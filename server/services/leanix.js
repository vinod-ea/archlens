/**
 * LeanIX API Service v3.2
 * metaModel does NOT exist on this LeanIX instance.
 * Discovery uses: __type enum introspection → factSheetTypes query → direct allFactSheets probing
 */
const fetch = require('node-fetch');
const PAGE_SIZE = 100;
const tokenCache = new Map();

function parseHost(raw) {
  let s = (raw || '').trim();
  if (!s) throw new Error('Workspace URL is empty');
  if (!s.startsWith('http')) s = 'https://' + s;
  try { return new URL(s).hostname; }
  catch (_) { return s.replace(/^https?:\/\//, '').split('/')[0].split('?')[0]; }
}

async function getToken(rawWorkspace, apiKey) {
  const host = parseHost(rawWorkspace);
  const k = `${host}::${apiKey}`;
  const c = tokenCache.get(k);
  if (c && Date.now() < c.exp - 15000) return { token: c.t, host };
  const res = await fetch(`https://${host}/services/mtm/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from('apitoken:' + apiKey).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  const text = await res.text();
  if (!res.ok) {
    const h = res.status === 401 ? ' — Invalid API key.' : res.status === 403 ? ' — Access denied.' : '';
    throw new Error('Auth failed (' + res.status + ')' + h);
  }
  const j = JSON.parse(text);
  tokenCache.set(k, { t: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 });
  return { token: j.access_token, host };
}

// gql that NEVER throws on application errors — returns { data, errors } instead
async function gqlSafe(host, token, query, variables) {
  try {
    const body = JSON.stringify(variables ? { query, variables } : { query });
    const res = await fetch('https://' + host + '/services/pathfinder/v1/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body
    });
    if (!res.ok) return { data: null, errors: [{ message: 'HTTP ' + res.status }] };
    const j = await res.json();
    return { data: j.data || null, errors: j.errors || [] };
  } catch (err) {
    return { data: null, errors: [{ message: err.message }] };
  }
}

// gql that DOES throw on any error (used where we want to fail-fast)
async function gql(host, token, query, variables) {
  const r = await gqlSafe(host, token, query, variables);
  if (r.errors && r.errors.length) throw new Error(r.errors[0].message);
  return r.data;
}

const KNOWN_TYPES = [
  'Application','Interface','ITComponent','BusinessCapability',
  'DataObject','TechnicalStack','Process','UserGroup','Provider',
  'Domain','Microservice','Service','Project','Epic',
  'ValueStream','Initiative','Persona','DataFlow'
];

async function discoverTypes(host, token) {
  let discovered = [];

  // Strategy 1: __type enum introspection (most reliable, no metaModel needed)
  const r1 = await gqlSafe(host, token, '{ __type(name: "FactSheetType") { enumValues { name } } }');
  if (r1.data && r1.data.__type && r1.data.__type.enumValues && r1.data.__type.enumValues.length) {
    discovered = r1.data.__type.enumValues.map(v => v.name).filter(Boolean);
    console.log('[discover] __type enum found:', discovered.join(', '));
  } else {
    console.log('[discover] __type enum empty or failed, trying factSheetTypes query...');
    // Strategy 2: factSheetTypes query (some versions)
    const r2 = await gqlSafe(host, token, '{ factSheetTypes { name } }');
    if (r2.data && r2.data.factSheetTypes && r2.data.factSheetTypes.length) {
      discovered = r2.data.factSheetTypes.map(v => v.name).filter(Boolean);
      console.log('[discover] factSheetTypes query found:', discovered.join(', '));
    } else {
      console.log('[discover] Both discovery strategies failed, falling back to known list only');
    }
  }

  // Merge discovered + KNOWN_TYPES (deduplicated)
  const seen = {};
  const toProbe = [];
  discovered.concat(KNOWN_TYPES).forEach(n => { if (!seen[n]) { seen[n] = true; toProbe.push(n); } });

  console.log('[discover] probing ' + toProbe.length + ' candidate types...');
  const results = [];

  for (const name of toProbe) {
    // Use gqlSafe so an unknown type just returns errors, not a thrown exception
    const r = await gqlSafe(host, token, '{ allFactSheets(factSheetType: ' + name + ', first: 1) { totalCount } }');
    if (r.data && r.data.allFactSheets !== undefined && !r.errors.length) {
      const count = r.data.allFactSheets.totalCount || 0;
      console.log('[discover]  ', name.padEnd(24), count);
      results.push({ name, count });
    }
    // silently skip types not in this workspace's schema
  }

  console.log('[discover] found ' + results.filter(r => r.count > 0).length + ' types with data, ' + results.length + ' total recognised');
  return results;
}

// Per-type extra fields — only included when querying that exact type.
// LeanIX validates ALL inline fragments in a query even if the current type can't use them,
// causing FieldUndefined errors for any unrecognised field on unrelated types.
// Solution: one query per type, with only that type's inline fragment.
const TYPE_EXTRAS = {
  Application: `
    lifecycle { asString phases { phase startDate } }
    businessCriticality technicalSuitability
    relApplicationToProvider { edges { node { factSheet { id name displayName } } } }`,

  Interface: `
    lifecycle { asString phases { phase startDate } }
    relInterfaceToApplication { edges { node { factSheet { id name } } } }`,

  ITComponent: `
    lifecycle { asString phases { phase startDate } }
    technicalSuitability
    relITComponentToProvider { edges { node { factSheet { id name displayName } } } }`,

  BusinessCapability: `
    level
    relToParent { edges { node { factSheet { id name } } } }`,

  DataObject:     `lifecycle { asString phases { phase startDate } }`,
  TechnicalStack: `lifecycle { asString phases { phase startDate } }`,

  Process: `
    level
    relToParent { edges { node { factSheet { id name } } } }`,

  UserGroup: `relToParent { edges { node { factSheet { id name } } } }`,

  Provider: `
    relProviderToApplication { edges { node { factSheet { id name displayName } } } }
    relProviderToITComponent  { edges { node { factSheet { id name displayName } } } }`,

  ProviderOffering: `lifecycle { asString phases { phase startDate } }`,

  Transformation: `lifecycle { asString phases { phase startDate } }`,

  OrgUnit: `
    level
    relToParent { edges { node { factSheet { id name } } } }`,

  Objective: `lifecycle { asString phases { phase startDate } }`,

  RPABot: `lifecycle { asString phases { phase startDate } }`,

  ApplicationFeature: `
    lifecycle { asString phases { phase startDate } }
    relApplicationFeatureToApplication { edges { node { factSheet { id name } } } }`,
};

// Universal base fields — present on every fact sheet type
// ── Dynamic field discovery ──────────────────────────────────────────────────
// Cached per host: which base fields and which type-extras actually exist.
const schemaCache = new Map(); // host -> { base: string, typeExtras: Map<type,string> }

// Candidate base fields — we probe each and keep only the ones that exist
const BASE_CANDIDATES = [
  'id', 'type', 'name', 'displayName', 'description',
  'completionRatio', 'fullCompletionRatio',
  'updatedAt', 'createdAt', 'lastChangedAt',
];
const BASE_RELATIONS = [
  { field: 'tags',          query: 'tags { name }' },
  { field: 'subscriptions', query: 'subscriptions(first:10) { edges { node { type user { id email displayName } } } }' },
];

async function discoverBaseFields(host, token, sampleType) {
  console.log(`[schema] discovering base fields using ${sampleType}...`);

  // Try all scalars in one batch first (fastest path — 1 request)
  const allScalarsQ = BASE_CANDIDATES.join(' ');
  const batchR = await gqlSafe(host, token,
    `{ allFactSheets(factSheetType: ${sampleType}, first: 1) { edges { node { ${allScalarsQ} } } } }`
  );
  let goodScalars;
  if (!batchR.errors || batchR.errors.length === 0) {
    goodScalars = [...BASE_CANDIDATES]; // all fine
  } else {
    // Batch failed — probe one by one to find which fields are bad
    goodScalars = [];
    for (const field of BASE_CANDIDATES) {
      const r = await gqlSafe(host, token,
        `{ allFactSheets(factSheetType: ${sampleType}, first: 1) { edges { node { ${field} } } } }`
      );
      if (!r.errors || r.errors.length === 0) goodScalars.push(field);
    }
  }
  console.log(`[schema] base scalars: ${goodScalars.join(', ')}`);

  const goodRelations = [];
  for (const rel of BASE_RELATIONS) {
    const r = await gqlSafe(host, token,
      `{ allFactSheets(factSheetType: ${sampleType}, first: 1) { edges { node { ${rel.query} } } } }`
    );
    if (!r.errors || r.errors.length === 0) goodRelations.push(rel.query);
  }
  console.log(`[schema] base relations: ${goodRelations.map(q=>q.split(' ')[0]).join(', ')}`);

  const result = [...goodScalars, ...goodRelations].join('\n        ');
  console.log(`[schema] final base fields: ${result.replace(/\s+/g,' ').slice(0,120)}`);
  return result;
}

async function discoverTypeExtras(host, token, fsType, extraFields, baseFields) {
  // Try all type extras in one query first
  const probe = await gqlSafe(host, token,
    `{ allFactSheets(factSheetType: ${fsType}, first: 1) { edges { node {
       ${baseFields}
       ... on ${fsType} { ${extraFields} }
    } } } }`
  );
  if (!probe.errors || probe.errors.length === 0) return extraFields;

  // Probe each extra field individually and keep the working ones
  const lines = extraFields.split('\n').map(l => l.trim()).filter(Boolean);
  const good  = [];
  for (const line of lines) {
    const r = await gqlSafe(host, token,
      `{ allFactSheets(factSheetType: ${fsType}, first: 1) { edges { node {
         ... on ${fsType} { ${line} }
      } } } }`
    );
    if (!r.errors || r.errors.length === 0) good.push(line);
  }
  if (good.length) {
    console.log(`[schema] ${fsType} extras accepted: ${good.map(l=>l.split(/[{ ]/)[0]).join(', ')}`);
  } else {
    console.log(`[schema] ${fsType} no type extras accepted, using base only`);
  }
  return good.join('\n    ');
}

async function getSchemaForHost(host, token, sampleType) {
  if (schemaCache.has(host)) return schemaCache.get(host);

  const base   = await discoverBaseFields(host, token, sampleType);
  const schema = { base, typeExtras: new Map() };
  schemaCache.set(host, schema);
  return schema;
}

async function buildSafeQuery(host, token, fsType) {
  const schema = await getSchemaForHost(host, token, fsType);

  if (!schema.typeExtras.has(fsType)) {
    const rawExtra = TYPE_EXTRAS[fsType] || '';
    let resolvedExtra = '';
    if (rawExtra.trim()) {
      resolvedExtra = await discoverTypeExtras(host, token, fsType, rawExtra, schema.base);
    }
    schema.typeExtras.set(fsType, resolvedExtra);
  }

  const extra     = schema.typeExtras.get(fsType) || '';
  const typeBlock = extra.trim() ? `... on ${fsType} { ${extra} }` : '';

  return `query Page($cursor: String) {
    allFactSheets(factSheetType: ${fsType}, first: ${PAGE_SIZE}, after: $cursor) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { node {
        ${schema.base}
        ${typeBlock}
      }}
    }
  }`;
}

function extractOwner(node) {
  const subs = (node.subscriptions && node.subscriptions.edges) ? node.subscriptions.edges : [];
  for (const role of ['RESPONSIBLE','ACCOUNTABLE']) {
    const m = subs.find(e => e.node && e.node.type === role && e.node.user);
    if (m) return m.node.user;
  }
  return subs.find(e => e.node && e.node.user)?.node.user || null;
}

function extractLifecycle(node) {
  const lc = node.lifecycle;
  if (!lc) return null;
  const phases = (lc.phases || []).filter(p => p.startDate);
  if (phases.length) {
    const latest = [...phases].sort((a,b) => new Date(b.startDate) - new Date(a.startDate))[0];
    return latest.phase || lc.asString;
  }
  return lc.asString || null;
}

function extractVendors(node) {
  const rels = [node.relApplicationToProvider, node.relITComponentToProvider,
                node.relProviderToApplication, node.relProviderToITComponent].filter(Boolean);
  const seen = {};
  return rels.flatMap(r => (r.edges||[]).map(e => e.node?.factSheet?.displayName || e.node?.factSheet?.name))
             .filter(n => n && !seen[n] && (seen[n]=true));
}

function extractCost(node) {
  for (const [k, v] of Object.entries(node)) {
    if (/cost|budget|spend|price|fee|annual/i.test(k) && typeof v === 'number' && v > 0) return v;
  }
  return 0;
}

function getCompletion(node) {
  // completionRatio may not exist in all LeanIX instances — try all variants
  return node.completionRatio ?? node.fullCompletionRatio ?? null;
}

function getUpdatedAt(node) {
  return node.updatedAt || node.lastChangedAt || node.createdAt || null;
}

function qualityScore(node, owner, lc) {
  let s = 0;
  if (owner) s += 25;
  if (node.description && node.description.trim().length > 10) s += 15;
  if (lc && !/end.?of.?life/i.test(lc)) s += 15;
  const comp = getCompletion(node);
  if (comp !== null) s += Math.round(comp * 25);
  const ua   = getUpdatedAt(node);
  const days = ua ? Math.floor((Date.now() - new Date(ua)) / 86400000) : 9999;
  if (days < 90) s += 20; else if (days < 180) s += 10; else if (days < 365) s += 5;
  return Math.min(100, s);
}

function normalise(node, fsType) {
  const owner = extractOwner(node);
  const lc    = extractLifecycle(node);
  const vends = extractVendors(node);
  const cost  = extractCost(node);
  const score = qualityScore(node, owner?.displayName, lc);
  const ua    = getUpdatedAt(node);
  const comp  = getCompletion(node);
  const days  = ua ? Math.floor((Date.now() - new Date(ua)) / 86400000) : 9999;
  const issues = [];
  if (!owner) issues.push('no-owner');
  if (!node.description || node.description.trim().length < 5) issues.push('no-description');
  if (!lc) issues.push('no-lifecycle');
  else if (/end.?of.?life/i.test(lc)) issues.push('eol');
  else if (/retir|phaseout/i.test(lc)) issues.push('retiring');
  if (days > 180) issues.push('stale-' + days + 'd');
  if (comp !== null && comp < 0.5) issues.push('incomplete');
  return {
    id: node.id, fs_type: fsType,
    name: node.displayName || node.name || '(unnamed)',
    description: node.description || '',
    lifecycle: lc || 'Not set',
    owner: owner?.displayName || null,
    owner_email: owner?.email || null,
    completion: comp || 0,
    updated_at: ua || null,
    quality_score: score,
    locker: score < 45 ? 'bronze' : score < 80 ? 'silver' : 'gold',
    issues: JSON.stringify(issues),
    tags: JSON.stringify((node.tags||[]).map(t => t.name)),
    vendors: JSON.stringify(vends),
    criticality: node.businessCriticality || null,
    tech_fit: node.technicalSuitability || null,
    fs_level: node.level || null,
    annual_cost: cost
  };
}

async function fetchAllPages(host, token, fsType, onProgress) {
  // Use buildSafeQuery: probes type-specific fields first, falls back to base-only
  const query = await buildSafeQuery(host, token, fsType);
  let cursor = null, all = [], total = null;
  do {
    const data = await gql(host, token, query, cursor ? { cursor } : {});
    const r = data && data.allFactSheets;
    if (!r) break;
    if (total === null) total = r.totalCount;
    all = all.concat((r.edges||[]).map(e => e.node));
    if (onProgress) onProgress({ fetched: all.length, total });
    cursor = r.pageInfo?.hasNextPage ? r.pageInfo.endCursor : null;
  } while (cursor);
  return { nodes: all, total: total || 0 };
}

async function syncWorkspace(rawWorkspace, apiKey, options={}, emit=()=>{}) {
  const e = (event, data) => emit({ event, ...data });

  e('step', { step:'auth', status:'active', msg:'Authenticating with LeanIX...' });
  const { token, host } = await getToken(rawWorkspace, apiKey);
  e('step', { step:'auth', status:'done', msg:'Authenticated → ' + host });

  e('step', { step:'discover', status:'active', msg:'Discovering fact sheet types...' });
  let allTypes = await discoverTypes(host, token);

  if (options.fsTypes && options.fsTypes !== 'all') {
    const req = options.fsTypes.split(',').map(s => s.trim().toLowerCase());
    allTypes = allTypes.filter(t => req.some(r => t.name.toLowerCase().includes(r)));
  }

  const withData = allTypes.filter(t => t.count > 0);
  const grandTotal = withData.reduce((s,t) => s + t.count, 0);
  e('step', { step:'discover', status:'done',
    msg: withData.length + ' types · ' + grandTotal.toLocaleString() + ' records', types: allTypes });

  const results = {};
  for (const ft of withData) {
    e('type_start', { fsType: ft.name, total: ft.count });
    try {
      const { nodes } = await fetchAllPages(host, token, ft.name,
        prog => e('type_progress', { fsType: ft.name, fetched: prog.fetched, total: prog.total }));
      const items = nodes.map(n => normalise(n, ft.name));
      results[ft.name] = items;
      e('type_done', { fsType: ft.name, count: items.length,
        bronze: items.filter(i=>i.locker==='bronze').length,
        silver: items.filter(i=>i.locker==='silver').length,
        gold:   items.filter(i=>i.locker==='gold').length });
    } catch (err) {
      e('type_error', { fsType: ft.name, error: err.message });
      results[ft.name] = [];
    }
  }

  const allItems = Object.values(results).flat();
  e('complete', { total: allItems.length,
    bronze: allItems.filter(i=>i.locker==='bronze').length,
    silver: allItems.filter(i=>i.locker==='silver').length,
    gold:   allItems.filter(i=>i.locker==='gold').length, types: allTypes });
  return { results, allTypes, host };
}

module.exports = { syncWorkspace, getToken, discoverTypes, parseHost, KNOWN_TYPES };
