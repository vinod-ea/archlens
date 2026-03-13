import React, { useState, useEffect, useCallback } from 'react';
import { SkeletonKPIRow, SkeletonCardGrid } from '../components/Skeleton';
import { useApp } from '../App';
import { useSSERunner, SSEProgressPanel, RunButton } from '../hooks/useSSERunner';

// ── Vendor category taxonomy ──────────────────────────────────────────────────
const CATEGORIES = {
  // Core IT Infrastructure
  'Payment Provider':               { color:'#1565C0', icon:'💳', desc:'PSPs, gateways, acquiring banks' },
  'Cloud Hosting & Infrastructure': { color:'#0F4C81', icon:'☁',  desc:'IaaS, PaaS, cloud platforms, CDN' },
  'E-Commerce & CRM':               { color:'#AD1457', icon:'🛒', desc:'Storefronts, CRM, customer engagement' },
  'ERP & Finance':                  { color:'#C87400', icon:'📊', desc:'ERP, finance, core business systems' },
  'Supply Chain & Logistics':       { color:'#2E7D32', icon:'🚛', desc:'Warehouse, transport, logistics platforms' },
  'Collaboration & Productivity':   { color:'#4527A0', icon:'🤝', desc:'Atlassian, ITSM, M365, ServiceNow' },
  'Security & Identity':            { color:'#BB0000', icon:'🔒', desc:'EDR, SIEM, IAM, vulnerability mgmt' },
  'DevOps & Developer Tools':       { color:'#37474F', icon:'⚙',  desc:'CI/CD, IDEs, APM, code quality' },
  'Analytics & BI':                 { color:'#00695C', icon:'📈', desc:'BI platforms, reporting, data analytics' },
  'AI & Machine Learning':          { color:'#6A1B9A', icon:'🤖', desc:'ML platforms, AI services' },
  'API & Integration Middleware':   { color:'#558B2F', icon:'🔗', desc:'MuleSoft, SAP Integration, Kafka' },
  'Database & Storage':             { color:'#4527A0', icon:'🗄',  desc:'Oracle, SQL Server, SAP HANA, Redis' },
  'HR & Workforce':                 { color:'#BF360C', icon:'👥', desc:'HR platforms, workforce management' },
  'IoT & OT':                       { color:'#006064', icon:'📡', desc:'Siemens, Bosch IoT, OT systems' },
  'Network & Connectivity':         { color:'#1B5E20', icon:'🌐', desc:'Cisco, Zscaler, F5, SDN' },
  'Search Engine':                  { color:'#7B1FA2', icon:'🔍', desc:'Elasticsearch, Solr, search indexing' },
  'Logging Solution':               { color:'#F57C00', icon:'📝', desc:'Log aggregation, ELK, Splunk, Datadog' },
  'Monitoring Solution':            { color:'#0277BD', icon:'📊', desc:'APM, observability, Dynatrace, New Relic' },
  'CMS Solution':                   { color:'#5D4037', icon:'📄', desc:'Content management, WordPress, AEM' },

  // Financial Services & FinTech
  'Banking & Core Banking':         { color:'#1A237E', icon:'🏦', desc:'Core banking, digital banking platforms' },
  'Trading & Capital Markets':      { color:'#004D40', icon:'📉', desc:'Trading platforms, market data, exchanges' },
  'Risk & Compliance':              { color:'#E65100', icon:'⚖️',  desc:'GRC, AML, KYC, regulatory compliance' },
  'Insurance & Actuarial':          { color:'#01579B', icon:'🛡️',  desc:'Policy admin, claims, underwriting, actuarial' },
  'Wealth & Asset Management':      { color:'#33691E', icon:'💰', desc:'Portfolio mgmt, robo-advisors, private banking' },
  'Treasury & Cash Management':     { color:'#4A148C', icon:'💵', desc:'Cash flow, liquidity, treasury operations' },

  // Healthcare & Life Sciences
  'Healthcare IT & EMR':            { color:'#B71C1C', icon:'🏥', desc:'EHR/EMR, PACS, patient management' },
  'Clinical & Research':            { color:'#880E4F', icon:'🔬', desc:'CTMS, EDC, clinical data platforms' },
  'Pharma & Drug Development':      { color:'#4A0072', icon:'💊', desc:'LIMS, drug discovery, formulation systems' },
  'Medical Devices & IoMT':         { color:'#1B5E20', icon:'🩺', desc:'Connected devices, remote monitoring, diagnostics' },
  'Genomics & Bioinformatics':      { color:'#311B92', icon:'🧬', desc:'Sequencing, genomic analysis, biobanking' },
  'Telehealth & Digital Health':    { color:'#006064', icon:'📱', desc:'Telemedicine, virtual care, RPM platforms' },
  'Healthcare Analytics':           { color:'#BF360C', icon:'📊', desc:'Population health, RWE, healthcare BI' },

  // Energy & Utilities
  'Energy Trading & ETRM':          { color:'#F57F17', icon:'⚡', desc:'Commodity trading, risk mgmt, ETRM systems' },
  'Smart Grid & Metering':          { color:'#827717', icon:'🔌', desc:'AMI, smart meters, grid management' },
  'Renewable Energy Systems':       { color:'#33691E', icon:'♻️',  desc:'Solar, wind, battery mgmt platforms' },
  'Oil & Gas Operations':           { color:'#3E2723', icon:'🛢️',  desc:'E&P, refining, pipeline SCADA' },
  'Utilities CIS & Billing':        { color:'#263238', icon:'💡', desc:'Customer info systems, utility billing' },

  // Manufacturing & Industrial
  'Manufacturing Execution (MES)':  { color:'#37474F', icon:'🏭', desc:'MES, shop floor control, production tracking' },
  'Quality Management (QMS)':       { color:'#424242', icon:'✅', desc:'Quality assurance, compliance, CAPA systems' },
  'Product Lifecycle (PLM)':        { color:'#455A64', icon:'🔧', desc:'CAD, CAE, PDM, product engineering' },
  'Maintenance & Asset (EAM)':      { color:'#4E342E', icon:'🔩', desc:'CMMS, asset management, predictive maintenance' },

  // Industry-Agnostic
  'Document Management':            { color:'#5D4037', icon:'📑', desc:'DMS, ECM, contract management' },
  'Marketing Automation':           { color:'#C2185B', icon:'📣', desc:'Marketing platforms, campaign mgmt, CDP' },
  'Legal & Contract Management':    { color:'#6A1B9A', icon:'⚖️',  desc:'CLM, legal tech, e-discovery' },
  'Sustainability & ESG':           { color:'#2E7D32', icon:'🌱', desc:'Carbon accounting, ESG reporting, sustainability' },
  'Other':                          { color:'#546E7A', icon:'📦', desc:'Uncategorised vendors' },
};

