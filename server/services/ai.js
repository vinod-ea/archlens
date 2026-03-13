require('dotenv').config();
const fetch = require('node-fetch');

const CATEGORIES = [
  // Core IT Infrastructure
  'Payment Provider',
  'Cloud Hosting & Infrastructure',
  'E-Commerce & CRM',
  'ERP & Finance',
  'Supply Chain & Logistics',
  'Collaboration & Productivity',
  'Security & Identity',
  'DevOps & Developer Tools',
  'Analytics & BI',
  'AI & Machine Learning',
  'API & Integration Middleware',
  'Database & Storage',
  'HR & Workforce',
  'IoT & OT',
  'Network & Connectivity',
  'Search Engine',
  'Logging Solution',
  'Monitoring Solution',
  'CMS Solution',

  // Financial Services & FinTech
  'Banking & Core Banking',
  'Trading & Capital Markets',
  'Risk & Compliance',
  'Insurance & Actuarial',
  'Wealth & Asset Management',
  'Treasury & Cash Management',

  // Healthcare & Life Sciences
  'Healthcare IT & EMR',
  'Clinical & Research',
  'Pharma & Drug Development',
  'Medical Devices & IoMT',
  'Genomics & Bioinformatics',
  'Telehealth & Digital Health',
  'Healthcare Analytics',

  // Energy & Utilities
  'Energy Trading & ETRM',
  'Smart Grid & Metering',
  'Renewable Energy Systems',
  'Oil & Gas Operations',
  'Utilities CIS & Billing',

  // Manufacturing & Industrial
  'Manufacturing Execution (MES)',
  'Quality Management (QMS)',
  'Product Lifecycle (PLM)',
  'Maintenance & Asset (EAM)',

  // Industry-Agnostic
  'Document Management',
  'Marketing Automation',
  'Legal & Contract Management',
  'Sustainability & ESG',

  'Other'
];

