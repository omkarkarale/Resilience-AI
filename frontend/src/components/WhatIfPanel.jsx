import React, { useState, useEffect } from 'react';

const STYLE = `
@keyframes scanline_whatif {
    0% { transform: translateY(-10px); opacity: 0; }
    10% { opacity: 0.1; }
    90% { opacity: 0.1; }
    100% { transform: translateY(800px); opacity: 0; }
}

@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0px #06b6d4, inset 0 0 0px rgba(6, 182, 212, 0); }
    50% { box-shadow: 0 0 12px #06b6d4, inset 0 0 12px rgba(6, 182, 212, 0.4); }
}

@keyframes panelEntry {
    0% { opacity: 0; transform: translateX(12px); }
    100% { opacity: 1; transform: translateX(0); }
}

@keyframes numberPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
}

.whatif-root {
    background-color: #0d1117;
    background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
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
    animation: panelEntry 0.3s ease-out forwards;
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
    font-weight: 600;
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
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #e2e8f0;
    opacity: 0.45;
    margin-bottom: 8px;
    padding-bottom: 4px;
}

.action-card {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, border-left 0.2s ease;
    margin-bottom: 6px;
}

.action-card:hover {
    background: rgba(255,255,255,0.02);
}

.action-card.selected {
    background: linear-gradient(90deg, rgba(6,182,212,0.04) 0%, transparent 100%);
    border-color: rgba(255,255,255,0.06);
    border-left: 3px solid #06b6d4;
}

.action-icon {
    margin-right: 12px;
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    color: #4a5568;
    transition: color 0.2s ease;
}

.action-card.selected .action-icon {
    color: var(--card-accent, #06b6d4);
}

.action-info {
    flex: 1;
}

.action-name {
    font-size: 12px;
    font-weight: 600;
    color: #cbd5e1;
    margin-bottom: 2px;
}

.action-card.selected .action-name {
    color: #e2e8f0;
}

.action-desc {
    font-size: 10px;
    color: #64748b;
    line-height: 1.2;
    font-weight: 400;
}

.action-radio {
    width: 14px; height: 14px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s ease;
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
    background: transparent;
    padding: 8px 12px 4px 12px;
}

.stepper-btn {
    width: 32px; height: 32px;
    background: transparent;
    border: 1px solid rgba(6,182,212,0.3);
    border-radius: 50%;
    color: #06b6d4;
    font-family: inherit;
    font-size: 16px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
}

.stepper-btn:hover:not(:disabled) {
    background: rgba(6, 182, 212, 0.12);
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.stepper-btn:disabled {
    opacity: 0.3; cursor: not-allowed;
    border-color: rgba(255,255,255,0.1);
    color: #64748b;
}

.stepper-value {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 2rem;
    font-weight: 400;
    color: #06b6d4;
    letter-spacing: 0.1em;
    min-width: 60px;
    text-align: center;
    display: inline-block;
}

.stepper-value.pop {
    animation: numberPop 0.15s ease-out;
}

.capacity-info {
    display: flex; justify-content: space-between;
    font-size: 9px; color: #64748b; font-family: 'JetBrains Mono', 'Courier New', monospace;
    margin-top: 12px; margin-bottom: 4px; text-transform: uppercase;
}

.capacity-track {
    height: 3px;
    background: rgba(255,255,255,0.08);
    overflow: visible;
    position: relative;
    width: 100%;
}

.capacity-fill {
    height: 100%;
    background: #06b6d4;
    transition: width 0.4s ease;
    box-shadow: 0 0 6px #06b6d4;
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

.impact-val { font-family: 'JetBrains Mono', 'Courier New', monospace; font-weight: 400; }

.run-footer {
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
}

.run-btn {
    width: 100%;
    padding: 12px;
    border-radius: 4px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.2s;
    font-family: 'Inter', system-ui, sans-serif;
}

.run-btn.active {
    background: linear-gradient(135deg, #0891b2, #06b6d4);
    color: #fff;
    animation: pulseGlow 2s infinite;
    border: 1px solid transparent; /* Required for sizing match */
}

.run-btn.active:hover {
    filter: brightness(1.1);
}

.run-btn.disabled {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.3);
    border: 1px dashed rgba(255, 255, 255, 0.15);
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
.res-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.res-val { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 16px; font-weight: 400; margin-top: 2px; }
`;

function AmbulanceIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
            <path d="M12 6v4" />
            <path d="M10 8h4" />
        </svg>
    );
}

function GeneratorIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
            <path d="M9 9h6v6H9z" />
            <path d="M12 4v2" />
            <path d="M12 18v2" />
            <path d="M4 12h2" />
            <path d="M18 12h2" />
        </svg>
    );
}

function ShelterIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M9 22a5 5 0 0 1 5-5h6a2 2 0 0 1 2 2v3" />
            <path d="M14 10V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v6" />
            <path d="M3 14v6a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-6" />
        </svg>
    );
}

export default function WhatIfPanel({ onRunWhatIf, running }) {
    const INTERVENTIONS = [
        {
            action: 'add_ambulances',
            label: 'Deploy Ambulances',
            icon: <AmbulanceIcon />,
            description: 'Send additional units to increase hospital capacity',
            unit: 'units',
            max: 50,
            color: '#ef4444' // critical red
        },
        {
            action: 'deploy_generator',
            label: 'Deploy Generators',
            icon: <GeneratorIcon />,
            description: 'Deploy backup generators to restore power grid',
            unit: 'generators',
            max: 20,
            color: '#f59e0b' // warning amber
        },
        {
            action: 'open_shelter',
            label: 'Open New Shelter',
            icon: <ShelterIcon />,
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
    const [popAnim, setPopAnim] = useState(false);

    const handleAmountChange = (newAmount) => {
        setAmount(newAmount);
        setResult(null);
        setPopAnim(true);
    };

    // Remove animation class after it plays so it can trigger again
    useEffect(() => {
        if (popAnim) {
            const timer = setTimeout(() => setPopAnim(false), 150);
            return () => clearTimeout(timer);
        }
    }, [popAnim]);

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
                <div className="whatif-title">SIMULATION INTERVENTIONS</div>
            </div>

            <div className="whatif-body">
                {/* ── ACTION CARDS ── */}
                <div>
                    <div className="section-label">SELECT ACTION</div>
                    {INTERVENTIONS.map(int => (
                        <div
                            key={int.action}
                            className={`action-card ${selectedAction === int.action ? 'selected' : ''}`}
                            style={{ '--card-accent': int.color }}
                            onClick={() => { 
                                setSelectedAction(int.action); 
                                setAmount(Math.min(amount, int.max)); 
                                setResult(null); 
                            }}
                        >
                            <div className="action-icon">{int.icon}</div>
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
                    <div className="section-label">ALLOCATE RESOURCES</div>
                    <div className="stepper-container">
                        <button 
                            className="stepper-btn" 
                            onClick={() => handleAmountChange(Math.max(1, amount - 1))}
                            disabled={amount <= 1}
                        >−</button>
                        <div className={`stepper-value ${popAnim ? 'pop' : ''}`}>
                            {amount.toString().padStart(2, '0')}
                        </div>
                        <button 
                            className="stepper-btn" 
                            onClick={() => handleAmountChange(Math.min(selectedIntervention.max, amount + 1))}
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
                    {loading ? 'SIMULATING...' : (!running ? 'RUN WHAT-IF SCENARIO' : 'RUN WHAT-IF SCENARIO')}
                </button>
            </div>
        </div>
    );
}
