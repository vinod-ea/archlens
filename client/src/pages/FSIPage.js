import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import Drawer from '../components/Drawer';

const LOCKERS = [
  { id:'bronze', label:'Bronze', color:'var(--bronze)', bgColor:'var(--bronze-bg)' },
  { id:'silver', label:'Silver', color:'var(--silver)', bgColor:'var(--silver-bg)' },
  { id:'gold',   label:'Gold',   color:'var(--gold)',   bgColor:'var(--gold-bg)'   },
];

const fmtEur = v => v > 0 ? '\u20AC'+Number(v).toLocaleString('de-DE',{maximumFractionDigits:0}) : null;
const daysAgo = d => d<1?'Today':d<30?d+'d':d<365?Math.floor(d/30)+'mo':Math.floor(d/365)+'yr';

function FSRow({ item, lColor, onClick }) {
  const issues  = item.issues  || [];
  const vendors = item.vendors || [];
  const days = item.updated_at ? Math.floor((Date.now()-new Date(item.updated_at))/86400000) : 9999;
  const cost = fmtEur(item.annual_cost);
  const updColor = days>365?'var(--fi-error)':days>180?'var(--fi-warning)':'var(--fi-text-2)';
  return (
    <tr onClick={onClick} style={{ cursor:'pointer' }}>
      <td>
        <div style={{ fontWeight:600, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
        {item.description && <div style={{ fontSize:11, color:'var(--fi-text-3)', marginTop:2, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.description}</div>}
      </td>
      <td><span className="fi-badge muted" style={{ fontSize:11 }}>{item.fs_type}</span></td>
      <td>
        {item.owner
          ? <span style={{ fontSize:13 }}>{item.owner}</span>
          : <span className="fi-badge error" style={{ fontSize:11 }}>Not assigned</span>}
      </td>
      <td>
        <span style={{ fontSize:13, color:/end.?of.?life/i.test(item.lifecycle||'')?'var(--fi-error)':'var(--fi-text)' }}>
          {item.lifecycle||'\u2014'}
        </span>
      </td>
      <td><span style={{ fontSize:12, color:updColor, fontFamily:'var(--fm)' }}>{daysAgo(days)}</span></td>
      <td style={{ minWidth:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div className="fi-progress" style={{ flex:1, minWidth:50 }}>
            <div className={'fi-progress-bar '+(item.locker||'bronze')} style={{ width:item.quality_score+'%' }} />
          </div>
          <span style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--fi-text-3)', minWidth:26 }}>{item.quality_score}%</span>
        </div>
      </td>
      <td>
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {issues.slice(0,2).map((iss,i) => (
            <span key={i} className={'fi-badge '+(/stale|retiring|incomplete/.test(iss)?'warning':'error')} style={{ fontSize:10 }}>
              {iss.replace(/-/g,' ')}
            </span>
          ))}
        </div>
      </td>
      <td>
        {cost && <span style={{ fontFamily:'var(--fm)', fontSize:12, color:'var(--gold)' }}>{cost}</span>}
        {vendors.length>0 && <div style={{ fontSize:11, color:'var(--fi-text-3)', marginTop:2 }}>{vendors[0]}{vendors.length>1?' +'+(vendors.length-1):''}</div>}
      </td>
    </tr>
  );
}

export default function FSIPage() {
  const { workspace } = useApp();
  const [types,   setTypes]   = useState([]);
  const [fsType,  setFsType]  = useState('all');
  const [locker,  setLocker]  = useState('bronze');
  const [search,  setSearch]  = useState('');
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [drawer,  setDrawer]  = useState(null);

  useEffect(() => {
    if (!workspace) return;
    const lk = sessionStorage.getItem('al_locker');
    const ft = sessionStorage.getItem('al_fstype');
    if (lk) { setLocker(lk); sessionStorage.removeItem('al_locker'); }
    if (ft) { setFsType(ft); sessionStorage.removeItem('al_fstype'); }
    fetch('/api/data/types?workspace='+encodeURIComponent(workspace)).then(r=>r.json()).then(setTypes);
  }, [workspace]);

  const loadItems = useCallback(async (pg=1, reset=false) => {
    if (!workspace) return;
    setLoading(true);
    const p = new URLSearchParams({ workspace, locker, page:pg, limit:50 });
    if (fsType!=='all') p.set('fs_type',fsType);
    if (search) p.set('search',search);
    const r = await fetch('/api/data/factsheets?'+p).then(x=>x.json()).catch(()=>({items:[],total:0}));
    setItems(prev => (reset||pg===1)?r.items:[...prev,...r.items]);
    setTotal(r.total); setPage(pg);
    setLoading(false);
  }, [workspace, locker, fsType, search]);

  useEffect(() => { loadItems(1,true); }, [locker,fsType,search]);

  const lk = LOCKERS.find(l=>l.id===locker)||LOCKERS[0];
  const lockerCount = lid => types.filter(t=>fsType==='all'||t.fs_type===fsType).reduce((s,t)=>s+(t[lid]||0),0);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--fi-bg)' }}>
      {/* Type tab bar */}
      <div style={{ display:'flex', background:'var(--fi-page-bg)', borderBottom:'1px solid var(--fi-border)', overflowX:'auto', flexShrink:0 }}>
        {[{fs_type:'all',total:types.reduce((s,t)=>s+t.total,0)},...types].map(t => (
          <div key={t.fs_type}
            className={'fi-nav-item'+(fsType===t.fs_type?' active':'')}
            onClick={()=>setFsType(t.fs_type)}>
            {t.fs_type==='all'?'All Types':t.fs_type}
            <span className="fi-nav-badge">{(t.total||0).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="fi-toolbar">
        {/* Locker filter */}
        <div style={{ display:'flex', border:'1px solid var(--fi-border)', borderRadius:'var(--r)', overflow:'hidden' }}>
          {LOCKERS.map(l => {
            const cnt = lockerCount(l.id);
            const on  = locker===l.id;
            return (
              <button key={l.id} onClick={()=>setLocker(l.id)}
                style={{ padding:'0 14px', height:36, border:'none', borderRight:'1px solid var(--fi-border)',
                  background:on?l.bgColor:'var(--fi-page-bg)', color:on?l.color:'var(--fi-text-2)',
                  fontSize:13, fontWeight:on?600:400, cursor:'pointer', fontFamily:'var(--ff)',
                  display:'flex', alignItems:'center', gap:7, transition:'all .12s' }}>
                {l.label}
                <span style={{ fontFamily:'var(--fm)', fontSize:11, padding:'1px 6px', borderRadius:3,
                  background:on?'rgba(0,0,0,.08)':'var(--fi-bg)', color:on?l.color:'var(--fi-text-3)' }}>
                  {cnt.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        <input className="fi-inp" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search name, owner, lifecycle..."
          style={{ width:240 }} />

        <div className="fi-toolbar-spacer" />

        <span style={{ fontSize:12, color:'var(--fi-text-3)' }}>
          {total.toLocaleString()} items{loading?' \u00B7 loading...':''}
        </span>
        <a href={'/api/data/export?workspace='+encodeURIComponent(workspace)+'&locker='+locker+(fsType!=='all'?'&fs_type='+fsType:'')}
          className="fi-btn sm">Export CSV</a>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', background:'var(--fi-page-bg)' }}>
        {!loading && items.length===0 ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--fi-text-3)' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>
              {locker==='gold'?'🏆':locker==='silver'?'🥈':'🥉'}
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--fi-text-2)', marginBottom:6 }}>No {lk.label} fact sheets</div>
            <div style={{ fontSize:13 }}>
              {locker==='bronze'
                ? 'All fact sheets have sufficient data quality.'
                : 'No fact sheets in this locker for the current filter.'}
            </div>
          </div>
        ) : (
          <>
            <table className="fi-table" style={{ tableLayout:'fixed', width:'100%' }}>
              <colgroup>
                <col style={{ width:'22%' }} /><col style={{ width:'10%' }} /><col style={{ width:'14%' }} />
                <col style={{ width:'10%' }} /><col style={{ width:'7%' }}  /><col style={{ width:'12%' }} />
                <col style={{ width:'14%' }} /><col style={{ width:'11%' }} />
              </colgroup>
              <thead style={{ position:'sticky', top:0, zIndex:2 }}>
                <tr><th>Name</th><th>Type</th><th>Owner</th><th>Lifecycle</th><th>Updated</th><th>Quality</th><th>Issues</th><th>Cost / Vendor</th></tr>
              </thead>
              <tbody>
                {items.map(item => <FSRow key={item.id} item={item} lColor={lk.color} onClick={()=>setDrawer(item)} />)}
              </tbody>
            </table>
            {items.length < total && (
              <div style={{ padding:16, textAlign:'center', borderTop:'1px solid var(--fi-border)' }}>
                <button className="fi-btn" onClick={()=>loadItems(page+1)} disabled={loading}>
                  {loading ? 'Loading...' : 'Load more (' + (total-items.length).toLocaleString() + ' remaining)'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {drawer && <Drawer item={drawer} onClose={()=>setDrawer(null)} />}
    </div>
  );
}
