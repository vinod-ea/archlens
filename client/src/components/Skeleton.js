import React from 'react';

// ── Base pulse box ────────────────────────────────────────────────────────────
export function SkeletonBox({ w, h = 14, style = {} }) {
  return (
    <div style={{
      height: h,
      width: w || '100%',
      borderRadius: 4,
      background: 'var(--fi-border)',
      animation: 'fi-shimmer 1.4s ease-in-out infinite',
      ...style,
    }} />
  );
}

// ── KPI tiles row ─────────────────────────────────────────────────────────────
export function SkeletonKPIRow({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 16, marginBottom: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="fi-card">
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SkeletonBox w={80} h={11} />
            <SkeletonBox w={60} h={28} style={{ animationDelay: `${i * 0.1}s` }} />
            <SkeletonBox w={100} h={10} style={{ animationDelay: `${i * 0.15}s` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Table rows ────────────────────────────────────────────────────────────────
export function SkeletonTable({ rows = 6, cols = 4 }) {
  return (
    <div className="fi-card">
      <div className="fi-card-header">
        <SkeletonBox w={140} h={14} />
      </div>
      <table className="fi-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><SkeletonBox w={80} h={11} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <SkeletonBox w={`${60 + Math.sin(r * cols + c) * 30}%`} h={12} style={{ animationDelay: `${(r * cols + c) * 0.05}s` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Card grid ─────────────────────────────────────────────────────────────────
export function SkeletonCardGrid({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="fi-card">
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <SkeletonBox w={36} h={36} style={{ borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SkeletonBox w="70%" h={13} style={{ animationDelay: `${i * 0.1}s` }} />
                <SkeletonBox w="50%" h={10} style={{ animationDelay: `${i * 0.12}s` }} />
              </div>
            </div>
            <SkeletonBox w="90%" h={10} style={{ animationDelay: `${i * 0.14}s` }} />
            <SkeletonBox w="60%" h={10} style={{ animationDelay: `${i * 0.16}s` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Single full-width card placeholder ───────────────────────────────────────
export function SkeletonBlock({ lines = 4 }) {
  return (
    <div className="fi-card" style={{ marginBottom: 16 }}>
      <div className="fi-card-header">
        <SkeletonBox w={180} h={14} />
      </div>
      <div className="fi-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBox key={i} w={`${95 - i * 8}%`} h={12} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── Full page skeleton (generic) ──────────────────────────────────────────────
export default function PageSkeleton({ kpis = 4, cards = 0, table = true, tableRows = 8 }) {
  return (
    <div className="fi-page fi-fade-in">
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <SkeletonBox w={240} h={22} style={{ marginBottom: 8 }} />
        <SkeletonBox w={360} h={13} />
      </div>
      {kpis > 0 && <SkeletonKPIRow count={kpis} />}
      {cards > 0 && <div style={{ marginBottom: 20 }}><SkeletonCardGrid count={cards} /></div>}
      {table && <SkeletonTable rows={tableRows} />}
    </div>
  );
}
