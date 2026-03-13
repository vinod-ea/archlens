import React, { useState, useEffect } from 'react';
import { useApp } from '../App';

const CRON_PRESETS = [
  { label:'Every hour',           expr:'0 * * * *'   },
  { label:'Daily at 6:00 AM',     expr:'0 6 * * *'   },
  { label:'Daily at midnight',    expr:'0 0 * * *'   },
  { label:'Weekly Mon 7:00 AM',   expr:'0 7 * * 1'   },
  { label:'Weekly Sun midnight',  expr:'0 0 * * 0'   },
  { label:'Monthly 1st 3:00 AM',  expr:'0 3 1 * *'   },
];

function FormRow({ label, hint, children }) {
  return (
    <div className="fi-form-row">
      <label className="fi-label">{label}</label>
      {children}
      {hint && <p className="fi-hint">{hint}</p>}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div className="fi-card" style={{ marginBottom:20 }}>
      <div className="fi-card-header">
        <span className="fi-card-title">{title}</span>
        {action}
      </div>
      <div className="fi-card-body">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { workspace, toast } = useApp();
  const [s,        setS]        = useState({});
  const [crons,    setCrons]    = useState([]);
  const [jobs,     setJobs]     = useState([]);
  const [dbStatus, setDbStatus] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('db');
  const [cronLabel,setCronLabel]= useState('');
  const [cronExpr, setCronExpr] = useState('0 6 * * *');
  const [cronTypes,setCronTypes]= useState('all');

  useEffect(() => { loadSettings(); if (workspace) { loadCrons(); loadJobs(); } }, [workspace]);

  async function loadSettings() {
    const r = await fetch('/api/settings').then(x=>x.json()).catch(()=>({}));
    setS(r);
  }
  async function loadCrons() {
    const r = await fetch('/api/cron?workspace='+encodeURIComponent(workspace)).then(x=>x.json()).catch(()=>[]);
    setCrons(Array.isArray(r)?r:[]);
  }
  async function loadJobs() {
    const r = await fetch('/api/sync/jobs?workspace='+encodeURIComponent(workspace)).then(x=>x.json()).catch(()=>[]);
    setJobs(Array.isArray(r)?r:[]);
  }
  async function saveSettings(updates) {
    setSaving(true);
    await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)});
    await loadSettings(); setSaving(false);
    toast('Settings saved','ok');
    
  }
  async function testDB() {
    const r = await fetch('/api/settings/db-test').then(x=>x.json()).catch(e=>({ok:false,error:e.message}));
    setDbStatus(r);
    toast(r.ok?'Database connected \u00B7 '+r.records+' records':r.error, r.ok?'ok':'err');
  }
  async function addCron(e) {
    e.preventDefault();
    if (!workspace) { toast('Connect a workspace first','err'); return; }
    const r = await fetch('/api/cron',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace,label:cronLabel,cron_expr:cronExpr,fs_types:cronTypes})});
    const j = await r.json();
    if (j.error) { toast(j.error,'err'); return; }
    toast('Schedule created','ok'); setCronLabel(''); await loadCrons();
  }

  const TABS = [
    { id:'db',      label:'Database' },
    { id:'ai',      label:'AI Provider' },
    { id:'cron',    label:'Scheduler' },
    { id:'history', label:'Sync History' },
  ];

  return (
    <div className="page-wrap mid">
      <div className="page-header" style={{ marginBottom:20 }}>
        <div className="page-header-left">
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Database, AI provider, scheduler and sync history</p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="fi-tabs">
        {TABS.map(t => (
          <button key={t.id} className={'fi-tab-btn'+(tab===t.id?' active':'')} onClick={()=>setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DATABASE */}
      {tab==='db' && (
        <Section title="Database Configuration"
          action={dbStatus && <span className={'fi-badge '+(dbStatus.ok?'success':'error')} style={{ fontSize:12 }}>{dbStatus.ok?'Connected \u00B7 '+dbStatus.records+' records':'Error: '+dbStatus.error}</span>}>
          <FormRow label="DATABASE TYPE" hint="SQLite requires no configuration. MySQL/Postgres require credentials below.">
            <select className="fi-select" value={s.db_type||'sqlite'} onChange={e=>setS({...s,db_type:e.target.value})}>
              <option value="sqlite">SQLite (default \u00B7 zero configuration)</option>
              <option value="mysql">MySQL</option>
              <option value="postgres">PostgreSQL</option>
            </select>
          </FormRow>
          {(s.db_type==='mysql'||s.db_type==='postgres') && (
            <div className="grid-2">
              <FormRow label="HOST"><input className="fi-inp" value={s.db_host||''} onChange={e=>setS({...s,db_host:e.target.value})} placeholder="localhost" /></FormRow>
              <FormRow label="PORT"><input className="fi-inp" value={s.db_port||''} onChange={e=>setS({...s,db_port:e.target.value})} placeholder={s.db_type==='mysql'?'3306':'5432'} /></FormRow>
              <FormRow label="DATABASE"><input className="fi-inp" value={s.db_name||''} onChange={e=>setS({...s,db_name:e.target.value})} placeholder="archlens" /></FormRow>
              <FormRow label="USERNAME"><input className="fi-inp" value={s.db_user||''} onChange={e=>setS({...s,db_user:e.target.value})} placeholder="archlens" /></FormRow>
              <FormRow label="PASSWORD"><input className="fi-inp" type="password" value={s.db_password||''} onChange={e=>setS({...s,db_password:e.target.value})} placeholder="password" /></FormRow>
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button className="fi-btn" onClick={testDB}>Test Connection</button>
            <button className="fi-btn emphasized" disabled={saving} onClick={()=>saveSettings(s)}>{saving?'Saving...':'Save Changes'}</button>
          </div>
          <hr className="fi-sep" />
          <div className="fi-msg info" style={{ marginBottom:0 }}>
            <span>&#9432;</span>
            <div><strong>Recommendation:</strong> Use SQLite for local/single-user deployments. Switch to MySQL/PostgreSQL for team environments. <strong>Restart the server after changing database type.</strong></div>
          </div>
        </Section>
      )}

      {/* AI PROVIDER */}
      {tab==='ai' && (
        <Section title="AI Provider">
          {s.ai_provider_active && (
            <div className="fi-msg info" style={{ marginBottom:16 }}>
              <span>&#9432;</span>
              <span>Active provider: <strong>{s.ai_provider_active}</strong></span>
            </div>
          )}
          <FormRow label="PROVIDER" hint="Used for all AI features: Vendor Analysis, Resolution, Duplicate Detection, and Architecture AI.">
            <select className="fi-select" value={s.ai_provider||'claude'} onChange={e=>setS({...s,ai_provider:e.target.value})}>
              <option value="claude">Anthropic Claude (claude-sonnet-4)</option>
              <option value="openai">OpenAI (gpt-4o)</option>
              <option value="gemini">Google AI Gemini (gemini-1.5-pro)</option>
              <option value="deepseek">DeepSeek (deepseek-chat)</option>
            </select>
          </FormRow>
          <FormRow label="API KEY" hint="Stored in local database only. Never sent to LeanIX.">
            <input className="fi-inp" type="password" value={s.ai_api_key||''} onChange={e=>setS({...s,ai_api_key:e.target.value})}
              placeholder={s.ai_api_key ? '(configured -- enter new key to update)' : {
                claude:   'sk-ant-api03-...',
                openai:   'sk-...',
                gemini:   'AIza...',
                deepseek: 'sk-...',
              }[s.ai_provider||'claude'] || 'your-api-key'} />
          </FormRow>
          {{
            claude:   <div className="fi-msg info" style={{marginBottom:0,marginTop:4}}><span>&#9432;</span><span>Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{color:'var(--fi-blue)'}}>console.anthropic.com</a>. Recommended for best analysis quality.</span></div>,
            openai:   <div className="fi-msg info" style={{marginBottom:0,marginTop:4}}><span>&#9432;</span><span>Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{color:'var(--fi-blue)'}}>platform.openai.com</a>.</span></div>,
            gemini:   <div className="fi-msg info" style={{marginBottom:0,marginTop:4}}><span>&#9432;</span><span>Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color:'var(--fi-blue)'}}>Google AI Studio</a>. Free tier available.</span></div>,
            deepseek: <div className="fi-msg info" style={{marginBottom:0,marginTop:4}}><span>&#9432;</span><span>Get your key at <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" style={{color:'var(--fi-blue)'}}>platform.deepseek.com</a>.</span></div>,
          }[s.ai_provider||'claude']}
          <div style={{marginTop:16}}>
            <button className="fi-btn emphasized" disabled={saving} onClick={()=>saveSettings({ai_provider:s.ai_provider,ai_api_key:s.ai_api_key})}>{saving?'Saving...':'Save AI Settings'}</button>
          </div>
        </Section>
      )}

      {/* SCHEDULER */}
      {tab==='cron' && (
        <>
          <Section title="Add Schedule">
            {!workspace && <div className="fi-msg warning" style={{ marginBottom:16 }}><span>&#9888;</span><span>Connect a workspace first before adding schedules.</span></div>}
            <form onSubmit={addCron}>
              <div className="grid-2" style={{ marginBottom:16 }}>
                <FormRow label="LABEL (OPTIONAL)">
                  <input className="fi-inp" value={cronLabel} onChange={e=>setCronLabel(e.target.value)} placeholder="e.g. Daily full sync" />
                </FormRow>
                <FormRow label="CRON EXPRESSION" hint="Standard 5-field cron (min hour day month weekday)">
                  <div style={{ display:'flex', gap:8 }}>
                    <input className="fi-inp" value={cronExpr} onChange={e=>setCronExpr(e.target.value)} placeholder="0 6 * * *" style={{ fontFamily:'var(--fm)' }} />
                    <select className="fi-select" style={{ width:'auto', minWidth:140 }} onChange={e=>e.target.value&&setCronExpr(e.target.value)} defaultValue="">
                      <option value="" disabled>Presets</option>
                      {CRON_PRESETS.map(p=><option key={p.expr} value={p.expr}>{p.label}</option>)}
                    </select>
                  </div>
                </FormRow>
              </div>
              <FormRow label="FACT SHEET TYPES">
                <select className="fi-select" value={cronTypes} onChange={e=>setCronTypes(e.target.value)}>
                  <option value="all">All Types (Full Sync)</option>
                  <option value="Application">Application only</option>
                  <option value="Interface">Interface only</option>
                  <option value="ITComponent">ITComponent only</option>
                  <option value="Provider">Provider only</option>
                </select>
              </FormRow>
              <button type="submit" className="fi-btn emphasized" disabled={!workspace}>Add Schedule</button>
            </form>
          </Section>

          <Section title="Active Schedules">
            {crons.length===0
              ? <div style={{ color:'var(--fi-text-3)', fontSize:13 }}>No schedules configured.</div>
              : <table className="fi-table compact">
                  <thead><tr><th>Label</th><th>Expression</th><th>Types</th><th>Last Run</th><th>Runs</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {crons.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight:600 }}>{c.label||'\u2014'}</td>
                        <td><code style={{ fontFamily:'var(--fm)', fontSize:12 }}>{c.cron_expr}</code></td>
                        <td><span className="fi-badge muted">{c.fs_types}</span></td>
                        <td style={{ fontSize:12, color:'var(--fi-text-3)' }}>{c.last_run?new Date(c.last_run).toLocaleString('de-DE'):'Never'}</td>
                        <td style={{ fontFamily:'var(--fm)', fontSize:12 }}>{c.runs||0}</td>
                        <td><span className={'fi-badge '+(c.enabled?'success':'muted')}>{c.enabled?'Active':'Paused'}</span></td>
                        <td>
                          <div style={{ display:'flex', gap:6 }}>
                            <button className="fi-btn xs" onClick={async()=>{await fetch('/api/cron/'+c.id+'/toggle',{method:'PUT'});loadCrons();}}>{c.enabled?'Pause':'Resume'}</button>
                            <button className="fi-btn xs" onClick={async()=>{await fetch('/api/cron/'+c.id+'/run-now',{method:'POST'});toast('Job started');setTimeout(loadJobs,2000);}}>Run Now</button>
                            <button className="fi-btn xs danger" onClick={async()=>{if(window.confirm('Delete?')){await fetch('/api/cron/'+c.id,{method:'DELETE'});loadCrons();}}}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Section>
        </>
      )}

      {/* SYNC HISTORY */}
      {tab==='history' && (
        <Section title="Sync Job History" action={<button className="fi-btn sm ghost" onClick={loadJobs}>Refresh</button>}>
          {jobs.length===0
            ? <div style={{ color:'var(--fi-text-3)', fontSize:13 }}>No sync jobs recorded.</div>
            : <div style={{ overflowX:'auto' }}>
                <table className="fi-table compact">
                  <thead><tr><th>Job #</th><th>Type</th><th>FS Types</th><th>Status</th><th style={{ textAlign:'right' }}>Records</th><th>Started</th><th>Duration</th><th>Trigger</th></tr></thead>
                  <tbody>
                    {jobs.map(j => {
                      const dur = j.started_at&&j.finished_at?Math.round((new Date(j.finished_at)-new Date(j.started_at))/1000):null;
                      const stCls = j.status==='done'?'success':j.status==='error'?'error':j.status==='running'?'info':'muted';
                      return (
                        <tr key={j.id}>
                          <td style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--fi-text-3)' }}>#{j.id}</td>
                          <td><span className="fi-badge muted">{j.job_type}</span></td>
                          <td style={{ fontSize:12 }}>{j.fs_types}</td>
                          <td><span className={'fi-badge '+stCls}>{j.status}</span></td>
                          <td style={{ textAlign:'right', fontFamily:'var(--fm)', fontSize:12 }}>{j.records?.toLocaleString()||'\u2014'}</td>
                          <td style={{ fontSize:12, color:'var(--fi-text-3)' }}>{j.started_at?new Date(j.started_at).toLocaleString('de-DE'):'\u2014'}</td>
                          <td style={{ fontFamily:'var(--fm)', fontSize:12, color:'var(--fi-text-3)' }}>{dur!=null?dur+'s':'\u2014'}</td>
                          <td style={{ fontSize:11, color:'var(--fi-text-3)' }}>{j.triggered_by}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          }
          {jobs.filter(j=>j.status==='error').slice(0,2).map(j => (
            <div key={j.id} className="fi-msg error" style={{ marginTop:12, marginBottom:0 }}>
              <span>&#9888;</span><span>Job #{j.id}: {j.error}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
