import { useRef, useEffect } from 'react';

const AGENT_COLORS = {
    'Weather Agent':   '#3b82f6',
    'Traffic Agent':   '#f59e0b',
    'Medical Agent':   '#a855f7',
    'Power Agent':     '#eab308',
    'Logistics Agent': '#06b6d4',
    'Command Agent':   '#6366f1',
};

export default function AgentLog({ logs = [] }) {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [logs]);

    return (
        <div className="glass-card" style={{ padding: '14px 16px', maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                Agent Activity
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', maxHeight: 340 }}>
                {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 12 }}>
                        No activity. Start a simulation.
                    </div>
                ) : (
                    logs.slice(-30).map((log, i) => (
                        <div key={i} style={{
                            borderLeft: `2px solid ${AGENT_COLORS[log.agent] || 'var(--border)'}`,
                            padding: '5px 10px',
                            marginBottom: 2,
                            borderRadius: '0 3px 3px 0',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: AGENT_COLORS[log.agent] || 'var(--text-secondary)' }}>
                                    {log.agent?.replace(' Agent', '')}
                                </span>
                                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>T{log.tick || '-'}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-primary)', marginTop: 1, lineHeight: 1.4 }}>
                                {log.message}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
