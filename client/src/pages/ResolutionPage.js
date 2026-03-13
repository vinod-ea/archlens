import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import { SkeletonKPIRow, SkeletonBlock } from '../components/Skeleton';
import { useSSERunner, SSEProgressPanel, RunButton } from '../hooks/useSSERunner';

// ── Vendor type config ────────────────────────────────────────────────────────
const TYPE_CFG = {
  vendor:   { icon:'🏢', color:'#1D2D3E', bg:'#F0F4F7', label:'Vendor'   },
  product:  { icon:'📦', color:'#0070F2', bg:'#EBF3FF', label:'Product'  },
  platform: { icon:'☁',  color:'#188918', bg:'#F5FAF5', label:'Platform' },
  module:   { icon:'🔧', color:'#DF6E0C', bg:'#FFF8F0', label:'Module'   },
  unknown:  { icon:'?',  color:'#8396A8', bg:'#F5F6F7', label:'Unknown'  },
};

const CONF_COLOR = c =>
  c >= 0.9 ? 'var(--fi-success)' :
  c >= 0.7 ? 'var(--fi-warning)' :
             'var(--fi-error)';

// ── Confidence pill ───────────────────────────────────────────────────────────
function ConfPill({ value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <span style={{
      fontSize: 11, padding: '1px 6px', borderRadius: 10, fontWeight: 700,
      fontFamily: 'var(--fm)',
      color: CONF_COLOR(value),
      background: value >= 0.9 ? 'var(--fi-success-bg)' : value >= 0.7 ? 'var(--fi-warning-bg)' : 'var(--fi-error-bg)',
      border: `1px solid ${value >= 0.9 ? 'var(--fi-success-border)' : value >= 0.7 ? 'var(--fi-warning-border)' : 'var(--fi-error-border)'}`,
    }}>{pct}%</span>
  );
}

