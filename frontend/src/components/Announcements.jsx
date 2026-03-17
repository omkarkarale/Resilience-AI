import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Announcements() {
    const { authFetch, user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isAdmin = user?.role === 'admin';

    const loadAnnouncements = () => {
        authFetch(`/api/announcements?role=${user?.role || 'public'}`)
            .then(r => r.json())
            .then(setAnnouncements)
            .catch(() => {});
    };

    useEffect(() => { loadAnnouncements(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await authFetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, body, visibility }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to publish');
            }
            setTitle('');
            setBody('');
            setShowForm(false);
            loadAnnouncements();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="glass-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Announcements ({announcements.length})
                </span>
                {isAdmin && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn-ghost"
                        style={{ fontSize: 10, padding: '4px 10px' }}
                    >
                        {showForm ? 'Cancel' : '+ Publish'}
                    </button>
                )}
            </div>

            {/* Create Form — Admin only */}
            {showForm && isAdmin && (
                <form onSubmit={handleSubmit} style={{
                    padding: '12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    marginBottom: 10,
                }}>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Title</label>
                        <input
                            type="text" value={title} onChange={e => setTitle(e.target.value)}
                            required placeholder="Announcement title"
                            style={{
                                width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
                                background: 'var(--bg-surface-raised)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Message</label>
                        <textarea
                            value={body} onChange={e => setBody(e.target.value)}
                            required rows={3} placeholder="Announcement details..."
                            style={{
                                width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
                                background: 'var(--bg-surface-raised)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', outline: 'none', resize: 'vertical',
                                fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Visibility</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['public', 'internal'].map(v => (
                                <button key={v} type="button"
                                    onClick={() => setVisibility(v)}
                                    style={{
                                        padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                        background: visibility === v ? 'var(--primary)' : 'transparent',
                                        color: visibility === v ? '#fff' : 'var(--text-secondary)',
                                        border: visibility === v ? 'none' : '1px solid var(--border)',
                                        cursor: 'pointer', textTransform: 'capitalize',
                                    }}
                                >{v}</button>
                            ))}
                        </div>
                    </div>
                    {error && (
                        <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--danger)' }}>{error}</div>
                    )}
                    <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', fontSize: 12 }}>
                        {submitting ? 'Publishing…' : 'Publish Announcement'}
                    </button>
                </form>
            )}

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
                {announcements.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0' }}>
                        No announcements
                    </div>
                )}
                {announcements.map(a => (
                    <div key={a.id} style={{
                        padding: '8px 10px', borderRadius: 6,
                        borderLeft: `3px solid ${a.visibility === 'internal' ? '#f59e0b' : '#3b82f6'}`,
                        background: a.visibility === 'internal' ? 'rgba(245,158,11,0.04)' : 'rgba(59,130,246,0.04)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</span>
                            <span style={{
                                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                color: a.visibility === 'internal' ? '#f59e0b' : '#3b82f6',
                                background: a.visibility === 'internal' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                                textTransform: 'uppercase',
                            }}>{a.visibility}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.body}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 3 }}>
                            {a.created_by_name} · {new Date(a.created_at).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
