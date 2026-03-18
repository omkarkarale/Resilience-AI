export default function CascadingFlow({ events = [] }) {
    if (events.length === 0) return null;

    const nodeColors = {
        'Flood': '#3b82f6', 'Earthquake': '#f59e0b', 'Cyclone': '#0ea5e9', 'Tsunami': '#2563eb',
        'Road': '#ef4444', 'Emergency': '#f97316', 'Casualty': '#f97316',
        'Hospital': '#a855f7', 'Power': '#eab308', 'Infrastructure': '#eab308',
        'Supply': '#06b6d4',
    };

    const getNodeColor = (name) => {
        for (const [key, val] of Object.entries(nodeColors)) {
            if (name.includes(key)) return val;
        }
        return '#64748b';
    };

    return (
        <div style={{
            padding: '8px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
        }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
                Cascade Chain
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 2 }}>
                {events.map((event, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {/* Source Node */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px',
                            background: 'var(--bg-surface-raised)',
                            border: `1px solid ${getNodeColor(event.source)}40`, // slight tint
                            borderRadius: 6,
                            fontSize: 10,
                        }}>
                            <div style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: getNodeColor(event.source), flexShrink: 0,
                                boxShadow: `0 0 4px ${getNodeColor(event.source)}`
                            }} />
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {event.source}
                            </div>
                        </div>

                        {/* Arrow with Description */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100, margin: '0 4px' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 2, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span style={{ color: '#06b6d4', fontWeight: 600, marginRight: 4 }}>T{event.tick || 1}</span>
                                {event.description}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                <div style={{ height: 2, background: 'var(--border)', flex: 1 }} />
                                <div style={{ color: 'var(--border)', fontSize: 10, marginLeft: -2, marginTop: -1 }}>▶</div>
                            </div>
                        </div>

                        {/* If it's the LAST event, also render its TARGET node */}
                        {i === events.length - 1 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '4px 10px',
                                background: 'var(--bg-surface-raised)',
                                border: `1px solid ${getNodeColor(event.target)}40`,
                                borderRadius: 6,
                                fontSize: 10,
                                marginLeft: 4
                            }}>
                                <div style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: getNodeColor(event.target), flexShrink: 0,
                                    boxShadow: `0 0 4px ${getNodeColor(event.target)}`
                                }} />
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                    {event.target}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
