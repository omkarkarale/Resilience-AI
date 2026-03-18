export default function CascadingFlow({ events = [] }) {
    if (events.length === 0) return null;

    const nodeColors = {
        'Flood': '#3b82f6', 'Earthquake': '#f59e0b', 'Cyclone': '#0ea5e9', 'Tsunami': '#2563eb',
        'Grid Failure': '#eab308', 'Grid': '#eab308', 'Blackout': '#6b21a8',
        'Disaster': '#ef4444', 'Road': '#ef4444', 'Emergency': '#f97316', 'Casualty': '#f97316',
        'Hospital': '#a855f7', 'Power': '#eab308', 'Infrastructure': '#eab308',
        'Supply': '#06b6d4', 'Communications': '#8b5cf6', 'Population': '#f97316',
        'Structural': '#dc2626', 'Storm': '#0284c7', 'Collapse': '#dc2626',
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
            minWidth: 0,
            overflow: 'hidden',
        }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
                Cascade Chain ({events.length} links)
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: 4,
                scrollbarWidth: 'thin',
            }}>
                {events.map((event, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {/* Source Node */}
                        <div
                            title={event.description}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px',
                                background: 'var(--bg-surface-raised)',
                                border: `1px solid ${getNodeColor(event.source)}40`,
                                borderRadius: 5,
                                fontSize: 9,
                                cursor: 'default',
                            }}
                        >
                            <div style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: getNodeColor(event.source), flexShrink: 0,
                                boxShadow: `0 0 4px ${getNodeColor(event.source)}`
                            }} />
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {event.source}
                            </div>
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', margin: '0 2px', minWidth: 20 }}>
                            <div style={{ height: 1.5, background: 'var(--border)', flex: 1, minWidth: 8 }} />
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 8, marginLeft: -1 }}>▶</div>
                        </div>

                        {/* If it's the LAST event, also render its TARGET node */}
                        {i === events.length - 1 && (
                            <div
                                title={event.description}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '3px 8px',
                                    background: 'var(--bg-surface-raised)',
                                    border: `1px solid ${getNodeColor(event.target)}40`,
                                    borderRadius: 5,
                                    fontSize: 9,
                                    cursor: 'default',
                                }}
                            >
                                <div style={{
                                    width: 5, height: 5, borderRadius: '50%',
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
