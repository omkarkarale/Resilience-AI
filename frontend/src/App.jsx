import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSimulation } from './hooks/useSimulation';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import CityMap from './components/CityMap';
import DisasterControls from './components/DisasterControls';
import Dashboard from './components/Dashboard';
import CascadingFlow from './components/CascadingFlow';
import AgentLog from './components/AgentLog';
import WhatIfPanel from './components/WhatIfPanel';
import TimelineSlider from './components/TimelineSlider';
import StatusBar from './components/StatusBar';
import StrategyPanel from './components/StrategyPanel';
import LoginPage from './components/LoginPage';
import PublicPortal from './components/PublicPortal';
import ProtectedRoute from './components/ProtectedRoute';
import FieldReports from './components/FieldReports';
import Announcements from './components/Announcements';
import AuditLogPanel from './components/AuditLogPanel';
import UserManagement from './components/UserManagement';

const ALL_TABS = [
  { id: 'dashboard', label: 'Dashboard', roles: ['admin', 'operator'] },
  { id: 'strategy', label: 'Strategy', roles: ['admin'] },
  { id: 'whatif', label: 'What-If', roles: ['admin'] },
  { id: 'agents', label: 'AI Models', roles: ['admin'] },
  { id: 'reports', label: 'Observations', roles: ['admin', 'operator'] },
  { id: 'announcements', label: 'Notices', roles: ['admin', 'operator'] },
  { id: 'logs', label: 'Audit', roles: ['admin'] },
  { id: 'users', label: 'Participants', roles: ['admin'] },
];

const ROLE_COLORS = {
  admin: '#3b82f6',
  operator: '#22c55e',
  public: '#7a8599',
};

const DEPT_COLORS = {
  medical: '#ef4444',
  traffic: '#f59e0b',
  fire: '#f97316',
  power: '#8b5cf6',
  logistics: '#6366f1',
};

function CommandCenter() {
  const { user, token, logout } = useAuth();
  const {
    state, connected, timeline, viewingTick, loading, error, isRunning,
    startSimulation, stopSimulation, resetSimulation, runWhatIf, viewTick,
  } = useSimulation(token);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const userRole = user?.role || 'public';
  const userDepartment = user?.department || null;
  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(userRole));

  // Make sure activeTab is valid for current role
  if (!visibleTabs.find(t => t.id === activeTab) && visibleTabs.length > 0) {
    setActiveTab(visibleTabs[0].id);
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };



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
              Educational Simulation Engine
            </div>
          </div>
        </div>

        {/* Center: Tabs */}
        <nav style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 2 }}>
          {visibleTabs.map(tab => (
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

        {/* Right: User + Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* User Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: `${ROLE_COLORS[userRole]}20`,
              border: `1px solid ${ROLE_COLORS[userRole]}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: ROLE_COLORS[userRole],
            }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.name || 'Unknown'}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: '0px 4px', borderRadius: 3,
                  color: ROLE_COLORS[userRole],
                  background: `${ROLE_COLORS[userRole]}15`,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{userRole}</span>
                {userDepartment && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '0px 4px', borderRadius: 3,
                    color: DEPT_COLORS[userDepartment] || '#7a8599',
                    background: `${DEPT_COLORS[userDepartment] || '#7a8599'}15`,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{userDepartment}</span>
                )}
              </div>
            </div>
          </div>

          <button onClick={toggleTheme} style={{
            width: 30, height: 30, borderRadius: 6,
            background: 'var(--bg-hover)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }} title="Toggle Theme">
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

          <button onClick={handleLogout} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            color: 'var(--text-secondary)', background: 'transparent',
            border: '1px solid var(--border)', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>Logout</button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 16px 8px 16px', maxWidth: 2560, margin: '0 auto', width: '100%' }}>
        
        {/* Status Bar */}
        <StatusBar state={state} connected={connected} userRole={userRole} userDepartment={userDepartment} />

        {/* Primary Grid: Map + Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '8px', flex: 1, minHeight: 0 }}>
          
          {/* Left Column — Map + Timeline + Cascade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0 }}>
            {/* Map — takes all remaining vertical space */}
            <div className="glass-card" style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: '480px', borderRadius: 10 }}>
              <CityMap state={state} theme={theme} userRole={userRole} userDepartment={userDepartment} />
            </div>

            {/* Timeline — below the map, in normal document flow */}
            {timeline.length > 0 && (
              <TimelineSlider timeline={timeline} viewingTick={viewingTick} onViewTick={viewTick} running={isRunning} />
            )}

            {state?.cascading_events?.length > 0 && userRole === 'admin' && (
              <CascadingFlow events={state.cascading_events} />
            )}
          </div>

          {/* Right Column — Dashboard Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)', paddingRight: 2 }}>
            
            {activeTab === 'dashboard' && (
              <>
                {userRole === 'admin' && (
                  <DisasterControls
                    onStart={startSimulation}
                    onStop={stopSimulation}
                    onReset={resetSimulation}
                    running={isRunning}
                    loading={loading}
                    error={error}
                  />
                )}
                <Dashboard state={state} userRole={userRole} userDepartment={userDepartment} />
              </>
            )}

            {activeTab === 'strategy' && userRole === 'admin' && (
              <StrategyPanel state={state} />
            )}

            {activeTab === 'whatif' && userRole === 'admin' && (
              <WhatIfPanel onRunWhatIf={runWhatIf} running={isRunning} />
            )}

            {activeTab === 'agents' && userRole === 'admin' && (
              <AgentLog logs={state?.agent_logs || []} />
            )}

            {activeTab === 'reports' && (
              <FieldReports />
            )}

            {activeTab === 'announcements' && (
              <Announcements />
            )}

            {activeTab === 'logs' && userRole === 'admin' && (
              <AuditLogPanel />
            )}

            {activeTab === 'users' && userRole === 'admin' && (
              <UserManagement />
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        padding: '8px 24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border)',
        fontSize: 10,
        color: 'var(--text-tertiary)',
        fontWeight: 500,
        letterSpacing: '0.04em',
      }}>
        RESILIENCE AI v2.0 · Educational Platform · {userRole.toUpperCase()} ACCESS
      </footer>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0b0f19', color: '#7a8599', fontSize: 14,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, border: '3px solid rgba(255,255,255,0.06)',
            borderTopColor: '#3b82f6', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Initializing Resilience AI…
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route path="/public" element={<PublicPortal />} />
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['admin', 'operator']}>
          <CommandCenter />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
