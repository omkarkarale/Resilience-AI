import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuditLogPanel() {
    const { authFetch } = useAuth();
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        authFetch('/api/audit-logs')
            .then(r => r.json())
            .then(setLogs)
            .catch(() => {});
    }, []);

    const filtered = filter
        ? logs.filter(l =>
            l.action.includes(filter) ||
            l.user_name.toLowerCase().includes(filter.toLowerCase()) ||
            (l.target || '').toLowerCase().includes(filter.toLowerCase())
        )
        : logs;

    const getActionColor = (action, success) => {
        if (!success) return '#ef4444';
        if (action.includes('login')) return '#22c55e';
        if (action.includes('simulation')) return '#3b82f6';
        if (action.includes('report')) return '#8b5cf6';
        if (action.includes('announcement')) return '#f59e0b';
        if (action.includes('user')) return '#6366f1';
        return '#7a8599';
    };

    return (
        <div className="glass-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Audit Log ({filtered.length})
                </span>
                <input
                    type="text"
                    placeholder="Filter actions…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, width: 160,
                        background: 'var(--bg-surface-raised)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', outline: 'none',
                    }}
                />
            </div>

            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Time</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>User</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Role</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Action</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Target</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 10 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(log => {
                            const color = getActionColor(log.action, log.success);
                            return (
                                <tr key={log.id} style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    background: !log.success ? 'rgba(239,68,68,0.03)' : 'transparent',
                                }}>
                                    <td style={{ padding: '5px 8px', color: 'var(--text-tertiary)', fontSize: 10, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </td>
                                    <td style={{ padding: '5px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                        {log.user_name}
                                    </td>
                                    <td style={{ padding: '5px 8px' }}>
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                            color: log.role === 'admin' ? '#3b82f6' : log.role === 'operator' ? '#22c55e' : '#7a8599',
                                            background: log.role === 'admin' ? 'rgba(59,130,246,0.1)' : log.role === 'operator' ? 'rgba(34,197,94,0.1)' : 'rgba(122,133,153,0.1)',
                                            textTransform: 'uppercase',
                                        }}>{log.role}</span>
                                    </td>
                                    <td style={{ padding: '5px 8px', color, fontWeight: 500 }}>
                                        {log.action.replace(/_/g, ' ')}
                                    </td>
                                    <td style={{ padding: '5px 8px', color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {log.target || '—'}
                                    </td>
                                    <td style={{ padding: '5px 8px' }}>
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                            color: log.success ? '#22c55e' : '#ef4444',
                                            background: log.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        }}>{log.success ? 'OK' : 'FAIL'}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        No audit logs
                    </div>
                )}
            </div>
        </div>
    );
}
