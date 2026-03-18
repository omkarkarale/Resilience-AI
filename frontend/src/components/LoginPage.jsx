import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { useSimulation } from '../hooks/useSimulation';

const DEMO_ACCOUNTS = [
    { label: 'Admin', email: 'admin@resilience.ai', password: 'admin123', desc: 'Instructor — full platform access' },
    { label: 'Medical Learner', email: 'medical@resilience.ai', password: 'operator123', desc: 'Hospital & health systems module' },
    { label: 'Traffic Learner', email: 'traffic@resilience.ai', password: 'operator123', desc: 'Road & transport module' },
    { label: 'Fire Learner', email: 'fire@resilience.ai', password: 'operator123', desc: 'Fire response module' },
    { label: 'Power Learner', email: 'power@resilience.ai', password: 'operator123', desc: 'Grid & power systems module' },
];

/* ── CSS Animations ── */
const STYLE_TAG = `
@keyframes gridPulse {
    0%, 100% { opacity: 0.8; }
    50%      { opacity: 1; }
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.3; }
}
@media (max-width: 768px) {
    .login-split-container { flex-direction: column !important; }
    .login-hero-side { width: 100% !important; height: auto !important; min-height: 400px !important; padding: 24px !important; }
    .login-form-side { width: 100% !important; min-height: auto !important; padding: 48px 24px !important; }
    .scenario-preview-card { bottom: 20px !important; right: 20px !important; }
}
.hero-map-container .leaflet-tile-pane {
    filter: invert(1) hue-rotate(180deg) brightness(0.4) contrast(1.2) saturate(0.5);
}
.hero-map-container .leaflet-control-container {
    display: none !important;
}
`;

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, token } = useAuth();
    const { state, isRunning } = useSimulation(token);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const user = await login(email, password);
            navigate(user.role === 'public' ? '/public' : '/', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async (account) => {
        setEmail(account.email);
        setPassword(account.password);
        setLoading(true);
        setError('');
        try {
            const user = await login(account.email, account.password);
            navigate(user.role === 'public' ? '/public' : '/', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-split-container" style={{ minHeight: '100vh', display: 'flex', background: '#0d1117', color: 'white', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
            <style>{STYLE_TAG}</style>

            {/* ── LEFT COLUMN (HERO) ── */}
            <div className="login-hero-side" style={{
                width: '55%', position: 'relative', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', padding: '40px', overflow: 'hidden',
                background: '#0d1117'
            }}>
                {/* ── Background Map (Decorative) ── */}
                <div className="hero-map-container" style={{
                    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6
                }}>
                    <MapContainer
                        center={[19.0760, 72.8777]}
                        zoom={12}
                        scrollWheelZoom={false}
                        dragging={false}
                        zoomControl={false}
                        doubleClickZoom={false}
                        style={{ height: '100%', width: '100%', background: '#0d1117' }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </MapContainer>
                </div>

                {/* Grid Overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(6,182,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.06) 1px, transparent 1px)',
                    backgroundSize: '80px 80px',
                    animation: 'gridPulse 6s ease-in-out infinite',
                    zIndex: 1, pointerEvents: 'none'
                }} />
                
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at center, transparent 20%, #0d1117 100%)',
                    pointerEvents: 'none', zIndex: 2
                }} />

                {/* Top Section: Logo */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 8, background: '#161b22',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.02em' }}>
                                RESILIENCE <span style={{ color: '#06b6d4' }}>AI</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1, fontFamily: 'monospace' }}>
                                Educational Simulation Engine
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center Section: Headline */}
                <div style={{ position: 'relative', zIndex: 2, maxWidth: 480 }}>
                    <h1 style={{ margin: 0, padding: 0, lineHeight: 1.1 }}>
                        <span style={{ fontSize: '2.6rem', fontWeight: 600, display: 'block' }}>Simulate crisis.</span>
                        <span style={{ fontSize: '2.6rem', fontWeight: 300, color: '#06b6d4', display: 'block' }}>Build resilience.</span>
                    </h1>
                    <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginTop: 24, marginBottom: 32 }}>
                        A real-time urban disaster simulation platform used by emergency
                        planners, NGO teams, and students. Experience cascading infrastructure
                        failures, coordinate multi-agency response, and test your decisions
                        against live AI models — all inside a digital twin of Mumbai.
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, background: '#06b6d4', borderRadius: 1 }}></span> Mumbai Digital Twin
                        </div>
                        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.3)' }}></span> Live AI Agents
                        </div>
                        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            Flood / Earthquake / Cyclone
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Stats */}
                <div style={{
                    position: 'relative', zIndex: 2, margin: '0 -40px -40px',
                    borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)',
                    display: 'flex', padding: '24px 40px'
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#06b6d4' }}>12</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'monospace', marginTop: 2 }}>ACTIVE SCENARIOS</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 32px' }}></div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#06b6d4' }}>4</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'monospace', marginTop: 2 }}>DISASTER TYPES</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 32px' }}></div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#06b6d4' }}>Mumbai</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'monospace', marginTop: 2 }}>DIGITAL TWIN CITY</div>
                    </div>
                </div>

                {/* Floating Scenario Card (Real Data) */}
                <div className="scenario-preview-card" style={{
                    position: 'absolute', bottom: 100, right: -24, zIndex: 10,
                    background: 'rgba(22,27,34,0.92)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, padding: '16px 20px', backdropFilter: 'blur(12px)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.5)', width: 240
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ 
                            width: 6, height: 6, 
                            background: isRunning ? '#22c55e' : '#f59e0b', 
                            borderRadius: '50%', 
                            animation: isRunning ? 'blink 1s infinite' : 'none' 
                        }}></div>
                        <div style={{ 
                            fontSize: '0.65rem', fontFamily: 'monospace', 
                            color: isRunning ? '#22c55e' : 'rgba(245,158,11,0.8)', 
                            letterSpacing: '0.1em', fontWeight: 600 
                        }}>
                            {isRunning ? 'LIVE SIMULATION' : 'DORMANT ENGINE'}
                        </div>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {state?.disaster?.type ? `${state.disaster.type} — ACTIVE` : 'READY FOR START'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                        Tick {state?.tick || 0} · Risk {state?.overall_risk?.toFixed(0) || 0}%
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 12, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ 
                            position: 'absolute', left: 0, top: 0, bottom: 0, 
                            width: `${state?.overall_risk || 0}%`, 
                            background: (state?.overall_risk || 0) > 60 ? '#ff4444' : '#06b6d4', 
                            borderRadius: 2,
                            transition: 'width 1s ease-out'
                        }}></div>
                    </div>
                </div>
            </div>

            {/* ── RIGHT COLUMN (FORM) ── */}
            <div className="login-form-side" style={{
                width: '45%', background: '#161b22', borderLeft: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 60px', minHeight: '100vh',
                position: 'relative', zIndex: 5
            }}>
                <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
                    <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 24, fontWeight: 600 }}>
                        SECURE ACCESS
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: '0 0 6px' }}>Resilience AI</h2>
                    <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 32px' }}>Sign in to your workspace</p>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.1em', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8, padding: '12px 14px', color: 'white', fontSize: '0.9rem', outline: 'none',
                                    transition: 'all 0.2s', boxSizing: 'border-box'
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = '#06b6d4';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: 28 }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.1em', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase' }}>Security Key / Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8, padding: '12px 14px', color: 'white', fontSize: '0.9rem', outline: 'none',
                                    transition: 'all 0.2s', boxSizing: 'border-box'
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = '#06b6d4';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{ marginBottom: 24, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff4444', fontSize: '0.82rem' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', background: '#06b6d4', color: '#0d1117', fontWeight: 700,
                                fontSize: '0.85rem', letterSpacing: '0.1em', padding: '14px', borderRadius: 8,
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                textTransform: 'uppercase', opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={e => { if(!loading) { e.target.style.background = '#0891b2'; e.target.style.boxShadow = '0 4px 20px rgba(6,182,212,0.3)'; }}}
                            onMouseLeave={e => { if(!loading) { e.target.style.background = '#06b6d4'; e.target.style.boxShadow = 'none'; }}}
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Demo Accounts */}
                    <div style={{ marginTop: 40, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                            DEMO WORKSPACES
                        </div>
                        {DEMO_ACCOUNTS.map((acc, i) => {
                            const role = (acc.label.split(' ')[0] || 'Admin').toUpperCase();
                            let badgeStyle = { fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em' };
                            
                            if (role === 'ADMIN')       badgeStyle = { ...badgeStyle, background: 'rgba(6,182,212,0.15)', color: '#06b6d4' };
                            else if (role === 'MEDICAL') badgeStyle = { ...badgeStyle, background: 'rgba(34,197,94,0.15)', color: '#22c55e' };
                            else if (role === 'TRAFFIC') badgeStyle = { ...badgeStyle, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
                            else if (role === 'FIRE')    badgeStyle = { ...badgeStyle, background: 'rgba(255,68,68,0.15)', color: '#ff4444' };
                            else if (role === 'POWER')   badgeStyle = { ...badgeStyle, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
                            else                         badgeStyle = { ...badgeStyle, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' };

                            return (
                                <div
                                    key={acc.email}
                                    onClick={() => handleDemoLogin(acc)}
                                    style={{
                                        padding: '12px 16px', borderBottom: i === DEMO_ACCOUNTS.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{acc.label}</span>
                                            <span style={badgeStyle}>{role}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{acc.desc}</div>
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1rem' }}>&#x2192;</span>
                                </div>
                            );
                        })}
                    </div>

                    <a
                        href="/public"
                        style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', marginTop: 32, display: 'block', textAlign: 'center', transition: 'color 0.2s' }}
                        onMouseEnter={e => e.target.style.color = '#06b6d4'}
                        onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
                    >
                        Access Public Learning Portal &#x2192;
                    </a>
                </div>
            </div>
        </div>
    );
}
