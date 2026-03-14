import React from 'react';

const INFRA_CATEGORIES = [
    { id: 'hospital',       label: 'Hospitals',  icon: 'H' },
    { id: 'power_station',  label: 'Power',      icon: 'P' },
    { id: 'shelter',        label: 'Shelters',    icon: 'S' },
    { id: 'fire_station',   label: 'Fire',        icon: 'F' },
    { id: 'police_station', label: 'Police',      icon: 'L' },
    { id: 'communications', label: 'Comms',       icon: 'C' },
];

function InfraChip({ label, icon, metric, health }) {
    const color = health > 70 ? 'var(--success)' : health > 40 ? 'var(--warning)' : 'var(--danger)';
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 10px',
            background: health < 50 ? 'rgba(239,68,68,0.06)' : 'transparent',
            borderRadius: 4,
            minWidth: 0,
        }}>
            <div style={{
                width: 18, height: 18, borderRadius: 4,
                background: `${color}18`, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, flexShrink: 0,
            }}>{icon}</div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{metric}</div>
            </div>
        </div>
    );
}

const StatusBar = React.memo(function StatusBar({ state, connected }) {
    if (!state) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 11, color: 'var(--text-secondary)',
            }}>
                <div className={`status-dot ${connected ? 'operational' : 'failed'}`} />
                {connected ? 'Connected — Awaiting Simulation' : 'Offline — Reconnecting…'}
            </div>
        );
    }

    const { infrastructure = [], roads = [], overall_risk = 0, tick = 0, running = false, zones = [], city_summary = {} } = state;

    const blockedRoads = roads.filter(r => r.blocked).length;
    const totalPop = zones.reduce((sum, z) => sum + (z.population || 0), 0);
    const riskColor = overall_risk > 60 ? 'var(--danger)' : overall_risk > 30 ? 'var(--warning)' : 'var(--success)';

    const infraCards = INFRA_CATEGORIES.map(cat => {
        const items = infrastructure.filter(i => i.type === cat.id);
        const operational = items.filter(i => i.status === 'operational').length;
        const health = items.length > 0 ? (operational / items.length) * 100 : 100;
        return { ...cat, metric: items.length > 0 ? `${operational}/${items.length}` : '—', health };
    });

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            gap: 8,
        }} className="animate-slide-up">
            {/* Left: Key metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {running && (
                    <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: 'var(--danger)',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', animation: 'pulse-danger 2s infinite' }} />
                        LIVE
                    </span>
                )}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>Tick</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{tick}</div>
                </div>
                <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>Risk</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: riskColor, fontVariantNumeric: 'tabular-nums' }}>{overall_risk.toFixed(0)}%</div>
                </div>
                <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>Pop.</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{(totalPop / 1000000).toFixed(1)}M</div>
                </div>
                {blockedRoads > 0 && (
                    <>
                        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>Roads</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>{blockedRoads} blocked</div>
                        </div>
                    </>
                )}
                {city_summary?.total_exposed > 0 && (
                    <>
                        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>Exposed</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{(city_summary.total_exposed / 1000).toFixed(1)}k</div>
                        </div>
                        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>Evac.</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>{(city_summary.total_evacuating / 1000).toFixed(1)}k</div>
                        </div>
                    </>
                )}
            </div>

            {/* Right: Infrastructure chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
                {infraCards.map((cat, i) => (
                    <InfraChip key={i} {...cat} />
                ))}
            </div>
        </div>
    );
});

export default StatusBar;
