import React, { useState } from 'react';

const STYLE = `
@keyframes scanline_whatif {
    0% { transform: translateY(-10px); opacity: 0; }
    10% { opacity: 0.1; }
    90% { opacity: 0.1; }
    100% { transform: translateY(800px); opacity: 0; }
}

@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 10px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.2); }
    50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.8), inset 0 0 20px rgba(6, 182, 212, 0.4); }
}

.whatif-root {
    background-color: #0d1117;
    background-image: 
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 20px 20px;
    color: #e2e8f0;
    font-family: 'Inter', system-ui, sans-serif;
    position: relative;
    overflow: hidden;
    height: 100%;
    min-height: 600px;
    border-radius: 4px;
    border: 1px solid rgba(6, 182, 212, 0.15);
    display: flex;
    flex-direction: column;
}

.whatif-root::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 10px;
    background: linear-gradient(to bottom, rgba(6,182,212,0.2), transparent);
    animation: scanline_whatif 6s linear infinite;
    pointer-events: none;
    z-index: 10;
}

.whatif-header {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(13, 17, 23, 0.9);
}

.whatif-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #06b6d4;
    display: flex;
    align-items: center;
    gap: 8px;
}

.whatif-title::before {
    content: '';
    display: inline-block;
    width: 6px; height: 6px;
    background: #06b6d4;
    border-radius: 50%;
    box-shadow: 0 0 8px #06b6d4;
}

.whatif-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    padding-bottom: 4px;
}

.action-card {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    margin-bottom: 6px;
}

.action-card:hover {
    background: rgba(255,255,255,0.04);
}

.action-card.selected {
    background: rgba(6, 182, 212, 0.08);
    border-color: rgba(6, 182, 212, 0.3);
    border-left: 3px solid #06b6d4;
}

.action-icon {
    font-size: 18px;
    margin-right: 12px;
    width: 24px;
    text-align: center;
}

.action-info {
    flex: 1;
}

.action-name {
    font-size: 12px;
    font-weight: 700;
    color: #cbd5e1;
    margin-bottom: 2px;
}

.action-card.selected .action-name {
    color: #06b6d4;
}

.action-desc {
    font-size: 10px;
    color: #64748b;
    line-height: 1.2;
}

.action-radio {
    width: 14px; height: 14px;
    border: 1px solid #64748b;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
}

.action-card.selected .action-radio {
    border-color: #06b6d4;
}

.action-card.selected .action-radio::after {
    content: '';
    width: 6px; height: 6px;
    background: #06b6d4;
    border-radius: 50%;
    box-shadow: 0 0 4px #06b6d4;
}

.stepper-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 4px;
    padding: 8px 12px;
}

.stepper-btn {
    width: 28px; height: 28px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 2px;
    color: #cbd5e1;
    font-family: monospace;
    font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
}

.stepper-btn:hover:not(:disabled) {
    background: rgba(6, 182, 212, 0.15);
    border-color: #06b6d4;
    color: #06b6d4;
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.3);
}

.stepper-btn:disabled {
    opacity: 0.3; cursor: not-allowed;
}

.stepper-value {
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 24px;
    font-weight: 700;
    color: #06b6d4;
    text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
    letter-spacing: 0.05em;
    min-width: 40px;
    text-align: center;
}

.capacity-info {
    display: flex; justify-content: space-between;
    font-size: 9px; color: #64748b; font-family: monospace;
    margin-top: 6px; margin-bottom: 4px; text-transform: uppercase;
}

.capacity-track {
    height: 3px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px; overflow: hidden;
}

.capacity-fill {
    height: 100%;
    background: #06b6d4;
    transition: width 0.3s ease;
}

.impact-preview {
    border: 1px dashed rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.15);
    opacity: 0.4;
}

.impact-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10px; color: #94a3b8; padding: 4px 0;
    border-bottom: 1px dotted rgba(255,255,255,0.05);
}

.impact-row:last-child { border-bottom: none; }

.impact-val { font-family: monospace; font-weight: 600; }

.run-footer {
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(13, 17, 23, 0.95);
}

.run-btn {
    width: 100%;
    padding: 12px;
    border-radius: 4px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.2s;
}

.run-btn.active {
    background: linear-gradient(90deg, #06b6d4, #0d9488);
    color: #020617;
    animation: pulseGlow 2s infinite;
    border: 1px solid #22d3ee;
    text-shadow: 0 1px 2px rgba(255,255,255,0.3);
}

.run-btn.active:hover {
    filter: brightness(1.15);
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.6);
}

.run-btn.disabled {
    background: rgba(255, 255, 255, 0.03);
    color: #64748b;
    border: 1px dashed rgba(255, 255, 255, 0.1);
    cursor: not-allowed;
}

/* ── Result display overrides ── */
.results-box {
    margin-top: 16px;
    border: 1px solid rgba(6, 182, 212, 0.3);
    background: rgba(6, 182, 212, 0.05);
    border-radius: 4px;
    padding: 12px;
}
.res-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;
}
.res-card {
    padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);
}
.res-card.before { background: rgba(239, 68, 68, 0.05); border-left: 2px solid #ef4444; }
.res-card.after { background: rgba(34, 197, 94, 0.05); border-left: 2px solid #22c55e; }
.res-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.res-val { font-family: monospace; font-size: 16px; font-weight: 700; margin-top: 2px; }
`;

