import React from 'react';
export default function Toasts({ toasts }) {
  return (
    <div className="fi-toasts">
      {toasts.map(t => (
        <div key={t.id} className={'fi-toast ' + (t.type||'')}>
          {t.type==='ok' && <span>✓</span>}
          {t.type==='err' && <span>✗</span>}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
