import React from 'react';

const URGENCY_CONFIG = {
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.06)', label: 'CRITICAL', order: 0 },
    high:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', label: 'HIGH',     order: 1 },
    medium:   { color: '#eab308', bg: 'rgba(234,179,8,0.05)',  label: 'MEDIUM',   order: 2 },
    low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.05)',  label: 'LOW',      order: 3 },
};

function getRiskColor(score) {
    if (score > 70) return '#ef4444';
    if (score > 40) return '#f59e0b';
    return '#22c55e';
}

function PriorityCard({ rec }) {
    const urgency = URGENCY_CONFIG[rec.urgency] || URGENCY_CONFIG.medium;
    const agent = rec.agent?.replace(' Agent', '') || 'AI';

    return (
        <div style={{
            padding: '8px 10px',
            borderLeft: `2px solid ${urgency.color}`,
            background: urgency.bg,
            borderRadius: '0 4px 4px 0',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                        padding: '1px 5px', borderRadius: 3,
                        color: urgency.color, background: `${urgency.color}15`,
                    }}>{urgency.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>{agent}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {rec.confidence?.toFixed(0)}%
                </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {rec.action?.replace(/^\[P\d+\] /, '')}
            </div>
            {rec.reason && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.3 }}>
                    {rec.reason.length > 100 ? rec.reason.slice(0, 100) + '…' : rec.reason}
                </div>
            )}
        </div>
    );
}

const Dashboard = React.memo(function Dashboard({ state }) {
    if (!state) return null;

    const { zones = [], recommendations = [], overall_risk = 0, tick = 0, disaster } = state;

    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const allRecs = recommendations
        .filter(r => r.action && r.reason)
        .sort((a, b) => {
            const uDiff = (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4);
            return uDiff !== 0 ? uDiff : a.priority - b.priority;
        });

    const seen = new Set();
    const uniqueRecs = allRecs.filter(r => {
        const key = r.action.slice(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 6);

    const avgConfidence = uniqueRecs.length > 0
        ? uniqueRecs.reduce((s, r) => s + r.confidence, 0) / uniqueRecs.length : 0;

    const sortedZones = [...zones].sort((a, b) => b.risk_score - a.risk_score);
    const riskColor = getRiskColor(overall_risk);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Overall Assessment */}
            <div className="glass-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Assessment
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                        T+{tick.toString().padStart(3, '0')}
                    </span>
                </div>

                {disaster && (
                    <div style={{
                        marginBottom: 10, padding: '5px 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 500,
                        background: 'rgba(239,68,68,0.06)',
                        borderLeft: '2px solid var(--danger)',
                        color: '#f87171',
                    }}>
                        Active: <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{disaster.type}</span>
                        {' — '}{disaster.intensity?.toFixed(0)}% intensity
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Risk gauge — compact */}
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                        background: `conic-gradient(${riskColor} ${overall_risk * 3.6}deg, rgba(255,255,255,0.04) 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'var(--bg-dark)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: riskColor, lineHeight: 1 }}>{overall_risk.toFixed(0)}</span>
                            <span style={{ fontSize: 8, color: 'var(--text-tertiary)', fontWeight: 600 }}>RISK</span>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 3 }}>AI Confidence</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div className="health-bar" style={{ flex: 1 }}>
                                    <div className="health-bar-fill" style={{
                                        width: `${avgConfidence}%`,
                                        background: avgConfidence > 70 ? 'var(--success)' : 'var(--warning)',
                                    }} />
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>
                                    {avgConfidence.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--danger)', padding: '1px 6px', borderRadius: 3, background: 'rgba(239,68,68,0.08)' }}>
                                {uniqueRecs.filter(r => r.urgency === 'critical').length} Critical
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--warning)', padding: '1px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.08)' }}>
                                {uniqueRecs.filter(r => r.urgency === 'high').length} High
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Priority Actions */}
            {uniqueRecs.length > 0 && (
                <div className="glass-card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Priority Actions ({uniqueRecs.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {uniqueRecs.map((rec, i) => <PriorityCard key={i} rec={rec} />)}
                    </div>
                </div>
            )}

            {/* District Risk Scores */}
            <div className="glass-card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    District Risk
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                    {sortedZones.map(zone => (
                        <div key={zone.id} style={{ padding: '5px 8px', borderRadius: 4, background: zone.risk_score > 60 ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zone.name}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: getRiskColor(zone.risk_score), fontVariantNumeric: 'tabular-nums', marginLeft: 4, flexShrink: 0 }}>{zone.risk_score.toFixed(0)}%</span>
                            </div>
                            <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 1, width: `${zone.risk_score}%`, background: getRiskColor(zone.risk_score), transition: 'width 0.5s ease' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default Dashboard;
