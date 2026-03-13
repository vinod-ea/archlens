import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Topbar         from './components/Topbar';
import Toasts         from './components/Toasts';
import ConnectPage    from './pages/ConnectPage';
import OverviewPage   from './pages/OverviewPage';
import FSIPage        from './pages/FSIPage';
import VendorsPage    from './pages/VendorsPage';
import ArchitectPage  from './pages/ArchitectPage';
import ResolutionPage from './pages/ResolutionPage';
import DuplicatesPage from './pages/DuplicatesPage';
import SettingsPage   from './pages/SettingsPage';
import SupportPage    from './pages/SupportPage';

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const NAV = [
  { id:'connect',    label:'Connect',            icon:'⚡' },
  { id:'overview',   label:'Overview',            icon:'◈'  },
  { id:'fsi',        label:'Fact Sheet Intel',    icon:'☰'  },
  { id:'vendors',    label:'Vendor Analysis',     icon:'◎'  },
  { id:'resolution', label:'Vendor Resolution',   icon:'🏢' },
  { id:'duplicates', label:'Duplicate Detection', icon:'⊕'  },
  { id:'architect',  label:'Architecture AI',     icon:'⬡'  },
  { id:'settings',   label:'Settings',            icon:'⚙'  },
  { id:'support',    label:'Support',             icon:'❓' },
];

// Pages that require an AI key to function
export const AI_PAGES = new Set(['vendors', 'resolution', 'duplicates', 'architect']);

export default function App() {
  const [page,      setPage]      = useState('connect');
  const [connected, setConnected] = useState(false);
  const [workspace, setWorkspace] = useState('');
  const [toasts,    setToasts]    = useState([]);

  // AI key status: null = not yet checked, { ok, reason, provider } after check
  const [aiStatus, setAIStatus] = useState(null);

  const toast = useCallback((msg, type='') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);

  const checkAIStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/ai/status');
      const j = await r.json();
      setAIStatus(j);
    } catch {
      setAIStatus(null);
    }
  }, []);

  // Check whenever user lands on an AI page or settings
  useEffect(() => {
    if (AI_PAGES.has(page) || page === 'settings') {
      checkAIStatus();
    }
  }, [page, checkAIStatus]);

  const pages = {
    connect:    ConnectPage,
    overview:   OverviewPage,
    fsi:        FSIPage,
    vendors:    VendorsPage,
    resolution: ResolutionPage,
    duplicates: DuplicatesPage,
    architect:  ArchitectPage,
    settings:   SettingsPage,
    support:    SupportPage,
  };
  const PageComp = pages[page] || ConnectPage;

  return (
    <AppCtx.Provider value={{
      page, setPage,
      connected, setConnected,
      workspace, setWorkspace,
      toast,
      aiStatus, checkAIStatus,
    }}>
      <div className="shell">
        <Topbar nav={NAV} />
        <div className="fi-content">
          <PageComp />
        </div>
      </div>
      <Toasts toasts={toasts} />
    </AppCtx.Provider>
  );
}
