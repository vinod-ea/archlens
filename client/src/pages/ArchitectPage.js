import React, { useState, useEffect } from 'react';
import { useApp } from '../App';

// ── Mermaid loader ────────────────────────────────────────────────────────────
let mermaidLoaded = false, mermaidLoading = false;
const mermaidCallbacks = [];
function loadMermaid(cb) {
  if (mermaidLoaded) { cb(window.mermaid); return; }
  mermaidCallbacks.push(cb);
  if (mermaidLoading) return;
  mermaidLoading = true;
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
  s.onload = () => {
    window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    mermaidLoaded = true;
    mermaidCallbacks.forEach(fn => fn(window.mermaid));
    mermaidCallbacks.length = 0;
  };
  document.head.appendChild(s);
}

function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('');
  const [err, setErr] = useState('');
  const [zoom, setZoom] = useState(1);
  React.useEffect(() => {
    if (!code) return;
    setErr(''); setSvg('');
    loadMermaid(async m => {
      try { const res = await m.render('mmd-' + Date.now(), code); setSvg(res.svg); }
      catch (e) { setErr(e.message || 'Render failed'); }
    });
  }, [code]);
  if (err) return (
    <div style={{ padding: 16 }}>
      <div className="fi-msg error" style={{ marginBottom: 12 }}><span>⚠</span><span>Diagram render error: showing raw Mermaid code instead</span></div>
      <pre style={{ fontFamily: 'var(--fm)', fontSize: 12, background: 'var(--fi-bg)', padding: 16, borderRadius: 'var(--r)', overflow: 'auto', maxHeight: 500, lineHeight: 1.6 }}>{code}</pre>
    </div>
  );
  if (!svg) return <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="fi-busy"><div className="fi-busy-dots"><div className="fi-busy-dot" /><div className="fi-busy-dot" /><div className="fi-busy-dot" /></div><span>Rendering diagram...</span></div></div>;
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--fi-border)', alignItems: 'center' }}>
        <button className="fi-btn sm" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>−</button>
        <span style={{ fontSize: 12, color: 'var(--fi-text-3)', minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button className="fi-btn sm" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>+</button>
        <button className="fi-btn sm" onClick={() => setZoom(1)}>Reset</button>
        <div style={{ flex: 1 }} />
        <button className="fi-btn sm" onClick={() => { const b = new Blob([svg], { type: 'image/svg+xml' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'architecture.svg'; a.click(); }}>↓ SVG</button>
        <button className="fi-btn sm" onClick={() => navigator.clipboard?.writeText(code)}>⎘ Mermaid</button>
      </div>
      <div style={{ overflow: 'auto', padding: 24, background: '#fff', minHeight: 300 }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform .15s' }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  );
}

// ── NFR category badge ────────────────────────────────────────────────────────
const NFR_META = {
  reliability:  { label: 'Reliability',  color: 'var(--fi-success)',  bg: 'var(--fi-success-bg)' },
  scalability:  { label: 'Scalability',  color: 'var(--fi-blue)',     bg: 'var(--fi-blue-bg)' },
  security:     { label: 'Security',     color: '#b45309',            bg: '#fef3c7' },
  performance:  { label: 'Performance',  color: 'var(--fi-warning)',  bg: 'var(--fi-warning-bg)' },
  integration:  { label: 'Integration',  color: '#7c3aed',            bg: '#ede9fe' },
  operational:  { label: 'Operations',   color: 'var(--fi-text-2)',   bg: 'var(--fi-bg)' },
  build_vs_buy: { label: 'Build vs Buy', color: '#0891b2',            bg: '#e0f2fe' },
};
function NfrBadge({ category }) {
  const m = NFR_META[category] || NFR_META.operational;
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.color}22`, flexShrink: 0 }}>{m.label}</span>;
}

// ── Question renderer ─────────────────────────────────────────────────────────
function QuestionCard({ q, answer, onChange, index }) {
  return (
    <div style={{ marginBottom: 16, padding: 16, background: 'var(--fi-page-bg)', border: '1px solid var(--fi-border)', borderRadius: 'var(--r2)', borderLeft: '3px solid var(--fi-blue)' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--fi-blue)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{index + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fi-text)', lineHeight: 1.4 }}>{q.question}</div>
            {q.nfrCategory && <NfrBadge category={q.nfrCategory} />}
          </div>
          {q.why && <div style={{ fontSize: 12, color: 'var(--fi-text-3)', fontStyle: 'italic', lineHeight: 1.4 }}>Architectural impact: {q.why}</div>}
        </div>
      </div>
      {q.type === 'choice' && q.options?.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 34 }}>
          {q.options.map(opt => (
            <button key={opt} onClick={() => onChange(q.id, opt)}
              style={{ padding: '6px 14px', border: '1px solid', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ff)', transition: 'all .12s', borderColor: answer === opt ? 'var(--fi-blue)' : 'var(--fi-border)', background: answer === opt ? 'var(--fi-blue-bg)' : 'var(--fi-page-bg)', color: answer === opt ? 'var(--fi-blue)' : 'var(--fi-text-2)', fontWeight: answer === opt ? 600 : 400 }}>
              {answer === opt ? '✓ ' : ''}{opt}
            </button>
          ))}
        </div>
      ) : q.type === 'multi' && q.options?.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 34 }}>
          {q.options.map(opt => {
            const sel = (answer || '').includes(opt);
            return (
              <button key={opt} onClick={() => { const cur = answer ? answer.split(', ').filter(Boolean) : []; onChange(q.id, (sel ? cur.filter(x => x !== opt) : [...cur, opt]).join(', ')); }}
                style={{ padding: '6px 14px', border: '1px solid', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ff)', transition: 'all .12s', borderColor: sel ? 'var(--fi-blue)' : 'var(--fi-border)', background: sel ? 'var(--fi-blue-bg)' : 'var(--fi-page-bg)', color: sel ? 'var(--fi-blue)' : 'var(--fi-text-2)', fontWeight: sel ? 600 : 400 }}>
                {sel ? '✓ ' : ''}{opt}
              </button>
            );
          })}
          <input className="fi-inp" placeholder="Or type your own answer..." style={{ marginTop: 8, width: '100%' }} value={answer && !q.options.some(o => answer.includes(o)) ? answer : ''} onChange={e => onChange(q.id, e.target.value)} />
        </div>
      ) : (
        <textarea className="fi-inp" value={answer || ''} onChange={e => onChange(q.id, e.target.value)} placeholder="Type your answer..." style={{ marginLeft: 34, height: 80, resize: 'vertical', padding: '8px 12px', lineHeight: 1.5 }} />
      )}
    </div>
  );
}

// ── Architecture result ───────────────────────────────────────────────────────
function ArchitectureResult({ arch, onReset }) {
  const [tab, setTab] = useState('diagram');
  const allComps     = (arch.layers || []).flatMap(l => l.components || []);
  const existingCnt  = allComps.filter(c => c.existsInLandscape || c.type === 'existing').length;
  const gapCount     = (arch.gaps || []).length;
  const criticalGaps = (arch.gaps || []).filter(g => g.urgency === 'critical').length;

  const typeColor = t => t === 'existing' ? 'var(--fi-success)' : t === 'new' ? 'var(--fi-blue)' : 'var(--fi-warning)';
  const typeBg    = t => t === 'existing' ? 'var(--fi-success-bg)' : t === 'new' ? 'var(--fi-blue-bg)' : 'var(--fi-warning-bg)';
  const typeLabel = t => t === 'existing' ? '✓ In landscape' : t === 'new' ? '+ Custom build' : '? Recommended';
  const urgColor  = u => u === 'critical' ? 'var(--fi-error)' : u === 'high' ? 'var(--fi-warning)' : 'var(--fi-text-3)';
  const sevColor  = s => s === 'high' ? 'var(--fi-error)' : s === 'medium' ? 'var(--fi-warning)' : 'var(--fi-success)';
  const effColor  = e => ({ low: 'var(--fi-success)', medium: 'var(--fi-warning)', high: 'var(--fi-error)' })[e] || 'var(--fi-text-3)';

  return (
    <div className="fi-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{arch.title}</h2>
              {arch.architecturalPattern && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 3, background: 'var(--fi-blue-bg)', color: 'var(--fi-blue)', fontWeight: 600 }}>{arch.architecturalPattern}</span>}
            </div>
            <p style={{ fontSize: 13, color: 'var(--fi-text-2)', lineHeight: 1.6, maxWidth: 760 }}>{arch.summary}</p>
            {(arch.estimatedDuration || arch.estimatedComplexity) && (
              <div style={{ fontSize: 12, color: 'var(--fi-text-3)', marginTop: 6 }}>
                {arch.estimatedDuration && <span>Timeline: <strong style={{ color: 'var(--fi-text)' }}>{arch.estimatedDuration}</strong></span>}
                {arch.estimatedComplexity && <span style={{ marginLeft: 16 }}>Complexity: <strong style={{ color: arch.estimatedComplexity === 'very_high' ? 'var(--fi-error)' : arch.estimatedComplexity === 'high' ? 'var(--fi-warning)' : 'var(--fi-success)' }}>{arch.estimatedComplexity.replace('_', ' ')}</strong></span>}
              </div>
            )}
          </div>
          <button className="fi-btn sm" onClick={onReset}>← Start over</button>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 14px', background: 'var(--fi-success-bg)', border: '1px solid var(--fi-success-border)', borderRadius: 'var(--r)', fontSize: 13 }}>
            <strong style={{ color: 'var(--fi-success)' }}>{existingCnt}</strong><span style={{ color: 'var(--fi-text-2)', marginLeft: 6 }}>existing tools reused</span>
          </div>
          <div style={{ padding: '8px 14px', background: 'var(--fi-blue-bg)', border: '1px solid var(--fi-blue-border)', borderRadius: 'var(--r)', fontSize: 13 }}>
            <strong style={{ color: 'var(--fi-blue)' }}>{allComps.length - existingCnt}</strong><span style={{ color: 'var(--fi-text-2)', marginLeft: 6 }}>new components</span>
          </div>
          {gapCount > 0 && (
            <div style={{ padding: '8px 14px', background: 'var(--fi-warning-bg)', border: '1px solid var(--fi-warning-border)', borderRadius: 'var(--r)', fontSize: 13 }}>
              <strong style={{ color: criticalGaps > 0 ? 'var(--fi-error)' : 'var(--fi-warning)' }}>{gapCount}</strong>
              <span style={{ color: 'var(--fi-text-2)', marginLeft: 6 }}>capability gap{gapCount !== 1 ? 's' : ''}{criticalGaps > 0 && <span style={{ color: 'var(--fi-error)', marginLeft: 4 }}>({criticalGaps} critical)</span>}</span>
            </div>
          )}
          <div style={{ padding: '8px 14px', background: 'var(--fi-bg)', border: '1px solid var(--fi-border)', borderRadius: 'var(--r)', fontSize: 13 }}>
            <strong>{(arch.integrations || []).length}</strong><span style={{ color: 'var(--fi-text-2)', marginLeft: 6 }}>integrations</span>
          </div>
        </div>

        {/* NFR decisions */}
        {arch.nfrDecisions && Object.values(arch.nfrDecisions).some(Boolean) && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8 }}>
            {Object.entries(arch.nfrDecisions).map(([key, val]) => val ? (
              <div key={key} style={{ padding: '8px 12px', background: 'var(--fi-page-bg)', border: '1px solid var(--fi-border)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fi-text-3)', letterSpacing: '.06em', marginBottom: 3 }}>{key}</div>
                <div style={{ fontSize: 12, color: 'var(--fi-text-2)', lineHeight: 1.4 }}>{val}</div>
              </div>
            ) : null)}
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--fi-border)', marginBottom: 20, flexWrap: 'wrap' }}>
        {[['diagram','Architecture Diagram'],['layers','Component Layers'],['gaps',`Gaps & Recs${gapCount > 0 ? ` (${gapCount})` : ''}`],['integrations','Integrations'],['plan','Risks & Next Steps']].map(([id, label]) => (
          <div key={id} className={'fi-nav-item' + (tab === id ? ' active' : '')} onClick={() => setTab(id)} style={{ fontSize: 13 }}>{label}</div>
        ))}
      </div>

      {/* Diagram */}
      {tab === 'diagram' && (
        <div className="fi-card">
          <div className="fi-card-header">
            <span className="fi-card-title">Architecture Diagram</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['var(--fi-success)','var(--fi-success-bg)','var(--fi-success-border)','Existing'],['var(--fi-blue)','var(--fi-blue-bg)','var(--fi-blue-border)','New / Custom'],['var(--fi-warning)','var(--fi-warning-bg)','var(--fi-warning-border)','Recommended']].map(([c,bg,b,l]) => (
                <span key={l} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: bg, color: c, border: `1px solid ${b}` }}>● {l}</span>
              ))}
            </div>
          </div>
          {arch.mermaidDiagram ? <MermaidDiagram code={arch.mermaidDiagram} /> : <div style={{ padding: 32, textAlign: 'center', color: 'var(--fi-text-3)' }}>No diagram generated</div>}
        </div>
      )}

      {/* Layers */}
      {tab === 'layers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(arch.layers || []).map((layer, li) => (
            <div key={li} className="fi-card">
              <div className="fi-card-header">
                <span className="fi-card-title">{layer.name}</span>
                <span style={{ fontSize: 12, color: 'var(--fi-text-3)' }}>{(layer.components || []).length} components</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 1, background: 'var(--fi-border)' }}>
                {(layer.components || []).map((comp, ci) => (
                  <div key={ci} style={{ background: 'var(--fi-page-bg)', padding: '14px 16px', borderLeft: `3px solid ${typeColor(comp.type)}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{comp.name}</div>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, flexShrink: 0, background: typeBg(comp.type), color: typeColor(comp.type), fontWeight: 600 }}>{typeLabel(comp.type)}</span>
                    </div>
                    {comp.product && comp.product !== comp.name && <div style={{ fontSize: 12, color: 'var(--fi-blue)', marginBottom: 4, fontWeight: 500 }}>{comp.product}</div>}
                    {comp.category && <div style={{ fontSize: 11, color: 'var(--fi-text-3)', marginBottom: 4 }}>{comp.category}</div>}
                    <div style={{ fontSize: 12, color: 'var(--fi-text-2)', lineHeight: 1.5 }}>{comp.role}</div>
                    {comp.notes && <div style={{ fontSize: 11, color: 'var(--fi-blue)', fontStyle: 'italic', borderTop: '1px solid var(--fi-border)', paddingTop: 6, marginTop: 6 }}>Note: {comp.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gaps */}
      {tab === 'gaps' && (
        <div>
          {gapCount === 0 ? (
            <div className="fi-msg success"><span>✓</span><span>All requirements covered by existing landscape. No capability gaps identified.</span></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(arch.gaps || []).map((gap, gi) => (
                <div key={gi} className="fi-card" style={{ borderTop: `3px solid ${urgColor(gap.urgency)}` }}>
                  <div className="fi-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{gap.capability}</span>
                        {gap.urgency && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 700, textTransform: 'uppercase', color: urgColor(gap.urgency), background: urgColor(gap.urgency) + '18', border: `1px solid ${urgColor(gap.urgency)}44` }}>{gap.urgency}</span>}
                        <span className="fi-badge warning" style={{ fontSize: 10 }}>Missing from landscape</span>
                      </div>
                      {gap.impact && <div style={{ fontSize: 12, color: 'var(--fi-text-3)' }}>Impact: {gap.impact}</div>}
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fi-text-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>MARKET RECOMMENDATIONS</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                      {(gap.recommendations || []).map((rec, ri) => (
                        <div key={ri} style={{ padding: 14, border: '1px solid var(--fi-border)', borderRadius: 'var(--r)', background: rec.recommended ? 'var(--fi-blue-bg)' : 'var(--fi-bg)', borderTop: `3px solid ${ri === 0 ? 'var(--gold)' : ri === 1 ? 'var(--silver)' : 'var(--bronze)'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: ri === 0 ? 'var(--gold)' : ri === 1 ? 'var(--silver)' : 'var(--bronze)' }}>#{ri + 1}</span>
                            <strong style={{ fontSize: 13 }}>{rec.name}</strong>
                            {rec.recommended && <span style={{ fontSize: 10, color: 'var(--fi-blue)', fontWeight: 700 }}>★ TOP PICK</span>}
                          </div>
                          {rec.vendor && <div style={{ fontSize: 11, color: 'var(--fi-blue)', marginBottom: 6 }}>{rec.vendor}</div>}
                          <div style={{ fontSize: 12, color: 'var(--fi-text-2)', marginBottom: 8, lineHeight: 1.5 }}>{rec.why}</div>
                          {rec.pros?.map((p, i) => <div key={i} style={{ fontSize: 11, color: 'var(--fi-success)' }}>+ {p}</div>)}
                          {rec.cons?.map((c, i) => <div key={i} style={{ fontSize: 11, color: 'var(--fi-text-3)' }}>- {c}</div>)}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            {rec.estimatedCost && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'var(--gold-bg)', color: 'var(--gold)', fontWeight: 500 }}>{rec.estimatedCost}</span>}
                            {rec.integrationEffort && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, fontWeight: 600, color: effColor(rec.integrationEffort), background: effColor(rec.integrationEffort) + '18' }}>{rec.integrationEffort} effort</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Integrations */}
      {tab === 'integrations' && (
        <div className="fi-card">
          <div className="fi-card-header">
            <span className="fi-card-title">Integration Map</span>
            <span style={{ fontSize: 12, color: 'var(--fi-text-3)' }}>{(arch.integrations || []).length} integrations</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="fi-table">
              <thead><tr><th>From</th><th>To</th><th>Protocol</th><th>Direction</th><th>Data / Events</th><th>Notes</th></tr></thead>
              <tbody>
                {(arch.integrations || []).map((intg, i) => (
                  <tr key={i}>
                    <td><strong>{intg.from}</strong></td>
                    <td><span style={{ color: 'var(--fi-text-3)', marginRight: 6 }}>→</span><strong>{intg.to}</strong></td>
                    <td><span className="fi-badge blue" style={{ fontSize: 11 }}>{intg.protocol || 'API'}</span></td>
                    <td><span className={'fi-badge ' + (intg.direction === 'async' ? 'warning' : intg.direction === 'batch' ? 'muted' : 'info')} style={{ fontSize: 10 }}>{intg.direction || 'sync'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--fi-text-2)', maxWidth: 200 }}>{intg.dataFlows}</td>
                    <td style={{ fontSize: 11, color: 'var(--fi-text-3)', maxWidth: 180 }}>{intg.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan */}
      {tab === 'plan' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="fi-card">
            <div className="fi-card-header"><span className="fi-card-title">Recommended Next Steps</span></div>
            <div className="fi-card-body">
              {(arch.nextSteps || []).map((step, i) => {
                const s = typeof step === 'string' ? { step } : step;
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < arch.nextSteps.length - 1 ? '1px solid var(--fi-border)' : 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--fi-blue)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{s.step || s}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {s.owner    && <span style={{ fontSize: 10, color: 'var(--fi-blue)', background: 'var(--fi-blue-bg)', padding: '1px 6px', borderRadius: 3 }}>{s.owner}</span>}
                        {s.timeline && <span style={{ fontSize: 10, color: 'var(--fi-text-3)' }}>{s.timeline}</span>}
                        {s.effort   && <span style={{ fontSize: 10, color: 'var(--fi-text-3)', background: 'var(--fi-bg)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--fi-border)' }}>{s.effort}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="fi-card">
            <div className="fi-card-header"><span className="fi-card-title">Risks &amp; Mitigations</span></div>
            <div className="fi-card-body">
              {(arch.risks || []).map((risk, i) => {
                const r = typeof risk === 'string' ? { risk, severity: 'medium' } : risk;
                return (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < arch.risks.length - 1 ? '1px solid var(--fi-border)' : 'none' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: r.mitigation ? 4 : 0 }}>
                      <span style={{ flexShrink: 0 }}>{r.severity === 'high' ? '🔴' : r.severity === 'medium' ? '🟡' : '🟢'}</span>
                      <div style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>{r.risk || r}</div>
                    </div>
                    {r.mitigation && <div style={{ fontSize: 12, color: 'var(--fi-text-3)', marginLeft: 24, fontStyle: 'italic' }}>Mitigation: {r.mitigation}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Phase bar ─────────────────────────────────────────────────────────────────
function PhaseBar({ current }) {
  const phases = [
    { n: 1, label: 'Requirement',   desc: 'Define your need' },
    { n: 2, label: 'Clarification', desc: 'Business context' },
    { n: 3, label: 'Deep Dive',     desc: 'NFRs & technicals' },
    { n: 4, label: 'Architecture',  desc: 'Generated result' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, padding: '14px 20px', background: 'var(--fi-page-bg)', border: '1px solid var(--fi-border)', borderRadius: 'var(--r2)' }}>
      {phases.map((p, i) => (
        <React.Fragment key={p.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, transition: 'all .2s', background: current > p.n ? 'var(--fi-success)' : current === p.n ? 'var(--fi-blue)' : 'var(--fi-border)', color: current >= p.n ? '#fff' : 'var(--fi-text-3)' }}>
              {current > p.n ? '✓' : p.n}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: current === p.n ? 'var(--fi-blue)' : current > p.n ? 'var(--fi-success)' : 'var(--fi-text-3)' }}>{p.label}</div>
              <div style={{ fontSize: 10, color: 'var(--fi-text-3)' }}>{p.desc}</div>
            </div>
          </div>
          {i < phases.length - 1 && <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 20, transition: 'background .2s', background: current > p.n ? 'var(--fi-success)' : 'var(--fi-border)' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const EXAMPLES = [
  'Build a real-time order management system integrating SAP S/4HANA and 3PL warehouses using event streaming',
  'Design a customer data platform that unifies all digital touchpoints for real-time personalisation',
  'Create an API gateway and developer portal to expose core retail capabilities to partners and mobile apps',
  'Implement a cloud-native microservices pipeline on Azure with full observability and GitOps',
  'Build a vendor portal for supplier onboarding, invoice processing and payment status tracking',
  'Design a real-time fraud detection system integrated with our payment gateway and core banking',
];

export default function ArchitectPage() {
  const { workspace } = useApp();
  const [phase,        setPhase]     = useState('idle');
  const [requirement,  setReq]       = useState('');
  const [landscape,    setLandscape] = useState(null);
  const [p1Data,       setP1Data]    = useState(null);
  const [p1Answers,    setP1Ans]     = useState({});
  const [p2Data,       setP2Data]    = useState(null);
  const [p2Answers,    setP2Ans]     = useState({});
  const [architecture, setArch]      = useState(null);
  const [error,        setError]     = useState('');
  const loading = phase.endsWith('Loading');

  React.useEffect(() => {
    if (!workspace) return;
    fetch('/api/architect/landscape?workspace=' + encodeURIComponent(workspace))
      .then(r => r.json()).then(setLandscape).catch(() => {});
  }, [workspace]);

  const collectQA = (qs, ans) => (qs || []).map(q => ({ question: q.question, answer: ans[q.id] || '(not answered)' }));

  function handleErr(e, fallback) {
    const m = e.message || '';
    setError(m === 'AI_KEY_MISSING' ? 'No AI API key configured. Go to Settings > AI Provider.' :
      m.startsWith('AI_KEY_INVALID') ? 'AI API key rejected. Check Settings > AI Provider.' :
      m.startsWith('AI_QUOTA_EXCEEDED') ? 'AI quota exceeded. Check your billing.' : m);
    setPhase(fallback);
  }

  async function startPhase1() {
    if (!requirement.trim()) return;
    setError(''); setPhase('phase1Loading');
    try {
      const j = await fetch('/api/architect/phase1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace, requirement }) }).then(r => r.json());
      if (j.error) throw new Error(j.error);
      setP1Data(j); setP1Ans({}); setPhase('phase1');
    } catch (e) { handleErr(e, 'idle'); }
  }

  async function submitPhase1() {
    setError(''); setPhase('phase2Loading');
    try {
      const j = await fetch('/api/architect/phase2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace, requirement, phase1QA: collectQA(p1Data?.questions, p1Answers) }) }).then(r => r.json());
      if (j.error) throw new Error(j.error);
      setP2Data(j); setP2Ans({}); setPhase('phase2');
    } catch (e) { handleErr(e, 'phase1'); }
  }

  async function submitPhase2() {
    setError(''); setPhase('phase3Loading');
    try {
      const allQA = [...collectQA(p1Data?.questions, p1Answers), ...collectQA(p2Data?.questions, p2Answers)];
      const j = await fetch('/api/architect/phase3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace, requirement: p2Data?.refined_requirement || requirement, allQA }) }).then(r => r.json());
      if (j.error) throw new Error(j.error);
      setArch(j); setPhase('result');
    } catch (e) { handleErr(e, 'phase2'); }
  }

  function reset() { setPhase('idle'); setReq(''); setP1Data(null); setP1Ans({}); setP2Data(null); setP2Ans({}); setArch(null); setError(''); }

  const phaseNum = { idle: 1, phase1Loading: 1, phase1: 2, phase2Loading: 2, phase2: 3, phase3Loading: 3, result: 4 }[phase] || 1;

  return (
    <div className="page-wrap mid fi-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Architecture Intelligence</h1>
          <p className="page-sub">AI-guided discovery session: functional requirements, NFRs, and technical specifics, then a full architecture diagram mapped to your LeanIX landscape.</p>
        </div>
      </div>

      <PhaseBar current={phaseNum} />

      {landscape && phase === 'idle' && (
        <div className="fi-msg info" style={{ marginBottom: 20 }}>
          <span>ℹ</span>
          <span>Using <strong>{landscape.vendorCount} vendors</strong> across <strong>{landscape.categories?.length || 0} categories</strong> and <strong>{landscape.appCount.toLocaleString()} applications</strong>{landscape.totalTechFS > landscape.appCount && <span style={{ color: 'var(--fi-text-3)' }}> (+ {(landscape.totalTechFS - landscape.appCount).toLocaleString()} IT components &amp; interfaces)</span>} from your LeanIX landscape.{landscape.vendorCount === 0 && <strong style={{ color: 'var(--fi-warning)', marginLeft: 8 }}>Run Vendor Analysis first for best results.</strong>}</span>
        </div>
      )}

      {error && <div className="fi-msg error" style={{ marginBottom: 16 }}><span>⚠</span><span>{error}</span></div>}

      {/* Phase 0 */}
      {(phase === 'idle' || phase === 'phase1Loading') && (
        <div className="fi-card">
          <div className="fi-card-header"><span className="fi-card-title">Describe Your Business Requirement</span></div>
          <div className="fi-card-body">
            <div className="fi-form-row">
              <label className="fi-label">REQUIREMENT</label>
              <textarea className="fi-inp" value={requirement} onChange={e => setReq(e.target.value)} disabled={loading}
                placeholder="Describe the business capability or system you need to build. Include any constraints, integrations, or scale expectations you already know."
                style={{ height: 120, resize: 'vertical', padding: '10px 12px', lineHeight: 1.6 }} />
              <p className="fi-hint">The AI detects architecture intent (event-driven, API integration, data platform, ERP, etc.) and tailors questions to your specific patterns.</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="fi-label" style={{ marginBottom: 8 }}>QUICK EXAMPLES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EXAMPLES.map(ex => (
                  <button key={ex} className="fi-btn sm ghost" onClick={() => setReq(ex)} disabled={loading}
                    style={{ fontSize: 12, textAlign: 'left', height: 'auto', padding: '5px 10px', whiteSpace: 'normal', lineHeight: 1.4 }}>{ex}</button>
                ))}
              </div>
            </div>
            <button className="fi-btn emphasized" onClick={startPhase1} disabled={loading || !requirement.trim()} style={{ paddingLeft: 24, paddingRight: 24 }}>
              {loading ? <><span className="fi-spin" style={{ fontSize: 12 }}>◌</span> Analysing requirement...</> : 'Start Architecture Session →'}
            </button>
          </div>
        </div>
      )}

      {/* Phase 1 */}
      {(phase === 'phase1' || phase === 'phase2Loading') && p1Data && (
        <div className="fi-card">
          <div className="fi-card-header">
            <div>
              <div className="fi-card-title">Phase 1: Business &amp; Functional Clarification</div>
              <div style={{ fontSize: 12, color: 'var(--fi-text-2)', marginTop: 4 }}>Interpreted as: <em>"{p1Data.summary}"</em></div>
              {p1Data.detectedPatterns?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--fi-text-3)' }}>Detected patterns:</span>
                  {p1Data.detectedPatterns.map(p => (
                    <span key={p} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 3, background: 'var(--fi-blue-bg)', color: 'var(--fi-blue)', fontWeight: 600 }}>{p.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="fi-card-body">
            {(p1Data.questions || []).map((q, i) => (
              <QuestionCard key={q.id} q={q} answer={p1Answers[q.id] || ''} index={i} onChange={(id, val) => setP1Ans(a => ({ ...a, [id]: val }))} />
            ))}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="fi-btn" onClick={reset} disabled={loading}>← Start over</button>
              <button className="fi-btn emphasized" onClick={submitPhase1} disabled={loading}>
                {loading ? <><span className="fi-spin" style={{ fontSize: 12 }}>◌</span> Generating technical questions...</> : 'Continue to Technical Deep Dive →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2 */}
      {(phase === 'phase2' || phase === 'phase3Loading') && p2Data && (
        <div>
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--fi-success-bg)', border: '1px solid var(--fi-success-border)', borderRadius: 'var(--r)', fontSize: 13 }}>
            <span style={{ color: 'var(--fi-success)', fontWeight: 600, marginRight: 8 }}>✓ Phase 1 complete</span>
            <span style={{ color: 'var(--fi-text-2)' }}>{p1Data?.questions?.length || 0} business questions answered</span>
          </div>
          <div className="fi-card" style={{ marginBottom: 16 }}>
            <div className="fi-card-header">
              <div>
                <div className="fi-card-title">Phase 2: Non-Functional &amp; Technical Deep Dive</div>
                {p2Data.refined_requirement && <div style={{ fontSize: 12, color: 'var(--fi-text-2)', marginTop: 4 }}>Refined: <em>"{p2Data.refined_requirement}"</em></div>}
              </div>
            </div>
            {(p2Data.keyInsights?.length > 0 || p2Data.missingCapabilities?.length > 0) && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--fi-border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {p2Data.keyInsights?.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fi-text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>KEY INSIGHTS FROM PHASE 1</div>
                    {p2Data.keyInsights.map((ins, i) => <div key={i} style={{ fontSize: 12, color: 'var(--fi-text-2)', lineHeight: 1.5, marginBottom: 3 }}>• {ins}</div>)}
                  </div>
                )}
                {p2Data.missingCapabilities?.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fi-warning)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>MISSING CAPABILITIES DETECTED</div>
                    {p2Data.missingCapabilities.map((cap, i) => <div key={i} style={{ fontSize: 12, color: 'var(--fi-warning)', lineHeight: 1.5, marginBottom: 3 }}>⚠ {cap}</div>)}
                  </div>
                )}
              </div>
            )}
            <div className="fi-card-body">
              {(p2Data.questions || []).map((q, i) => (
                <QuestionCard key={q.id} q={q} answer={p2Answers[q.id] || ''} index={i} onChange={(id, val) => setP2Ans(a => ({ ...a, [id]: val }))} />
              ))}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="fi-btn" onClick={() => setPhase('phase1')} disabled={loading}>← Back</button>
                <button className="fi-btn emphasized" onClick={submitPhase2} disabled={loading} style={{ paddingLeft: 24, paddingRight: 24 }}>
                  {loading ? <><span className="fi-spin" style={{ fontSize: 12 }}>◌</span> Generating architecture...</> : '⬡ Generate Architecture →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3 loading */}
      {phase === 'phase3Loading' && (
        <div className="fi-card" style={{ marginTop: 16 }}>
          <div className="fi-card-body" style={{ padding: 52, textAlign: 'center' }}>
            <div className="fi-busy" style={{ justifyContent: 'center', marginBottom: 20 }}>
              <div className="fi-busy-dots"><div className="fi-busy-dot" /><div className="fi-busy-dot" /><div className="fi-busy-dot" /></div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Generating architecture...</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fi-text-3)', lineHeight: 2.2 }}>
              Mapping requirements to {landscape?.vendorCount || 0} vendors in your landscape<br />
              Identifying capability gaps and missing middleware<br />
              Selecting named market products for each gap<br />
              Building layered Mermaid architecture diagram<br />
              Generating integration map, NFR summary and next steps
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && architecture && <ArchitectureResult arch={architecture} onReset={reset} />}
    </div>
  );
}
