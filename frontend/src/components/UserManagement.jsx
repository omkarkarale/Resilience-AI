import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLES = [
    { value: 'admin', label: 'Admin', color: '#3b82f6' },
    { value: 'operator', label: 'Operator', color: '#22c55e' },
    { value: 'public', label: 'Public', color: '#7a8599' },
];

const DEPARTMENTS = [
    { value: '', label: 'None' },
    { value: 'medical', label: 'Medical' },
    { value: 'traffic', label: 'Traffic' },
    { value: 'fire', label: 'Fire' },
    { value: 'power', label: 'Power' },
    { value: 'logistics', label: 'Logistics' },
];

export default function UserManagement() {
    const { authFetch } = useAuth();
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'operator', department: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const loadUsers = () => {
        authFetch('/api/users')
            .then(r => r.json())
            .then(setUsers)
            .catch(() => {});
    };

    useEffect(() => { loadUsers(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const body = { ...formData };
            if (!body.department) body.department = null;
            const res = await authFetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed');
            }
            setFormData({ name: '', email: '', password: '', role: 'operator', department: '' });
            setShowForm(false);
            loadUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleActive = async (userId, currentActive) => {
        try {
            await authFetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentActive }),
            });
            loadUsers();
        } catch { /* ignore */ }
    };

    return (
        <div className="glass-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Participant Management ({users.length})
                </span>
                <button onClick={() => setShowForm(!showForm)} className="btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }}>
                    {showForm ? 'Cancel' : '+ Add Participant'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleCreate} style={{
                    padding: '12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    marginBottom: 10,
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Name</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12, background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Email</label>
                            <input type="email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12, background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Password</label>
                            <input type="password" required value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12, background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Role</label>
                            <select value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12, background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}>
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Department</label>
                            <select value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12, background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}>
                                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                        </div>
                    </div>
                    {error && <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--danger)' }}>{error}</div>}
                    <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', fontSize: 12 }}>
                        {submitting ? 'Creating…' : 'Create Participant'}
                    </button>
                </form>
            )}

            {/* User List */}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Name</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Email</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Role</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Dept</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => {
                            const roleObj = ROLES.find(r => r.value === u.role);
                            return (
                                <tr key={u.id} style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    opacity: u.is_active ? 1 : 0.5,
                                }}>
                                    <td style={{ padding: '6px 8px', fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</td>
                                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{u.email}</td>
                                    <td style={{ padding: '6px 8px' }}>
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                            color: roleObj?.color || '#7a8599',
                                            background: `${roleObj?.color || '#7a8599'}15`,
                                            textTransform: 'uppercase',
                                        }}>{u.role}</span>
                                    </td>
                                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                        {u.department || '—'}
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                        <button
                                            onClick={() => toggleActive(u.id, u.is_active)}
                                            style={{
                                                fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                                color: u.is_active ? '#22c55e' : '#ef4444',
                                                background: u.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                border: 'none', cursor: 'pointer',
                                            }}
                                        >{u.is_active ? 'ACTIVE' : 'INACTIVE'}</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
