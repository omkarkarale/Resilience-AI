import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://127.0.0.1:8000/ws';
const API_BASE = 'http://127.0.0.1:8000';

export function useSimulation() {
    const [state, setState] = useState(null);
    const [connected, setConnected] = useState(false);
    const [timeline, setTimeline] = useState([]);
    const [viewingTick, setViewingTick] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // This is the single source of truth for running state, synced from WS or set optimistically
    const [simulationRunning, setSimulationRunning] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    // Fetch initial state via REST as fallback
    const fetchInitialState = useCallback(async () => {
        try {
            console.log('[SIM] Fetching initial city state via REST...');
            const res = await fetch(`${API_BASE}/api/city`);
            if (res.ok) {
                const data = await res.json();
                console.log('[SIM] Initial state loaded via REST, tick:', data.tick, 'running:', data.running);
                setState(data);
                setSimulationRunning(data.running || false);
            } else {
                console.warn('[SIM] REST /api/city returned status:', res.status);
            }
        } catch (e) {
            console.warn('[SIM] REST /api/city fetch failed:', e.message);
        }
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        console.log('[WS] Attempting connection to', WS_URL);
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            setConnected(true);
            console.log('[WS] Connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[WS] State update — tick:', data.tick, 'running:', data.running);
                setState(data);
                // Always sync running state from backend WS updates
                setSimulationRunning(data.running || false);
                if (data.tick > 0) {
                    setTimeline(prev => {
                        const next = [...prev, data];
                        return next.length > 60 ? next.slice(-60) : next;
                    });
                }
            } catch (e) {
                console.error('[WS] Parse error:', e);
            }
        };

        ws.onclose = () => {
            setConnected(false);
            console.log('[WS] Disconnected, reconnecting in 3s...');
            reconnectTimer.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
            console.error('[WS] Error:', err);
            ws.close();
        };

        wsRef.current = ws;
    }, []);

    // On mount: fetch initial state via REST, then connect WS
    useEffect(() => {
        fetchInitialState();
        connect();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, [connect, fetchInitialState]);

    const startSimulation = async (disasterType, epicenterZone, intensity = 70) => {
        if (loading) {
            console.warn('[SIM] Start already in progress, ignoring duplicate click');
            return;
        }

        console.log('[SIM] Starting simulation:', { disasterType, epicenterZone, intensity });
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: disasterType,
                    epicenter_zone: epicenterZone,
                    intensity: intensity,
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error('[SIM] Start failed with status', res.status, errText);
                setError(`Start failed (${res.status}): ${errText}`);
                setLoading(false);
                return;
            }

            const result = await res.json();
            console.log('[SIM] Start response:', result);

            // Optimistic update: mark simulation as running immediately
            setSimulationRunning(true);
            setTimeline([]);
            setViewingTick(null);
            setLoading(false);
            return result;
        } catch (e) {
            console.error('[SIM] Start request error:', e);
            setError(`Network error: ${e.message}`);
            setLoading(false);
        }
    };

    const stopSimulation = async () => {
        console.log('[SIM] Stopping simulation...');
        try {
            const res = await fetch(`${API_BASE}/api/stop`, { method: 'POST' });
            const result = await res.json();
            console.log('[SIM] Stop response:', result);
            // Immediately mark as not running — don't wait for WS
            setSimulationRunning(false);
            // Also update the state object so all UI components see running=false
            setState(prev => prev ? { ...prev, running: false } : prev);
            return result;
        } catch (e) {
            console.error('[SIM] Stop failed:', e);
            setError(`Stop failed: ${e.message}`);
        }
    };

    const resetSimulation = async () => {
        console.log('[SIM] Resetting simulation...');
        try {
            const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
            const result = await res.json();
            console.log('[SIM] Reset response:', result);
            // Clear all local state
            setSimulationRunning(false);
            setTimeline([]);
            setViewingTick(null);
            setError(null);
            // Fetch fresh state from backend
            await fetchInitialState();
            return result;
        } catch (e) {
            console.error('[SIM] Reset failed:', e);
            setError(`Reset failed: ${e.message}`);
        }
    };

    const runWhatIf = async (action, targetZone = null, amount = 1) => {
        try {
            const res = await fetch(`${API_BASE}/api/whatif`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action,
                    target_zone: targetZone,
                    amount: amount,
                }),
            });
            return await res.json();
        } catch (e) {
            console.error('[SIM] What-if failed:', e);
        }
    };

    const viewTick = (tickIndex) => {
        if (tickIndex === null || tickIndex === undefined) {
            setViewingTick(null);
            return;
        }
        if (timeline[tickIndex]) {
            setViewingTick(tickIndex);
        }
    };

    const displayState = viewingTick !== null && timeline[viewingTick]
        ? timeline[viewingTick]
        : state;

    return {
        state: displayState,
        liveState: state,
        connected,
        timeline,
        viewingTick,
        loading,
        error,
        isRunning: simulationRunning,
        startSimulation,
        stopSimulation,
        resetSimulation,
        runWhatIf,
        viewTick,
    };
}