// Known vendor mappings as reference hints (displayed in UI)
const VENDOR_EXAMPLES = {
  // Core IT Infrastructure
  'Payment Provider':               'Adyen, Computop, Stripe, Klarna, Worldline',
  'Cloud Hosting & Infrastructure': 'Azure, AWS, Google Cloud, Cloudflare',
  'E-Commerce & CRM':               'Spryker, SAP Commerce, Hybris, Adobe Commerce, Salesforce',
  'ERP & Finance':                  'SAP S/4HANA, SAP ECC, SAP BW',
  'Supply Chain & Logistics':       'SAP TM, SAP EWM, SAP WM, Manhattan',
  'Collaboration & Productivity':   'Atlassian, Jira, Confluence, ServiceNow, M365',
  'Security & Identity':            'CrowdStrike, Fortinet, Okta, Palo Alto',
  'DevOps & Developer Tools':       'Jenkins, GitHub, IntelliJ, SonarQube, Dynatrace',
  'Search Engine':                  'Elasticsearch, Solr, Algolia, Azure Cognitive Search',
  'Logging Solution':               'Splunk, ELK Stack, Datadog, Graylog, Sumo Logic',
  'Monitoring Solution':            'Dynatrace, New Relic, Datadog, Prometheus, Grafana',
  'CMS Solution':                   'WordPress, Contentful, Adobe Experience Manager, Sitecore',

  // Financial Services & FinTech
  'Banking & Core Banking':         'Temenos, Finastra, FIS, Mambu, Thought Machine',
  'Trading & Capital Markets':      'Bloomberg, Refinitiv, FactSet, ICE, CME, Tradeweb',
  'Risk & Compliance':              'NICE Actimize, SAS, Moody\'s, Fenergo, ComplyAdvantage',
  'Insurance & Actuarial':          'Guidewire, Duck Creek, Sapiens, Majesco, Prophet',
  'Wealth & Asset Management':      'BlackRock Aladdin, SimCorp, SS&C, Charles River, Broadridge',
  'Treasury & Cash Management':     'Kyriba, GTreasury, Reval, Calypso, Salmon',

  // Healthcare & Life Sciences
  'Healthcare IT & EMR':            'Epic, Cerner, Meditech, Allscripts, athenahealth',
  'Clinical & Research':            'Medidata, Veeva Vault, Oracle Clinical, Parexel, IQVIA',
  'Pharma & Drug Development':      'LabWare, Thermo Fisher, PerkinElmer, BIOVIA, Benchling',
  'Medical Devices & IoMT':         'Philips HealthSuite, GE Healthcare, Medtronic, Boston Scientific',
  'Genomics & Bioinformatics':      'Illumina, DNAnexus, Seven Bridges, BaseSpace, Benchling',
  'Telehealth & Digital Health':    'Teladoc, Amwell, Doxy.me, MDLive, Doctor on Demand',
  'Healthcare Analytics':           'Optum, Health Catalyst, Arcadia, Verily, Flatiron Health',

  // Energy & Utilities
  'Energy Trading & ETRM':          'Allegro, Openlink Endur, Triple Point, Brady, CTRM',
  'Smart Grid & Metering':          'Itron, Landis+Gyr, Schneider Electric, Siemens, Oracle Utilities',
  'Renewable Energy Systems':       'GE Digital, SCADA, OSIsoft PI, AutoGrid, Sense',
  'Oil & Gas Operations':           'Aspen Tech, Honeywell, Emerson, Rockwell, Schlumberger',
  'Utilities CIS & Billing':        'Oracle Utilities, SAP Utilities, Hansen, Genability',

  // Manufacturing & Industrial
  'Manufacturing Execution (MES)':  'Siemens Opcenter, Dassault DELMIA, Rockwell FactoryTalk, SAP MES',
  'Quality Management (QMS)':       'Sparta Systems, MasterControl, ETQ, Veeva QualityOne',
  'Product Lifecycle (PLM)':        'Siemens Teamcenter, PTC Windchill, Dassault ENOVIA, Arena',
  'Maintenance & Asset (EAM)':      'IBM Maximo, SAP EAM, Infor EAM, IFS, eMaint',

  // Industry-Agnostic
  'Document Management':            'OpenText, M-Files, Laserfiche, DocuWare, Box',
  'Marketing Automation':           'HubSpot, Marketo, Pardot, Eloqua, Adobe Campaign',
  'Legal & Contract Management':    'Ironclad, ContractWorks, Concord, DocuSign CLM, Icertis',
  'Sustainability & ESG':           'Workiva, Sphera, Enablon, Sustainalytics, Watershed',
};

