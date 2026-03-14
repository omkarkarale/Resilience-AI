export default function TimelineSlider({ timeline = [], viewingTick, onViewTick, running = false }) {
    if (timeline.length === 0) return null;

    const maxTick = timeline.length - 1;
    const isLive = viewingTick === null;

    return (
        <div style={{
            padding: '6px 12px',
            background: 'rgba(11, 15, 25, 0.88)',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    TIMELINE
                </span>

                <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>1</span>
                <input
                    type="range"
                    min={0} max={maxTick}
                    value={viewingTick !== null ? viewingTick : maxTick}
                    onChange={e => { if (!running) onViewTick(Number(e.target.value)); }}
                    disabled={running}
                    style={{ flex: 1, opacity: running ? 0.5 : 1, height: 4 }}
                />
                <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>{maxTick + 1}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!isLive && !running && (
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
                        color: isLive ? 'var(--success)' : '#94a3b8',
                        whiteSpace: 'nowrap',
                    }}>
                        {isLive ? `● T${maxTick + 1}` : `T${viewingTick + 1}/${maxTick + 1}`}
                    </span>
                </div>
            </div>
        </div>
    );
}
