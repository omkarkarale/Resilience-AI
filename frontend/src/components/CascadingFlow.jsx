export default function CascadingFlow({ events = [] }) {
    if (events.length === 0) return null;

    const nodeColors = {
        'Flood': '#3b82f6', 'Earthquake': '#f59e0b',
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
                        {/* Node */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 8px',
                            background: 'var(--bg-surface-raised)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            fontSize: 10,
                        }}>
                            <div style={{
                                width: 4, height: 16, borderRadius: 2,
                                background: getNodeColor(event.source), flexShrink: 0,
                            }} />
                            <div>
                                <div style={{ fontWeight: 600, color: getNodeColor(event.source), whiteSpace: 'nowrap', fontSize: 10 }}>
                                    {event.source}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 9, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {event.description}
                                </div>
                            </div>
                        </div>

                        {/* Connector */}
                        {i < events.length - 1 && (
                            <div style={{ padding: '0 3px', color: 'var(--text-tertiary)', fontSize: 10, flexShrink: 0 }}>→</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
