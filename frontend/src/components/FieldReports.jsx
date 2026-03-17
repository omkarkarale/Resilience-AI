import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const REPORT_TYPES = [
    { value: 'road_blocked', label: 'Road Blocked' },
    { value: 'hospital_issue', label: 'Hospital Access Issue' },
    { value: 'shelter_full', label: 'Shelter Full' },
    { value: 'power_outage', label: 'Power Outage' },
    { value: 'comms_disruption', label: 'Comms Disruption' },
    { value: 'fire_station_unavailable', label: 'Fire Station Unavailable' },
    { value: 'emergency_incident', label: 'Emergency Incident' },
];

const ZONES = [
    { id: 'z1', name: 'South Mumbai' }, { id: 'z2', name: 'Colaba' },
    { id: 'z3', name: 'Dadar' }, { id: 'z4', name: 'Bandra' },
    { id: 'z5', name: 'Andheri' }, { id: 'z6', name: 'Juhu' },
    { id: 'z7', name: 'Powai' }, { id: 'z8', name: 'Kurla' },
    { id: 'z9', name: 'Dharavi' }, { id: 'z10', name: 'Sion' },
    { id: 'z11', name: 'Chembur' }, { id: 'z12', name: 'Borivali' },
    { id: 'z13', name: 'Thane' }, { id: 'z14', name: 'Navi Mumbai' },
];

const TYPE_COLORS = {
    road_blocked: '#f59e0b',
    hospital_issue: '#ef4444',
    shelter_full: '#8b5cf6',
    power_outage: '#f97316',
    comms_disruption: '#6366f1',
    fire_station_unavailable: '#ef4444',
    emergency_incident: '#dc2626',
};

export default function FieldReports() {
    const { authFetch, user } = useAuth();
    const [reports, setReports] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [zone, setZone] = useState('z1');
    const [reportType, setReportType] = useState('road_blocked');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const loadReports = () => {
        authFetch('/api/field-reports')
            .then(r => r.json())
            .then(setReports)
            .catch(() => {});
    };

    useEffect(() => { loadReports(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await authFetch('/api/field-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zone, report_type: reportType, description }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to submit');
            }
            setDescription('');
            setShowForm(false);
            loadReports();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const isAdmin = user?.role === 'admin';

    return (
        <div className="glass-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Field Reports ({reports.length})
                </span>
                {!isAdmin && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn-ghost"
                        style={{ fontSize: 10, padding: '4px 10px' }}
                    >
                        {showForm ? 'Cancel' : '+ New Report'}
                    </button>
                )}
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleSubmit} style={{
                    padding: '12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    marginBottom: 10,
                }}>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Zone</label>
                        <select value={zone} onChange={e => setZone(e.target.value)} style={{
                            width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
                            background: 'var(--bg-surface-raised)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', outline: 'none',
                        }}>
                            {ZONES.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} style={{
                            width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
                            background: 'var(--bg-surface-raised)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', outline: 'none',
                        }}>
                            {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Description</label>
                        <textarea
                            value={description} onChange={e => setDescription(e.target.value)}
                            required rows={3} placeholder="Describe the situation..."
                            style={{
                                width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
                                background: 'var(--bg-surface-raised)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', outline: 'none', resize: 'vertical',
                                fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    {error && (
                        <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--danger)' }}>{error}</div>
                    )}
                    <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', fontSize: 12 }}>
                        {submitting ? 'Submitting…' : 'Submit Report'}
                    </button>
                </form>
            )}

            {/* Reports List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
                {reports.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0' }}>
                        No field reports yet
                    </div>
                )}
                {reports.map(r => {
                    const typeColor = TYPE_COLORS[r.report_type] || '#7a8599';
                    const typeLabel = REPORT_TYPES.find(t => t.value === r.report_type)?.label || r.report_type;
                    const zoneName = ZONES.find(z => z.id === r.zone)?.name || r.zone;
                    return (
                        <div key={r.id} style={{
                            padding: '8px 10px', borderRadius: 6,
                            borderLeft: `2px solid ${typeColor}`,
                            background: `${typeColor}08`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                        color: typeColor, background: `${typeColor}15`,
                                    }}>{typeLabel}</span>
                                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{zoneName}</span>
                                </div>
                                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                                    {new Date(r.created_at).toLocaleTimeString()}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                {r.description}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                                {r.user_name}{r.department ? ` · ${r.department}` : ''}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