const CATEGORY_EXAMPLES = {
  // Core IT Infrastructure
  'Payment Provider':               'Adyen, Computop, Stripe, Klarna, Worldline, PayPal',
  'Cloud Hosting & Infrastructure': 'Azure, AWS, Google Cloud, Cloudflare, Azure Kubernetes',
  'E-Commerce & CRM':               'Spryker, SAP Commerce, Hybris, Adobe Commerce, Salesforce, Magento',
  'ERP & Finance':                  'SAP S/4HANA, SAP ECC, SAP BW, SAP FI, SAP MM, SAP SD, Oracle ERP',
  'Supply Chain & Logistics':       'SAP TM, SAP EWM, SAP WM, SAP SCM, Manhattan Associates, BluJay',
  'Collaboration & Productivity':   'Atlassian, Jira, Confluence, ServiceNow, Microsoft 365, Teams',
  'Security & Identity':            'CrowdStrike, Fortinet, Palo Alto, Okta, SailPoint, Qualys, Splunk',
  'DevOps & Developer Tools':       'Jenkins, GitHub, GitLab, IntelliJ, SonarQube, Dynatrace, Nexus',
  'Analytics & BI':                 'SAP BW, SAP Analytics Cloud, Power BI, Tableau, Databricks, Qlik',
  'AI & Machine Learning':          'Azure ML, Google Vertex AI, DataRobot, OpenAI, Palantir',
  'API & Integration Middleware':   'MuleSoft, SAP Integration Suite, Dell Boomi, IBM MQ, Apache Kafka',
  'Database & Storage':             'Oracle DB, SQL Server, PostgreSQL, MongoDB, Redis, SAP HANA',
  'HR & Workforce':                 'SAP SuccessFactors, SAP HCM, Workday, ADP',
  'IoT & OT':                       'Siemens, Bosch IoT, PTC ThingWorx, Honeywell',
  'Network & Connectivity':         'Cisco, Juniper, F5, Zscaler, Palo Alto Networks',
  'Search Engine':                  'Elasticsearch, Solr, Algolia, Azure Cognitive Search, Amazon OpenSearch',
  'Logging Solution':               'Splunk, ELK Stack, Datadog, Graylog, Loggly, Sumo Logic',
  'Monitoring Solution':            'Dynatrace, New Relic, Datadog, Prometheus, Grafana, AppDynamics',
  'CMS Solution':                   'WordPress, Contentful, Adobe Experience Manager, Sitecore, Drupal',

  // Financial Services & FinTech
  'Banking & Core Banking':         'Temenos, Finastra, FIS, Mambu, Thought Machine, Oracle FLEXCUBE',
  'Trading & Capital Markets':      'Bloomberg, Refinitiv, FactSet, ICE, CME, Tradeweb, Symphony',
  'Risk & Compliance':              'NICE Actimize, SAS, Moody\'s Analytics, Fenergo, ComplyAdvantage, Quantexa',
  'Insurance & Actuarial':          'Guidewire, Duck Creek, Sapiens, Majesco, Prophet, ISCS',
  'Wealth & Asset Management':      'BlackRock Aladdin, SimCorp, SS&C, Charles River, Broadridge, Advent',
  'Treasury & Cash Management':     'Kyriba, GTreasury, Reval, Calypso, FIS Treasury, ION',

  // Healthcare & Life Sciences
  'Healthcare IT & EMR':            'Epic, Cerner Oracle, Meditech, Allscripts, athenahealth, NextGen',
  'Clinical & Research':            'Medidata, Veeva Vault, Oracle Clinical, Parexel, IQVIA, TriNetX',
  'Pharma & Drug Development':      'LabWare LIMS, Thermo Fisher, PerkinElmer, BIOVIA, Benchling, CDD Vault',
  'Medical Devices & IoMT':         'Philips HealthSuite, GE Healthcare, Medtronic CareLink, Boston Scientific',
  'Genomics & Bioinformatics':      'Illumina BaseSpace, DNAnexus, Seven Bridges, PierianDx, Benchling',
  'Telehealth & Digital Health':    'Teladoc, Amwell, Doxy.me, MDLive, Doctor on Demand, SimplePractice',
  'Healthcare Analytics':           'Optum, Health Catalyst, Arcadia Analytics, Verily, Flatiron Health',

  // Energy & Utilities
  'Energy Trading & ETRM':          'Allegro, Openlink Endur, Triple Point, Brady CTRM, FIS Energy',
  'Smart Grid & Metering':          'Itron, Landis+Gyr, Schneider Electric, Siemens, Oracle Utilities MDM',
  'Renewable Energy Systems':       'GE Digital, OSIsoft PI, AutoGrid, Sense, Energy Hub',
  'Oil & Gas Operations':           'Aspen Tech, Honeywell Forge, Emerson DeltaV, Rockwell, Schlumberger Petrel',
  'Utilities CIS & Billing':        'Oracle Utilities CC&B, SAP Utilities, Hansen CIS, Genability',

  // Manufacturing & Industrial
  'Manufacturing Execution (MES)':  'Siemens Opcenter, Dassault DELMIA, Rockwell FactoryTalk, SAP MES, Plex',
  'Quality Management (QMS)':       'Sparta TrackWise, MasterControl, ETQ Reliance, Veeva QualityOne, AssurX',
  'Product Lifecycle (PLM)':        'Siemens Teamcenter, PTC Windchill, Dassault ENOVIA, Arena PLM, Aras',
  'Maintenance & Asset (EAM)':      'IBM Maximo, SAP EAM, Infor EAM, IFS Applications, eMaint CMMS',

  // Industry-Agnostic
  'Document Management':            'OpenText, M-Files, Laserfiche, DocuWare, Box, SharePoint',
  'Marketing Automation':           'HubSpot, Marketo, Pardot, Eloqua, Adobe Campaign, ActiveCampaign',
  'Legal & Contract Management':    'Ironclad, ContractWorks, Concord, DocuSign CLM, Icertis, Agiloft',
  'Sustainability & ESG':           'Workiva, Sphera, Enablon, Sustainalytics, Watershed, Persefoni'
};

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

