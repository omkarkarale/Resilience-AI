import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

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

// Gear icon SVG
function GearIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

export default function DisasterControls({ onStart, onStop, onReset, running, loading, error }) {
    const { activeExperiment, setActiveExperiment } = useAuth();

    // Derive local UI-selection values from context (persist across unmount) or fall back to defaults
    const selectedDisaster = activeExperiment?.type ?? 'flood';
    const selectedZone     = activeExperiment?.zone ?? 'z9';
    const intensity        = activeExperiment?.intensity ?? 70;

    const setSelectedDisaster = (type)     => setActiveExperiment(prev => ({ ...(prev ?? {}), type,      zone: prev?.zone ?? 'z9',   intensity: prev?.intensity ?? 70 }));
    const setSelectedZone     = (zone)     => setActiveExperiment(prev => ({ ...(prev ?? {}), zone,      type: prev?.type ?? 'flood', intensity: prev?.intensity ?? 70 }));
    const setIntensity        = (intensity) => setActiveExperiment(prev => ({ ...(prev ?? {}), intensity, type: prev?.type ?? 'flood', zone: prev?.zone ?? 'z9' }));

    const [isCollapsed, setIsCollapsed] = useState(false);

    // Auto-collapse when simulation starts
    useEffect(() => {
        if (running) setIsCollapsed(true);
    }, [running]);

    const handleStart = () => {
        if (loading) return;
        // Persist selection to context before starting
        setActiveExperiment({ type: selectedDisaster, zone: selectedZone, intensity });
        onStart(selectedDisaster, selectedZone, intensity);
    };

    const intensityColor = intensity > 70 ? 'var(--danger)' : intensity > 40 ? 'var(--warning)' : 'var(--success)';

    const disasterLabel = DISASTERS.find(d => d.type === selectedDisaster)?.label ?? selectedDisaster;
    const disasterColor = DISASTERS.find(d => d.type === selectedDisaster)?.color ?? '#64748b';
    const zoneName = ZONES.find(z => z.id === selectedZone)?.name ?? selectedZone;

    // Stop/Reset buttons — always visible
    const ActionButtons = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {!running ? (
                <button
                    onClick={handleStart}
                    disabled={loading}
                    className="btn-primary"
                    style={{ width: '100%', padding: '9px 18px', fontSize: 12 }}
                >
                    {loading ? 'Starting…' : 'Start Experiment'}
                </button>
            ) : (
                <button onClick={() => { setActiveExperiment(null); onStop(); }} className="btn-primary danger" style={{ width: '100%' }}>
                    Stop Experiment
                </button>
            )}
            <button onClick={() => { setActiveExperiment(null); onReset(); }} disabled={loading} className="btn-ghost" style={{ width: '100%' }}>
                Reset
            </button>
        </div>
    );

    return (
        <div className="glass-card" style={{ padding: '14px 16px' }}>

            {error && (
                <div style={{
                    marginBottom: 10, padding: '6px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 500,
                    background: 'rgba(239,68,68,0.08)', color: 'var(--danger)',
                    borderLeft: '2px solid var(--danger)',
                }}>{error}</div>
            )}

            {isCollapsed ? (
                /* ── Collapsed: compact summary bar ── */
                <>
                    <div style={{
                        height: 40,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 8,
                    }}>
                        {/* Left: gear + summary text */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                            <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                                <GearIcon />
                            </span>
                            <span style={{
                                fontSize: 12, fontWeight: 600,
                                color: disasterColor,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {disasterLabel.toUpperCase()}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>
                            <span style={{
                                fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {zoneName}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>
                            <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: intensityColor, fontVariantNumeric: 'tabular-nums',
                                flexShrink: 0,
                            }}>
                                {intensity}%
                            </span>
                        </div>

                        {/* Right: Edit button */}
                        <button
                            onClick={() => setIsCollapsed(false)}
                            style={{
                                padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                                color: 'var(--text-secondary)', background: 'var(--bg-hover)',
                                border: '1px solid var(--border)', cursor: 'pointer',
                                flexShrink: 0, transition: 'all 0.15s',
                            }}
                        >
                            Edit
                        </button>
                    </div>

                    {/* Stop/Reset always visible */}
                    {ActionButtons}
                </>
            ) : (
                /* ── Expanded: full panel ── */
                <>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
                        Simulation Parameters
                    </div>

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
                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.03em' }}>Scenario Origin</div>
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
                    {ActionButtons}
                </>
            )}
        </div>
    );
}
