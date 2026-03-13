/**
 * ArchLens Resolution Service
 * 
 * Vendor Identity Resolution + Functional Duplicate Detection + Modernization Analysis
 * 
 * Architecture:
 *   1. Load all fact sheets (App, ITC, Interface, Provider) with full relationship context
 *   2. AI resolves vendor aliases → canonical vendor hierarchy (vendor > product > platform > instance)
 *   3. AI clusters fact sheets by functional purpose → duplicate groups
 *   4. AI assesses modernization opportunities per cluster or target type
 */
require('dotenv').config();
const fetch = require('node-fetch');

async function getAIConfig() {
  try {
    const { getDB } = require('../db/db');
    const rows = await getDB().all(`SELECT key,value FROM settings WHERE key IN ('ai_provider','ai_api_key')`);
    const s = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return { provider: s.ai_provider || process.env.AI_PROVIDER || 'claude', apiKey: s.ai_api_key || process.env.AI_API_KEY || '' };
  } catch { return { provider: process.env.AI_PROVIDER||'claude', apiKey: process.env.AI_API_KEY||'' }; }
}

async function callAI(messages, maxTokens = 3000, system = '') {
  const { provider, apiKey } = await getAIConfig();
  if (!apiKey) throw new Error('AI_KEY_MISSING');
  let url, headers, body;
  if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    body = { model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system, messages };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { Authorization: `Bearer ${apiKey}` };
    body = { model: 'gpt-4o', max_tokens: maxTokens, messages: system ? [{ role:'system', content:system }, ...messages] : messages };
  } else {
    url = 'https://api.deepseek.com/v1/chat/completions';
    headers = { Authorization: `Bearer ${apiKey}` };
    body = { model: 'deepseek-chat', max_tokens: maxTokens, messages: system ? [{ role:'system', content:system }, ...messages] : messages };
  }
  const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', ...headers }, body:JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) throw new Error('AI_KEY_INVALID:' + provider);
    if (res.status === 429 || res.status === 402) throw new Error('AI_QUOTA_EXCEEDED:' + provider);
    throw new Error(`${provider} API error ${res.status}: ${text.slice(0,120)}`);
  }
  const j = await res.json();
  return provider === 'claude' ? j.content[0].text : j.choices[0].message.content;
}

