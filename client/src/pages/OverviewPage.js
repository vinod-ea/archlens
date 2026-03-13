import React, { useEffect, useState } from 'react';
import PageSkeleton from '../components/Skeleton';
import { useApp } from '../App';

const fmtN   = n => n != null ? Number(n).toLocaleString('de-DE') : '\u2014';
const fmtEur = v => v > 0 ? '\u20AC'+Number(v).toLocaleString('de-DE',{maximumFractionDigits:0}) : '\u2014';

function KPITile({ label, value, sub, accent, onClick }) {
  return (
    <div className="fi-tile" onClick={onClick} style={{ cursor:onClick?'pointer':'default' }}>
      <div className="fi-kpi">
        <div className="fi-kpi-label">{label}</div>
        <div className="fi-kpi-value" style={{ color:accent||'var(--fi-text)' }}>{value}</div>
        {sub && <div className="fi-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

function LockerTile({ id, count, pct, onClick }) {
  const cfg = {
    bronze: { label:'Bronze', cls:'bronze', desc:'Missing owner, lifecycle, or stale data', threshold:'< 45 pts' },
    silver: { label:'Silver', cls:'silver', desc:'Has basics, needs enrichment',            threshold:'45–79 pts' },
    gold:   { label:'Gold',   cls:'gold',   desc:'Board-ready, fully enriched',              threshold:'\u2265 80 pts' },
  }[id];
  return (
    <div className="fi-tile" onClick={onClick} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span className={'fi-badge '+cfg.cls} style={{ fontSize:13, padding:'4px 12px' }}>{cfg.label}</span>
        <span style={{ fontSize:11, color:'var(--fi-text-3)' }}>{cfg.threshold}</span>
      </div>
      <div style={{ fontSize:32, fontWeight:700, color:'var(--'+(id==='gold'?'gold':id==='silver'?'silver':'bronze')+')' }}>
        {fmtN(count)}
      </div>
      <div className="fi-progress">
        <div className={'fi-progress-bar '+id} style={{ width:pct+'%' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--fi-text-3)' }}>
        <span>{cfg.desc}</span>
        <span style={{ fontFamily:'var(--fm)', fontWeight:600 }}>{pct}%</span>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { workspace, setPage } = useApp();
  const [d, setD]     = useState(null);
  const [load, setLoad] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    setLoad(true);
    fetch('/api/data/overview?workspace='+encodeURIComponent(workspace))
      .then(r=>r.json()).then(setD).finally(()=>setLoad(false));
  }, [workspace]);

  if (load) return <PageSkeleton kpis={5} cards={0} table={true} tableRows={8} />;
  if (!d) return <div className="page-wrap" style={{ color:'var(--fi-text-3)' }}>No data available. Connect and sync a workspace first.</div>;

  const { byType={}, lockers={}, topIssues=[], lastSync, costByType={}, noOwner={}, eol={} } = d;
  const total     = Object.values(lockers).reduce((s,v)=>s+v,0);
  const totalCost = Object.values(costByType).reduce((s,v)=>s+v,0);

  return (
    <div className="page-wrap fi-fade-in">
      {/* Object Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Architecture Overview</h1>
          <p className="page-sub">{fmtN(total)} total fact sheets in <strong>{workspace}</strong></p>
        </div>
        {lastSync && (
          <div className="page-header-right">
            <span style={{ fontSize:12, color:'var(--fi-text-3)', fontFamily:'var(--fm)' }}>Last sync: {new Date(lastSync).toLocaleString('de-DE')}</span>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="kpi-row">
        <KPITile label="APPLICATIONS"  value={fmtN((byType.Application||0)+(byType.Microservice||0)+(byType.Service||0))} sub="Microservices + Services" onClick={()=>{sessionStorage.setItem('al_fstype','Application');setPage('fsi');}} />
        <KPITile label="INTERFACES"    value={fmtN((byType.Interface||0)+(byType.ITComponent||0))} sub="IT Components" onClick={()=>{sessionStorage.setItem('al_fstype','Interface');setPage('fsi');}} />
        <KPITile label="BUSINESS"      value={fmtN((byType.BusinessCapability||0)+(byType.Process||0)+(byType.UserGroup||0))} sub="Capabilities + Processes" />
        <KPITile label="PROVIDERS"     value={fmtN(byType.Provider||0)} sub="Vendor catalog" onClick={()=>{sessionStorage.setItem('al_fstype','Provider');setPage('fsi');}} />
        {totalCost>0 && <KPITile label="ANNUAL IT COST" value={fmtEur(totalCost)} sub="from cost fields" accent="var(--gold)" />}
      </div>

      {/* Locker tiles */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:12 }}>
          <h2 style={{ fontSize:16, fontWeight:600 }}>Data Quality Distribution</h2>
          <button className="fi-btn ghost sm" onClick={()=>setPage('support')} style={{ fontSize:12 }}>
            ❓ How scoring works
          </button>
        </div>
        <div className="grid-3">
          {['bronze','silver','gold'].map(l => (
            <LockerTile key={l} id={l} count={lockers[l]||0}
              pct={total>0?Math.round((lockers[l]||0)/total*100):0}
              onClick={()=>{sessionStorage.setItem('al_locker',l);setPage('fsi');}} />
          ))}
        </div>
      </div>

      {/* Types + Issues row */}
      <div className="grid-2" style={{ marginBottom:0 }}>
        {/* Fact Sheet types table */}
        <div className="fi-card">
          <div className="fi-card-header">
            <span className="fi-card-title">Fact Sheet Types</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="fi-table compact">
              <thead><tr>
                <th>Type</th><th style={{ textAlign:'right' }}>Total</th>
                <th style={{ textAlign:'right' }}>EOL</th>
                <th style={{ textAlign:'right' }}>No Owner</th>
                <th style={{ textAlign:'right' }}>Annual Cost</th>
              </tr></thead>
              <tbody>
                {Object.entries(byType).sort(([,a],[,b])=>b-a).map(([type,cnt]) => (
                  <tr key={type} style={{ cursor:'pointer' }}
                    onClick={()=>{sessionStorage.setItem('al_fstype',type);setPage('fsi');}}>
                    <td><span style={{ fontWeight:600 }}>{type}</span></td>
                    <td style={{ textAlign:'right', fontFamily:'var(--fm)', fontSize:12 }}>{fmtN(cnt)}</td>
                    <td style={{ textAlign:'right' }}>
                      {eol[type] ? <span className="fi-badge error">{eol[type]}</span> : <span style={{ color:'var(--fi-text-3)' }}>\u2014</span>}
                    </td>
                    <td style={{ textAlign:'right' }}>
                      {noOwner[type] ? <span className="fi-badge warning">{noOwner[type]}</span> : <span style={{ color:'var(--fi-text-3)' }}>\u2014</span>}
                    </td>
                    <td style={{ textAlign:'right', fontFamily:'var(--fm)', fontSize:12 }}>{fmtEur(costByType[type]||0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top issues */}
        <div className="fi-card">
          <div className="fi-card-header">
            <span className="fi-card-title">Priority Issues</span>
            <button className="fi-btn ghost sm" onClick={()=>setPage('fsi')}>View all</button>
          </div>
          {topIssues.length===0
            ? <div style={{ padding:32, textAlign:'center', color:'var(--fi-text-3)', fontSize:13 }}>No issues detected \u2014 excellent data quality!</div>
            : <table className="fi-table compact">
                <thead><tr><th>Fact Sheet</th><th>Type</th><th>Score</th><th>Issues</th></tr></thead>
                <tbody>
                  {topIssues.map(item => (
                    <tr key={item.id} style={{ cursor:'pointer' }}>
                      <td style={{ maxWidth:140 }}>
                        <div className="ellipsis" style={{ fontWeight:600, maxWidth:140 }}>{item.name}</div>
                      </td>
                      <td><span className="fi-badge muted" style={{ fontSize:11 }}>{item.fs_type}</span></td>
                      <td style={{ minWidth:90 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div className="fi-progress" style={{ flex:1, minWidth:40 }}>
                            <div className={'fi-progress-bar '+(item.locker||'bronze')} style={{ width:item.quality_score+'%' }} />
                          </div>
                          <span style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--fi-text-3)', minWidth:26 }}>{item.quality_score}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                          {(item.issues||[]).slice(0,2).map((iss,i)=>(
                            <span key={i} className={'fi-badge '+(/stale|retiring|incomplete/.test(iss)?'warning':'error')} style={{ fontSize:10 }}>
                              {iss.replace(/-/g,' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>
    </div>
  );
}
