import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://127.0.0.1:8000';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('resilience-token'));
    const [loading, setLoading] = useState(true);
    // Experiment state lifted here so it survives tab navigation (DisasterControls unmounts/remounts)
    const [activeExperiment, setActiveExperiment] = useState(null);

    // Validate stored token on mount
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => {
                if (!res.ok) throw new Error('Invalid token');
                return res.json();
            })
            .then(userData => {
                setUser(userData);
                setLoading(false);
            })
            .catch(() => {
                localStorage.removeItem('resilience-token');
                setToken(null);
                setUser(null);
                setLoading(false);
            });
    }, [token]);

    const login = useCallback(async (email, password) => {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(err.detail || 'Login failed');
        }
        const data = await res.json();
        localStorage.setItem('resilience-token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        if (token) {
            try {
                await fetch(`${API_BASE}/api/auth/logout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch { /* ignore */ }
        }
        localStorage.removeItem('resilience-token');
        setToken(null);
        setUser(null);
    }, [token]);

    // Helper to make authenticated API calls
    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { ...options.headers };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return fetch(url.startsWith('http') ? url : `${API_BASE}${url}`, {
            ...options,
            headers,
        });
    }, [token]);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            logout,
            authFetch,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'admin',
            isOperator: user?.role === 'operator',
            isPublic: user?.role === 'public',
            activeExperiment,
            setActiveExperiment,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
