import { useState, useEffect } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { useTheme } from '../context/ThemeContext';
import CityMap from './CityMap';
import Announcements from './Announcements';

const API_BASE = 'http://127.0.0.1:8000';

export default function PublicPortal() {
    const { state, connected } = useSimulation();
    const { theme, toggleTheme } = useTheme();
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        fetch(`${API_BASE}/api/announcements?role=public`)
            .then(r => r.json())
            .then(setAnnouncements)
            .catch(() => {});
    }, []);

    const zones = state?.zones || [];
    const shelters = (state?.infrastructure || []).filter(i => i.type === 'shelter');

    // Calculate broad zone alerts
    const alertZones = zones.map(z => ({
        ...z,
        level: z.risk_score > 70 ? 'critical' : z.risk_score > 40 ? 'alert' : 'safe',
    }));

    const critical = alertZones.filter(z => z.level === 'critical').length;
    const alertCount = alertZones.filter(z => z.level === 'alert').length;
    const safe = alertZones.filter(z => z.level === 'safe').length;

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            background: '#0d1117', color: '#e2e8f0',
        }}>
            {/* Header */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 24px',
                background: 'rgba(15, 20, 32, 0.8)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.03em' }}>
                            <span style={{ color: '#22c55e' }}>PUBLIC</span> LEARNING PORTAL
                        </div>
                        <div style={{ fontSize: 10, color: '#7a8599', fontWeight: 500 }}>
                            Mumbai Metropolitan Region · Simulation Response Guide
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={toggleTheme} style={{
                        width: 30, height: 30, borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        color: '#7a8599', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}>{theme === 'dark' ? '☀' : '☾'}</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: connected ? '#22c55e' : '#ef4444',
                        }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: connected ? '#22c55e' : '#ef4444' }}>
                            {connected ? 'LIVE' : 'OFFLINE'}
                        </span>
                    </div>
                    <a href="/login" style={{
                        padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        color: '#7a8599', border: '1px solid rgba(255,255,255,0.06)',
                        textDecoration: 'none', transition: 'all 0.15s',
                    }}>Staff Login →</a>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Zone Alert Summary */}
                <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(15, 20, 32, 0.65)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#7a8599', letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 8 }}>
                        ZONE STATUS
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{critical}</span>
                        <span style={{ fontSize: 11, color: '#7a8599', marginRight: 8 }}>Critical</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{alertCount}</span>
                        <span style={{ fontSize: 11, color: '#7a8599', marginRight: 8 }}>Alert</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{safe}</span>
                        <span style={{ fontSize: 11, color: '#7a8599' }}>Safe</span>
                    </div>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: '#4b5563', fontStyle: 'italic' }}>
                        Updated live
                    </span>
                </div>

                {/* Map + Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 12, flex: 1, minHeight: 0 }}>
                    {/* Map — public simplified */}
                    <div style={{
                        borderRadius: 12, overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.06)',
                        minHeight: 480, position: 'relative',
                    }}>
                        <CityMap state={state} theme={theme} userRole="public" />
                    </div>

                    {/* Right Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>

                        {/* Evacuation Guidance */}
                        <div style={{
                            padding: '16px 18px', borderRadius: 10,
                            background: 'rgba(15,20,32,0.65)', border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                             <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8599', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                                🛡 SIMULATION RESPONSE GUIDE
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>
                                <div style={{ marginBottom: 8 }}>
                                    <strong style={{ color: '#f59e0b' }}>In High Vulnerability Zones:</strong>
                                    <ul style={{ margin: '4px 0 0 16px', fontSize: 12, color: '#cbd5e1' }}>
                                        <li>Identify nearest shelters on the learning map</li>
                                        <li>Observe designated relay points for students</li>
                                        <li>Follow the simulation protocol for relocation</li>
                                    </ul>
                                </div>
                                <div>
                                    <strong style={{ color: '#22c55e' }}>In Low Vulnerability Zones:</strong>
                                    <ul style={{ margin: '4px 0 0 16px', fontSize: 12, color: '#cbd5e1' }}>
                                        <li>Monitor real-time cascading event simulations</li>
                                        <li>Study the impact of infrastructure failure</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Nearest Shelters */}
                        <div style={{
                            padding: '16px 18px', borderRadius: 10,
                            background: 'rgba(15,20,32,0.65)', border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8599', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                                🏠 NEAREST SHELTERS ({shelters.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {shelters.slice(0, 8).map(s => {
                                    const statusColor = s.status === 'operational' ? '#22c55e' : s.status === 'degraded' ? '#f59e0b' : '#ef4444';
                                    const load = s.capacity > 0 ? Math.round((s.current_load / s.capacity) * 100) : 0;
                                    return (
                                        <div key={s.id} style={{
                                            padding: '8px 10px', borderRadius: 6,
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</div>
                                                <div style={{ fontSize: 10, color: '#7a8599' }}>
                                                    Capacity: {s.capacity} · Load: {load}%
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: 9, fontWeight: 700, padding: '2px 6px',
                                                borderRadius: 4, color: statusColor,
                                                background: `${statusColor}15`,
                                            }}>{s.status?.toUpperCase()}</span>
                                        </div>
                                    );
                                })}
                                {shelters.length === 0 && (
                                    <div style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>No shelter data available</div>
                                )}
                            </div>
                        </div>

                        {/* Announcements */}
                        <div style={{
                            padding: '16px 18px', borderRadius: 10,
                            background: 'rgba(15,20,32,0.65)', border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8599', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                                📢 SIMULATION ANNOUNCEMENTS
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {announcements.length === 0 && (
                                    <div style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>No announcements</div>
                                )}
                                {announcements.map(a => (
                                    <div key={a.id} style={{
                                        padding: '8px 10px', borderRadius: 6,
                                        borderLeft: '3px solid #3b82f6',
                                        background: 'rgba(59,130,246,0.04)',
                                    }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{a.title}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{a.body}</div>
                                        <div style={{ fontSize: 9, color: '#4b5563', marginTop: 4 }}>
                                            {new Date(a.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Zone Risk Details */}
                        <div style={{
                            padding: '16px 18px', borderRadius: 10,
                            background: 'rgba(15,20,32,0.65)', border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8599', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                                📍 ZONE SAFETY STATUS
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {alertZones.sort((a, b) => b.risk_score - a.risk_score).map(z => {
                                    const color = z.level === 'critical' ? '#ef4444' : z.level === 'alert' ? '#f59e0b' : '#22c55e';
                                    const label = z.level === 'critical' ? 'CRITICAL' : z.level === 'alert' ? 'ALERT' : 'SAFE';
                                    return (
                                        <div key={z.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '6px 8px', borderRadius: 4,
                                            background: z.level === 'critical' ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        }}>
                                            <span style={{ fontSize: 12, fontWeight: 500 }}>{z.name}</span>
                                            <span style={{
                                                fontSize: 9, fontWeight: 700, padding: '1px 6px',
                                                borderRadius: 3, color, background: `${color}15`,
                                            }}>{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                padding: '10px 24px', textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                fontSize: 10, color: '#4b5563', fontWeight: 500,
            }}>
                Educational Simulation Platform · Learning Portal · Updated live per experiment
            </footer>
        </div>
    );
}
