import { useState, useCallback, useRef, useEffect } from 'react';

// ── Core SSE hook ─────────────────────────────────────────────────────────────
// Usage: const { running, logs, progress, run, reset } = useSSERunner(onComplete)
// run(url) opens the stream; onComplete fires when event=complete/error
export function useSSERunner(onComplete) {
  const [running,  setRunning]  = useState(false);
  const [logs,     setLogs]     = useState([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const esRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const addLog = useCallback((msg, type = 'info') => {
    setLogs(l => [...l.slice(-40), { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString() }]);
  }, []);

  const run = useCallback((url) => {
    if (esRef.current) { esRef.current.close(); }
    setRunning(true);
    setLogs([]);
    setProgress({ processed: 0, total: 0 });

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data);
        if (d.event === 'step')     addLog(d.msg, 'info');
        if (d.event === 'progress') setProgress({ processed: d.processed || 0, total: d.total || 0 });
        if (d.event === 'complete') { addLog('✓ Complete', 'success'); es.close(); setRunning(false); onCompleteRef.current?.(null); }
        if (d.event === 'error')    { addLog('✗ ' + d.msg, 'error');   es.close(); setRunning(false); onCompleteRef.current?.(d.msg); }
        // Pass through all events to onComplete for custom handling
        if (['done_resolve','done_duplicates','done_modernization'].includes(d.event)) {
          onCompleteRef.current?.(null, d);
        }
      } catch (_) {}
    };
    es.onerror = () => { addLog('✗ Stream disconnected', 'error'); es.close(); setRunning(false); };
  }, [addLog]);

  const reset = useCallback(() => { setLogs([]); setProgress({ processed: 0, total: 0 }); }, []);

  return { running, logs, progress, run, reset };
}

// ── Animated progress panel (shared across all AI pages) ─────────────────────
export function SSEProgressPanel({ running, logs, progress, label = 'Running analysis…', onClose }) {
  const logsEndRef = useRef(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  if (!running && !logs.length) return null;

  const pct = progress.total > 0 ? Math.round(progress.processed / progress.total * 100) : 0;
  const done = !running && logs.some(l => l.type === 'success');
  const errored = !running && logs.some(l => l.type === 'error');

  return (
    <div style={{
      border: '1px solid var(--fi-border)',
      borderLeft: `3px solid ${done ? 'var(--fi-success)' : errored ? 'var(--fi-error)' : 'var(--fi-blue)'}`,
      borderRadius: 'var(--r)',
      background: 'var(--fi-page-bg)',
      padding: '14px 16px',
      marginTop: 12,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {running && (
            <div className="fi-busy-dots" style={{ display: 'flex', gap: 4 }}>
              <div className="fi-busy-dot" /><div className="fi-busy-dot" /><div className="fi-busy-dot" />
            </div>
          )}
          {done    && <span style={{ color: 'var(--fi-success)', fontSize: 14 }}>✓</span>}
          {errored && <span style={{ color: 'var(--fi-error)',   fontSize: 14 }}>✗</span>}
          <span style={{ fontSize: 13, fontWeight: 600, color: done ? 'var(--fi-success)' : errored ? 'var(--fi-error)' : 'var(--fi-blue)' }}>
            {done ? 'Complete' : errored ? 'Failed' : label}
          </span>
        </div>
        {!running && onClose && (
          <button className="fi-btn xs" onClick={onClose}>✕ Dismiss</button>
        )}
      </div>

      {/* Progress bar */}
      {(running && progress.total > 0) && (
        <div style={{ marginBottom: 8 }}>
          <div className="fi-progress">
            <div className="fi-progress-bar" style={{ width: pct + '%', transition: 'width .3s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--fi-text-3)', fontFamily: 'var(--fm)', marginTop: 3 }}>
            {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)
          </div>
        </div>
      )}

      {/* Log stream */}
      <div style={{
        maxHeight: 140,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {logs.map(l => (
          <div key={l.id} style={{
            display: 'flex',
            gap: 8,
            fontSize: 12,
            lineHeight: 1.5,
            color: l.type === 'success' ? 'var(--fi-success)' : l.type === 'error' ? 'var(--fi-error)' : 'var(--fi-text-2)',
          }}>
            <span style={{ fontFamily: 'var(--fm)', color: 'var(--fi-text-3)', flexShrink: 0 }}>{l.time}</span>
            <span>{
              l.msg === 'AI_KEY_MISSING' ? '✗ No AI API key — add one in Settings → AI Provider' :
              l.msg.startsWith('AI_KEY_INVALID:') ? '✗ API key rejected (invalid or expired) — check Settings → AI Provider' :
              l.msg.startsWith('AI_QUOTA_EXCEEDED:') ? '✗ AI quota or rate limit exceeded — check billing or switch provider' :
              l.msg
            }</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

// ── Animated run button ───────────────────────────────────────────────────────
export function RunButton({ running, onClick, idleLabel, runningLabel, disabled, className = 'fi-btn emphasized', style = {} }) {
  return (
    <button className={className} onClick={onClick} disabled={running || disabled} style={style}>
      {running ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            border: '2px solid rgba(255,255,255,.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'fi-spin .7s linear infinite',
            flexShrink: 0,
          }} />
          {runningLabel || 'Running…'}
        </span>
      ) : idleLabel}
    </button>
  );
}