const fmtEur = v => v > 0 ? '€' + Number(v).toLocaleString('de-DE', { maximumFractionDigits:0 }) : '—';

function CategoryCard({ cat, vendors, onFilter, isActive }) {
  const cfg    = CATEGORIES[cat] || CATEGORIES['Other'];
  const cost   = vendors.reduce((s, v) => s + v.total_cost, 0);
  const apps   = vendors.reduce((s, v) => s + v.app_count, 0);
  const topV   = [...vendors].sort((a, b) => b.app_count - a.app_count).slice(0, 4);

  return (
    <div onClick={onFilter} style={{
      background: 'var(--fi-page-bg)', border: '1px solid',
      borderColor: isActive ? cfg.color : 'var(--fi-border)',
      borderRadius: 'var(--r2)', padding: 16, cursor: 'pointer',
      transition: 'all .15s', boxShadow: isActive ? `0 0 0 2px ${cfg.color}30` : 'var(--shadow-1)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:'var(--r)', background: cfg.color + '18',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
          {cfg.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--fi-text)', lineHeight:1.3, marginBottom:2 }}>{cat}</div>
          <div style={{ fontSize:11, color:'var(--fi-text-3)', lineHeight:1.4 }}>{cfg.desc}</div>
        </div>
        <div style={{ fontFamily:'var(--fm)', fontWeight:700, fontSize:18, color: cfg.color, flexShrink:0 }}>
          {vendors.length}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:10, background: cfg.color + '15', color: cfg.color, fontWeight:600 }}>
          {apps} apps
        </span>
        {cost > 0 && (
          <span style={{ fontSize:11, padding:'2px 7px', borderRadius:10, background:'var(--gold-bg)', color:'var(--gold)', fontWeight:600 }}>
            {fmtEur(cost)}
          </span>
        )}
      </div>

      {/* Top vendors */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
        {topV.map(v => (
          <span key={v.vendor_name} style={{ fontSize:11, padding:'2px 8px', borderRadius:3,
            background:'var(--fi-bg)', color:'var(--fi-text-2)', border:'1px solid var(--fi-border)', fontWeight:500 }}>
            {v.vendor_name}
          </span>
        ))}
        {vendors.length > 4 && (
          <span style={{ fontSize:11, padding:'2px 8px', color:'var(--fi-text-3)' }}>
            +{vendors.length - 4} more
          </span>
        )}
      </div>
    </div>
  );
}

function VendorTable({ vendors }) {
  return (
    <div className="fi-card">
      <table className="fi-table">
        <thead><tr>
          <th style={{ width:'22%' }}>Vendor / Product</th>
          <th style={{ width:'16%' }}>Category</th>
          <th style={{ width:'16%' }}>Sub-Category</th>
          <th style={{ width:'7%', textAlign:'right' }}>Apps</th>
          <th style={{ width:'11%', textAlign:'right' }}>Annual Cost</th>
          <th>Linked Applications</th>
          <th style={{ width:'18%' }}>Reasoning</th>
        </tr></thead>
        <tbody>
          {vendors.sort((a, b) => b.app_count - a.app_count || b.total_cost - a.total_cost).map(v => {
            const cfg = CATEGORIES[v.category] || CATEGORIES['Other'];
            let appList = [];
            try { appList = JSON.parse(v.app_list || '[]'); } catch {}
            return (
              <tr key={v.vendor_name}>
                <td>
                  <div style={{ fontWeight:600, fontSize:13 }}>{v.vendor_name}</div>
                  {v.sub_category && <div style={{ fontSize:11, color:'var(--fi-text-3)', marginTop:2 }}>{v.sub_category}</div>}
                </td>
                <td>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12 }}>
                    <span style={{ fontSize:14 }}>{cfg.icon}</span>
                    <span style={{ color: cfg.color, fontWeight:600 }}>{v.category}</span>
                  </span>
                </td>
                <td style={{ fontSize:12, color:'var(--fi-text-2)' }}>{v.sub_category || '—'}</td>
                <td style={{ textAlign:'right' }}>
                  <span style={{ fontFamily:'var(--fm)', fontWeight:700, color: cfg.color, fontSize:14 }}>{v.app_count}</span>
                </td>
                <td style={{ textAlign:'right', fontFamily:'var(--fm)', fontSize:12, color:'var(--gold)', fontWeight:600 }}>
                  {fmtEur(v.total_cost)}
                </td>
                <td>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:3, maxHeight:48, overflow:'hidden' }}>
                    {appList.slice(0, 5).map((a, i) => (
                      <span key={i} style={{ fontSize:10, padding:'1px 6px', borderRadius:3,
                        background:'var(--fi-bg)', color:'var(--fi-text-2)', border:'1px solid var(--fi-border)', whiteSpace:'nowrap' }}>
                        {a}
                      </span>
                    ))}
                    {appList.length > 5 && <span style={{ fontSize:10, color:'var(--fi-text-3)', padding:'1px 4px' }}>+{appList.length - 5}</span>}
                  </div>
                </td>
                <td style={{ fontSize:11, color:'var(--fi-text-3)', lineHeight:1.5 }}>
                  <div className="ellipsis" style={{ maxWidth:200 }}>{v.reasoning || '—'}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function VendorsPage() {
  const { workspace, toast } = useApp();
  const [vendors,   setVendors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [search,    setSearch]    = useState('');
  const [view,      setView]      = useState('categories');
  const [showPanel, setShowPanel] = useState(false);

  const load = useCallback(() => {
    if (!workspace) return;
    setLoading(true);
    fetch('/api/vendors?workspace=' + encodeURIComponent(workspace))
      .then(x => x.json()).then(r => { setVendors(Array.isArray(r) ? r : []); }).catch(() => {})
      .finally(() => setLoading(false));
  }, [workspace]);

  useEffect(() => { load(); }, [load]);

  const onComplete = useCallback((err, evt) => {
    if (err) { toast(err.includes('AI_KEY_MISSING') ? 'No AI API key. Add one in Settings > AI Provider' : err.includes('AI_KEY_INVALID') ? 'AI API key invalid or expired. Check Settings > AI Provider' : err.includes('AI_QUOTA_EXCEEDED') ? 'AI quota exceeded. Check your billing or switch provider' : err, 'err'); return; }
    if (evt?.event === 'complete') { toast('Vendor analysis complete', 'ok'); }
    // Seamless refresh — data reloads in background, page updates without full skeleton
    load();
  }, [load, toast]);

  const { running, logs, progress, run } = useSSERunner(onComplete);

  function runAnalysis() {
    setShowPanel(true);
    run(`/api/vendors/analyse/stream?workspace=${encodeURIComponent(workspace)}`);
  }

  async function clearAll() {
    if (!window.confirm('Clear all vendor analysis results?')) return;
    await fetch('/api/vendors?workspace=' + encodeURIComponent(workspace), { method: 'DELETE' });
    setVendors([]); toast('Vendor data cleared');
  }

  // Filtered list
  const filtered = vendors.filter(v => {
    const mc = catFilter === 'all' || v.category === catFilter;
    const ms = !search || (v.vendor_name || '').toLowerCase().includes(search.toLowerCase())
                       || (v.category    || '').toLowerCase().includes(search.toLowerCase())
                       || (v.sub_category|| '').toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  // Group by category
  const grouped = {};
  for (const cat of Object.keys(CATEGORIES)) grouped[cat] = [];
  for (const v of vendors) {
    const c = v.category || 'Other';
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(v);
  }
  const catsSorted = Object.keys(grouped)
    .filter(c => grouped[c].length > 0)
    .sort((a, b) => grouped[b].length - grouped[a].length);

  const grandCost = vendors.reduce((s, v) => s + v.total_cost, 0);
  const grandApps = vendors.reduce((s, v) => s + v.app_count, 0);

  if (loading) return (
    <div className="page-wrap fi-fade-in">
      <div style={{ marginBottom:20 }}>
        <div style={{ height:22, width:200, borderRadius:4, background:'var(--fi-border)', animation:'fi-pulse 1.4s ease-in-out infinite', marginBottom:8 }} />
        <div style={{ height:12, width:340, borderRadius:4, background:'var(--fi-border)', animation:'fi-pulse 1.4s ease-in-out infinite' }} />
      </div>
      <SkeletonKPIRow count={4} />
      <SkeletonCardGrid count={8} />
    </div>
  );

  return (
    <div className="page-wrap fi-fade-in">
      
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Vendor Intelligence</h1>
          <p className="page-sub">
            {vendors.length > 0
              ? `${vendors.length} vendors · ${grandApps.toLocaleString()} app relationships · ${fmtEur(grandCost)} total annual cost`
              : 'Analyse vendor relationships from Application & ITComponent fact sheets'}
          </p>
        </div>
        <div className="page-header-right">
          {vendors.length > 0 && <button className="fi-btn danger sm" onClick={clearAll} disabled={running}>Clear Results</button>}
          <RunButton
            running={running}
            onClick={runAnalysis}
            idleLabel={vendors.length > 0 ? '↻ Re-run AI Analysis' : '⚡ Run AI Vendor Analysis'}
            runningLabel="Analysing vendors…"
          />
        </div>
      </div>

      {/* SSE Progress panel */}
      {showPanel && (
        <SSEProgressPanel
          running={running}
          logs={logs}
          progress={progress}
          label="AI Vendor Analysis running…"
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* Empty state */}
      {vendors.length === 0 && !running && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:24 }}>
          {/* How it works */}
          <div className="fi-card">
            <div className="fi-card-header"><span className="fi-card-title">How It Works</span></div>
            <div className="fi-card-body" style={{ fontSize:13, color:'var(--fi-text-2)', lineHeight:1.8 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  ['1', 'Reads', 'relApplicationToProvider + relITComponentToProvider relations'],
                  ['2', 'Extracts', 'Vendor names from Application and ITComponent fact sheets only'],
                  ['3', 'Sends',   'Vendor list to AI with enterprise category guidance'],
                  ['4', 'Saves',   'Category, sub-category, reasoning and app count per vendor'],
                ].map(([n, action, detail]) => (
                  <div key={n} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--fi-blue)', color:'#fff',
                      fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{n}</div>
                    <div><strong>{action}:</strong> {detail}</div>
                  </div>
                ))}
              </div>
              <div className="fi-msg info" style={{ marginTop:16, marginBottom:0 }}>
                <span>ℹ</span>
                <span>Requires AI API key in <strong>Settings → AI Provider</strong></span>
              </div>
            </div>
          </div>

          {/* Category taxonomy */}
          <div className="fi-card">
            <div className="fi-card-header"><span className="fi-card-title">Target Categories</span></div>
            <div className="fi-card-body" style={{ padding:'8px 0' }}>
              {Object.entries(CATEGORIES).filter(([c]) => c !== 'Other').map(([cat, cfg]) => (
                <div key={cat} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'7px 16px',
                  borderBottom:'1px solid var(--fi-border)' }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{cfg.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:12, color: cfg.color }}>{cat}</div>
                    <div style={{ fontSize:11, color:'var(--fi-text-3)' }}>{VENDOR_EXAMPLES[cat] || cfg.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {vendors.length > 0 && (
        <>
          {/* KPI summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
            <div className="fi-tile">
              <div className="fi-kpi">
                <div className="fi-kpi-label">UNIQUE VENDORS</div>
                <div className="fi-kpi-value" style={{ color:'var(--fi-blue)' }}>{vendors.length}</div>
                <div className="fi-kpi-sub">from Application & ITComponent relations</div>
              </div>
            </div>
            <div className="fi-tile">
              <div className="fi-kpi">
                <div className="fi-kpi-label">FACT SHEET LINKS</div>
                <div className="fi-kpi-value">{grandApps.toLocaleString()}</div>
                <div className="fi-kpi-sub">Application & ITComponent relations</div>
              </div>
            </div>
            {grandCost > 0 && (
              <div className="fi-tile">
                <div className="fi-kpi">
                  <div className="fi-kpi-label">ANNUAL IT COST</div>
                  <div className="fi-kpi-value" style={{ color:'var(--gold)' }}>{fmtEur(grandCost)}</div>
                  <div className="fi-kpi-sub">from cost fields</div>
                </div>
              </div>
            )}
            <div className="fi-tile">
              <div className="fi-kpi">
                <div className="fi-kpi-label">TOP CATEGORY</div>
                <div style={{ fontSize:15, fontWeight:700, color:(CATEGORIES[catsSorted[0]]||{}).color||'var(--fi-text)', marginTop:4 }}>
                  {catsSorted[0] || '—'}
                </div>
                <div className="fi-kpi-sub">{(grouped[catsSorted[0]]||[]).length} vendors</div>
              </div>
            </div>
          </div>

          {/* Data source note */}
          <div style={{ fontSize:12, color:'var(--fi-text-3)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <span>ℹ</span>
            <span>
              Vendor count = distinct Provider names linked via <strong style={{ color:'var(--fi-text-2)' }}>relApplicationToProvider</strong> and{' '}
              <strong style={{ color:'var(--fi-text-2)' }}>relITComponentToProvider</strong> relations in LeanIX.
              Each linked Provider fact sheet name is one vendor entry.
            </span>
          </div>

          {/* Toolbar */}
          <div className="fi-toolbar" style={{ marginBottom:16 }}>
            <input className="fi-inp" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search vendor, category, sub-category..." style={{ width:260 }} />
            {catFilter !== 'all' && (
              <button className="fi-btn sm" onClick={() => setCatFilter('all')}>
                × {catFilter}
              </button>
            )}
            <div className="fi-toolbar-spacer" />
            <span style={{ fontSize:12, color:'var(--fi-text-3)' }}>
              {filtered.length} of {vendors.length} vendors
            </span>
            {/* View toggle */}
            <div style={{ display:'flex', border:'1px solid var(--fi-border)', borderRadius:'var(--r)', overflow:'hidden' }}>
              {[['categories','Categories'],['table','Table']].map(([v, l], i) => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding:'0 12px', height:28, border:'none',
                  borderRight: i === 0 ? '1px solid var(--fi-border)' : 'none',
                  background: view === v ? 'var(--fi-blue-bg)' : 'var(--fi-page-bg)',
                  color:      view === v ? 'var(--fi-blue)'    : 'var(--fi-text-2)',
                  fontSize:12, cursor:'pointer', fontFamily:'var(--ff)', fontWeight: view===v ? 600:400
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Category grid view */}
          {view === 'categories' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
              {catsSorted.map(cat => (
                <CategoryCard key={cat}
                  cat={cat}
                  vendors={grouped[cat]}
                  isActive={catFilter === cat}
                  onFilter={() => { setCatFilter(catFilter === cat ? 'all' : cat); setView('table'); }}
                />
              ))}
            </div>
          )}

          {/* Table view */}
          {view === 'table' && <VendorTable vendors={filtered} />}
        </>
      )}
    </div>
  );
}
