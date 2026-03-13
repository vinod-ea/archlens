import React from 'react';

const fmtEur = v => v > 0 ? '\u20AC' + Number(v).toLocaleString('de-DE', { maximumFractionDigits:0 }) : null;
const daysAgo = d => d < 1 ? 'Today' : d < 30 ? d+'d ago' : d < 365 ? Math.floor(d/30)+'mo ago' : Math.floor(d/365)+'yr ago';

function AttrRow({ label, value, color, mono }) {
  if (!value) return null;
  return (
    <div style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:'1px solid var(--fi-border)' }}>
      <span style={{ color:'var(--fi-text-2)', fontSize:12, fontWeight:600, minWidth:110, flexShrink:0 }}>{label}</span>
      <span style={{ color:color||'var(--fi-text)', fontSize:13, fontFamily:mono?'var(--fm)':undefined, flex:1, wordBreak:'break-word' }}>{value}</span>
    </div>
  );
}

export default function Drawer({ item, onClose }) {
  if (!item) return null;
  const q = item.quality_score || 0;
  const l = item.locker || 'bronze';
  const lColor = l==='gold' ? 'var(--gold)' : l==='silver' ? 'var(--silver)' : 'var(--bronze)';
  const lClass = 'fi-badge '+l;
  const lLabel = l==='gold'?'Gold':l==='silver'?'Silver':'Bronze';
  const issues  = item.issues  || [];
  const vendors = item.vendors || [];
  const tags    = item.tags    || [];
  const days = item.updated_at ? Math.floor((Date.now()-new Date(item.updated_at))/86400000) : 9999;

  const issueClass = iss => /stale|retiring|incomplete/.test(iss) ? 'fi-badge warning' : 'fi-badge error';

  const actions = [
    !item.owner && 'Assign a responsible owner in LeanIX',
    (!item.description||item.description.length<10) && 'Add a meaningful description',
    (!item.lifecycle||item.lifecycle==='Not set') && 'Set the lifecycle phase',
    issues.includes('eol') && 'Plan migration — End of Life fact sheet',
    days > 180 && 'Re-validate data (not updated in '+Math.floor(days/30)+' months)',
    (item.completion||0) < 0.5 && 'Complete missing fields ('+Math.round((item.completion||0)*100)+'% done)',
  ].filter(Boolean);

  return (
    <>
      <div className="fi-panel-overlay" onClick={onClose} />
      <div className="fi-panel">
        {/* Header */}
        <div className="fi-panel-header">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:17, marginBottom:6, lineHeight:1.3 }}>{item.name}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                <span className="fi-badge muted">{item.fs_type}</span>
                <span className={lClass} style={{ fontWeight:600 }}>{lLabel}</span>
                <span style={{ fontSize:12, color:'var(--fi-text-3)' }}>Quality: {q}%</span>
              </div>
            </div>
            <button onClick={onClose} style={{ border:'1px solid var(--fi-border)', borderRadius:'var(--r)', background:'transparent', color:'var(--fi-text-2)', width:32, height:32, fontSize:16, cursor:'pointer', flexShrink:0 }}>✕</button>
          </div>
          {/* Quality bar */}
          <div style={{ marginTop:12 }}>
            <div className="fi-progress">
              <div className={'fi-progress-bar '+l} style={{ width:q+'%' }} />
            </div>
          </div>
        </div>

        <div className="fi-panel-body">
          {/* Attributes */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--fi-text-2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>ATTRIBUTES</div>
            <AttrRow label="Owner"       value={item.owner || 'Not assigned'} color={item.owner?'var(--fi-text)':'var(--fi-error)'} />
            <AttrRow label="Owner Email" value={item.owner_email} />
            <AttrRow label="Lifecycle"   value={item.lifecycle} color={/end.?of.?life/i.test(item.lifecycle||'')?'var(--fi-error)':'var(--fi-text)'} />
            <AttrRow label="Updated"     value={daysAgo(days)} color={days>365?'var(--fi-error)':days>180?'var(--fi-warning)':'var(--fi-text)'} />
            <AttrRow label="Completion"  value={Math.round((item.completion||0)*100)+'%'} />
            <AttrRow label="Annual Cost" value={fmtEur(item.annual_cost)} color="var(--gold)" />
            <AttrRow label="Criticality" value={item.criticality} />
            <AttrRow label="Tech Fit"    value={item.tech_fit} />
            <AttrRow label="Description" value={item.description} />
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--fi-text-2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>ISSUES</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {issues.map((iss,i) => <span key={i} className={issueClass(iss)}>{iss.replace(/-/g,' ')}</span>)}
              </div>
            </div>
          )}

          {/* Action items */}
          {actions.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--fi-text-2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>RECOMMENDED ACTIONS</div>
              {actions.map((a, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'9px 12px', borderLeft:'3px solid var(--fi-blue)', background:'var(--fi-blue-bg)', marginBottom:6, borderRadius:'0 var(--r) var(--r) 0', fontSize:13, color:'var(--fi-text)' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--fi-blue)', flexShrink:0, paddingTop:1 }}>0{i+1}</span>
                  {a}
                </div>
              ))}
            </div>
          )}

          {/* Vendors */}
          {vendors.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--fi-text-2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>LINKED PROVIDERS</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {vendors.map((v,i) => <span key={i} className="fi-badge blue">{v}</span>)}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--fi-text-2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>TAGS</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {tags.map((t,i) => <span key={i} className="fi-badge muted">{t}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="fi-panel-footer">
          <button onClick={onClose} className="fi-btn">Close</button>
        </div>
      </div>
    </>
  );
}
