import React from 'react';
import { useApp } from '../App';

export default function Topbar({ nav }) {
  const { page, setPage, connected, workspace } = useApp();
  return (
    <>
      {/* SAP Fiori Shell Bar */}
      <div className="fi-topbar">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginRight:16, flexShrink:0 }}>
          <div style={{ width:28, height:28, borderRadius:4, background:'linear-gradient(135deg,#0070F2,#00144A)', display:'grid', placeItems:'center', fontSize:16, flexShrink:0 }}>⬡</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, letterSpacing:'-.01em', lineHeight:1 }}>ArchLens</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', lineHeight:1, marginTop:2 }}>EA Intelligence</div>
          </div>
        </div>
        <div style={{ flex:1 }} />
        {/* Workspace indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,.75)', flexShrink:0, minWidth:0 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:connected?'#3FB950':'#8396A8', boxShadow:connected?'0 0 6px #3FB950':'none' }} />
          <span style={{ fontFamily:'var(--fm)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'clamp(60px, 20vw, 260px)' }}>
            {connected ? workspace : 'Not connected'}
          </span>
        </div>
      </div>

      {/* Navigation bar — scrollable on mobile */}
      <div className="fi-nav" role="navigation">
        {nav.map(n => {
          const locked = !connected && n.id !== 'connect' && n.id !== 'settings' && n.id !== 'support';
          return (
            <div key={n.id}
              className={'fi-nav-item' + (page===n.id?' active':'')}
              onClick={() => !locked && setPage(n.id)}
              title={locked ? `Connect a workspace to access ${n.label}` : n.label}
              style={{ opacity:locked?0.4:1, cursor:locked?'default':'pointer' }}
            >
              <span style={{ fontSize:13 }}>{n.icon}</span>
              <span className="nav-label">{n.label}</span>
              {locked && <span style={{ fontSize:10, marginLeft:2 }}>🔒</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}