// ── Vendor card ───────────────────────────────────────────────────────────────
function VendorCard({ vendor, children, expanded, onToggle }) {
  const cfg = TYPE_CFG[vendor.vendor_type] || TYPE_CFG.unknown;
  const aliases = (() => { try { return JSON.parse(vendor.aliases || '[]'); } catch { return []; } })();
  const total = (vendor.app_count || 0) + (vendor.itc_count || 0);

  return (
    <div style={{
      border: '1px solid var(--fi-border)',
      borderRadius: 'var(--r2)',
      marginBottom: 8,
      background: 'var(--fi-page-bg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-1)',
    }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          cursor: 'pointer', background: cfg.bg, borderBottom: expanded ? '1px solid var(--fi-border)' : 'none',
          transition: 'background .1s',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fi-text)' }}>{vendor.canonical_name}</span>
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
              color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}22`,
            }}>{cfg.label}</span>
            {vendor.category && (
              <span className="fi-badge info" style={{ fontSize: 10 }}>{vendor.category}</span>
            )}
          </div>
          {aliases.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--fi-text-3)', marginTop: 2 }}>
              Also known as: {aliases.slice(0, 5).join(' · ')}
              {aliases.length > 5 && ` +${aliases.length - 5} more`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          {total > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fm)', fontSize: 13, fontWeight: 700, color: 'var(--fi-text)' }}>{total}</div>
              <div style={{ fontSize: 10, color: 'var(--fi-text-3)' }}>linked FS</div>
            </div>
          )}
          {vendor.confidence != null && <ConfPill value={vendor.confidence} />}
          <span style={{ color: 'var(--fi-text-3)', fontSize: 12, transition: 'transform .15s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none' }}>▶</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '12px 16px', background: 'var(--fi-page-bg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12, marginBottom: children ? 14 : 0 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fi-text-3)', marginBottom: 2 }}>APPLICATIONS</div>
              <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: 18, color: 'var(--fi-blue)' }}>{vendor.app_count || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fi-text-3)', marginBottom: 2 }}>IT COMPONENTS</div>
              <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: 18, color: 'var(--fi-text)' }}>{vendor.itc_count || 0}</div>
            </div>
            {vendor.total_cost > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--fi-text-3)', marginBottom: 2 }}>ANNUAL COST</div>
                <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: 14, color: 'var(--gold)' }}>
                  €{(vendor.total_cost / 1000).toFixed(0)}K
                </div>
              </div>
            )}
            {vendor.sub_category && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--fi-text-3)', marginBottom: 2 }}>SUBCATEGORY</div>
                <div style={{ fontSize: 13, color: 'var(--fi-text-2)' }}>{vendor.sub_category}</div>
              </div>
            )}
          </div>
          {/* Child products/modules */}
          {children && <div style={{ paddingLeft: 20, borderLeft: '2px solid var(--fi-border)' }}>{children}</div>}
        </div>
      )}
    </div>
  );
}


// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, color }) {
  return (
    <div className="fi-card">
      <div className="fi-kpi">
        <div className="fi-kpi-label">{label}</div>
        <div className="fi-kpi-value" style={{ color: color || 'var(--fi-text)', fontSize: 26 }}>{value}</div>
        {sub && <div className="fi-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ResolutionPage() {
  const { workspace } = useApp();
  const [hierarchy,  setHierarchy]  = useState([]);
  const [expanded,   setExpanded]   = useState({});
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCat,  setFilterCat]  = useState('all');
  const [sortBy,     setSortBy]     = useState('linked');
  const [loaded,     setLoaded]     = useState(false);
  const [showPanel,  setShowPanel]  = useState(false);

  const loadData = useCallback(() => {
    if (!workspace) return;
    fetch(`/api/resolution/hierarchy?workspace=${encodeURIComponent(workspace)}`)
      .then(r => r.json())
      .then(d => { setHierarchy(Array.isArray(d) ? d : []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [workspace]);

  useEffect(() => { loadData(); }, [loadData]);

  const onComplete = useCallback((err, evt) => {
    if (evt?.event === 'done_resolve') {
      // Seamless refresh — no skeleton flash
      loadData();
    }
  }, [loadData]);

  const { running, logs, progress, run } = useSSERunner(onComplete);

  function runResolution() {
    setShowPanel(true);
    run(`/api/resolution/stream?workspace=${encodeURIComponent(workspace || '')}`);
  }

  // Also reload on tab focus (handles switching away and back)
  useEffect(() => {
    const onFocus = () => { if (loaded) loadData(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loaded, loadData]);

  // Build hierarchy tree
  const buildTree = () => {
    const vendors  = hierarchy.filter(v => v.vendor_type === 'vendor');
    const products = hierarchy.filter(v => v.vendor_type !== 'vendor');
    return { vendors, products };
  };

  const { vendors, products } = buildTree();

  // Filtering + sorting
  const categories = [...new Set(hierarchy.map(v => v.category).filter(Boolean))].sort();

  const filtered = hierarchy.filter(v => {
    if (filterType !== 'all' && v.vendor_type !== filterType) return false;
    if (filterCat  !== 'all' && v.category     !== filterCat)  return false;
    if (search) {
      const s = search.toLowerCase();
      const aliases = (() => { try { return JSON.parse(v.aliases || '[]'); } catch { return []; } })();
      if (!v.canonical_name?.toLowerCase().includes(s) && !aliases.some(a => a.toLowerCase().includes(s))) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'linked') return ((b.app_count||0)+(b.itc_count||0)) - ((a.app_count||0)+(a.itc_count||0));
    if (sortBy === 'cost')   return (b.total_cost||0) - (a.total_cost||0);
    if (sortBy === 'name')   return (a.canonical_name||'').localeCompare(b.canonical_name||'');
    if (sortBy === 'conf')   return (b.confidence||0) - (a.confidence||0);
    return 0;
  });

  const topVendors = filtered.filter(v => v.vendor_type === 'vendor');
  const allLinked  = hierarchy.reduce((s, v) => s + (v.app_count||0) + (v.itc_count||0), 0);
  const avgConf    = hierarchy.length ? (hierarchy.reduce((s,v) => s+(v.confidence||0),0)/hierarchy.length) : 0;
  const rawCount   = hierarchy.reduce((s,v) => {
    const al = (() => { try { return JSON.parse(v.aliases||'[]'); } catch { return []; }})();
    return s + 1 + al.length;
  }, 0);

  return (
    <div className="page-wrap fi-fade-in">
      
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Vendor Identity Resolution</h1>
          <p className="page-sub">
            AI resolves all raw vendor names, product variants and aliases across Provider, Application,
            IT Component and Interface fact sheets into a canonical vendor hierarchy. No EA tool does this automatically.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      {hierarchy.length > 0 && (
        <div className="kpi-row" style={{ marginBottom: 20 }}>
          <StatTile label="CANONICAL VENDORS" value={vendors.length} sub={`from ${rawCount} raw names`} color="var(--fi-blue)" />
          <StatTile label="PRODUCTS / MODULES" value={products.length} sub="resolved hierarchy entries" />
          <StatTile label="LINKED FACT SHEETS" value={allLinked} sub="apps + IT components" />
          <StatTile label="AVG CONFIDENCE" value={`${Math.round(avgConf*100)}%`}
            sub="AI resolution accuracy"
            color={avgConf >= 0.8 ? 'var(--fi-success)' : 'var(--fi-warning)'} />
        </div>
      )}

      {/* Run panel */}
      <div className="fi-card" style={{ marginBottom: 20 }}>
        <div className="fi-card-header">
          <span className="fi-card-title">Resolution Engine</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {hierarchy.length > 0 && (
              <button className="fi-btn sm danger" disabled={running}
                onClick={() => {
                  fetch(`/api/resolution/hierarchy?workspace=${encodeURIComponent(workspace)}`, { method:'DELETE' })
                    .then(() => { setHierarchy([]); setShowPanel(false); });
                }}>
                ✕ Clear
              </button>
            )}
            <RunButton
              running={running}
              onClick={runResolution}
              idleLabel={hierarchy.length > 0 ? '↻ Re-run Resolution' : '▶ Run Vendor Resolution'}
              runningLabel="Resolving vendors…"
            />
          </div>
        </div>
        <div className="fi-card-body">
          {showPanel && (
            <SSEProgressPanel
              running={running}
              logs={logs}
              progress={progress}
              label="Vendor Identity Resolution running…"
              onClose={() => setShowPanel(false)}
            />
          )}
          {!running && !showPanel && hierarchy.length === 0 && (
            <div style={{ color: 'var(--fi-text-3)', fontSize: 13 }}>
              Click Run to analyse all vendor names across your LeanIX fact sheets and build the canonical hierarchy.
              This reads Provider, Application, and IT Component fact sheets and resolves all aliases.
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {hierarchy.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="fi-toolbar" style={{ borderRadius: 'var(--r)', marginBottom: 12 }}>
            <input className="fi-inp" placeholder="Search vendor or alias..."
              style={{ width: 220, height: 28, fontSize: 13 }}
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="fi-select" value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ width: 140, height: 28, fontSize: 13 }}>
              <option value="all">All types</option>
              <option value="vendor">Vendor</option>
              <option value="product">Product</option>
              <option value="platform">Platform</option>
              <option value="module">Module</option>
              <option value="unknown">Unknown</option>
            </select>
            <select className="fi-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ width: 180, height: 28, fontSize: 13 }}>
              <option value="all">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="fi-toolbar-spacer" />
            <span style={{ fontSize: 12, color: 'var(--fi-text-3)' }}>{filtered.length} entries</span>
            <select className="fi-select" value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ width: 150, height: 28, fontSize: 13 }}>
              <option value="linked">Sort: Most linked</option>
              <option value="cost">Sort: Highest cost</option>
              <option value="name">Sort: Name A–Z</option>
              <option value="conf">Sort: Confidence</option>
            </select>
          </div>

          {/* Category legend */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {Object.entries(TYPE_CFG).map(([type, cfg]) => {
              const count = hierarchy.filter(v => v.vendor_type === type).length;
              if (!count) return null;
              return (
                <button key={type} onClick={() => setFilterType(filterType === type ? 'all' : type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                    borderRadius: 20, border: `1px solid ${filterType === type ? cfg.color : 'var(--fi-border)'}`,
                    background: filterType === type ? cfg.bg : 'var(--fi-page-bg)',
                    cursor: 'pointer', fontSize: 12, fontFamily: 'var(--ff)', fontWeight: 500,
                    color: filterType === type ? cfg.color : 'var(--fi-text-2)',
                  }}>
                  {cfg.icon} {cfg.label}
                  <span style={{
                    background: 'var(--fi-border)', color: 'var(--fi-text-2)',
                    padding: '0 5px', borderRadius: 8, fontSize: 11,
                  }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Hierarchy view: vendors with their products nested */}
          {filterType === 'all' || filterType === 'vendor' ? (
            <div>
              {topVendors.filter(v => {
                if (search) {
                  const s = search.toLowerCase();
                  const aliases = (() => { try { return JSON.parse(v.aliases||'[]'); } catch { return []; } })();
                  return v.canonical_name?.toLowerCase().includes(s) || aliases.some(a => a.toLowerCase().includes(s));
                }
                if (filterCat !== 'all' && v.category !== filterCat) return false;
                return true;
              }).map(vendor => {
                const children = products.filter(p => {
                  // match parent by canonical vendor name (AI sets parent_canonical → but we store canonical_name)
                  return p.canonical_name?.toLowerCase().includes(vendor.canonical_name?.split(' ')[0]?.toLowerCase() || '');
                });
                const isExpanded = expanded[vendor.id];
                return (
                  <VendorCard key={vendor.id} vendor={vendor} expanded={isExpanded}
                    onToggle={() => setExpanded(e => ({ ...e, [vendor.id]: !e[vendor.id] }))}>
                    {children.length > 0 && (
                      <div style={{ paddingTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fi-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                          Products & Modules ({children.length})
                        </div>
                        {children.map(child => (
                          <VendorCard key={child.id} vendor={child}
                            expanded={expanded[child.id]}
                            onToggle={() => setExpanded(e => ({ ...e, [child.id]: !e[child.id] }))} />
                        ))}
                      </div>
                    )}
                  </VendorCard>
                );
              })}
            </div>
          ) : (
            // Flat list for non-vendor filter
            <div>
              {filtered.map(vendor => (
                <VendorCard key={vendor.id} vendor={vendor}
                  expanded={expanded[vendor.id]}
                  onToggle={() => setExpanded(e => ({ ...e, [vendor.id]: !e[vendor.id] }))} />
              ))}
            </div>
          )}
        </>
      )}

      {!loaded && !running && (
        <div>
          <SkeletonKPIRow count={4} />
          <SkeletonBlock lines={3} />
          <SkeletonBlock lines={5} />
        </div>
      )}
      {loaded && hierarchy.length === 0 && !running && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--fi-text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No vendor hierarchy yet</div>
          <div style={{ fontSize: 13 }}>Run the resolution engine above to analyse your LeanIX landscape.</div>
        </div>
      )}
    </div>
  );
}