async function callAI(prompt, maxTokens = 2048) {
  const { provider, apiKey } = await getAIConfig();
  if (!apiKey) throw new Error('AI_KEY_MISSING');

  let url, headers, body;
  if (provider === 'claude') {
    url     = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    body    = { model: 'claude-sonnet-4-20250514', max_tokens: maxTokens,
                messages: [{ role: 'user', content: prompt }] };
  } else if (provider === 'openai') {
    url     = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}` };
    body    = { model: 'gpt-4o', max_tokens: maxTokens,
                messages: [{ role: 'user', content: prompt }] };
  } else if (provider === 'deepseek') {
    url     = 'https://api.deepseek.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}` };
    body    = { model: 'deepseek-chat', max_tokens: maxTokens,
                messages: [{ role: 'user', content: prompt }] };
  } else if (provider === 'gemini') {
    // Google AI Gemini — uses generateContent endpoint
    url     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
    headers = {};  // API key is in URL param for Gemini
    body    = { contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 } };
  } else {
    throw new Error(`Unknown AI provider: ${provider}`);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) throw new Error('AI_KEY_INVALID:' + provider);
    if (res.status === 429) throw new Error('AI_QUOTA_EXCEEDED:' + provider);
    if (res.status === 402) throw new Error('AI_QUOTA_EXCEEDED:' + provider);
    throw new Error(`${provider} API error ${res.status}: ${text.slice(0, 120)}`);
  }
  const j = await res.json();
  if (provider === 'claude')  return j.content[0].text;
  if (provider === 'gemini')  return j.candidates[0].content.parts[0].text;
  return j.choices[0].message.content;
}

// ── JSON repair ───────────────────────────────────────────────────────────────
// When the AI hits its token limit mid-response, the JSON array is truncated.
// This attempts to salvage whatever complete objects were returned.
function repairJSON(raw) {
  const text = raw.replace(/```json|```/g, '').trim();

  // 1. Try clean parse first
  try { return JSON.parse(text); } catch (_) {}

  // 2. Extract every complete {...} object individually using a bracket counter
  const results = [];
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const chunk = text.slice(start, i + 1);
        try {
          const obj = JSON.parse(chunk);
          if (obj && obj.name) results.push(obj);
        } catch (_) {
          // Try to fix common issues: trailing commas, unquoted values
          try {
            const fixed = chunk
              .replace(/,\s*([}\]])/g, '$1')          // trailing commas
              .replace(/:\s*([^",\{\[\]\}\n]+?)(\s*[,\}])/g, (m, v, end) => {
                const trimmed = v.trim();
                if (trimmed === 'null' || trimmed === 'true' || trimmed === 'false' || /^-?\d/.test(trimmed)) {
                  return ': ' + trimmed + end;
                }
                return ': "' + trimmed.replace(/"/g, '\\"') + '"' + end;
              });
            const obj = JSON.parse(fixed);
            if (obj && obj.name) results.push(obj);
          } catch (_) { /* skip unparseable object */ }
        }
        start = -1;
      }
    }
  }

  if (results.length > 0) {
    console.log(`[AI] JSON repair: salvaged ${results.length} objects from truncated response`);
    return results;
  }

  throw new Error('Could not parse or repair AI response');
}