export default function WhatIfPanel({ onRunWhatIf, running }) {
    const INTERVENTIONS = [
        {
            action: 'add_ambulances',
            label: 'Deploy Ambulances',
            icon: '🚑',
            description: 'Send additional units to increase hospital capacity',
            unit: 'units',
            max: 50,
            color: '#ef4444' // critical red
        },
        {
            action: 'deploy_generator',
            label: 'Deploy Generators',
            icon: '⚡',
            description: 'Deploy backup generators to restore power grid',
            unit: 'generators',
            max: 20,
            color: '#f59e0b' // warning amber
        },
        {
            action: 'open_shelter',
            label: 'Open New Shelter',
            icon: '🏠',
            description: 'Open emergency shelters for displaced population',
            unit: 'shelters',
            max: 30,
            color: '#22c55e' // operational green
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
        <div className="whatif-root">
            <style>{STYLE}</style>
            
            <div className="whatif-header">
                <div className="whatif-title">INTERVENTION CONTROLS</div>
            </div>

            <div className="whatif-body">
                {/* ── ACTION CARDS ── */}
                <div>
                    <div className="section-label">SELECT ACTION</div>
                    {INTERVENTIONS.map(int => (
                        <div
                            key={int.action}
                            className={`action-card ${selectedAction === int.action ? 'selected' : ''}`}
                            onClick={() => { 
                                setSelectedAction(int.action); 
                                setAmount(Math.min(amount, int.max)); 
                                setResult(null); 
                            }}
                        >
                            <div className="action-icon" style={{ textShadow: `0 0 8px ${int.color}` }}>{int.icon}</div>
                            <div className="action-info">
                                <div className="action-name">{int.label}</div>
                                <div className="action-desc">{int.description}</div>
                            </div>
                            <div className="action-radio" />
                        </div>
                    ))}
                </div>

                {/* ── AMOUNT CONTROLS ── */}
                <div>
                    <div className="section-label">DEPLOY UNITS</div>
                    <div className="stepper-container">
                        <button 
                            className="stepper-btn" 
                            onClick={() => { setAmount(a => Math.max(1, a - 1)); setResult(null); }}
                            disabled={amount <= 1}
                        >−</button>
                        <div className="stepper-value">
                            {amount.toString().padStart(2, '0')}
                        </div>
                        <button 
                            className="stepper-btn" 
                            onClick={() => { setAmount(a => Math.min(selectedIntervention.max, a + 1)); setResult(null); }}
                            disabled={amount >= (selectedIntervention?.max || 10)}
                        >+</button>
                    </div>
                    <div className="capacity-info">
                        <span>CAPACITY ALLOCATION</span>
                        <span style={{ color: '#06b6d4' }}>{amount} OF {selectedIntervention?.max || 10} AVAIL</span>
                    </div>
                    <div className="capacity-track">
                        <div 
                            className="capacity-fill" 
                            style={{ width: `${(amount / (selectedIntervention?.max || 10)) * 100}%` }}
                        />
                    </div>
                </div>

                {/* ── IMPACT PREVIEW (Ghost State) ── */}
                {!result && (
                    <div>
                        <div className="section-label">PROJECTED IMPACT</div>
                        <div className="impact-preview">
                            <div className="impact-row">
                                <span>Est. Casualties Reduced</span>
                                <span className="impact-val">-</span>
                            </div>
                            <div className="impact-row">
                                <span>Hospital Load Δ</span>
                                <span className="impact-val">-</span>
                            </div>
                            <div className="impact-row">
                                <span>Zones Stabilized</span>
                                <span className="impact-val">-</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── REAL RESULTS ── */}
                {result && (
                    <div>
                        <div className="section-label">SIMULATION RESULTS</div>
                        <div className="results-box animate-fade-in">
                            <div className="res-grid">
                                <div className="res-card before">
                                    <div className="res-label">PRIOR RISK</div>
                                    <div className="res-val" style={{ color: '#ef4444' }}>{result.before?.overall_risk?.toFixed(1)}%</div>
                                </div>
                                <div className="res-card after">
                                    <div className="res-label">NEW RISK</div>
                                    <div className="res-val" style={{ color: '#22c55e' }}>{result.after?.overall_risk?.toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className="res-card" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6,182,212,0.3)', textAlign: 'center' }}>
                                <div className="res-label" style={{ color: '#06b6d4' }}>RISK REDUCTION</div>
                                <div className="res-val" style={{ color: '#06b6d4', fontSize: 18 }}>↓ {result.improvement?.risk_reduction?.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="run-footer">
                <button
                    onClick={handleRun}
                    disabled={!running || loading || !selectedAction}
                    className={`run-btn ${(!running || loading || !selectedAction) ? 'disabled' : 'active'}`}
                >
                    {loading ? 'SIMULATING...' : (!running ? '🔒 SELECT AN ACTION TO CONTINUE' : '▶ RUN WHAT-IF SCENARIO')}
                </button>
            </div>
        </div>
    );
}
