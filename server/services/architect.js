/**
 * ArchLens Architecture Intelligence Service — v2
 *
 * A 3-phase conversational architecture workflow modelled on how a real
 * principal enterprise architect actually runs a discovery session:
 *
 * Phase 1 — Requirement Clarification
 *   Business context, scope, users, integrations. Detects intent patterns
 *   (event-driven, API gateway, data platform, etc.) from the requirement
 *   and tailors questions accordingly.
 *
 * Phase 2 — Technical Deep Dive
 *   NFRs (SLAs, security, compliance, scalability), data models, integration
 *   protocols, build-vs-buy, existing landscape fit. Questions are generated
 *   dynamically based on Phase 1 answers and detected architecture patterns.
 *
 * Phase 3 — Architecture Generation
 *   Maps every component to the existing LeanIX landscape, identifies gaps,
 *   recommends specific market products for each gap, and produces a
 *   high-quality Mermaid diagram.
 */
require('dotenv').config();
const fetch = require('node-fetch');

// ── AI call ───────────────────────────────────────────────────────────────────
async function getAIConfig() {
  try {
    const { getDB } = require('../db/db');
    const db  = getDB();
    const rows = await db.all(`SELECT key, value FROM settings WHERE key IN ('ai_provider','ai_api_key')`);
    const s   = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return {
      provider: s.ai_provider || process.env.AI_PROVIDER || 'claude',
      apiKey:   s.ai_api_key  || process.env.AI_API_KEY  || ''
    };
  } catch {
    return { provider: process.env.AI_PROVIDER || 'claude', apiKey: process.env.AI_API_KEY || '' };
  }
}