// ── Single-vendor fallback ────────────────────────────────────────────────────
// When a batch still fails after repair, categorise one vendor at a time.
async function categoriseSingle(vendor) {
  const appContext = vendor.appDetails && vendor.appDetails.length > 0
    ? vendor.appDetails.map(a => `- ${a.name} (${a.type}): ${a.description || 'no description'}`).join('\n')
    : 'No linked applications';

  const prompt = `Categorise this IT vendor/product for an enterprise.
Vendor: "${vendor.name}"
${vendor.providerDescription ? `Provider description: ${vendor.providerDescription}` : ''}

Linked Applications/ITComponents:
${appContext}

Analyze the linked applications' descriptions and context to determine what this vendor product is used for.

Return ONLY a JSON object (no markdown):
{"name":"${vendor.name}","category":"<one of: ${CATEGORIES.join(' | ')}>","sub_category":"<specific type>","reasoning":"<one sentence explaining why based on linked apps>"}`;

  try {
    const raw = await callAI(prompt, 256);
    const text = raw.replace(/```json|```/g, '').trim();
    // Extract just the JSON object
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found');
    return JSON.parse(match[0]);
  } catch (err) {
    console.warn(`[AI] single fallback failed for "${vendor.name}": ${err.message}`);
    return { name: vendor.name, category: 'Other', sub_category: '', reasoning: 'Categorisation failed' };
  }
}

