import { useState } from 'react';

export default function WhatIfPanel({ onRunWhatIf, running }) {
    const INTERVENTIONS = [
        {
            action: 'add_ambulances',
            label: 'Deploy Ambulances',
            icon: '🚑',
            description: 'Send additional ambulances to increase hospital capacity',
            unit: 'units',
        },
        {
            action: 'deploy_generator',
            label: 'Deploy Generators',
            icon: '🔋',
            description: 'Deploy backup generators to restore power grid',
            unit: 'generators',
        },
        {
            action: 'open_shelter',
            label: 'Open New Shelter',
            icon: '🏕️',
            description: 'Open emergency shelters for displaced population',
            unit: 'shelters',
        },
    ];
    const [selectedAction, setSelectedAction] = useState('add_ambulances');
    const [amount, setAmount] = useState(3);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        setLoading(true);
        const res = await onRunWhatIf(selectedAction, null, amount);
        setResult(res);
        setLoading(false);
    };

    const selectedIntervention = INTERVENTIONS.find(i => i.action === selectedAction);

    return (
        <div className="glass-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
                What-If Simulation
            </div>

            {/* Intervention selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                {INTERVENTIONS.map(int => (
                    <button
                        key={int.action}
                        onClick={() => { setSelectedAction(int.action); setResult(null); }}
                        style={{
                            textAlign: 'left',
                            padding: '7px 10px', borderRadius: 5,
                            background: selectedAction === int.action ? 'var(--primary-subtle)' : 'transparent',
                            border: selectedAction === int.action ? '1px solid var(--border-active)' : '1px solid transparent',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                        }}
                    >
                        <div style={{ fontSize: 12, fontWeight: selectedAction === int.action ? 600 : 400, color: selectedAction === int.action ? 'var(--primary)' : 'var(--text-primary)' }}>
                            {int.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{int.description}</div>
                    </button>
                ))}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)' }}>Amount</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{amount} {selectedIntervention?.unit}</span>
                </div>
                <input
                    type="range" min="1" max="10"
                    value={amount}
                    onChange={e => { setAmount(Number(e.target.value)); setResult(null); }}
                    style={{ width: '100%' }}
                />
            </div>

            {/* Run button */}
            <button
                onClick={handleRun}
                disabled={!running || loading}
                className="btn-primary"
                style={{ width: '100%', marginBottom: result ? 12 : 0 }}
            >
                {loading ? 'Simulating…' : 'Run What-If'}
            </button>

            {/* Results */}
            {result && (
                <div className="animate-fade-in" style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Results
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
                        <div style={{ padding: '6px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.05)', borderLeft: '2px solid var(--danger)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Before</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)' }}>{result.before?.overall_risk?.toFixed(1)}%</div>
                        </div>
                        <div style={{ padding: '6px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.05)', borderLeft: '2px solid var(--success)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>After</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>{result.after?.overall_risk?.toFixed(1)}%</div>
                        </div>
                    </div>
                    <div style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--primary-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Reduction</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>↓ {result.improvement?.risk_reduction?.toFixed(1)}%</div>
                    </div>
                </div>
            )}
        </div>
    );
}
