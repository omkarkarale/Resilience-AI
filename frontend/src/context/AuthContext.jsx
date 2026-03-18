import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const DEMO_ACCOUNTS = [
    { name: 'Admin', email: 'admin@resilience.ai', role: 'admin', department: null },
    { name: 'Medical Learner', email: 'medical@resilience.ai', role: 'operator', department: 'medical' },
    { name: 'Traffic Learner', email: 'traffic@resilience.ai', role: 'operator', department: 'traffic' },
    { name: 'Fire Learner', email: 'fire@resilience.ai', role: 'operator', department: 'fire' },
    { name: 'Power Learner', email: 'power@resilience.ai', role: 'operator', department: 'power' },
    { name: 'Public User', email: 'public@resilience.ai', role: 'public', department: null },
];

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('resilience-token'));
    const [loading, setLoading] = useState(true);
    // Experiment state lifted here so it survives tab navigation (DisasterControls unmounts/remounts)
    const [activeExperiment, setActiveExperiment] = useState(null);

    // Initial check (no backend call needed)
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        // Simulating a valid token check by finding a user associated with the "token" (which is just the email for simplicity)
        const storedUser = DEMO_ACCOUNTS.find(u => u.email === token);
        if (storedUser) {
            setUser(storedUser);
        } else if (token === 'mock-token-admin') {
            setUser(DEMO_ACCOUNTS[0]);
        }
        setLoading(false);
    }, [token]);

    const login = useCallback(async (email, password) => {
        // Artificially delay slightly for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        // Find match in demo accounts or default to admin for any entry (per user request: "no verification")
        let authenticatedUser = DEMO_ACCOUNTS.find(acc => acc.email === email);
        
        // If no demo account matches, just create a mock user based on email or default to admin
        if (!authenticatedUser) {
            authenticatedUser = {
                name: email.split('@')[0],
                email: email,
                role: email.includes('admin') ? 'admin' : 'operator',
                department: email.includes('medical') ? 'medical' : null
            };
        }

        localStorage.setItem('resilience-token', authenticatedUser.email);
        setToken(authenticatedUser.email);
        setUser(authenticatedUser);
        return authenticatedUser;
    }, []);

    const logout = useCallback(async () => {
        localStorage.removeItem('resilience-token');
        setToken(null);
        setUser(null);
    }, []);

    // Helper to make "authenticated" API calls (keeping it for compatibility, but it doesn't add headers)
    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { ...options.headers };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        // In this direct login mode, we just pass through to fetch
        return fetch(url, { ...options, headers });
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
