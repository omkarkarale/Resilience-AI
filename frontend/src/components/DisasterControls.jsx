import { useState } from 'react';

const DISASTERS = [
    { type: 'flood',        label: 'Flood',        color: '#3b82f6' },
    { type: 'earthquake',   label: 'Earthquake',   color: '#f59e0b' },
    { type: 'cyclone',      label: 'Cyclone',      color: '#8b5cf6' },
    { type: 'grid_failure', label: 'Grid Failure',  color: '#ef4444' },
];

const ZONES = [
    { id: 'z1', name: 'South Mumbai' }, { id: 'z2', name: 'Colaba' },
    { id: 'z3', name: 'Dadar' },       { id: 'z4', name: 'Bandra' },
    { id: 'z5', name: 'Andheri' },     { id: 'z6', name: 'Juhu' },
    { id: 'z7', name: 'Powai' },       { id: 'z8', name: 'Kurla' },
    { id: 'z9', name: 'Dharavi' },     { id: 'z10', name: 'Sion' },
    { id: 'z11', name: 'Chembur' },    { id: 'z12', name: 'Borivali' },
    { id: 'z13', name: 'Thane' },      { id: 'z14', name: 'Navi Mumbai' },
];

export default function DisasterControls({ onStart, onStop, onReset, running, loading, error }) {
    const [selectedDisaster, setSelectedDisaster] = useState('flood');
    const [selectedZone, setSelectedZone] = useState('z9');
    const [intensity, setIntensity] = useState(70);

    const handleStart = () => {
        if (loading) return;
        onStart(selectedDisaster, selectedZone, intensity);
    };

    const intensityColor = intensity > 70 ? 'var(--danger)' : intensity > 40 ? 'var(--warning)' : 'var(--success)';

    return (
        <div className="glass-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Disaster Control
            </div>

            {error && (
                <div style={{
                    marginBottom: 10, padding: '6px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 500,
                    background: 'rgba(239,68,68,0.08)', color: 'var(--danger)',
                    borderLeft: '2px solid var(--danger)',
                }}>{error}</div>
            )}

            {/* Event Type — segmented control */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.03em' }}>Event Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: 3 }}>
                    {DISASTERS.map(d => (
                        <button
                            key={d.type}
                            onClick={() => setSelectedDisaster(d.type)}
                            style={{
                                padding: '5px 2px', borderRadius: 4,
                                fontSize: 11, fontWeight: selectedDisaster === d.type ? 600 : 400,
                                background: selectedDisaster === d.type ? 'var(--bg-surface-raised)' : 'transparent',
                                border: selectedDisaster === d.type ? '1px solid var(--border)' : '1px solid transparent',
                                color: selectedDisaster === d.type ? d.color : 'var(--text-secondary)',
                                cursor: 'pointer', transition: 'all 0.15s ease',
                                textAlign: 'center',
                            }}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Zone */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.03em' }}>Epicenter</div>
                <select
                    value={selectedZone}
                    onChange={e => setSelectedZone(e.target.value)}
                    style={{
                        width: '100%', padding: '6px 10px', borderRadius: 6,
                        fontSize: 12, fontWeight: 500,
                        background: 'var(--bg-surface-raised)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)', outline: 'none',
                    }}
                >
                    {ZONES.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
            </div>

            {/* Intensity */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>Intensity</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: intensityColor, fontVariantNumeric: 'tabular-nums' }}>{intensity}%</span>
                </div>
                <input
                    type="range" min="10" max="100"
                    value={intensity}
                    onChange={e => setIntensity(Number(e.target.value))}
                    style={{ width: '100%' }}
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {!running ? (
                    <button
                        onClick={handleStart}
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: '100%', padding: '9px 18px', fontSize: 12 }}
                    >
                        {loading ? 'Starting…' : 'Launch Simulation'}
                    </button>
                ) : (
                    <button onClick={onStop} className="btn-primary danger" style={{ width: '100%' }}>
                        Stop Simulation
                    </button>
                )}
                <button onClick={onReset} disabled={loading} className="btn-ghost" style={{ width: '100%' }}>
                    Reset
                </button>
            </div>
        </div>
    );
}
