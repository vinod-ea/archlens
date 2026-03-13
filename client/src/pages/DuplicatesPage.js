import React, { useState, useEffect, useCallback } from 'react';
import { SkeletonKPIRow, SkeletonBlock } from '../components/Skeleton';
import { useApp } from '../App';
import { useSSERunner, SSEProgressPanel, RunButton } from '../hooks/useSSERunner';

// ── Constants ─────────────────────────────────────────────────────────────────
const FS_TYPES = ['Application', 'ITComponent', 'Interface'];

const STATUS_CFG = {
  pending:    { label: 'Pending Review',  color: 'var(--fi-warning)',  bg: 'var(--fi-warning-bg)',  border: 'var(--fi-warning-border)' },
  confirmed:  { label: 'Confirmed',       color: 'var(--fi-success)',  bg: 'var(--fi-success-bg)',  border: 'var(--fi-success-border)' },
  dismissed:  { label: 'Dismissed',       color: 'var(--fi-text-3)',   bg: 'var(--fi-bg)',          border: 'var(--fi-border)'         },
  investigating: { label: 'Investigating', color: 'var(--fi-blue)',    bg: 'var(--fi-blue-bg)',     border: 'var(--fi-blue-border)'    },
};

const PRIORITY_CFG = {
  critical: { color: 'var(--fi-error)',   bg: 'var(--fi-error-bg)',   label: 'Critical' },
  high:     { color: 'var(--fi-warning)', bg: 'var(--fi-warning-bg)', label: 'High'     },
  medium:   { color: 'var(--fi-blue)',    bg: 'var(--fi-blue-bg)',    label: 'Medium'   },
  low:      { color: 'var(--fi-text-3)',  bg: 'var(--fi-bg)',         label: 'Low'      },
};

const EFFORT_CFG = {
  low:    { color: 'var(--fi-success)', label: 'Low effort'    },
  medium: { color: 'var(--fi-warning)', label: 'Medium effort' },
  high:   { color: 'var(--fi-error)',   label: 'High effort'   },
};

const MOD_TYPES = [
  { id: 'Application',  icon: '📱', label: 'Application',       desc: 'Cloud-native, microservices, SaaS replacement, AI-augmentation' },
  { id: 'ITComponent',  icon: '🖥',  label: 'Infrastructure',    desc: 'Cloud PaaS, managed services, serverless, FinOps' },
  { id: 'Interface',    icon: '⚡',  label: 'Integration Layer',  desc: 'Event-driven, API modernization, service mesh, AsyncAPI' },
];

const MOD_FOCUS = {
  Application: ['Cloud-Native Migration', 'Microservices Decomposition', 'SaaS Replacement', 'AI Augmentation', 'Low-Code Platform'],
  ITComponent: ['Cloud PaaS Migration', 'Managed Kubernetes', 'Serverless', 'Infrastructure as Code', 'FinOps Optimization'],
  Interface:   ['Event-Driven Migration', 'REST to GraphQL', 'AsyncAPI', 'Service Mesh', 'API Gateway Consolidation'],
};


