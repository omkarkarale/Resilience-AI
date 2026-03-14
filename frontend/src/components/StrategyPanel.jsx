import React from 'react';

const STRATEGY_COLORS = {
    aggressive_evac: '#ef4444',
    fortify_in_place: '#3b82f6',
    balanced: '#22c55e',
    infra_first: '#f59e0b',
};

function MetricBar({ label, value, max = 100, color }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{typeof value === 'number' ? value.toFixed(1) : value}</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: color, transition: 'width 0.5s ease' }} />
            </div>
        </div>
    );
}

function StrategyCard({ strategy, isRecommended, rank }) {
    const color = STRATEGY_COLORS[strategy.id] || '#64748b';

    return (
        <div style={{
            padding: '10px 12px',
            background: isRecommended ? `${color}08` : 'transparent',
            border: isRecommended ? `1px solid ${color}30` : '1px solid var(--border)',
            borderRadius: 6,
            position: 'relative',
        }}>
            {/* Rank badge */}
            <div style={{
                position: 'absolute', top: -6, left: 10,
                padding: '1px 6px', borderRadius: 3,
                fontSize: 9, fontWeight: 700,
                background: isRecommended ? color : 'var(--bg-surface-raised)',
                color: isRecommended ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${isRecommended ? color : 'var(--border)'}`,
            }}>
                #{rank}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, marginTop: 4 }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isRecommended ? color : 'var(--text-primary)' }}>
                        {strategy.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
                        {strategy.description}
                    </div>
                </div>
                <div style={{
                    textAlign: 'center', padding: '4px 8px', borderRadius: 4,
                    background: isRecommended ? `${color}15` : 'var(--bg-surface-raised)',
                    minWidth: 44,
                }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isRecommended ? color : 'var(--text-primary)', lineHeight: 1 }}>
                        {strategy.impact_score?.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 8, color: 'var(--text-tertiary)', fontWeight: 600 }}>SCORE</div>
                </div>
            </div>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
                <MetricBar label="Risk Reduction" value={strategy.risk_reduction} max={50} color="#22c55e" />
                <MetricBar label="Time Saved" value={strategy.time_saved_min} max={60} color="#3b82f6" />
                <MetricBar label="Survival Improvement" value={strategy.survival_improvement} max={40} color="#a855f7" />
                <MetricBar label="Confidence" value={strategy.confidence} max={100} color="#f59e0b" />
            </div>

            {/* Actions */}
            <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.04em' }}>ACTIONS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(strategy.actions || []).slice(0, 3).map((action, i) => (
                        <div key={i} style={{
                            fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4,
                            paddingLeft: 8, borderLeft: `2px solid ${color}20`,
                        }}>
                            {action}
                        </div>
                    ))}
                    {(strategy.actions || []).length > 3 && (
                        <div style={{ fontSize: 9, color: 'var(--text-tertiary)', paddingLeft: 8 }}>
                            +{strategy.actions.length - 3} more
                        </div>
                    )}
                </div>
            </div>

            {isRecommended && (
                <div style={{
                    marginTop: 8, padding: '4px 8px', borderRadius: 4,
                    background: `${color}12`, textAlign: 'center',
                    fontSize: 10, fontWeight: 600, color,
                }}>
                    ★ RECOMMENDED STRATEGY
                </div>
            )}
        </div>
    );
}

const StrategyPanel = React.memo(function StrategyPanel({ state }) {
    if (!state) return null;

    const { strategies = [], recommended_strategy_id, city_summary = {}, resource_allocations = [] } = state;

    if (strategies.length === 0 && !city_summary.total_exposed) {
        return (
            <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Start a simulation to see AI strategy recommendations.
                </div>
            </div>
        );
    }

    // Resource summaries
    const ambulanceAllocs = resource_allocations.filter(a => a.resource_type === 'ambulance');
    const generatorAllocs = resource_allocations.filter(a => a.resource_type === 'generator');
    const evacRoutes = resource_allocations.filter(a => a.resource_type === 'evacuation_route');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Population Impact */}
            {city_summary.total_exposed > 0 && (
                <div className="glass-card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
                        Population Impact
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                        {[
                            { label: 'Exposed', value: city_summary.total_exposed, color: '#ef4444' },
                            { label: 'Evacuating', value: city_summary.total_evacuating, color: '#f59e0b' },
                            { label: 'Sheltered', value: city_summary.total_sheltered, color: '#22c55e' },
                            { label: 'Est. Casualties', value: city_summary.total_casualties_est, color: '#ef4444' },
                        ].map((m, i) => (
                            <div key={i} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 4, background: `${m.color}06` }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: m.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                                    {typeof m.value === 'number' ? (m.value > 9999 ? `${(m.value / 1000).toFixed(1)}k` : m.value.toLocaleString()) : '—'}
                                </div>
                                <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 2 }}>{m.label}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '4px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Avg Evac Time</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: city_summary.avg_evac_time_min > 30 ? '#ef4444' : '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                            {city_summary.avg_evac_time_min?.toFixed(0) || '—'} min
                        </span>
                    </div>
                </div>
            )}

            {/* Resource Allocation Summary */}
            {resource_allocations.length > 0 && (
                <div className="glass-card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Resource Allocation
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ambulanceAllocs.length > 0 && (
                            <div style={{ padding: '5px 8px', borderRadius: 4, borderLeft: '2px solid #ef4444', background: 'rgba(239,68,68,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>Ambulances</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{ambulanceAllocs.reduce((s, a) => s + a.amount, 0)} deployed</span>
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
                                    → {ambulanceAllocs.slice(0, 3).map(a => a.target_name).join(', ')}
                                </div>
                            </div>
                        )}
                        {generatorAllocs.length > 0 && (
                            <div style={{ padding: '5px 8px', borderRadius: 4, borderLeft: '2px solid #f59e0b', background: 'rgba(245,158,11,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>Generators</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{generatorAllocs.length} deployed</span>
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
                                    → {generatorAllocs.slice(0, 3).map(a => a.target_name.split(' (')[0]).join(', ')}
                                </div>
                            </div>
                        )}
                        {evacRoutes.length > 0 && (
                            <div style={{ padding: '5px 8px', borderRadius: 4, borderLeft: '2px solid #3b82f6', background: 'rgba(59,130,246,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>Evacuation Routes</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>{evacRoutes.length} active</span>
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
                                    Avg route time: {(evacRoutes.reduce((s, a) => s + a.route_cost, 0) / evacRoutes.length).toFixed(0)} min
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Ranked Strategies */}
            {strategies.length > 0 && (
                <div className="glass-card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
                        Response Strategies
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {strategies.map((s, i) => (
                            <StrategyCard
                                key={s.id}
                                strategy={s}
                                rank={i + 1}
                                isRecommended={s.id === recommended_strategy_id}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default StrategyPanel;
