import { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { useTheme } from './context/ThemeContext';
import CityMap from './components/CityMap';
import DisasterControls from './components/DisasterControls';
import Dashboard from './components/Dashboard';
import CascadingFlow from './components/CascadingFlow';
import AgentLog from './components/AgentLog';
import WhatIfPanel from './components/WhatIfPanel';
import TimelineSlider from './components/TimelineSlider';
import StatusBar from './components/StatusBar';
import StrategyPanel from './components/StrategyPanel';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'whatif',    label: 'What-If' },
  { id: 'agents',   label: 'Agents' },
];

export default function App() {
  const {
    state,
    connected,
    timeline,
    viewingTick,
    loading,
    error,
    isRunning,
    startSimulation,
    stopSimulation,
    resetSimulation,
    runWhatIf,
    viewTick,
  } = useSimulation();

  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
      }}>
        {/* Left: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            {isRunning && (
              <div style={{
                position: 'absolute', top: -2, right: -2,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--danger)',
                border: '2px solid var(--bg-dark)',
                animation: 'pulse-danger 2s ease-in-out infinite',
              }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.2 }}>
              RESILIENCE <span style={{ color: 'var(--primary)' }}>AI</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.02em' }}>
              Crisis Simulation Engine
            </div>
          </div>
        </div>

        {/* Center: Tabs */}
        <nav style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 2 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 16px',
                borderRadius: 5,
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 600 : 400,
                background: activeTab === tab.id ? 'var(--bg-surface-raised)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeTab === tab.id ? '1px solid var(--border)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={toggleTheme}
            style={{
              width: 30, height: 30, borderRadius: 6,
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className={`status-dot ${connected ? 'operational' : 'failed'}`} />
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: connected ? 'var(--success)' : 'var(--danger)',
              letterSpacing: '0.03em',
            }}>
              {connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 16px 8px 16px', maxWidth: 2560, margin: '0 auto', width: '100%' }}>
        
        {/* Status Bar — secondary tier */}
        <StatusBar state={state} connected={connected} />

        {/* Primary Grid: Map (72%) + Panel (28%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '8px', flex: 1, minHeight: 0 }}>
          
          {/* Left Column — Map + Timeline + Cascade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0 }}>
            {/* Map — primary focus */}
            <div className="glass-card" style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: '480px', borderRadius: 10 }}>
              <CityMap state={state} theme={theme} />
              
              {/* Timeline overlay — tertiary */}
              {timeline.length > 0 && (
                <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 1000 }}>
                  <TimelineSlider
                    timeline={timeline}
                    viewingTick={viewingTick}
                    onViewTick={viewTick}
                    running={isRunning}
                  />
                </div>
              )}
            </div>

            {/* Cascading Flow — tertiary */}
            {state?.cascading_events?.length > 0 && (
              <CascadingFlow events={state.cascading_events} />
            )}
          </div>

          {/* Right Column — Controls + Dashboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)', paddingRight: 2 }}>
            
            {activeTab === 'dashboard' && (
              <>
                <DisasterControls
                  onStart={startSimulation}
                  onStop={stopSimulation}
                  onReset={resetSimulation}
                  running={isRunning}
                  loading={loading}
                  error={error}
                />
                <Dashboard state={state} />
              </>
            )}

            {activeTab === 'strategy' && (
              <StrategyPanel state={state} />
            )}

            {activeTab === 'whatif' && (
              <WhatIfPanel onRunWhatIf={runWhatIf} running={isRunning} />
            )}

            {activeTab === 'agents' && (
              <AgentLog logs={state?.agent_logs || []} />
            )}
          </div>
        </div>
      </main>

      {/* ── Footer — tertiary ── */}
      <footer style={{
        padding: '8px 24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border)',
        fontSize: 10,
        color: 'var(--text-tertiary)',
        fontWeight: 500,
        letterSpacing: '0.04em',
      }}>
        RESILIENCE AI v2.0 · Mumbai Metropolitan Region
      </footer>
    </div>
  );
}