// ── Cluster card ──────────────────────────────────────────────────────────────
function ClusterCard({ cluster, onStatus, onModernize }) {
  const [open, setOpen] = useState(false);
  const cfg    = STATUS_CFG[cluster.status] || STATUS_CFG.pending;
  const names  = (() => { try { return JSON.parse(cluster.fs_names || '[]'); } catch { return []; } })();
  const ids    = (() => { try { return JSON.parse(cluster.fs_ids   || '[]'); } catch { return []; } })();

  return (
    <div style={{
      border: '1px solid var(--fi-border)',
      borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 'var(--r2)',
      background: 'var(--fi-page-bg)',
      marginBottom: 10,
      boxShadow: 'var(--shadow-1)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{cluster.cluster_name}</span>
            <span className="fi-badge muted" style={{ fontSize: 11 }}>{cluster.fs_type}</span>
            <span style={{
              fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            }}>{cfg.label}</span>
          </div>
          {cluster.functional_domain && (
            <div style={{ fontSize: 12, color: 'var(--fi-blue)', fontStyle: 'italic', marginBottom: 6 }}>
              Functional domain: {cluster.functional_domain}
            </div>
          )}
          {/* Member chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {names.map((n, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: 'var(--fi-blue-bg)', color: 'var(--fi-blue)',
                border: '1px solid var(--fi-blue-border)', fontWeight: 500,
              }}>{n}</span>
            ))}
            {names.length === 0 && <span style={{ fontSize: 12, color: 'var(--fi-text-3)' }}>{ids.length} items</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: cfg.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: cfg.color,
          }}>{names.length || ids.length}</div>
          <span style={{ color: 'var(--fi-text-3)', fontSize: 12, display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--fi-border)', background: 'var(--fi-section-bg)' }}>
          {cluster.evidence && (
            <div style={{ marginTop: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fi-text-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>EVIDENCE</div>
              <div style={{ fontSize: 13, color: 'var(--fi-text-2)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--fi-page-bg)', borderRadius: 'var(--r)', border: '1px solid var(--fi-border)' }}>
                {cluster.evidence}
              </div>
            </div>
          )}
          {cluster.recommendation && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fi-text-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>AI RECOMMENDATION</div>
              <div style={{ fontSize: 13, color: 'var(--fi-text)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--fi-warning-bg)', borderRadius: 'var(--r)', border: '1px solid var(--fi-warning-border)' }}>
                💡 {cluster.recommendation}
              </div>
            </div>
          )}
          {/* Action row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="fi-btn sm"
              style={{ background: STATUS_CFG.confirmed.bg, borderColor: STATUS_CFG.confirmed.border, color: STATUS_CFG.confirmed.color }}
              onClick={() => onStatus(cluster.id, 'confirmed')}>✓ Confirm Duplicate</button>
            <button className="fi-btn sm"
              style={{ background: STATUS_CFG.investigating.bg, borderColor: STATUS_CFG.investigating.border, color: STATUS_CFG.investigating.color }}
              onClick={() => onStatus(cluster.id, 'investigating')}>🔍 Investigate</button>
            <button className="fi-btn sm"
              style={{ background: 'var(--fi-bg)', borderColor: 'var(--fi-border)', color: 'var(--fi-text-3)' }}
              onClick={() => onStatus(cluster.id, 'dismissed')}>✕ Dismiss</button>
            <div style={{ flex: 1 }} />
            <button className="fi-btn sm emphasized" onClick={() => onModernize(cluster)}>
              ⚡ Modernize These
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modernization assessment card ─────────────────────────────────────────────
function AssessmentCard({ item, onStatus }) {
  const pCfg = PRIORITY_CFG[item.priority] || PRIORITY_CFG.medium;
  const eCfg = EFFORT_CFG[item.effort]     || EFFORT_CFG.medium;
  return (
    <div style={{
      border: '1px solid var(--fi-border)',
      borderTop: `3px solid ${pCfg.color}`,
      borderRadius: 'var(--r2)',
      background: 'var(--fi-page-bg)',
      padding: '14px 16px',
      boxShadow: 'var(--shadow-1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{item.fs_name}</div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 3, fontWeight: 700,
            background: pCfg.bg, color: pCfg.color,
          }}>{pCfg.label}</span>
          <span style={{ fontSize: 10, color: eCfg.color, fontWeight: 600 }}>{eCfg.label}</span>
        </div>
      </div>
      {item.modernization_type && (
        <span className="fi-badge info" style={{ fontSize: 10, marginBottom: 8, display: 'inline-block' }}>
          {item.modernization_type}
        </span>
      )}
      {item.current_tech && (
        <div style={{ fontSize: 11, color: 'var(--fi-text-3)', marginBottom: 6 }}>
          Current: <span style={{ fontFamily: 'var(--fm)' }}>{item.current_tech}</span>
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--fi-text-2)', lineHeight: 1.6, marginBottom: 10 }}>
        {item.recommendation}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="fi-btn xs"
          style={{ background: 'var(--fi-success-bg)', borderColor: 'var(--fi-success-border)', color: 'var(--fi-success)' }}
          onClick={() => onStatus(item.id, 'accepted')}>Accept</button>
        <button className="fi-btn xs"
          onClick={() => onStatus(item.id, 'backlog')}>Add to Backlog</button>
        <button className="fi-btn xs"
          style={{ color: 'var(--fi-text-3)' }}
          onClick={() => onStatus(item.id, 'dismissed')}>Dismiss</button>
      </div>
    </div>
  );
}

// ── Modernization wizard modal ────────────────────────────────────────────────
function ModernizationWizard({ initialType, onClose, onStart }) {
  const [step,   setStep]   = useState(1);
  const [target, setTarget] = useState(initialType || null);
  const [focus,  setFocus]  = useState([]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: 'var(--fi-page-bg)', borderRadius: 12, padding: 32, width: 560,
        maxWidth: '95vw', boxShadow: 'var(--shadow-3)', animation: 'fi-slideup .2s ease both',
      }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {[1, 2].map(s => (
            <React.Fragment key={s}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12,
                background: step >= s ? 'var(--fi-blue)' : 'var(--fi-border)',
                color: step >= s ? '#fff' : 'var(--fi-text-3)',
              }}>{step > s ? '✓' : s}</div>
              {s < 2 && <div style={{ flex: 1, height: 2, background: step > s ? 'var(--fi-blue)' : 'var(--fi-border)' }} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>What do you want to modernize?</h3>
            <p style={{ fontSize: 13, color: 'var(--fi-text-2)', marginBottom: 20 }}>
              AI will scan the selected fact sheet type and identify modernization opportunities
              based on current technology trends ({new Date().getFullYear()}).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {MOD_TYPES.map(t => (
                <div key={t.id} onClick={() => setTarget(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    border: `2px solid ${target === t.id ? 'var(--fi-blue)' : 'var(--fi-border)'}`,
                    borderRadius: 'var(--r2)', cursor: 'pointer',
                    background: target === t.id ? 'var(--fi-blue-bg)' : 'var(--fi-page-bg)',
                    transition: 'all .12s',
                  }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: target === t.id ? 'var(--fi-blue)' : 'var(--fi-text)' }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--fi-text-3)', marginTop: 2 }}>{t.desc}</div>
                  </div>
                  {target === t.id && <span style={{ marginLeft: 'auto', color: 'var(--fi-blue)', fontWeight: 700 }}>✓</span>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="fi-btn" onClick={onClose}>Cancel</button>
              <button className="fi-btn emphasized" disabled={!target} onClick={() => setStep(2)}>Next →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              {MOD_TYPES.find(t => t.id === target)?.icon} Focus areas
            </h3>
            <p style={{ fontSize: 13, color: 'var(--fi-text-2)', marginBottom: 16 }}>
              Select the modernization patterns to analyse. Leave all unchecked to analyse everything.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {(MOD_FOCUS[target] || []).map(f => {
                const sel = focus.includes(f);
                return (
                  <button key={f} onClick={() => setFocus(fcs => sel ? fcs.filter(x => x !== f) : [...fcs, f])}
                    style={{
                      padding: '6px 14px', border: `1px solid ${sel ? 'var(--fi-blue)' : 'var(--fi-border)'}`,
                      borderRadius: 20, background: sel ? 'var(--fi-blue-bg)' : 'var(--fi-page-bg)',
                      color: sel ? 'var(--fi-blue)' : 'var(--fi-text-2)',
                      fontWeight: sel ? 600 : 400, fontSize: 13, cursor: 'pointer',
                      fontFamily: 'var(--ff)', transition: 'all .12s',
                    }}>
                    {sel ? '✓ ' : ''}{f}
                  </button>
                );
              })}
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--fi-info-bg)', border: '1px solid var(--fi-info-border)', borderRadius: 'var(--r)', marginBottom: 20, fontSize: 12, color: 'var(--fi-text-2)' }}>
              ℹ AI will analyse all <strong>{target}</strong> fact sheets and identify opportunities for:{' '}
              {focus.length > 0 ? focus.join(', ') : 'all modernization patterns'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="fi-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="fi-btn" onClick={onClose}>Cancel</button>
              <button className="fi-btn emphasized" onClick={() => onStart(target, focus.join(',') || 'General')}>
                ⚡ Run Modernization Analysis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DuplicatesPage() {
  const { workspace } = useApp();

  // Detection state
  const [clusters,    setClusters]    = useState([]);
  const [detTypes,    setDetTypes]    = useState(FS_TYPES);

  // Modernization state
  const [assessments,    setAssessments]    = useState([]);
  const [showWizard,     setShowWizard]     = useState(false);
  const [wizardInitType, setWizardInitType] = useState(null);
  const [modTarget,      setModTarget]      = useState('Application');

  // UI state
  const [tab,         setTab]         = useState('duplicates');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType,   setFilterType]   = useState('all');
  const [loaded,       setLoaded]       = useState(false);
  const [showDetPanel, setShowDetPanel] = useState(false);
  const [showModPanel, setShowModPanel] = useState(false);


  const loadClusters = useCallback(() => {
    if (!workspace) return;
    fetch(`/api/duplicates?workspace=${encodeURIComponent(workspace)}`)
      .then(r => r.json()).then(d => { setClusters(Array.isArray(d) ? d : []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [workspace]);

  const loadAssessments = useCallback((targetType) => {
    if (!workspace) return;
    const q = targetType ? `&targetType=${encodeURIComponent(targetType)}` : '';
    fetch(`/api/modernization?workspace=${encodeURIComponent(workspace)}${q}`)
      .then(r => r.json()).then(d => setAssessments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [workspace]);

  useEffect(() => { loadClusters(); loadAssessments(); }, [loadClusters, loadAssessments]);

  // Seamless update when switching tabs back to this page
  useEffect(() => {
    const onFocus = () => { if (loaded) { loadClusters(); loadAssessments(modTarget); } };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loaded, loadClusters, loadAssessments, modTarget]);

  const onDetComplete = useCallback((err, evt) => {
    
    if (evt?.event === 'done_duplicates') loadClusters();
  }, [loadClusters]);

  const onModComplete = useCallback((err, evt) => {
    
    if (evt?.event === 'done_modernization') {
      setModTarget(evt.targetType);
      loadAssessments(evt.targetType);
      setTab('modernization');
    }
  }, [loadAssessments]);

  const { running: detRunning, logs: detLogs, progress: detProgress, run: runDetSSE } = useSSERunner(onDetComplete);
  const { running: modRunning, logs: modLogs, progress: modProgress, run: runModSSE } = useSSERunner(onModComplete);

  const startDetection = () => {
    setShowDetPanel(true);
    runDetSSE(`/api/duplicates/stream?workspace=${encodeURIComponent(workspace)}&fsTypes=${detTypes.join(',')}`);
  };

  const startModernization = (targetType, modernizationType) => {
    setShowWizard(false);
    setShowModPanel(true);
    setTab('modernization');
    runModSSE(`/api/modernization/stream?workspace=${encodeURIComponent(workspace)}&targetType=${encodeURIComponent(targetType)}&modernizationType=${encodeURIComponent(modernizationType)}`);
  };

  const updateClusterStatus = (id, status) => {
    fetch(`/api/duplicates/${id}/status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) })
      .then(() => setClusters(cs => cs.map(c => c.id === id ? { ...c, status } : c)));
  };

  const updateAssessmentStatus = (id, status) => {
    fetch(`/api/modernization/${id}/status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) })
      .then(() => setAssessments(as => as.map(a => a.id === id ? { ...a, status } : a)));
  };

  // Stats
  const pendingCount    = clusters.filter(c => c.status === 'pending').length;
  const confirmedCount  = clusters.filter(c => c.status === 'confirmed').length;
  const criticalModCount = assessments.filter(a => a.priority === 'critical' || a.priority === 'high').length;

  // Filter clusters
  const filteredClusters = clusters.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterType   !== 'all' && c.fs_type !== filterType)   return false;
    return true;
  });

  // Group assessments by type
  const assessmentsByType = assessments.reduce((acc, a) => {
    if (!acc[a.target_type]) acc[a.target_type] = [];
    acc[a.target_type].push(a);
    return acc;
  }, {});

  const running = detRunning || modRunning;

  return (
    <div className="page-wrap fi-fade-in">
      
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Functional Duplicate Detection</h1>
          <p className="page-sub">
            AI reads every Application, IT Component and Interface fact sheet and clusters them by
            functional purpose. Identify duplicates and assess modernization opportunities.
          </p>
        </div>
        <div className="page-header-right">
          <button className="fi-btn emphasized" onClick={() => setShowWizard(true)} disabled={running}>
            ⚡ Modernization Analysis
          </button>
        </div>
      </div>

      {/* KPI strip */}
      {(clusters.length > 0 || assessments.length > 0) && (
        <div className="kpi-row" style={{ marginBottom: 20 }}>
          <div className="fi-card">
            <div className="fi-kpi">
              <div className="fi-kpi-label">DUPLICATE CLUSTERS</div>
              <div className="fi-kpi-value" style={{ color: 'var(--fi-warning)', fontSize: 26 }}>{clusters.length}</div>
              <div className="fi-kpi-sub">{pendingCount} pending review</div>
            </div>
          </div>
          <div className="fi-card">
            <div className="fi-kpi">
              <div className="fi-kpi-label">CONFIRMED DUPLICATES</div>
              <div className="fi-kpi-value" style={{ color: 'var(--fi-error)', fontSize: 26 }}>{confirmedCount}</div>
              <div className="fi-kpi-sub">ready for retirement</div>
            </div>
          </div>
          <div className="fi-card">
            <div className="fi-kpi">
              <div className="fi-kpi-label">AFFECTED FACT SHEETS</div>
              <div className="fi-kpi-value" style={{ fontSize: 26 }}>
                {clusters.reduce((s, c) => { try { return s + JSON.parse(c.fs_ids||'[]').length; } catch { return s; } }, 0)}
              </div>
              <div className="fi-kpi-sub">across {FS_TYPES.length} types</div>
            </div>
          </div>
          <div className="fi-card">
            <div className="fi-kpi">
              <div className="fi-kpi-label">MOD. OPPORTUNITIES</div>
              <div className="fi-kpi-value" style={{ color: 'var(--fi-blue)', fontSize: 26 }}>{assessments.length}</div>
              <div className="fi-kpi-sub">{criticalModCount} high/critical priority</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--fi-border)', marginBottom: 16 }}>
        {[
          ['duplicates',     'Duplicate Clusters',       pendingCount],
          ['modernization',  'Modernization Analysis',   criticalModCount],
          ['run',            'Run Analysis',              0],
        ].map(([id, label, badge]) => (
          <div key={id} className={`fi-nav-item${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label}
            {badge > 0 && (
              <span className="fi-nav-badge" style={{ background: tab === id ? 'var(--fi-warning-bg)' : undefined, color: tab === id ? 'var(--fi-warning)' : undefined }}>
                {badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── DUPLICATES TAB ── */}
      {tab === 'duplicates' && (
        <div>
          {/* Toolbar */}
          <div className="fi-toolbar" style={{ borderRadius: 'var(--r)', marginBottom: 12 }}>
            <select className="fi-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ width: 160, height: 28, fontSize: 13 }}>
              <option value="all">All statuses</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="fi-select" value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ width: 160, height: 28, fontSize: 13 }}>
              <option value="all">All types</option>
              {FS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="fi-toolbar-spacer" />
            <span style={{ fontSize: 12, color: 'var(--fi-text-3)' }}>{filteredClusters.length} clusters</span>
            {clusters.length > 0 && (
              <button className="fi-btn sm danger" disabled={running}
                onClick={() => {
                  fetch(`/api/duplicates?workspace=${encodeURIComponent(workspace)}`, { method:'DELETE' })
                    .then(() => setClusters([]));
                }}>✕ Clear all</button>
            )}
          </div>

          {!loaded ? (
            <div>
              <SkeletonKPIRow count={4} />
              {[1,2,3].map(i => <SkeletonBlock key={i} lines={3} />)}
            </div>
          ) : filteredClusters.length > 0 ? (
            filteredClusters.map(c => (
              <ClusterCard key={c.id} cluster={c}
                onStatus={updateClusterStatus}
                onModernize={cluster => {
                  setWizardInitType(cluster.fs_type);
                  setShowWizard(true);
                }} />
            ))
          ) : loaded ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--fi-text-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                {clusters.length === 0 ? 'No analysis run yet' : 'No clusters match current filter'}
              </div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>
                {clusters.length === 0 ? 'Go to Run Analysis tab to detect functional duplicates in your landscape.' : 'Try changing the filter.'}
              </div>
              {clusters.length === 0 && (
                <button className="fi-btn emphasized" onClick={() => setTab('run')}>→ Run Analysis</button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── MODERNIZATION TAB ── */}
      {tab === 'modernization' && (
        <div>
          {showModPanel && (
            <div style={{ marginBottom: 16 }}>
              <SSEProgressPanel running={modRunning} logs={modLogs} progress={modProgress}
                label="Modernization Analysis running…" onClose={() => setShowModPanel(false)} />
            </div>
          )}

          {assessments.length > 0 ? (
            <>
              {/* Type tabs inside modernization */}
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                {['all', ...Object.keys(assessmentsByType)].map(type => (
                  <button key={type} onClick={() => setModTarget(type === 'all' ? '' : type)}
                    style={{
                      padding:'5px 14px', border:`1px solid ${(modTarget||'all') === type ? 'var(--fi-blue)' : 'var(--fi-border)'}`,
                      borderRadius:20, background:(modTarget||'all') === type ? 'var(--fi-blue-bg)' : 'var(--fi-page-bg)',
                      color:(modTarget||'all') === type ? 'var(--fi-blue)' : 'var(--fi-text-2)',
                      fontWeight:(modTarget||'all') === type ? 600 : 400, fontSize:13, cursor:'pointer', fontFamily:'var(--ff)',
                    }}>
                    {type === 'all' ? `All (${assessments.length})` : `${type} (${(assessmentsByType[type]||[]).length})`}
                  </button>
                ))}
                <div style={{ flex:1 }} />
                <button className="fi-btn sm emphasized" onClick={() => setShowWizard(true)} disabled={running}>
                  ⚡ New Analysis
                </button>
              </div>

              {/* Priority groups */}
              {['critical','high','medium','low'].map(priority => {
                const items = (modTarget && modTarget !== 'all'
                  ? assessmentsByType[modTarget] || []
                  : assessments
                ).filter(a => a.priority === priority);
                if (!items.length) return null;
                const pCfg = PRIORITY_CFG[priority];
                return (
                  <div key={priority} style={{ marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:pCfg.color, textTransform:'uppercase', letterSpacing:'.04em' }}>
                        {pCfg.label} Priority
                      </span>
                      <span style={{ fontSize:12, background:pCfg.bg, color:pCfg.color, padding:'1px 7px', borderRadius:10, border:`1px solid ${pCfg.color}33` }}>
                        {items.length}
                      </span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
                      {items.map(item => (
                        <AssessmentCard key={item.id} item={item} onStatus={updateAssessmentStatus} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : !modRunning ? (
            <div style={{ textAlign:'center', padding:60, color:'var(--fi-text-3)' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No modernization analysis yet</div>
              <div style={{ fontSize:13, marginBottom:16 }}>
                Run a modernization analysis to identify opportunities in your landscape.
              </div>
              <button className="fi-btn emphasized" onClick={() => setShowWizard(true)}>⚡ Start Modernization Analysis</button>
            </div>
          ) : null}
        </div>
      )}

      {/* ── RUN ANALYSIS TAB ── */}
      {tab === 'run' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Duplicate detection card */}
          <div className="fi-card">
            <div className="fi-card-header">
              <div>
                <div className="fi-card-title">🔍 Duplicate Detection</div>
                <div style={{ fontSize:12, color:'var(--fi-text-2)', marginTop:2 }}>Cluster fact sheets by functional purpose</div>
              </div>
            </div>
            <div className="fi-card-body">
              <div className="fi-form-row">
                <label className="fi-label">FACT SHEET TYPES TO ANALYSE</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                  {FS_TYPES.map(t => (
                    <label key={t} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                      <input type="checkbox" checked={detTypes.includes(t)}
                        onChange={e => setDetTypes(ts => e.target.checked ? [...ts, t] : ts.filter(x => x !== t))} />
                      <span>{t}</span>
                      <span style={{ fontSize:11, color:'var(--fi-text-3)' }}>
                        {t === 'Application' ? 'Business apps, microservices' : t === 'ITComponent' ? 'Infrastructure, platforms' : 'APIs, integrations'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {showDetPanel && (
                <SSEProgressPanel running={detRunning} logs={detLogs} progress={detProgress}
                  label="Duplicate Detection running…" onClose={() => setShowDetPanel(false)} />
              )}

              <button className="fi-btn emphasized" onClick={startDetection}
                disabled={detRunning || detTypes.length === 0}
                style={{ width:'100%', justifyContent:'center' }}>
                {detRunning
                  ? <><span className="fi-spin" style={{ fontSize:11 }}>◌</span> Detecting duplicates...</>
                  : clusters.length > 0 ? '↻ Re-run Detection' : '▶ Run Duplicate Detection'}
              </button>
            </div>
          </div>

          {/* Modernization card */}
          <div className="fi-card">
            <div className="fi-card-header">
              <div>
                <div className="fi-card-title">⚡ Modernization Analysis</div>
                <div style={{ fontSize:12, color:'var(--fi-text-2)', marginTop:2 }}>Identify technology modernization opportunities</div>
              </div>
            </div>
            <div className="fi-card-body">
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {MOD_TYPES.map(t => (
                  <div key={t.id} style={{ padding:'10px 12px', background:'var(--fi-bg)', borderRadius:'var(--r)', border:'1px solid var(--fi-border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span>{t.icon}</span>
                      <span style={{ fontWeight:600, fontSize:13 }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--fi-text-3)', marginTop:3 }}>{t.desc}</div>
                  </div>
                ))}
              </div>

              {modRunning && modProgress.total > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div className="fi-progress">
                    <div className="fi-progress-bar" style={{ width:`${modProgress.total ? (modProgress.processed/modProgress.total)*100 : 0}%` }} />
                  </div>
                </div>
              )}

              <button className="fi-btn emphasized" onClick={() => setShowWizard(true)}
                disabled={modRunning}
                style={{ width:'100%', justifyContent:'center' }}>
                {modRunning
                  ? <><span className="fi-spin" style={{ fontSize:11 }}>◌</span> Analysing...</>
                  : assessments.length > 0 ? '↻ New Modernization Analysis' : '⚡ Run Modernization Analysis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modernization wizard modal */}
      {showWizard && (
        <ModernizationWizard
          initialType={wizardInitType}
          onClose={() => { setShowWizard(false); setWizardInitType(null); }}
          onStart={(target, focus) => {
            setWizardInitType(null);
            startModernization(target, focus);
          }} />
      )}
    </div>
  );
}
