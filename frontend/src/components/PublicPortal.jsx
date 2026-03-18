import React, { useState, useEffect, useMemo } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { useTheme } from '../context/ThemeContext';
import CityMap from './CityMap';
import CascadingFlow from './CascadingFlow';
import './PublicPortal.css';

// ── Helpers ──

function capitalize(s) {
    if (!s) return '';
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatNumber(n) {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString();
}

function disasterVerb(type) {
    const map = {
        flood: 'Flood waters are rising in',
        earthquake: 'Seismic activity is intensifying in',
        cyclone: 'Cyclone winds are approaching',
        grid_failure: 'Power grid failure is spreading across',
        tsunami: 'Tsunami waves are approaching',
        fire: 'Fire is spreading through',
    };
    return map[(type || '').toLowerCase()] || 'Disaster is unfolding in';
}

function agentCategory(agentName) {
    const n = (agentName || '').toLowerCase();
    if (n.includes('traffic') || n.includes('road') || n.includes('logistics')) return 'roads';
    if (n.includes('medical') || n.includes('hospital')) return 'medical';
    if (n.includes('power') || n.includes('grid')) return 'power';
    if (n.includes('weather') || n.includes('cyclone') || n.includes('flood')) return 'weather';
    if (n.includes('command')) return 'command';
    return 'logistics';
}

function cleanAction(text) {
    if (!text) return '';
    // Strip technical terms for learner readability
    return text
        .replace(/OR-Tools/gi, 'optimization engine')
        .replace(/\bconf(idence)?\s*[:=]\s*[\d.]+%?/gi, '')
        .replace(/\bR²\s*[:=]\s*[\d.]+/gi, '')
        .replace(/\bagent\s*class\b/gi, 'analysis module')
        .replace(/\bML\s+model\b/gi, 'prediction system')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ── Subcomponents ──

function EventCard({ rec, index, tick }) {
    const [expanded, setExpanded] = useState(false);
    const cat = agentCategory(rec.agent);

    return (
        <div
            className="lp-event-card"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <div className="lp-event-top">
                <span className={`lp-event-tag ${cat}`}>
                    {cat.toUpperCase()}
                </span>
                <span className="lp-event-tick">T+{tick}</span>
            </div>
            <div className="lp-event-headline">{cleanAction(rec.action)}</div>
            <div className="lp-event-body">{cleanAction(rec.reason || rec.expected_impact || '')}</div>
            {(rec.expected_impact || rec.reason) && (
                <>
                    <button
                        className="lp-event-toggle"
                        onClick={() => setExpanded(e => !e)}
                    >
                        {expanded ? '▲ Hide details' : '▼ Why does this matter?'}
                    </button>
                    <div className={`lp-event-detail ${expanded ? 'open' : ''}`}>
                        {cleanAction(rec.expected_impact || rec.reason || 'This event impacts local infrastructure and population safety.')}
                        {rec.affected_zone && ` Affected area: ${rec.affected_zone}.`}
                    </div>
                </>
            )}
        </div>
    );
}

function DecisionSection({ tick, disaster }) {
    const [selected, setSelected] = useState(null);
    const [activeDecision, setActiveDecision] = useState(false);
    const [decisionTick, setDecisionTick] = useState(0);
    const lastTriggeredRef = React.useRef(0);

    // Questions rotate based on which decision round we're on
    const allQuestions = useMemo(() => {
        const type = (disaster?.type || '').toLowerCase();
        const pool = [];

        if (type.includes('flood') || type.includes('cyclone') || type.includes('tsunami')) {
            pool.push(
                { question: 'Floodwaters are blocking 3 roads. What should responders prioritize?', choices: ['Redirect all ambulances to alternate routes', 'Deploy boats for doorstep evacuation', 'Focus resources on opening the main highway'], optimalIndex: 0, reason: 'The AI optimization engine dynamically reroutes traffic to open alternate routes, avoiding unpredictable delays in clearing the main road.' },
                { question: 'A shelter is nearing 90% capacity. What is the best action?', choices: ['Open a new temporary shelter nearby', 'Redirect evacuees to a farther but emptier shelter', 'Expand the current shelter with emergency tents'], optimalIndex: 1, reason: 'Redirecting to a farther shelter spreads the load and preserves resources for critical edge cases, per our ML load balancing.' },
                { question: 'Water levels are still rising. Should evacuations continue?', choices: ['Yes — every minute counts for trapped residents', 'Pause — wait for water to stabilize before risking more teams', 'Switch to aerial rescue for remaining zones'], optimalIndex: 0, reason: 'Predictive models show water levels crossing safe thresholds within 2 hours. Immediate evacuation minimizes fatalities.' },
            );
        } else if (type.includes('earthquake')) {
            pool.push(
                { question: 'Aftershocks have damaged a hospital wing. How should we respond?', choices: ['Move patients to the nearest stable shelter', 'Set up a field hospital in the parking area', 'Focus all repair crews on the damaged wing'], optimalIndex: 1, reason: 'Field hospitals ensure continuity of care using existing hospital staff while avoiding risky transport across damaged roads.' },
                { question: 'A collapsed building may have survivors. How should teams be deployed?', choices: ['Send search-and-rescue immediately', 'Secure the perimeter first to prevent secondary collapses', 'Use drones to assess before committing teams'], optimalIndex: 2, reason: 'Initial drone assessment identifies structural weak points and thermal signatures, minimizing risk to rescue crews.' },
                { question: 'Roads are cracked and debris is blocking ambulances. What now?', choices: ['Clear the main corridor with heavy machinery', 'Reroute ambulances through residential streets', 'Use helicopters for critical patient transport'], optimalIndex: 0, reason: 'Clearing the main corridor provides the highest throughput for all emergency vehicles, solving the bottleneck globally.' },
            );
        } else if (type.includes('grid') || type.includes('power')) {
            pool.push(
                { question: 'Power is down in 4 sectors. How should generators be allocated?', choices: ['Hospitals and medical facilities first', 'Distribute evenly across all affected areas', 'Focus on the water pumping station to prevent flooding'], optimalIndex: 0, reason: 'Hospitals have critical life-support systems. AI prioritization always ranks critical medical infrastructure first.' },
                { question: 'Backup generators have 6 hours of fuel left. What is the priority?', choices: ['Ration power to extend coverage to 12 hours', 'Run at full capacity for hospitals only', 'Use remaining power to restore the main grid connection'], optimalIndex: 1, reason: 'Running at full capacity for hospitals ensures no loss of life due to equipment failure while grid repair teams work.' },
                { question: 'Communication towers are down. How should coordination happen?', choices: ['Deploy runners between zones', 'Set up temporary radio relay stations', 'Prioritize restoring one tower for emergency broadcasts'], optimalIndex: 2, reason: 'Restoring a central tower re-establishes a wide-area mesh network, maximizing rapid coordination efficiency.' },
            );
        } else {
            pool.push(
                { question: 'Resources are limited. Which strategy should be prioritized?', choices: ['Evacuate the highest-risk zone immediately', 'Fortify shelters and distribute supplies', 'Restore roads and power before moving people'], optimalIndex: 0, reason: 'The analytics engine indicates the highest-risk zone has a 95% hazard probability within the hour. Evacuation is the only viable path.' },
                { question: 'Two zones need help simultaneously. How should resources split?', choices: ['All resources to the higher-risk zone', 'Split 50/50 between both zones', 'Triage: send scouts first, then commit resources'], optimalIndex: 0, reason: 'Focusing all resources on the higher-risk zone prevents a partial failure in both. Concentration of force is optimal here.' },
                { question: 'Volunteers are arriving. What is the best use of untrained help?', choices: ['Supply distribution at shelters', 'Assisting with crowd management at evacuation points', 'Door-to-door welfare checks in safe zones'], optimalIndex: 0, reason: 'Supply distribution requires the least specialized training and frees up professional responders for complex tasks.' },
            );
        }
        return pool;
    }, [disaster?.type]);

    // Detect decision point trigger (every 5 ticks) — latch it
    useEffect(() => {
        if (tick > 0 && tick % 5 === 0 && tick !== lastTriggeredRef.current) {
            lastTriggeredRef.current = tick;
            setDecisionTick(tick);
            setActiveDecision(true);
            setSelected(null); // reset for new question
        }
    }, [tick]);

    // Pick question based on which decision round (cycles through pool)
    const roundIndex = Math.floor((decisionTick / 5) - 1);
    const currentQ = allQuestions[roundIndex % allQuestions.length] || allQuestions[0];

    // Progress toward next decision: fill based on how close we are to the next multiple of 5
    const ticksIntoRound = tick % 5;
    const approachPct = (ticksIntoRound / 5) * 100;

    if (!activeDecision) {
        return (
            <div className="lp-decision">
                <div className="lp-decision-waiting">A decision point is approaching…</div>
                <div className="lp-decision-approach-bar">
                    <div className="lp-decision-approach-fill" style={{ width: `${approachPct}%`, animation: 'none' }} />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Next decision in {5 - ticksIntoRound} tick{5 - ticksIntoRound !== 1 ? 's' : ''}
                </div>
            </div>
        );
    }

    return (
        <div className="lp-decision">
            <div className="lp-decision-label">DECISION POINT</div>
            <div className="lp-decision-question">{currentQ.question}</div>
            
            <div className={`lp-options-container ${selected !== null ? 'fade-out-shrink' : ''}`}>
                {currentQ.choices.map((choice, i) => (
                    <button
                        key={i}
                        className={`lp-option-btn ${selected === i ? 'selected' : ''}`}
                        onClick={() => setSelected(i)}
                    >
                        {choice}
                    </button>
                ))}
            </div>

            {selected !== null && (
                <div className="lp-decision-result animate-fade-in">
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>YOUR CHOICE</div>
                        <div style={{ color: selected === currentQ.optimalIndex ? '#22c55e' : 'white', fontWeight: 500 }}>
                            {currentQ.choices[selected]} 
                            {selected === currentQ.optimalIndex && <span style={{ marginLeft: 6 }}>✓</span>}
                        </div>
                    </div>
                    
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#06b6d4', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '6px' }}>
                            OPTIMAL SOLUTION (AI ENGINE)
                        </div>
                        <div style={{ color: 'white', fontWeight: 500, marginBottom: '6px' }}>
                            {currentQ.choices[currentQ.optimalIndex]}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                            {currentQ.reason}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ── Main Component ──

export default function PublicPortal() {
    const { state, connected } = useSimulation();
    const { theme } = useTheme();

    const [chainExpanded, setChainExpanded] = useState(false);

    // Derived data
    const disaster = state?.disaster;
    const zones = state?.zones || [];
    const infrastructure = state?.infrastructure || [];
    const roads = state?.roads || [];
    const recommendations = state?.recommendations || [];
    const cascading = state?.cascading_events || [];
    const tick = state?.tick || 0;
    const maxTick = 30;

    const disasterType = capitalize(disaster?.type || '');
    const epicenter = capitalize(disaster?.epicenter_zone || '');
    const overallRisk = state?.overall_risk || 0;

    const blockedRoads = roads.filter(r => r.blocked).length;
    const hospitals = infrastructure.filter(i => i.type === 'hospital');
    const isolatedHospitals = hospitals.filter(h => h.status === 'failed' || h.status === 'degraded').length;

    const exposedPop = useMemo(() => {
        return zones.reduce((sum, z) => sum + Math.round(z.population * (z.risk_score / 100) * 0.6), 0);
    }, [zones]);

    const progressPct = Math.min(100, (tick / maxTick) * 100);

    // Story nodes derived from cascading events or fallback
    const storyNodes = useMemo(() => {
        if (cascading.length > 0) {
            return [
                { icon: '🌪️', text: 'Hazard Start', tick: 1 },
                ...cascading.map(e => ({
                    icon: e.icon || '⚠️',
                    text: e.target, // Show the target of the failure as the step
                    tick: e.tick || 1
                }))
            ];
        }
        const type = (disaster?.type || 'flood').toLowerCase();
        const zone = epicenter || 'the affected area';
        if (type.includes('flood')) {
            return [
                { icon: '🌊', text: `Flood begins in ${zone}` },
                { icon: '🚧', text: `${blockedRoads} roads cut off, hospitals isolated` },
                { icon: '🏠', text: 'Evacuation routes overwhelmed' },
            ];
        }
        return [
            { icon: '⚠️', text: `Disaster strikes ${zone}` },
            { icon: '🚧', text: `${blockedRoads} routes blocked` },
            { icon: '🏠', text: 'Residents need shelter' },
        ];
    }, [cascading, disaster?.type, epicenter, blockedRoads]);

    const chainExplanation = useMemo(() => {
        const zone = epicenter || 'a dense zone';
        const type = (disaster?.type || 'disaster').toLowerCase();
        if (type.includes('flood')) {
            return `When floodwaters overwhelm drainage in a dense zone like ${zone}, roads become impassable within hours. This cuts off hospitals from ambulance networks, delays evacuation, and concentrates thousands of residents onto fewer and fewer safe routes — each failure making the next one worse.`;
        }
        if (type.includes('earthquake')) {
            return `When seismic activity damages structures in ${zone}, roads crack and debris blocks corridors. Hospitals lose structural integrity, forcing patient transfers. Emergency teams compete for limited access routes, creating bottlenecks that cascade across the entire response network.`;
        }
        if (type.includes('grid') || type.includes('power')) {
            return `When the power grid fails in ${zone}, hospitals switch to backup generators with limited fuel. Water pumps stop, traffic lights fail, and communication towers go dark. Each system depends on the others — losing one accelerates the failure of the rest.`;
        }
        return `When disaster strikes ${zone}, infrastructure systems begin to cascade. Road blockages isolate hospitals, power failures disable communication, and evacuation routes become congested — each failure worsening the next.`;
    }, [disaster?.type, epicenter]);

    return (
        <div className="learner-portal">
            {/* ── TOP BAR ── */}
            <div className="lp-topbar">
                {/* LEFT — Scenario Pill */}
                <div className="lp-scenario-pill">
                    <div className="lp-scenario-dot" />
                    <span className="lp-scenario-text">
                        {disaster
                            ? `${disasterType} — ${epicenter || 'MUMBAI'}`
                            : 'AWAITING SCENARIO'}
                    </span>
                </div>

                {/* CENTER — Progress Track */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 32px' }}>
                    <div className="lp-progress-track">
                        <div className="lp-progress-fill" style={{ width: `${progressPct}%` }} />
                        {/* Milestones */}
                        {[
                            { pct: 25, label: 'Road Blocked' },
                            { pct: 50, label: 'Hospital Isolated' },
                            { pct: 75, label: 'Evacuation Begins' },
                        ].map((m, idx) => (
                            <div key={m.pct} style={{ position: 'absolute', left: `${m.pct}%` }}>
                                <div className={`lp-milestone ${progressPct >= m.pct ? 'passed' : ''}`} />
                                <div className={`lp-milestone-label ${idx % 2 === 0 ? 'below' : 'above'} ${progressPct >= m.pct ? 'passed' : ''}`}>
                                    {m.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT */}
                <div className="lp-topbar-right">
                    <a href="/" className="lp-operator-link">Switch to Operator View →</a>
                    <button className="lp-help-btn">?</button>
                </div>
            </div>

            {/* ── MAIN ── */}
            <div className="lp-main">
                {/* Map */}
                <div className="lp-map-area">
                    <CityMap state={state} theme={theme} userRole="public" />
                </div>

                {/* Right Panel */}
                <div className="lp-right-panel">
                    {/* Cascade Failure Chain — Highly visible for learner */}
                    {cascading.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <CascadingFlow events={cascading} />
                        </div>
                    )}

                    {/* Section A — Situation Brief */}
                    <div className="lp-brief">
                        <div className="lp-brief-label">SITUATION BRIEF</div>
                        <div className="lp-brief-headline">
                            {disaster
                                ? `${disasterVerb(disaster.type)} ${epicenter || 'Mumbai'}`
                                : 'Waiting for a scenario to begin…'}
                        </div>
                        {disaster && (
                            <>
                                <div className="lp-brief-context">
                                    {blockedRoads} road{blockedRoads !== 1 ? 's are' : ' is'} blocked.{' '}
                                    {isolatedHospitals} hospital{isolatedHospitals !== 1 ? 's have' : ' has'} lost ambulance access.
                                    <br />
                                    {formatNumber(exposedPop)} residents are in disaster-affected areas.
                                </div>
                                <div className="lp-severity-label">SITUATION SEVERITY</div>
                                <div className="lp-severity-track">
                                    <div
                                        className="lp-severity-fill"
                                        style={{ width: `${Math.min(100, overallRisk)}%` }}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Section B — What's Happening */}
                    <div className="lp-feed">
                        <div className="lp-feed-label">WHAT'S HAPPENING</div>
                        {recommendations.length === 0 && (
                            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                                Events will appear here once the simulation starts.
                            </div>
                        )}
                        {recommendations.slice(0, 12).map((rec, i) => (
                            <EventCard key={`${rec.agent}-${i}`} rec={rec} index={i} tick={tick} />
                        ))}
                    </div>

                    {/* Section C — What Would You Do? */}
                    <DecisionSection tick={tick} disaster={disaster} />
                </div>

                {/* ── BOTTOM STRIP ── */}
                <div className="lp-bottom-strip">
                    <div className="lp-story-nodes" style={{ justifyContent: cascading.length > 0 ? 'flex-start' : 'center', overflowX: 'auto', padding: '10px 20px' }}>
                        {storyNodes.map((node, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && (
                                    <div className="lp-connector">
                                        <div className="lp-connector-line" />
                                        <div className="lp-connector-dot" />
                                    </div>
                                )}
                                <div className="lp-story-node">
                                    <div className="lp-node-circle" style={{ position: 'relative', background: i < cascading.length + 1 ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.05)' }}>
                                        {node.tick && (
                                            <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', fontWeight: 700, color: '#06b6d4', opacity: 0.8 }}>
                                                T{node.tick}
                                            </div>
                                        )}
                                        {node.icon}
                                    </div>
                                    <div className="lp-node-text">{node.text}</div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