async function callAI(messages, maxTokens = 4000, systemPrompt = '') {
  const { provider, apiKey } = await getAIConfig();
  if (!apiKey) throw new Error('AI_KEY_MISSING');

  let url, headers, body;
  if (provider === 'claude') {
    url     = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    body    = { model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system: systemPrompt, messages };
  } else if (provider === 'openai') {
    url     = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}` };
    const msgs = systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages;
    body = { model: 'gpt-4o', max_tokens: maxTokens, messages: msgs };
  } else if (provider === 'gemini') {
    url     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
    headers = {};
    const allText = (systemPrompt ? systemPrompt + '\n\n' : '') + messages.map(m => m.content).join('\n\n');
    body    = { contents: [{ parts: [{ text: allText }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 } };
  } else {
    url     = 'https://api.deepseek.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}` };
    const msgs = systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages;
    body = { model: 'deepseek-chat', max_tokens: maxTokens, messages: msgs };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 401 || res.status === 403) throw new Error('AI_KEY_INVALID:' + provider);
    if (res.status === 429 || res.status === 402) throw new Error('AI_QUOTA_EXCEEDED:' + provider);
    throw new Error(`${provider} API ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  if (provider === 'claude')  return j.content[0].text;
  if (provider === 'gemini')  return j.candidates[0].content.parts[0].text;
  return j.choices[0].message.content;
}

function parseJSON(raw) {
  const text = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(text); } catch (_) {}
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) { try { return JSON.parse(match[1]); } catch (_) {} }
  throw new Error('Could not parse AI response as JSON. Raw: ' + text.slice(0, 300));
}

// ── Landscape loader ──────────────────────────────────────────────────────────
async function loadLandscape(workspace) {
  const { getDB } = require('../db/db');
  const db = getDB();

  const vendors = await db.all(
    `SELECT vendor_name, category, sub_category, app_count, total_cost, app_list
     FROM vendor_analysis WHERE workspace = ? ORDER BY app_count DESC`,
    [workspace]
  ).catch(() => []);

  const apps = await db.all(
    `SELECT name, fs_type, description, lifecycle, vendors, tags, criticality, tech_fit, annual_cost
     FROM fact_sheets
     WHERE workspace = ? AND fs_type IN ('Application','ITComponent','Interface','Middleware','Microservice','Service')
     ORDER BY fs_type, name`,
    [workspace]
  ).catch(() => []);

  const appOnlyCount = apps.filter(a => ['Application','Microservice','Service'].includes(a.fs_type)).length;

  const byCategory = {};
  for (const v of vendors) {
    const cat = v.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({
      name:        v.vendor_name,
      subCategory: v.sub_category,
      appCount:    v.app_count,
      cost:        v.total_cost,
      apps: (() => { try { return JSON.parse(v.app_list || '[]'); } catch { return []; } })()
    });
  }

  return { vendors, apps, byCategory, vendorCount: vendors.length, appCount: appOnlyCount, totalTechFS: apps.length };
}

// ── Landscape context builder — structured for the AI ────────────────────────
function buildLandscapeContext(landscape) {
  const { byCategory, apps, appCount, vendorCount, totalTechFS } = landscape;

  const lines = [
    `=== EXISTING TECHNOLOGY LANDSCAPE ===`,
    `${vendorCount} categorised vendors | ${appCount} applications | ${totalTechFS} total technical fact sheets`,
    ''
  ];

  // Vendors by category
  if (vendorCount > 0) {
    lines.push('--- VENDORS BY CATEGORY ---');
    for (const [cat, vs] of Object.entries(byCategory)) {
      if (!vs.length) continue;
      lines.push(`[${cat}]`);
      for (const v of vs.slice(0, 15)) {
        lines.push(`  • ${v.name}${v.subCategory ? ' (' + v.subCategory + ')' : ''} — used by ${v.appCount} app(s)`);
      }
      if (vs.length > 15) lines.push(`  ... and ${vs.length - 15} more in this category`);
      lines.push('');
    }
  }

  // Applications and IT Components — grouped by type
  const byType = {};
  for (const a of apps) {
    if (!byType[a.fs_type]) byType[a.fs_type] = [];
    byType[a.fs_type].push(a);
  }

  if (apps.length > 0) {
    lines.push('--- APPLICATIONS & TECHNICAL COMPONENTS ---');
    for (const [type, items] of Object.entries(byType)) {
      lines.push(`[${type}] (${items.length} total)`);
      // Show top 20 per type to give AI good context without token explosion
      for (const a of items.slice(0, 20)) {
        const vendorStr = (() => { try { const v = JSON.parse(a.vendors || '[]'); return v.length ? ` [${v.slice(0,3).join(', ')}]` : ''; } catch { return ''; } })();
        lines.push(`  • ${a.name}${vendorStr}${a.lifecycle ? ' [' + a.lifecycle + ']' : ''}`);
      }
      if (items.length > 20) lines.push(`  ... and ${items.length - 20} more`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ── Intent detection — drives dynamic question generation ────────────────────
function detectIntentPatterns(requirement) {
  const r = requirement.toLowerCase();
  const patterns = [];

  if (/event|stream|messag|queue|kafka|rabbit|pulsar|kinesis|pubsub|async|real.?time|notify/i.test(r))
    patterns.push('event_driven');
  if (/api|gateway|rest|graphql|webhook|integrat|connect|sync|middleware/i.test(r))
    patterns.push('api_integration');
  if (/data|analytics|bi|report|warehouse|lake|pipeline|etl|ml|ai|predict/i.test(r))
    patterns.push('data_platform');
  if (/checkout|payment|order|cart|ecommerce|e-commerce|shop|storefront/i.test(r))
    patterns.push('ecommerce');
  if (/identity|auth|sso|saml|oauth|iam|user|login|access|permiss/i.test(r))
    patterns.push('identity_access');
  if (/microservice|container|kubernetes|k8s|docker|serverless|cloud.?native|devops|deploy/i.test(r))
    patterns.push('cloud_native');
  if (/erp|sap|finance|supply.?chain|warehouse|inventory|logistics|procurement/i.test(r))
    patterns.push('erp_integration');
  if (/portal|customer|self.?service|onboard|crm|salesforce|support|ticket/i.test(r))
    patterns.push('customer_portal');
  if (/monitor|observ|alert|log|trace|apm|perform|sla|uptime/i.test(r))
    patterns.push('observability');
  if (/security|compliance|gdpr|pci|iso|audit|encrypt|vault/i.test(r))
    patterns.push('security_compliance');

  // Default if nothing detected
  if (patterns.length === 0) patterns.push('general');

  return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SYSTEM PROMPT — shared persona for all phases
// ═══════════════════════════════════════════════════════════════════════════════
const ARCHITECT_PERSONA = `You are a Principal Enterprise Architect with 20+ years of experience designing mission-critical systems for large enterprises across retail, finance, logistics, and manufacturing sectors.

Your architecture practice is grounded in:
- Domain-Driven Design (DDD) and bounded context thinking
- Event-Driven Architecture (EDA) and messaging patterns (CQRS, Event Sourcing, Saga)
- API-first design (REST, GraphQL, AsyncAPI, gRPC)
- Cloud-native patterns (12-factor, microservices, serverless, service mesh)
- Integration patterns (ESB, iPaaS, event streaming, ETL/ELT)
- Non-functional requirements: reliability, scalability, security, observability, cost

When asking questions, you think like a real architect running a discovery session:
- You probe for SCALE (transactions/sec, users, data volume, peak load)
- You probe for RESILIENCE (availability SLAs, RPO/RTO, failure modes)
- You probe for INTEGRATION (upstream/downstream systems, protocols, ownership)
- You probe for SECURITY and COMPLIANCE (data classification, regulatory requirements)
- You probe for OPERATIONAL needs (monitoring, alerting, on-call, runbooks)
- You always look at the existing landscape FIRST before recommending new tools
- You flag when an event-driven or async pattern is needed vs. synchronous REST
- You identify when the customer lacks a critical middleware component (message broker, API gateway, service mesh, etc.)

Always respond with valid JSON only — no markdown fences, no preamble text.`;

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — Business & Functional Clarification
// ═══════════════════════════════════════════════════════════════════════════════
async function phase1Questions(requirement, landscape) {
  const ctx      = buildLandscapeContext(landscape);
  const patterns = detectIntentPatterns(requirement);

  const patternGuidance = {
    event_driven: `
DETECTED PATTERN: Event-Driven / Messaging
- Ask about event producers and consumers
- Ask about ordering guarantees, idempotency, and at-least-once vs exactly-once delivery
- Ask about event schema management and versioning
- Check if they have a message broker in the landscape (look for Kafka, RabbitMQ, Azure Service Bus, AWS SQS/SNS, MuleSoft, etc.)
- If no broker exists, this is a critical gap to flag`,

    api_integration: `
DETECTED PATTERN: API / Integration Layer
- Ask about API consumers (internal teams, third parties, mobile apps)
- Ask about authentication requirements (OAuth2, API keys, mTLS)
- Ask about rate limiting, throttling, and SLA needs
- Check if they have an API Gateway or iPaaS in the landscape`,

    data_platform: `
DETECTED PATTERN: Data / Analytics Platform
- Ask about data sources, formats, and volumes
- Ask about latency requirements (batch vs real-time vs near-real-time)
- Ask about data governance, lineage, and compliance
- Check existing BI/analytics tools in the landscape`,

    ecommerce: `
DETECTED PATTERN: E-Commerce / Checkout
- Ask about transaction volumes and peak load (Black Friday scenarios)
- Ask about payment providers and PCI-DSS compliance requirements
- Ask about cart, pricing, and inventory system integrations
- Ask about fraud detection needs`,

    erp_integration: `
DETECTED PATTERN: ERP / SAP Integration
- Ask about which SAP modules are involved (SD, MM, FI, WM, TM, etc.)
- Ask about integration approach: RFC/BAPI, IDoc, OData, SAP Integration Suite
- Ask about data synchronisation frequency (real-time vs batch)
- Ask about master data management (MDM) requirements`,

    cloud_native: `
DETECTED PATTERN: Cloud-Native / DevOps
- Ask about target cloud provider and existing infrastructure
- Ask about container orchestration and deployment strategy
- Ask about CI/CD maturity and toolchain
- Ask about multi-region or hybrid-cloud requirements`,

    security_compliance: `
DETECTED PATTERN: Security / Compliance
- Ask about specific regulations (GDPR, PCI-DSS, ISO 27001, SOC2)
- Ask about data classification and handling requirements
- Ask about identity provider and SSO integration
- Ask about audit logging and non-repudiation needs`,

    general: `
Focus on: scope boundaries, user types, key integrations, data flows, and expected scale.`
  };

  const patternContext = patterns.map(p => patternGuidance[p] || '').join('\n');

  const prompt = `A stakeholder has submitted this architecture requirement:
"${requirement}"

${ctx}

DETECTED ARCHITECTURE INTENT: ${patterns.join(', ')}
${patternContext}

TASK: Generate 5-6 targeted Phase 1 questions as a principal enterprise architect.

Phase 1 focuses on FUNCTIONAL and BUSINESS requirements:
- Business context: who uses it, what problem it solves, what success looks like
- Functional scope: key capabilities, user journeys, integrations needed
- Data: what data flows, ownership, sensitivity
- Stakeholders: who owns the system, who are the consumers
- Timeline and phasing: MVP vs full rollout

CRITICAL RULES:
1. Tailor questions to the detected patterns (${patterns.join(', ')}) — do not ask generic questions
2. Reference SPECIFIC systems from the existing landscape where relevant (e.g. "You already have SAP S/4HANA — should this integrate with it?")
3. For event-driven patterns, explicitly ask about message broker requirements and check the landscape
4. Mix question types: use 'choice' for bounded answers, 'multi' for multi-select, 'text' for open-ended
5. The 'why' field must explain the ARCHITECTURAL IMPLICATION of the answer, not just why it's interesting
6. Each question must directly affect an architectural decision

Respond with ONLY this JSON (no markdown, no preamble):
{
  "summary": "<one sentence restatement of the requirement>",
  "detectedPatterns": ${JSON.stringify(patterns)},
  "phase": 1,
  "phaseTitle": "Business & Functional Clarification",
  "questions": [
    {
      "id": "q1",
      "question": "<specific, architect-quality question>",
      "why": "<exact architectural decision this answer drives — e.g. 'Determines whether we need synchronous REST or async event streaming'>",
      "type": "text | choice | multi",
      "options": ["option1", "option2"]
    }
  ]
}`;

  const raw = await callAI([{ role: 'user', content: prompt }], 2500, ARCHITECT_PERSONA);
  return parseJSON(raw);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — Non-Functional & Technical Deep Dive
// ═══════════════════════════════════════════════════════════════════════════════
async function phase2Questions(requirement, phase1QA, landscape) {
  const ctx = buildLandscapeContext(landscape);

  const answersText = phase1QA.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');

  const prompt = `Original requirement: "${requirement}"

Phase 1 answers from the business stakeholder:
${answersText}

${ctx}

TASK: You have completed Phase 1 business clarification. Now generate 5-6 Phase 2 TECHNICAL and NON-FUNCTIONAL deep-dive questions.

Phase 2 must cover NON-FUNCTIONAL REQUIREMENTS and TECHNICAL SPECIFICS:

MANDATORY NFR AREAS TO COVER (pick the most relevant 5-6 based on Phase 1 answers):

1. RELIABILITY & AVAILABILITY
   - Target SLA (99.9% = 8.7h downtime/year, 99.99% = 52min/year)
   - RPO (Recovery Point Objective) and RTO (Recovery Time Objective)
   - Failover strategy: active-active, active-passive, or best-effort?
   
2. SCALABILITY & PERFORMANCE
   - Expected transaction volume (requests/sec, messages/sec, records/day)
   - Peak load multiplier (e.g. 10x normal on Black Friday)
   - Response time SLAs (p50, p95, p99 latency targets)
   - Data volume growth projections (GB/year, record counts)

3. SECURITY & COMPLIANCE
   - Data classification: public, internal, confidential, restricted?
   - Regulatory requirements: GDPR, PCI-DSS, ISO 27001, SOC2, HIPAA?
   - Authentication: SSO, OAuth2, service-to-service mTLS?
   - Encryption requirements: at-rest, in-transit, field-level?

4. INTEGRATION & DATA FLOW
   - Synchronous vs asynchronous: which flows need guaranteed delivery?
   - Data consistency model: strong consistency vs eventual consistency?
   - Idempotency requirements for event processing?
   - Schema evolution strategy (backward/forward compatibility)?

5. OPERATIONAL EXCELLENCE
   - Observability needs: metrics, logs, distributed tracing?
   - Alerting thresholds and on-call requirements?
   - Deployment strategy: blue/green, canary, rolling?
   - Runbook and incident management requirements?

6. BUILD vs BUY vs EXTEND
   - For each capability gap identified: build custom, buy SaaS, or extend existing?
   - Make vs integrate decision for each major component?
   - Open-source vs commercial licensing preference?

7. MIDDLEWARE & INTEGRATION PATTERNS (if event-driven patterns detected):
   - Message ordering: strict FIFO or best-effort?
   - Dead letter queue strategy for failed message processing?
   - Event schema registry requirement?
   - Pub/sub vs point-to-point vs broadcast topology?

CRITICAL RULES:
1. Analyse Phase 1 answers carefully — build on them, do not repeat what was already answered
2. Reference existing landscape systems: ask how THIS solution will integrate with THOSE specific systems
3. If Phase 1 revealed a missing critical component (no message broker, no API gateway, etc.), ask the BUILD vs BUY question for that specific gap
4. Phrase questions as a senior architect would — use precise technical terminology
5. Each question must change a specific design decision in Phase 3

Respond with ONLY this JSON:
{
  "phase": 2,
  "phaseTitle": "Technical & Non-Functional Deep Dive",
  "refined_requirement": "<updated requirement statement incorporating Phase 1 answers, 2-3 sentences>",
  "keyInsights": ["<insight from phase 1 that shapes phase 2>", "..."],
  "missingCapabilities": ["<any critical capability not in landscape>", "..."],
  "questions": [
    {
      "id": "q1",
      "question": "<precise NFR or technical question>",
      "why": "<which architectural quality attribute this drives: reliability/scalability/security/performance/operability>",
      "type": "text | choice | multi",
      "options": ["option1", "option2"],
      "nfrCategory": "reliability | scalability | security | performance | integration | operational | build_vs_buy"
    }
  ]
}`;

  const raw = await callAI([{ role: 'user', content: prompt }], 2800, ARCHITECT_PERSONA);
  return parseJSON(raw);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3 — Architecture Generation with Landscape Mapping
// ═══════════════════════════════════════════════════════════════════════════════
async function phase3Architecture(requirement, allQA, landscape) {
  const ctx     = buildLandscapeContext(landscape);
  const patterns = detectIntentPatterns(requirement);

  const answersText = allQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA: ${qa.answer}`).join('\n\n');

  const prompt = `You are generating a complete enterprise solution architecture.

REQUIREMENT: "${requirement}"

DETECTED ARCHITECTURE PATTERNS: ${patterns.join(', ')}

ALL GATHERED REQUIREMENTS (${allQA.length} questions answered):
${answersText}

${ctx}

TASK: Generate a complete, production-quality solution architecture.

ARCHITECTURE GENERATION RULES:

1. LANDSCAPE MAPPING (critical):
   - Go through the landscape systematically — match EVERY needed capability against existing vendors/apps
   - Mark as 'existing' ONLY if the specific vendor or product is actually in the landscape
   - Mark as 'recommended' for products that should be procured (with specific product names)
   - Mark as 'new' for custom-built components

2. GAP ANALYSIS (mandatory):
   - For every capability NOT covered by existing landscape, create a gap entry
   - For each gap, provide 3-4 specific NAMED product recommendations (not categories)
   - Include real market products: e.g. "Apache Kafka", "Confluent Cloud", "Azure Service Bus", "AWS MSK" — not just "message broker"
   - Include integration effort estimate and rough cost indication

3. MERMAID DIAGRAM QUALITY (this is the most important output):
   - Use 'flowchart TD' syntax (most reliable rendering)
   - Show ALL architectural layers as subgraphs: Presentation, API Gateway, Business Services, Integration/Messaging, Data, External/Vendor, Infrastructure
   - Use different node shapes to distinguish component types:
     * Rectangles [Component] for services/applications
     * Cylinders [(Database)] for data stores
     * Stadium shapes ([Queue]) or parallelograms for message queues/events
     * Rounded rectangles (Component) for external services
   - Style existing components in green, new/custom in blue, recommended/missing in orange
   - Show data flows with labeled arrows: --> |REST API| or --> |Event Stream| or --> |Batch ETL|
   - The diagram MUST be syntactically valid Mermaid that renders without errors
   - Aim for a diagram with 15-30 nodes — detailed enough to be useful, not so complex it breaks

4. INTEGRATION MAP:
   - List every integration with: from, to, protocol (REST/GraphQL/Event/Batch/gRPC/IDoc/OData), direction, and what data flows

5. NFR SUMMARY:
   - Summarise the key NFR decisions from Phase 2 in the architecture

Respond with ONLY this JSON (absolutely no markdown outside the JSON):
{
  "title": "<specific architecture title, not generic>",
  "summary": "<3-4 sentence executive summary covering what is built, what is reused, what is missing, and the key architectural pattern>",
  "architecturalPattern": "<primary pattern: e.g. Event-Driven Microservices, API-Led Integration, Lambda Architecture, CQRS with Event Sourcing, etc.>",
  "nfrDecisions": {
    "availability": "<SLA and resilience approach>",
    "scalability": "<scaling strategy and expected capacity>",
    "security": "<security and compliance approach>",
    "integration": "<integration pattern and protocols>"
  },
  "layers": [
    {
      "name": "<layer name: Presentation | API Gateway | Business Services | Integration & Messaging | Data | External & Vendor | Infrastructure>",
      "components": [
        {
          "name": "<component display name>",
          "type": "existing | new | recommended",
          "product": "<exact product/vendor name if existing or recommended>",
          "category": "<technology category>",
          "role": "<what this component does in the architecture, 1-2 sentences>",
          "existsInLandscape": true,
          "notes": "<optional: key design decision or constraint for this component>"
        }
      ]
    }
  ],
  "gaps": [
    {
      "capability": "<specific missing capability, e.g. 'Event Streaming / Message Broker'>",
      "impact": "<what breaks without this capability>",
      "urgency": "critical | high | medium",
      "recommendations": [
        {
          "name": "<specific product name, e.g. 'Apache Kafka'>",
          "vendor": "<vendor name>",
          "why": "<why this fits THIS architecture specifically>",
          "pros": ["<pro 1>", "<pro 2>"],
          "cons": ["<con 1>"],
          "estimatedCost": "<rough annual cost range>",
          "integrationEffort": "low | medium | high",
          "recommended": true
        }
      ]
    }
  ],
  "integrations": [
    {
      "from": "<source component>",
      "to": "<target component>",
      "protocol": "<REST | GraphQL | Event | Batch | gRPC | IDoc | OData | SOAP | MQ>",
      "direction": "sync | async | batch",
      "dataFlows": "<what data/events flow>",
      "notes": "<key integration design decision>"
    }
  ],
  "mermaidDiagram": "<complete valid Mermaid flowchart TD diagram as a single escaped string>",
  "risks": [
    {
      "risk": "<specific risk>",
      "severity": "high | medium | low",
      "mitigation": "<concrete mitigation strategy>"
    }
  ],
  "nextSteps": [
    {
      "step": "<action>",
      "owner": "<role: Enterprise Architect | Development Team | Infrastructure | Procurement | Security>",
      "timeline": "<e.g. Week 1-2 | Month 1 | Q1>",
      "effort": "<S | M | L | XL>"
    }
  ],
  "estimatedComplexity": "low | medium | high | very_high",
  "estimatedDuration": "<e.g. 3-6 months MVP, 12 months full rollout>"
}`;

  const raw = await callAI([{ role: 'user', content: prompt }], 5000, ARCHITECT_PERSONA);
  const result = parseJSON(raw);

  // Cross-reference components against actual landscape
  const { vendors, apps } = landscape;
  const vendorNames = new Set(vendors.map(v => v.vendor_name.toLowerCase()));
  const appNames    = new Set(apps.map(a => a.name.toLowerCase()));

  if (result.layers) {
    for (const layer of result.layers) {
      for (const comp of (layer.components || [])) {
        const lookup = (comp.product || comp.name || '').toLowerCase();
        comp.existsInLandscape =
          vendorNames.has(lookup) ||
          appNames.has(lookup) ||
          vendors.some(v => lookup.includes(v.vendor_name.toLowerCase().split(' ')[0])) ||
          apps.some(a => lookup.includes(a.name.toLowerCase().split(' ')[0]));
        if (comp.existsInLandscape && comp.type !== 'new') {
          comp.type = 'existing';
        }
      }
    }
  }

  return result;
}

module.exports = { phase1Questions, phase2Questions, phase3Architecture, loadLandscape };
