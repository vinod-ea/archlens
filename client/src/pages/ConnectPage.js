import React, { useState, useEffect } from 'react';
import { useApp } from '../App';

function StepRow({ status, label, note, pct }) {
  const cfg = {
    idle:    { cls:'fi-step',         dot:'○', txt:'' },
    active:  { cls:'fi-step active',  dot:'◌', txt:'var(--fi-blue)', spin:true },
    success: { cls:'fi-step success', dot:'✓', txt:'var(--fi-success)' },
    error:   { cls:'fi-step error',   dot:'✗', txt:'var(--fi-error)' },
  }[status] || { cls:'fi-step', dot:'○', txt:'' };
  return (
    <div>
      <div className={cfg.cls} style={{ justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className="fi-step-dot" style={{ animation:cfg.spin?'fi-spin .8s linear infinite':undefined }}>{cfg.dot}</div>
          <span style={{ fontSize:13, fontWeight:status==='active'?600:400 }}>{label}</span>
        </div>
        {note && <span style={{ fontSize:11, fontFamily:'var(--fm)', color:cfg.txt||'var(--fi-text-3)', maxWidth:280, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{note}</span>}
      </div>
      {status==='active' && pct != null && pct > 0 && (
        <div style={{ margin:'2px 0 4px 42px' }}>
          <div className="fi-progress"><div className="fi-progress-bar" style={{ width:pct+'%' }} /></div>
        </div>
      )}
    </div>
  );
}

export default function ConnectPage() {
  const { setConnected, setWorkspace, setPage, toast } = useApp();
  const [ws,          setWs]          = useState('');
  const [apiKey,      setApiKey]      = useState('');
  const [phase,       setPhase]       = useState('idle');
  const [steps,       setSteps]       = useState({});
  const [types,       setTypes]       = useState([]);
  const [prog,        setProg]        = useState({});
  const [summary,     setSummary]     = useState(null);
  const [err,         setErr]         = useState('');
  const [savedWs,     setSavedWs]     = useState(null);
  const [checking,    setChecking]    = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const busy = phase === 'connecting' || phase === 'syncing';

  // On mount — check for saved workspace and auto-navigate
  useEffect(() => {
    fetch('/api/connect/saved')
      .then(r => r.json())
      .then(data => {
        if (data.found) {
          setSavedWs(data);
          setWorkspace(data.host);
          setConnected(true);
          setPage('overview');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, []); // eslint-disable-line

  function upStep(k, s, n) { setSteps(p => ({ ...p, [k]:{ status:s, note:n } })); }

  async function handleSync(e) {
    if (e) e.preventDefault();
    const wsv = ws.trim(), kv = apiKey.trim();
    if (!wsv || !kv) { toast('Enter workspace URL and API key','err'); return; }
    setPhase('connecting'); setErr(''); setSteps({}); setTypes([]); setProg({}); setSummary(null);
    upStep('auth','active','Connecting…');
    let host, discoveredTypes;
    try {
      const r = await fetch('/api/connect', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ workspace:wsv, apiKey:kv })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error||'HTTP '+r.status);
      host = j.host; discoveredTypes = j.types||[];
      upStep('auth','success','Authenticated → '+host);
    } catch(ex) { upStep('auth','error',ex.message); setErr(ex.message); setPhase('idle'); return; }

    const withData = discoveredTypes.filter(t => t.count > 0);
    upStep('discover','success',withData.length+' types · '+withData.reduce((s,t)=>s+t.count,0).toLocaleString()+' records');
    setTypes(withData);
    const initProg = {};
    withData.forEach(t => { initProg[t.name]={ fetched:0, total:t.count, done:false, active:false }; });
    setProg(initProg);
    setPhase('syncing');

    const params = new URLSearchParams({ workspace:wsv, apiKey:kv, fsTypes:'all' });
    const es = new EventSource('/api/sync/stream?'+params);
    es.onmessage = ev => {
      let msg; try { msg=JSON.parse(ev.data); } catch { return; }
      if (msg.event==='type_start')    setProg(p=>({...p,[msg.fsType]:{...p[msg.fsType],active:true,fetched:0,total:msg.total}}));
      if (msg.event==='type_progress') setProg(p=>({...p,[msg.fsType]:{...p[msg.fsType],active:true,fetched:msg.fetched,total:msg.total}}));
      if (msg.event==='type_done')     setProg(p=>({...p,[msg.fsType]:{fetched:msg.count,total:msg.count,done:true,active:false,bronze:msg.bronze,silver:msg.silver,gold:msg.gold}}));
      if (msg.event==='type_error')    setProg(p=>({...p,[msg.fsType]:{...(p[msg.fsType]||{}),done:true,active:false,error:msg.error}}));
      if (msg.event==='done') {
        es.close(); setSummary(msg); setPhase('done');
        setWorkspace(host); setConnected(true);
        toast('Synced '+msg.total?.toLocaleString()+' fact sheets','ok');
        setTimeout(()=>setPage('overview'),1200);
      }
      if (msg.event==='error') { es.close(); setErr(msg.msg); setPhase('idle'); }
    };
    es.onerror = () => { es.close(); setErr('Stream error — check server console'); setPhase('idle'); };
  }

  async function handleReconnect() {
    setPhase('connecting');
    try {
      const r = await fetch('/api/connect/saved');
      const data = await r.json();
      if (!data.found) throw new Error('No saved workspace');
      setWorkspace(data.host); setConnected(true);
      toast('Reconnected to '+data.host,'ok');
      setPage('overview');
    } catch(e) { setErr(e.message); setPhase('idle'); }
  }

  // Boot skeleton
  if (checking) return (
    <div className="page-wrap narrow">
      {[1,2].map(i => (
        <div key={i} className="fi-card" style={{ marginBottom:16 }}>
          <div className="fi-card-header">
            <div style={{ height:14, width:160, borderRadius:3, background:'var(--fi-border)', animation:'fi-shimmer 1.4s ease-in-out infinite' }} />
          </div>
          <div className="fi-card-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[200,150,220].map((w,j) => (
              <div key={j} style={{ height:11, width:w, borderRadius:3, background:'var(--fi-border)', animation:'fi-shimmer 1.4s ease-in-out infinite', animationDelay:`${j*0.12}s` }} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ display:'flex', justifyContent:'center', padding:16 }}>
        <div className="fi-busy">
          <div className="fi-busy-dots"><div className="fi-busy-dot"/><div className="fi-busy-dot"/><div className="fi-busy-dot"/></div>
          <span style={{ fontSize:13 }}>Checking for saved workspace…</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-wrap narrow">
      {/* Header */}
      <div className="page-header" style={{ paddingBottom:16, borderBottom:'1px solid var(--fi-border)' }}>
        <div className="page-header-left">
          <h1 className="page-title">Connect EA Workspace</h1>
          <p className="page-sub">
            Authenticate and sync your LeanIX fact sheet data to the local database.
            Accepts <code style={{ background:'var(--fi-bg)', padding:'1px 5px', borderRadius:3, fontSize:12 }}>{'{company}'}.leanix.net</code> or full workspace URLs.
          </p>
        </div>
      </div>

      {/* Saved workspace banner */}
      {savedWs && !showNewForm && (
        <div className="fi-card" style={{ marginBottom:20, borderLeft:'4px solid var(--fi-success)' }}>
          <div className="fi-card-body">
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--fi-success)', boxShadow:'0 0 6px var(--fi-success)' }} />
                  <span style={{ fontWeight:700, fontSize:14 }}>Saved Workspace</span>
                  {savedWs.tokenExpired && <span className="fi-badge warning" style={{ fontSize:11 }}>Token may have expired</span>}
                </div>
                <div style={{ fontSize:13, color:'var(--fi-blue)', fontFamily:'var(--fm)', marginBottom:4 }}>{savedWs.host}</div>
                <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--fi-text-3)' }}>
                  {savedWs.lastSync && <span>Last sync: {new Date(savedWs.lastSync).toLocaleString()}</span>}
                  {savedWs.fsCount > 0 && <span>{savedWs.fsCount.toLocaleString()} fact sheets in local DB</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button className="fi-btn sm" onClick={()=>setShowNewForm(true)} disabled={busy}>+ New Workspace</button>
                <button className="fi-btn emphasized sm" onClick={handleReconnect} disabled={busy}>
                  {busy ? <><span className="fi-spin" style={{ fontSize:11 }}>◌</span> Reconnecting…</> : '⚡ Reconnect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credentials form */}
      {(!savedWs || showNewForm) && (
        <div className="fi-card" style={{ marginBottom:20 }}>
          <div className="fi-card-header">
            <span className="fi-card-title">Workspace Credentials</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--fi-text-3)' }}>Stored locally — never shared</span>
              {showNewForm && savedWs && (
                <button className="fi-btn xs" onClick={()=>setShowNewForm(false)}>← Back</button>
              )}
            </div>
          </div>
          <form onSubmit={handleSync} className="fi-card-body" style={{ display:'flex', flexDirection:'column', gap:0 }}>
            <div className="fi-form-row">
              <label className="fi-label">WORKSPACE URL</label>
              <input className="fi-inp" value={ws} onChange={e=>setWs(e.target.value)} disabled={busy}
                placeholder="{company}.leanix.net  or  https://{company}.leanix.net/{WorkspaceName}" />
              <p className="fi-hint">Replace <code>{'{company}'}</code> with your organisation's LeanIX subdomain</p>
            </div>
            <div className="fi-form-row">
              <label className="fi-label">API KEY (TECHNICAL USER TOKEN)</label>
              <input className="fi-inp" type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} disabled={busy}
                placeholder="Paste your LeanIX Technical User token" />
              <p className="fi-hint">LeanIX → Administration → Technical Users → Generate Token</p>
            </div>

            {phase !== 'idle' && (
              <div style={{ borderTop:'1px solid var(--fi-border)', paddingTop:16, marginTop:4, marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  {phase==='done'
                    ? <span style={{ fontSize:14, fontWeight:600, color:'var(--fi-success)' }}>✓ Sync complete</span>
                    : <div className="fi-busy"><div className="fi-busy-dots"><div className="fi-busy-dot"/><div className="fi-busy-dot"/><div className="fi-busy-dot"/></div><span>Syncing workspace…</span></div>
                  }
                </div>
                <StepRow status={steps.auth?.status||'idle'}     label="Authenticate with LeanIX"  note={steps.auth?.note} />
                <StepRow status={steps.discover?.status||'idle'} label="Discover fact sheet types" note={steps.discover?.note} />
                {types.map(t => {
                  const p = prog[t.name]||{fetched:0,total:t.count,done:false};
                  const pct = p.total>0?Math.round(p.fetched/p.total*100):0;
                  const status = p.error?'error':p.done?'success':p.active?'active':'idle';
                  const note = p.error ? 'Error: '+p.error
                    : p.done   ? p.fetched.toLocaleString()+' records • Gold:'+p.gold+' Silver:'+p.silver+' Bronze:'+p.bronze
                    : p.active ? p.fetched.toLocaleString()+' / '+p.total.toLocaleString()+' ('+pct+'%)'
                    : t.count.toLocaleString()+' records';
                  return <StepRow key={t.name} status={status} label={t.name} note={note} pct={p.active?pct:null}/>;
                })}
                {summary && <div className="fi-msg success" style={{ marginTop:12, marginBottom:0 }}><span>✓</span><span><strong>{summary.total?.toLocaleString()}</strong> fact sheets saved — Gold: {summary.gold} · Silver: {summary.silver} · Bronze: {summary.bronze}</span></div>}
                {err && phase!=='idle' && <div className="fi-msg error" style={{ marginTop:12, marginBottom:0 }}><span>⚠</span><span>{err}</span></div>}
              </div>
            )}
            {err && phase==='idle' && <div className="fi-msg error" style={{ marginBottom:16 }}><span>⚠</span><span>{err}</span></div>}
            <button type="submit" className="fi-btn emphasized" disabled={busy} style={{ alignSelf:'flex-start', paddingLeft:24, paddingRight:24 }}>
              {busy ? <><span className="fi-spin" style={{ fontSize:12 }}>◌</span> Syncing…</> : 'Connect & Sync Workspace'}
            </button>
          </form>
        </div>
      )}

      <div className="fi-msg info">
        <span>ℹ</span>
        <span><strong>Data stays local.</strong> Credentials and synced data are stored only in the local database on this machine. The only external network calls are to the LeanIX API (to fetch your data) and to your AI provider (Claude/OpenAI/DeepSeek) for analysis features.</span>
      </div>
    </div>
  );
}