function safeJSON(raw) {
  const text = raw.replace(/```json|```/g,'').trim();
  try { return JSON.parse(text); } catch(_) {}
  const m = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (m) try { return JSON.parse(m[1]); } catch(_) {}
  // Bracket-scan salvage
  const results = []; let depth=0, start=-1;
  for (let i=0;i<text.length;i++) {
    if (text[i]==='{') { if(!depth)start=i; depth++; }
    else if (text[i]==='}') { depth--; if(!depth&&start!==-1) { try{ const o=JSON.parse(text.slice(start,i+1)); if(o)results.push(o); }catch(_){} start=-1; } }
  }
  if (results.length) return results;
  throw new Error('Cannot parse AI response as JSON');
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 1 — Load full landscape context from DB
// ══════════════════════════════════════════════════════════════════════════════
async function loadFullLandscape(workspace) {
  const db = require('../db/db').getDB();

  const [apps, itcs, ifaces, providers, vendorAnalysis] = await Promise.all([
    db.all(`SELECT id,name,description,tags,vendors,lifecycle,criticality,tech_fit,annual_cost,quality_score,locker FROM fact_sheets WHERE workspace=? AND fs_type='Application'`, [workspace]),
    db.all(`SELECT id,name,description,tags,vendors,lifecycle,tech_fit,annual_cost,quality_score,locker FROM fact_sheets WHERE workspace=? AND fs_type='ITComponent'`, [workspace]),
    db.all(`SELECT id,name,description,tags,vendors,lifecycle FROM fact_sheets WHERE workspace=? AND fs_type='Interface'`, [workspace]),
    db.all(`SELECT id,name,description,tags FROM fact_sheets WHERE workspace=? AND fs_type='Provider'`, [workspace]),
    db.all(`SELECT vendor_name,category,sub_category,app_count,total_cost,app_list FROM vendor_analysis WHERE workspace=?`, [workspace]),
  ]);

  const parse = row => { try { return JSON.parse(row||'[]'); } catch { return []; } };

  return {
    apps:     apps.map(r => ({ ...r, tags:parse(r.tags), vendors:parse(r.vendors) })),
    itcs:     itcs.map(r => ({ ...r, tags:parse(r.tags), vendors:parse(r.vendors) })),
    ifaces:   ifaces.map(r => ({ ...r, tags:parse(r.tags), vendors:parse(r.vendors||'[]') })),
    providers: providers.map(r => ({ ...r, tags:parse(r.tags) })),
    vendorAnalysis,
    counts: { apps:apps.length, itcs:itcs.length, ifaces:ifaces.length, providers:providers.length }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 2 — Vendor Identity Resolution
//  Input: all raw vendor names from Provider FS + vendors[] fields
//  Output: canonical vendor hierarchy saved to vendor_hierarchy table
// ══════════════════════════════════════════════════════════════════════════════
async function resolveVendorIdentities(workspace, emit) {
  const db  = require('../db/db').getDB();
  const land = await loadFullLandscape(workspace);

  emit({ event:'step', step:'collect', msg:'Collecting all vendor name variants...' });

  // Collect every raw vendor name from all sources
  const rawNames = new Set();
  land.providers.forEach(p => rawNames.add(p.name?.trim()));
  land.apps.forEach(a => a.vendors.forEach(v => rawNames.add(v?.trim())));
  land.itcs.forEach(c => c.vendors.forEach(v => rawNames.add(v?.trim())));
  land.vendorAnalysis.forEach(v => rawNames.add(v.vendor_name?.trim()));
  const names = [...rawNames].filter(Boolean).sort();

  emit({ event:'step', step:'collect', msg:`Found ${names.length} raw vendor name variants` });
  emit({ event:'step', step:'resolve', msg:`Resolving ${names.length} names into canonical vendors...` });

  // AI resolution in batches of 60 names
  const BATCH = 60;
  const allResolved = [];
  const now = new Date().toISOString();

  for (let i = 0; i < names.length; i += BATCH) {
    const batch = names.slice(i, i + BATCH);
    const prompt = `You are a principal enterprise architect with deep knowledge of enterprise software vendors.

Resolve these raw vendor/product names into a canonical vendor hierarchy.
Group aliases, product variants, and modules under their real canonical vendor.

RULES:
- "SAP", "SAP SE", "SAP AG", "SAP S4", "SAP S/4HANA", "SAP ECC", "SAP FI", "SAP MM" → all resolve to vendor "SAP SE"
- "Microsoft", "MS Azure", "Azure", "Microsoft 365", "MS Teams" → vendor "Microsoft"  
- "Google", "GCP", "Google Cloud", "Google Workspace" → vendor "Google LLC"
- Distinguish: vendor_type can be "vendor" (the company), "product" (a product), "platform" (a platform/cloud), "module" (a sub-component)
- Set parent_canonical for products/modules (e.g. "SAP S/4HANA" parent is "SAP SE")
- confidence: 1.0 = certain, 0.8 = very likely, 0.6 = probable, 0.5 = uncertain

Raw names to resolve (${i+1}–${Math.min(i+BATCH,names.length)} of ${names.length}):
${JSON.stringify(batch)}

Return ONLY a JSON array:
[{
  "raw_name": "<exact input name>",
  "canonical_name": "<clean canonical name>",
  "vendor_type": "vendor|product|platform|module|unknown",
  "parent_canonical": "<parent vendor canonical name or null>",
  "confidence": 0.9
}]`;

    try {
      const raw = await callAI([{ role:'user', content:prompt }], 3000,
        'You are an enterprise architect. Return only valid JSON arrays. No markdown.');
      const parsed = safeJSON(raw);
      allResolved.push(...(Array.isArray(parsed) ? parsed : []));
    } catch (e) {
      console.warn(`[resolve] batch ${i}–${i+BATCH} failed: ${e.message}`);
      // Fallback: use raw name as canonical
      batch.forEach(n => allResolved.push({ raw_name:n, canonical_name:n, vendor_type:'unknown', parent_canonical:null, confidence:0.5 }));
    }
    emit({ event:'progress', processed: Math.min(i+BATCH, names.length), total: names.length, step:'resolve' });
  }

  // Build canonical → { aliases, appList, cost, counts }
  const canonicalMap = {};
  for (const r of allResolved) {
    const k = r.canonical_name || r.raw_name;
    if (!canonicalMap[k]) canonicalMap[k] = { canonical:k, type:r.vendor_type||'vendor', parent:r.parent_canonical||null, aliases:[], appSet:new Set(), itcSet:new Set(), cost:0 };
    if (r.raw_name !== k) canonicalMap[k].aliases.push(r.raw_name);
  }

  // Enrich with actual app/ITC counts
  for (const a of land.apps) {
    for (const v of a.vendors) {
      const resolved = allResolved.find(r => r.raw_name === v);
      const k = resolved?.canonical_name || v;
      if (canonicalMap[k]) { canonicalMap[k].appSet.add(a.id); canonicalMap[k].cost += a.annual_cost||0; }
    }
  }
  for (const c of land.itcs) {
    for (const v of c.vendors) {
      const resolved = allResolved.find(r => r.raw_name === v);
      const k = resolved?.canonical_name || v;
      if (canonicalMap[k]) { canonicalMap[k].itcSet.add(c.id); canonicalMap[k].cost += c.annual_cost||0; }
    }
  }

  // Persist to vendor_hierarchy
  await db.run(`DELETE FROM vendor_hierarchy WHERE workspace=?`, [workspace]);
  let saved = 0;
  for (const [, v] of Object.entries(canonicalMap)) {
    const apps = [...v.appSet];
    const itcs = [...v.itcSet];
    const conf = allResolved.filter(r => r.canonical_name === v.canonical).reduce((s,r,_,arr) => s + (r.confidence||0.8)/arr.length, 0);
    const va = land.vendorAnalysis.find(a => a.vendor_name === v.canonical || v.aliases.includes(a.vendor_name));
    await db.run(
      `INSERT OR REPLACE INTO vendor_hierarchy (workspace,canonical_name,vendor_type,aliases,category,sub_category,app_count,itc_count,total_cost,linked_fs,confidence,analysed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [workspace, v.canonical, v.type||'vendor',
       JSON.stringify([...new Set(v.aliases)]),
       va?.category||null, va?.sub_category||null,
       apps.length, itcs.length, v.cost,
       JSON.stringify([...apps, ...itcs].slice(0,200)),
       Math.round((conf||0.8)*100)/100, now]
    );
    saved++;
  }

  emit({ event:'done_resolve', saved, rawCount: names.length });
  return { saved, rawCount: names.length };
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 3 — Functional Duplicate Detection
//  Clusters fact sheets by what they DO, not what they're called
// ══════════════════════════════════════════════════════════════════════════════
async function detectDuplicates(workspace, fsTypes, emit) {
  const db   = require('../db/db').getDB();
  const land = await loadFullLandscape(workspace);
  const now  = new Date().toISOString();

  const typeMap = { Application: land.apps, ITComponent: land.itcs, Interface: land.ifaces };
  const targetTypes = fsTypes || ['Application', 'ITComponent', 'Interface'];

  emit({ event:'step', step:'cluster', msg:'Analysing fact sheets for functional duplicates...' });

  const allClusters = [];
  const BATCH = 40;

  for (const fsType of targetTypes) {
    const items = typeMap[fsType] || [];
    if (!items.length) continue;

    emit({ event:'step', step:'cluster', msg:`Clustering ${items.length} ${fsType} records...` });

    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH).map(it => ({
        id:   it.id,
        name: it.name,
        desc: (it.description||'').slice(0, 200),
        tags: it.tags || [],
        vendors: it.vendors || [],
        lifecycle: it.lifecycle,
        techFit: it.tech_fit
      }));

      const prompt = `You are a principal enterprise architect performing application portfolio rationalization.

Analyse these ${fsType} fact sheets and identify FUNCTIONAL DUPLICATES — items that serve the same or overlapping business purpose.

INSTRUCTIONS:
- Group items that do the same functional job (e.g., 5 pricing engines, 3 order managers, 2 API gateways)
- Only group items with genuine functional overlap — do NOT group just because names are similar
- A cluster needs at least 2 members
- functional_domain: what they ALL do (e.g., "Pricing Engine", "Order Management", "API Gateway")
- evidence: concrete reasons they are duplicates (what they share)
- recommendation: which to KEEP and why, what to RETIRE

Items to analyse (${fsType}):
${JSON.stringify(batch)}

Return ONLY a JSON array of clusters. Items with no duplicates should NOT appear:
[{
  "cluster_name": "<descriptive cluster name>",
  "functional_domain": "<what they all do>",
  "member_ids": ["<id1>","<id2>"],
  "member_names": ["<name1>","<name2>"],
  "evidence": "<why these are duplicates>",
  "recommendation": "<which to keep, which to retire, and why>"
}]
If no duplicates found in this batch, return: []`;

      try {
        const raw  = await callAI([{ role:'user', content:prompt }], 3000,
          'You are an enterprise architect. Return only valid JSON. No markdown.');
        const parsed = safeJSON(raw);
        const clusters = Array.isArray(parsed) ? parsed : [];
        for (const c of clusters) {
          if ((c.member_ids||[]).length >= 2) {
            allClusters.push({ ...c, fsType });
          }
        }
      } catch (e) {
        console.warn(`[duplicates] ${fsType} batch ${i} failed: ${e.message}`);
      }

      emit({ event:'progress', processed: Math.min(i+BATCH, items.length), total: items.length, step:'cluster', fsType });
    }
  }

  // Merge overlapping clusters (same IDs appearing in multiple batches)
  const merged = mergeOverlappingClusters(allClusters);

  // Persist
  await db.run(`DELETE FROM duplicate_clusters WHERE workspace=?`, [workspace]);
  for (const c of merged) {
    await db.run(
      `INSERT INTO duplicate_clusters (workspace,cluster_name,fs_type,functional_domain,fs_ids,fs_names,evidence,recommendation,status,analysed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [workspace, c.cluster_name, c.fsType, c.functional_domain,
       JSON.stringify(c.member_ids||[]), JSON.stringify(c.member_names||[]),
       c.evidence||'', c.recommendation||'', 'pending', now]
    );
  }

  emit({ event:'done_duplicates', clusters: merged.length });
  return { clusters: merged.length };
}

function mergeOverlappingClusters(clusters) {
  // Union-find to merge clusters that share member IDs
  const parent = {};
  const find = x => { if (!parent[x]) parent[x]=x; return parent[x]===x ? x : (parent[x]=find(parent[x])); };
  const union = (a,b) => { parent[find(a)] = find(b); };

  for (const c of clusters) {
    const ids = c.member_ids || [];
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }

  const groups = {};
  for (const c of clusters) {
    const root = find((c.member_ids||[])[0] || c.cluster_name);
    if (!groups[root]) groups[root] = { ...c, member_ids: new Set(c.member_ids||[]), member_names: new Set(c.member_names||[]) };
    else {
      (c.member_ids||[]).forEach(id => groups[root].member_ids.add(id));
      (c.member_names||[]).forEach(n => groups[root].member_names.add(n));
    }
  }

  return Object.values(groups).map(g => ({
    ...g,
    member_ids:   [...g.member_ids],
    member_names: [...g.member_names]
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 4 — Modernization Assessment
//  For a given target type, assess modernization opportunities
// ══════════════════════════════════════════════════════════════════════════════
async function assessModernization(workspace, targetType, modernizationType, emit) {
  const db   = require('../db/db').getDB();
  const land = await loadFullLandscape(workspace);
  const now  = new Date().toISOString();

  // Get current year for trending tech context
  const year = new Date().getFullYear();

  emit({ event:'step', step:'assess', msg:`Assessing ${targetType} modernization opportunities (${modernizationType})...` });

  const typeMap = { Application: land.apps, ITComponent: land.itcs, Interface: land.ifaces };
  const items = typeMap[targetType] || [];

  // Also get duplicate clusters for this type — modernization is extra relevant for duplicates
  const clusters = await db.all(
    `SELECT * FROM duplicate_clusters WHERE workspace=? AND fs_type=?`, [workspace, targetType]
  );

  const BATCH = 25;
  const allAssessments = [];

  const modernContext = {
    Interface: `Focus on: Event-driven architecture (Kafka, Azure Event Hub), API modernization (REST→GraphQL, gRPC), AsyncAPI, Service Mesh (Istio), replacing point-to-point with event streaming. In ${year} the biggest trend is replacing synchronous integrations with event-driven patterns.`,
    Application: `Focus on: Cloud-native migration (containerization, Kubernetes), microservices decomposition, SaaS replacement of custom-built apps, low-code/no-code platforms (Power Platform, Mendix), AI-augmented applications. In ${year} key trends: AI-native apps, composable architecture.`,
    ITComponent: `Focus on: Cloud PaaS replacement of self-managed infra, managed Kubernetes (AKS, EKS), serverless (Azure Functions, AWS Lambda), Infrastructure as Code, FinOps optimization, replacing on-prem with cloud-native equivalents. In ${year}: FinOps and platform engineering are dominant.`,
  }[targetType] || 'Focus on current technology modernization trends.';

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);

    const prompt = `You are a principal enterprise architect performing modernization assessment in ${year}.

Assess these ${targetType} fact sheets for modernization opportunities.
Focus: ${modernizationType}
Technology context: ${modernContext}

For each item that has a genuine modernization opportunity, provide an assessment.
Skip items that are already modern or have no clear opportunity.

Items:
${JSON.stringify(batch.map(it => ({
  id: it.id, name: it.name,
  desc: (it.description||'').slice(0,150),
  tags: it.tags?.slice(0,5)||[],
  vendors: it.vendors?.slice(0,3)||[],
  lifecycle: it.lifecycle,
  techFit: it.tech_fit
})))}

Return ONLY a JSON array (empty array if no opportunities):
[{
  "fs_id": "<id>",
  "fs_name": "<name>",
  "current_tech": "<what technology/pattern it currently uses>",
  "modernization_type": "<Event-Driven Migration|Cloud-Native|Microservices|SaaS Replacement|API Modernization|Infrastructure|AI-Augmentation|Consolidation>",
  "recommendation": "<specific modernization recommendation with named technologies>",
  "effort": "low|medium|high",
  "priority": "critical|high|medium|low",
  "rationale": "<why this modernization is needed now>"
}]`;

    try {
      const raw    = await callAI([{ role:'user', content:prompt }], 3000,
        'You are a senior enterprise architect. Return only valid JSON arrays. No markdown.');
      const parsed = safeJSON(raw);
      allAssessments.push(...(Array.isArray(parsed) ? parsed : []));
    } catch (e) {
      console.warn(`[modernization] batch ${i} failed: ${e.message}`);
    }

    emit({ event:'progress', processed: Math.min(i+BATCH, items.length), total: items.length, step:'assess' });
  }

  // Persist
  await db.run(`DELETE FROM modernization_assessments WHERE workspace=? AND target_type=?`, [workspace, targetType]);
  for (const a of allAssessments) {
    await db.run(
      `INSERT INTO modernization_assessments (workspace,target_type,fs_id,fs_name,current_tech,modernization_type,recommendation,effort,priority,status,analysed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [workspace, targetType, a.fs_id, a.fs_name, a.current_tech||'',
       a.modernization_type||'', a.recommendation||'', a.effort||'medium', a.priority||'medium', 'pending', now]
    );
  }

  emit({ event:'done_modernization', assessments: allAssessments.length, targetType });
  return { assessments: allAssessments.length, targetType };
}

module.exports = { resolveVendorIdentities, detectDuplicates, assessModernization, loadFullLandscape };
