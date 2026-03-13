import React from 'react';
import { useApp } from '../App';

// Parses AI error codes from SSE / fetch responses into user-friendly messages
export function parseAIError(msg) {
  if (!msg) return null;
  if (msg === 'AI_KEY_MISSING' || msg.includes('AI_KEY_MISSING'))
    return { type: 'missing', text: 'No AI API key configured.' };
  if (msg.startsWith('AI_KEY_INVALID:'))
    return { type: 'invalid', provider: msg.split(':')[1], text: 'AI API key was rejected (invalid or expired).' };
  if (msg.startsWith('AI_QUOTA_EXCEEDED:'))
    return { type: 'quota', provider: msg.split(':')[1], text: 'AI API quota or rate limit exceeded.' };
  return null;
}

const PROVIDER_NAMES = { claude: 'Anthropic Claude', openai: 'OpenAI', deepseek: 'DeepSeek' };
const PROVIDER_URLS  = {
  claude:   'https://console.anthropic.com/settings/keys',
  openai:   'https://platform.openai.com/api-keys',
  deepseek: 'https://platform.deepseek.com/api_keys',
};

// ── Inline banner shown at the top of AI-powered pages ──────────────────────
export default function AIKeyBanner({ reason, provider, onDismiss }) {
  const { setPage } = useApp();

  if (!reason) return null;

  const providerName = PROVIDER_NAMES[provider] || provider || 'AI provider';
  const providerUrl  = PROVIDER_URLS[provider];

  const cfg = {
    missing: {
      icon: '🔑',
      title: 'AI API Key Required',
      body: `This feature uses ${providerName} to analyse your data. Add your API key in Settings to continue.`,
      actions: [
        { label: '⚙ Go to Settings → AI Provider', primary: true, onClick: () => setPage('settings') },
      ],
    },
    invalid: {
      icon: '⚠',
      title: `${providerName} API Key Invalid or Expired`,
      body: `The API key was rejected with an authentication error. It may have been revoked, rotated, or entered incorrectly.`,
      actions: [
        { label: '⚙ Update Key in Settings', primary: true, onClick: () => setPage('settings') },
        providerUrl && { label: '↗ Open ' + providerName + ' Console', primary: false, href: providerUrl },
      ].filter(Boolean),
    },
    quota: {
      icon: '⏱',
      title: `${providerName} Rate Limit or Quota Exceeded`,
      body: `Your ${providerName} account has hit its usage limit or rate limit. Wait a few minutes and try again, or check your billing.`,
      actions: [
        providerUrl && { label: '↗ Check ' + providerName + ' Usage', primary: false, href: providerUrl },
        { label: '⚙ Switch AI Provider', primary: false, onClick: () => setPage('settings') },
      ].filter(Boolean),
    },
  }[reason] || {
    icon: '⚠',
    title: 'AI Provider Error',
    body: 'An error occurred with the AI provider. Check your API key and provider settings.',
    actions: [{ label: '⚙ Open Settings', primary: true, onClick: () => setPage('settings') }],
  };

  return (
    <div style={{
      display: 'flex',
      gap: 14,
      padding: '14px 18px',
      background: 'var(--fi-warning-bg)',
      border: '1px solid var(--fi-warning-border)',
      borderLeft: '4px solid var(--fi-warning)',
      borderRadius: 'var(--r)',
      marginBottom: 20,
      animation: 'fi-fadein .2s ease both',
    }}>
      {/* Icon */}
      <div style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.4 }}>{cfg.icon}</div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fi-warning)', marginBottom: 4 }}>
          {cfg.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--fi-text-2)', lineHeight: 1.6, marginBottom: 10 }}>
          {cfg.body}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cfg.actions.map((a, i) =>
            a.href ? (
              <a key={i} href={a.href} target="_blank" rel="noreferrer"
                className={`fi-btn${a.primary ? ' emphasized' : ''} sm`}
                style={a.primary ? {} : { color: 'var(--fi-warning)', borderColor: 'var(--fi-warning-border)' }}>
                {a.label}
              </a>
            ) : (
              <button key={i} onClick={a.onClick}
                className={`fi-btn${a.primary ? ' emphasized' : ''} sm`}
                style={a.primary ? {} : { color: 'var(--fi-warning)', borderColor: 'var(--fi-warning-border)' }}>
                {a.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button onClick={onDismiss} className="fi-btn xs"
          style={{ alignSelf: 'flex-start', flexShrink: 0, color: 'var(--fi-text-3)', border: 'none', background: 'none', padding: '2px 4px' }}
          title="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

// ── Hook: derive banner reason from an error string ──────────────────────────
export function useAIError() {
  const [aiError, setAIError] = React.useState(null); // { reason, provider }

  const handleError = React.useCallback((msg) => {
    const parsed = parseAIError(msg);
    if (parsed) setAIError({ reason: parsed.type, provider: parsed.provider });
  }, []);

  const clearError = React.useCallback(() => setAIError(null), []);

  return { aiError, handleError, clearError };
}
