import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
    { label: 'Admin', email: 'admin@resilience.ai', password: 'admin123', desc: 'Full command center access' },
    { label: 'Medical Op', email: 'medical@resilience.ai', password: 'operator123', desc: 'Hospital & ambulance ops' },
    { label: 'Traffic Op', email: 'traffic@resilience.ai', password: 'operator123', desc: 'Road & transport ops' },
    { label: 'Fire Op', email: 'fire@resilience.ai', password: 'operator123', desc: 'Fire response ops' },
    { label: 'Power Op', email: 'power@resilience.ai', password: 'operator123', desc: 'Grid & power ops' },
];

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
        <div style={{
            minHeight: '100vh',
            background: '#0b0f19',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            {/* Background grid effect */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0,
                backgroundImage: `
                    linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: 440,
                display: 'flex', flexDirection: 'column', gap: 20,
            }}>
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16,
                        boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
                    }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.04em' }}>
                        RESILIENCE <span style={{ color: '#3b82f6' }}>AI</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#7a8599', marginTop: 4, fontWeight: 500 }}>
                        Crisis Command Center · Authentication
                    </div>
                </div>

                {/* Login Card */}
                <div style={{
                    background: 'rgba(15, 20, 32, 0.8)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: '32px 28px',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 18 }}>
                            <label style={{
                                display: 'block', fontSize: 11, fontWeight: 600,
                                color: '#7a8599', marginBottom: 6,
                                letterSpacing: '0.05em', textTransform: 'uppercase',
                            }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="operator@resilience.ai"
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 8, color: '#e2e8f0',
                                    fontSize: 14, outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                        </div>
                        <div style={{ marginBottom: 22 }}>
                            <label style={{
                                display: 'block', fontSize: 11, fontWeight: 600,
                                color: '#7a8599', marginBottom: 6,
                                letterSpacing: '0.05em', textTransform: 'uppercase',
                            }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 8, color: '#e2e8f0',
                                    fontSize: 14, outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
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
                                background: loading ? '#2563eb88' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: '#fff', border: 'none', borderRadius: 8,
                                fontSize: 14, fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
                                letterSpacing: '0.02em',
                            }}
                        >
                            {loading ? 'Authenticating…' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Quick Access */}
                <div style={{
                    background: 'rgba(15, 20, 32, 0.6)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: 12,
                    padding: '18px 20px',
                }}>
                    <div style={{
                        fontSize: 10, fontWeight: 600, color: '#4b5563',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        marginBottom: 10,
                    }}>Quick Access — Demo Accounts</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {DEMO_ACCOUNTS.map(acc => (
                            <button
                                key={acc.email}
                                onClick={() => handleDemoLogin(acc)}
                                disabled={loading}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 12px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                    color: '#e2e8f0', cursor: 'pointer',
                                    transition: 'all 0.15s', textAlign: 'left',
                                    width: '100%',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(59,130,246,0.06)';
                                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{acc.label}</div>
                                    <div style={{ fontSize: 10, color: '#7a8599' }}>{acc.desc}</div>
                                </div>
                                <span style={{ fontSize: 14, color: '#4b5563' }}>→</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Public Portal Link */}
                <div style={{ textAlign: 'center' }}>
                    <a
                        href="/public"
                        style={{
                            fontSize: 12, color: '#7a8599', textDecoration: 'none',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => e.target.style.color = '#3b82f6'}
                        onMouseLeave={e => e.target.style.color = '#7a8599'}
                    >
                        Access Public Safety Portal →
                    </a>
                </div>
            </div>
        </div>
    );
}
