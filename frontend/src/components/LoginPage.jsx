import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Role config ──────────────────────────────────────────────── */
const ROLE_BADGES = {
    Admin:        'COMMANDER',
    'Medical Op': 'MEDICAL',
    'Traffic Op': 'TRAFFIC',
    'Fire Op':    'FIRE',
    'Power Op':   'POWER',
};

const DEMO_ACCOUNTS = [
    { label: 'Admin', email: 'admin@resilience.ai', password: 'admin123', desc: 'Full command center access' },
    { label: 'Medical Op', email: 'medical@resilience.ai', password: 'operator123', desc: 'Hospital & ambulance ops' },
    { label: 'Traffic Op', email: 'traffic@resilience.ai', password: 'operator123', desc: 'Road & transport ops' },
    { label: 'Fire Op', email: 'fire@resilience.ai', password: 'operator123', desc: 'Fire response ops' },
    { label: 'Power Op', email: 'power@resilience.ai', password: 'operator123', desc: 'Grid & power ops' },
];

/* ── CSS-only animations (injected once) ──────────────────────── */
const STYLE_TAG = `
@keyframes radarPulse {
    0%   { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(2);   opacity: 0; }
}
@keyframes scanLine {
    0%   { left: -30%; }
    100% { left: 100%; }
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0; }
}
@keyframes gridPulse {
    0%, 100% { opacity: 0.02; }
    50%      { opacity: 0.05; }
}
`;

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
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
        <>
            <style>{STYLE_TAG}</style>

            <div style={{
                minHeight: '100vh',
                background: '#080c10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
            }}>

                {/* ── Animated grid background ── */}
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 0,
                    backgroundImage: `
                        linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                    animation: 'gridPulse 4s ease-in-out infinite',
                }} />

                {/* ── Radar pulse rings — very subtle slate ── */}
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        position: 'fixed',
                        top: '50%', left: '50%',
                        width: 400, height: 400,
                        marginTop: -200, marginLeft: -200,
                        borderRadius: '50%',
                        border: '1px solid rgba(148,163,184,0.06)',
                        animation: `radarPulse 3s ease-out infinite`,
                        animationDelay: `${i}s`,
                        zIndex: 0,
                        pointerEvents: 'none',
                    }} />
                ))}

                {/* ── Main content ── */}
                <div style={{
                    position: 'relative', zIndex: 1,
                    width: '100%', maxWidth: 440,
                    display: 'flex', flexDirection: 'column', gap: 20,
                }}>

                    {/* ── Brand / Header ── */}
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: '#0f1520',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 16,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(148,163,184,0.15)',
                        }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.04em' }}>
                            RESILIENCE <span style={{ color: '#94a3b8' }}>AI</span>
                        </div>
                        <div style={{
                            fontSize: 10, color: '#475569', marginTop: 6,
                            fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                        }}>
                            AUTHORIZED PERSONNEL ONLY &nbsp;·&nbsp; SECURE ACCESS
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 6, marginTop: 10,
                        }}>
                            <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: '#94a3b8',
                                animation: 'blink 1s infinite',
                                display: 'inline-block',
                            }} />
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.08em' }}>
                                SYSTEM ACTIVE
                            </span>
                        </div>
                    </div>

                    {/* ── Login Card ── */}
                    <div style={{
                        background: 'rgba(12, 18, 26, 0.97)',
                        border: '1px solid rgba(148,163,184,0.15)',
                        borderLeft: '3px solid #334155',
                        borderRadius: 12,
                        padding: 0,
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        {/* Scanning status bar — slate colored */}
                        <div style={{
                            height: 2, width: '100%',
                            background: 'rgba(51,65,85,0.3)',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: 0,
                                width: '30%', height: '100%',
                                background: 'linear-gradient(90deg, transparent, #334155, transparent)',
                                animation: 'scanLine 2s linear infinite',
                            }} />
                        </div>

                        <div style={{ padding: '28px 28px 32px' }}>
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: 18 }}>
                                    <label style={{
                                        display: 'block', fontSize: 10, fontWeight: 600,
                                        color: '#6b7280', marginBottom: 6,
                                        letterSpacing: '0.08em', textTransform: 'uppercase',
                                    }}>Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        placeholder="operator@resilience.ai"
                                        style={{
                                            width: '100%', padding: '10px 14px',
                                            background: '#0a0f14',
                                            border: '1px solid #1f2937',
                                            borderRadius: 8, color: '#e2e8f0',
                                            fontSize: 14, outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#475569'}
                                        onBlur={e => e.target.style.borderColor = '#1f2937'}
                                    />
                                </div>
                                <div style={{ marginBottom: 22 }}>
                                    <label style={{
                                        display: 'block', fontSize: 10, fontWeight: 600,
                                        color: '#6b7280', marginBottom: 6,
                                        letterSpacing: '0.08em', textTransform: 'uppercase',
                                    }}>Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%', padding: '10px 14px',
                                            background: '#0a0f14',
                                            border: '1px solid #1f2937',
                                            borderRadius: 8, color: '#e2e8f0',
                                            fontSize: 14, outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#475569'}
                                        onBlur={e => e.target.style.borderColor = '#1f2937'}
                                    />
                                </div>

                                {error && (
                                    <div style={{
                                        marginBottom: 16, padding: '8px 12px', borderRadius: 8,
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        color: '#f87171', fontSize: 12, fontWeight: 500,
                                    }}>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        width: '100%', padding: '11px 20px',
                                        background: loading ? '#1e293b88' : '#1e293b',
                                        color: '#e2e8f0',
                                        border: '1px solid #334155',
                                        borderRadius: 8,
                                        fontSize: 13, fontWeight: 700,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: 'none',
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                    }}
                                    onMouseEnter={e => {
                                        if (!loading) {
                                            e.currentTarget.style.background = '#293548';
                                            e.currentTarget.style.boxShadow = '0 0 20px rgba(148,163,184,0.1)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!loading) {
                                            e.currentTarget.style.background = '#1e293b';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    {loading ? 'Authenticating…' : 'AUTHENTICATE'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ── Quick Access ── */}
                    <div style={{
                        background: 'rgba(12, 18, 26, 0.8)',
                        border: '1px solid rgba(148,163,184,0.1)',
                        borderRadius: 12,
                        padding: '18px 20px',
                    }}>
                        <div style={{
                            fontSize: 10, fontWeight: 600, color: '#64748b',
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            marginBottom: 10,
                        }}>⚡ DEMO CREDENTIALS — SELECT ROLE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {DEMO_ACCOUNTS.map(acc => {
                                const badge = ROLE_BADGES[acc.label] || '';
                                return (
                                    <button
                                        key={acc.email}
                                        onClick={() => handleDemoLogin(acc)}
                                        disabled={loading}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 12px', borderRadius: 8,
                                            background: '#0a0f14',
                                            border: 'none',
                                            borderLeft: '3px solid #475569',
                                            color: '#e2e8f0', cursor: 'pointer',
                                            transition: 'all 0.15s', textAlign: 'left',
                                            width: '100%',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = '#111820';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = '#0a0f14';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {acc.label}
                                                    <span style={{
                                                        fontSize: 8, fontWeight: 700,
                                                        color: '#94a3b8',
                                                        background: 'rgba(148,163,184,0.08)',
                                                        padding: '2px 6px', borderRadius: 3,
                                                        letterSpacing: '0.06em',
                                                        textTransform: 'uppercase',
                                                        border: '1px solid rgba(148,163,184,0.15)',
                                                    }}>{badge}</span>
                                                </div>
                                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{acc.desc}</div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 14, color: '#475569', fontWeight: 600, transition: 'color 0.15s' }}>→</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Public Portal Link ── */}
                    <div style={{ textAlign: 'center' }}>
                        <a
                            href="/public"
                            style={{
                                fontSize: 12, color: '#475569', textDecoration: 'none',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => e.target.style.color = '#94a3b8'}
                            onMouseLeave={e => e.target.style.color = '#475569'}
                        >
                            Access Public Safety Portal →
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