// ── Main analysis ─────────────────────────────────────────────────────────────
async function analyseVendors(workspace, emit) {
  const _emit = typeof emit === "function" ? emit : () => {};
  const { getDB } = require('../db/db');
  const db = getDB();

  // Source: ONLY Application + ITComponent (they carry the provider relations)
  const rows = await db.all(
    `SELECT id, name, fs_type, vendors, annual_cost
     FROM fact_sheets
     WHERE workspace = ?
       AND fs_type IN ('Application', 'ITComponent')
       AND vendors != '[]'
       AND vendors IS NOT NULL`,
    [workspace]
  );

  if (!rows.length) {
    const providerCount = await db.get(
      `SELECT COUNT(*) as c FROM fact_sheets WHERE workspace = ? AND fs_type = 'Provider'`,
      [workspace]
    );
    return {
      analysed: 0,
      warning: `No vendor relationships found on Application or ITComponent fact sheets. ` +
               `Found ${providerCount?.c || 0} Provider records. ` +
               `Ensure Applications have relApplicationToProvider relations in LeanIX.`
    };
  }

  console.log(`[AI] Building vendor map from ${rows.length} Application/ITComponent records...`);

  // Build vendor → { apps, totalCost, appDetails } map with full context
  const vendorMap = {};
  for (const row of rows) {
    let vList;
    try { vList = JSON.parse(row.vendors || '[]'); } catch { continue; }
    for (const vName of vList) {
      const v = vName?.trim();
      if (!v) continue;
      if (!vendorMap[v]) vendorMap[v] = { apps: [], totalCost: 0, appDetails: [] };
      vendorMap[v].apps.push(row.name);
      vendorMap[v].totalCost += parseFloat(row.annual_cost) || 0;
      // Store detailed app info for AI context
      vendorMap[v].appDetails.push({
        name: row.name,
        type: row.fs_type,
        description: (row.description || '').slice(0, 200), // Limit to 200 chars
        tags: row.tags
      });
    }
  }

  // Also include Provider fact sheets themselves (their name = the vendor product)
  const provRows = await db.all(
    `SELECT name, annual_cost, description FROM fact_sheets WHERE workspace = ? AND fs_type = 'Provider'`,
    [workspace]
  );
  for (const row of provRows) {
    const v = (row.name || '').trim();
    if (!v || vendorMap[v]) continue; // skip if already found via relations
    vendorMap[v] = { apps: [], totalCost: parseFloat(row.annual_cost) || 0, appDetails: [], providerDescription: row.description };
  }

  const vendorList = Object.entries(vendorMap)
    .map(([name, d]) => ({
      name,
      appCount:     d.apps.length,
      totalCostEur: d.totalCost,
      sampleApps:   d.apps.slice(0, 4),
      appDetails:   d.appDetails.slice(0, 4), // Top 4 apps with full context
      providerDescription: d.providerDescription || ''
    }))
    .sort((a, b) => b.appCount - a.appCount || b.totalCostEur - a.totalCostEur);

  console.log(`[AI] ${vendorList.length} unique vendors to categorise`);

  const examplesText = Object.entries(CATEGORY_EXAMPLES)
    .map(([cat, ex]) => `  "${cat}": ${ex}`)
    .join('\n');

  // ── Adaptive batch size ───────────────────────────────────────────────────
  // Each vendor entry ≈ 80–120 tokens in the prompt.
  // With 2048 output tokens, safe batch = ~20 vendors (leaves headroom for reasoning).
  // We use 15 to be conservative with 1294 vendors.
  const BATCH_SIZE = 15;
  // Output tokens: 15 vendors × ~80 tokens/vendor = 1200, request 1600 for safety
  const OUTPUT_TOKENS = 1600;

  const now = new Date().toISOString();
  let totalAnalysed = 0;
  let batchNum = 0;

  for (let i = 0; i < vendorList.length; i += BATCH_SIZE) {
    const batch    = vendorList.slice(i, i + BATCH_SIZE);
    const batchEnd = Math.min(i + BATCH_SIZE, vendorList.length);
    batchNum++;
    _emit(`Processing vendors ${i + 1}–${Math.min(i + BATCH_SIZE, vendorList.length)} of ${vendorList.length}…`);

    const prompt = `You are a principal enterprise architect at a large enterprise company.
Categorise each IT vendor/product into EXACTLY ONE category from this list:
${CATEGORIES.map(c => `- ${c}`).join('\n')}

Examples per category:
${examplesText}

Rules - Core IT:
- "E-Commerce & CRM": storefronts, CRM, customer platforms
- "ERP & Finance": SAP S/4HANA, ECC, FI/MM/SD/PP/CO modules, general ERP
- "Supply Chain & Logistics": TM, WM, EWM, SCM, warehouse, logistics
- "Payment Provider": payment gateways, PSPs, acquiring
- "Cloud Hosting & Infrastructure": Azure, AWS, GCP, K8s platforms
- "DevOps & Developer Tools": IDEs, CI/CD, code quality
- "Collaboration & Productivity": ticketing, ITSM, M365, Atlassian
- "Security & Identity": EDR, SIEM, IAM, firewall
- "Search Engine": Elasticsearch, Solr, search indexing
- "Logging Solution": log aggregation, ELK, Splunk
- "Monitoring Solution": APM, observability, Dynatrace, New Relic
- "CMS Solution": content management, WordPress, AEM

Rules - Financial Services:
- "Banking & Core Banking": core banking systems, digital banking, T24, FLEXCUBE
- "Trading & Capital Markets": Bloomberg, trading platforms, market data, OMS/EMS
- "Risk & Compliance": GRC, AML, KYC, regulatory reporting, fraud detection
- "Insurance & Actuarial": policy admin, claims, underwriting, actuarial systems
- "Wealth & Asset Management": portfolio mgmt, Aladdin, asset management platforms
- "Treasury & Cash Management": treasury operations, cash flow, liquidity management

Rules - Healthcare & Life Sciences:
- "Healthcare IT & EMR": EHR/EMR, Epic, Cerner, patient management, PACS
- "Clinical & Research": CTMS, EDC, clinical trials, clinical data platforms
- "Pharma & Drug Development": LIMS, drug discovery, formulation, R&D systems
- "Medical Devices & IoMT": connected medical devices, remote patient monitoring
- "Genomics & Bioinformatics": sequencing, genomic analysis, biobanking
- "Telehealth & Digital Health": telemedicine, virtual care, RPM
- "Healthcare Analytics": population health, real-world evidence, healthcare BI

Rules - Energy & Utilities:
- "Energy Trading & ETRM": commodity trading, ETRM systems, energy risk
- "Smart Grid & Metering": AMI, smart meters, grid management, MDM
- "Renewable Energy Systems": solar, wind, battery management, renewables
- "Oil & Gas Operations": E&P, refining, pipeline SCADA, petrochemical
- "Utilities CIS & Billing": customer info systems, utility billing, CC&B

Rules - Manufacturing & Industrial:
- "Manufacturing Execution (MES)": MES, shop floor control, production
- "Quality Management (QMS)": quality assurance, CAPA, compliance systems
- "Product Lifecycle (PLM)": CAD, CAE, PDM, product engineering
- "Maintenance & Asset (EAM)": CMMS, asset management, maintenance

Rules - Other:
- "Document Management": DMS, ECM, document workflow
- "Marketing Automation": marketing platforms, campaign mgmt, CDP
- "Legal & Contract Management": CLM, legal tech, contract lifecycle
- "Sustainability & ESG": carbon accounting, ESG reporting, sustainability

IMPORTANT: Analyze linked Applications/ITComponents descriptions and tags to understand vendor purpose
Only use "Other" if truly no category fits

Vendors (${i + 1}–${batchEnd} of ${vendorList.length}):
${JSON.stringify(batch.map(b => ({
  name: b.name,
  sampleApps: b.sampleApps,
  linkedApps: b.appDetails.map(a => ({
    name: a.name,
    type: a.type,
    description: a.description,
    tags: a.tags
  })),
  providerInfo: b.providerDescription || undefined
})))}

IMPORTANT:
- Use the linkedApps data (descriptions, tags, types) to understand what this vendor/product actually does
- Return ONLY a valid complete JSON array. No markdown. No truncation.
- Every vendor in the input MUST have an entry in the output.
[{"name":"...","category":"...","sub_category":"...","reasoning":"..."},...]`;

    let parsed = null;

    // Attempt 1: normal call + JSON repair
    try {
      const raw = await callAI(prompt, OUTPUT_TOKENS);
      parsed    = repairJSON(raw);
      if (parsed.length < batch.length) {
        console.warn(`[AI] Batch ${i + 1}–${batchEnd}: got ${parsed.length}/${batch.length} items, filling missing with fallback`);
      }
    } catch (err) {
      console.warn(`[AI] Batch ${i + 1}–${batchEnd} failed (${err.message}), falling back to single-vendor mode`);
    }

    // Attempt 2: for any vendor missing from parsed results, call one-by-one
    const parsedNames = new Set((parsed || []).map(p => p.name));
    const missing     = batch.filter(b => !parsedNames.has(b.name));

    if (missing.length > 0) {
      console.log(`[AI] Single-vendor fallback for ${missing.length} items in batch ${batchNum}`);
      for (const vendor of missing) {
        const result = await categoriseSingle(vendor);
        if (!parsed) parsed = [];
        parsed.push(result);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Save results
    for (const item of (parsed || [])) {
      const d = vendorMap[item.name];
      if (!d) continue;
      const cat = CATEGORIES.includes(item.category) ? item.category : 'Other';
      await db.run(
        `INSERT OR REPLACE INTO vendor_analysis
         (workspace, vendor_name, category, sub_category, reasoning, app_count, total_cost, app_list, analysed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [workspace, item.name, cat, item.sub_category || '', item.reasoning || '',
         d.apps.length, d.totalCost, JSON.stringify(d.apps), now]
      );
      totalAnalysed++;
    }

    // Log progress every 5 batches
    if (batchNum % 5 === 0 || batchEnd === vendorList.length) {
      console.log(`[AI] Progress: ${batchEnd}/${vendorList.length} vendors processed (${totalAnalysed} saved)`);
    }
  }

  console.log(`[AI] Vendor analysis complete: ${totalAnalysed}/${vendorList.length} vendors categorised`);
  return { analysed: totalAnalysed, total: vendorList.length };
}

module.exports = { analyseVendors, getAIConfig, CATEGORIES, CATEGORY_EXAMPLES };
