export default function TimelineSlider({ timeline = [], viewingTick, onViewTick, running = false, theme = 'dark' }) {
    if (timeline.length === 0) return null;

    const maxTick = timeline.length - 1;
    const isLive = viewingTick === null;
    const isLight = theme === 'light';

    return (
        <div style={{
            padding: '6px 12px',
            background: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(11, 15, 25, 0.88)',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255,255,255,0.06)',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: isLight ? '#475569' : '#64748b', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    TIMELINE
                </span>

                <span style={{ fontSize: 10, color: isLight ? '#475569' : '#64748b', flexShrink: 0 }}>1</span>
                <input
                    type="range"
                    min={0} max={maxTick}
                    value={viewingTick !== null ? viewingTick : maxTick}
                    onChange={e => onViewTick(Number(e.target.value))}
                    style={{ flex: 1, height: 4, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 10, color: isLight ? '#475569' : '#64748b', flexShrink: 0 }}>{maxTick + 1}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!isLive && (
                        <button
                            onClick={() => onViewTick(null)}
                            style={{
                                padding: '2px 8px', borderRadius: 4,
                                fontSize: 10, fontWeight: 600,
                                background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
                                border: '1px solid rgba(59,130,246,0.2)',
                                cursor: 'pointer',
                            }}
                        >LIVE</button>
                    )}
                    <span style={{
                        fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                        color: isLive ? 'var(--success)' : (isLight ? '#64748b' : '#94a3b8'),
                        whiteSpace: 'nowrap',
                    }}>
                        {isLive ? `● T${maxTick + 1}` : `T${viewingTick + 1}/${maxTick + 1}`}
                    </span>
                </div>
            </div>
        </div>
    );
}
