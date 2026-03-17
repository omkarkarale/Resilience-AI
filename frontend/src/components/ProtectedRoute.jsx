import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-dark)', color: 'var(--text-secondary)',
                fontSize: 14, fontWeight: 500,
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 32, height: 32, border: '3px solid var(--border)',
                        borderTopColor: 'var(--primary)', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                    }} />
                    Authenticating…
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-dark)', color: 'var(--text-primary)',
                flexDirection: 'column', gap: 12,
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 12,
                    background: 'rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                }}>🔒</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Access Denied</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, textAlign: 'center' }}>
                    Your role ({user?.role}) does not have permission to access this area.
                </div>
                <a href="/" style={{
                    marginTop: 8, padding: '8px 20px', borderRadius: 6,
                    background: 'var(--primary)', color: '#fff',
                    fontSize: 12, fontWeight: 600, textDecoration: 'none',
                }}>Back to Dashboard</a>
            </div>
        );
    }

    return children;
}
