import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Polygon, Popup, useMap, useMapEvents, LayerGroup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CENTER = [19.0760, 72.8777];
const ZOOM = 11;

const COLORS = {
    critical: '#ef4444',
    warning:  '#f59e0b',
    healthy:  '#22c55e',
    info:     '#3b82f6',
    muted:    '#64748b',
};

// Layer filter config — accent colors used only on hover
const LAYER_CONFIG = [
    { key: 'hospitals', label: 'Hospitals', color: '#be185d' },
    { key: 'roads',     label: 'Roads',     color: '#1d4ed8' },
    { key: 'power',     label: 'Power',     color: '#b45309' },
    { key: 'fire',      label: 'Fire',      color: '#991b1b' },
    { key: 'shelters',  label: 'Shelters',  color: '#166534' },
];

function getRiskColor(score) {
    if (score > 70) return COLORS.critical;
    if (score > 40) return COLORS.warning;
    if (score > 15) return '#ca8a04';
    return COLORS.healthy;
}

function getStatusColor(status) {
    if (status === 'failed')   return COLORS.critical;
    if (status === 'degraded') return COLORS.warning;
    return COLORS.healthy;
}

function createCustomIcon(type, status) {
    const color = getStatusColor(status);
    let svgIcon = '';

    switch (type) {
        case 'hospital':
            svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M19 10.5H13.5V5C13.5 4.17 12.83 3.5 12 3.5C11.17 3.5 10.5 4.17 10.5 5V10.5H5C4.17 10.5 3.5 11.17 3.5 12C3.5 12.83 4.17 13.5 5 13.5H10.5V19C10.5 19.83 11.17 20.5 12 20.5C12.83 20.5 13.5 19.83 13.5 19V13.5H19C19.83 13.5 20.5 12.83 20.5 12C20.5 11.17 19.83 10.5 19 10.5Z"/></svg>`;
            break;
        case 'power_station':
            svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 2L3.5 14H10.5L9.5 22L19.5 9H13L14.5 2Z"/></svg>`;
            break;
        case 'shelter':
            svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L2 12H5V20H19V12H22L12 3Z"/></svg>`;
            break;
        case 'fire_station':
            svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.5,10.6c0-0.1,0-0.2,0-0.2c-0.6-2-2.3-3.6-4.5-4.3C13,6.2,13.1,6.3,13.1,6.5c0,1-0.9,1.9-2,1.9c-0.5,0-1,0-1,0 c0-2.3,1-4.4,2.7-5.8C12.4,2.3,12,2,11.5,2C9,3.5,6,6.3,6,11.5C6,16,8.7,20,13,20c3.3,0,6-2.7,6-6C19,12.7,18.4,11.5,17.5,10.6z M13,18c-2.2,0-4-1.8-4-4c0-0.9,0.3-1.8,0.8-2.5c0.6-0.8,1.4-1.3,2.4-1.5c1-0.2,2.1,0,3,0.6c0.8,0.6,1.4,1.4,1.6,2.4c0.1,1,0,2.1-0.6,3C15.6,17.2,14.3,18,13,18z"/></svg>`;
            break;
        case 'police_station':
            svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C12 2 5 5 5 12C5 18 12 22 12 22C12 22 19 18 19 12C19 5 12 2 12 2ZM12 7.5L13.5 11H17L14 13L15 16.5L12 14.5L9 16.5L10 13L7 11H10.5L12 7.5Z" /></svg>`;
            break;
        default:
            svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8"/></svg>`;
    }

    return L.divIcon({
        html: `<div style="background-color:${color};border-radius:50%;padding:4px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5);width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${svgIcon}</div>`,
        className: 'custom-infra-icon',
        iconSize:    [24, 24],
        iconAnchor:  [12, 12],
        popupAnchor: [0, -12],
    });
}

function createClusterCustomIcon(cluster) {
    const count = cluster.getChildCount();
    return L.divIcon({
        html: `<div style="background-color:#475569;color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:700;font-family:Inter,system-ui;width:28px;height:28px;font-size:13px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5);">${count}</div>`,
        className: 'marker-cluster',
        iconSize:   [28, 28],
        iconAnchor: [14, 14],
    });
}

function MapUpdater({ center, zoom, onZoomChange }) {
    const map = useMap();
    useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
    useMapEvents({ zoomend() { onZoomChange(map.getZoom()); } });
    return null;
}

const DEPT_INFRA_MAP = {
    medical:   ['hospital'],
    fire:      ['fire_station'],
    traffic:   ['road'],
    power:     ['power_station'],
    logistics: ['shelter'],
};

// ── Compact collapsible legend ────────────────────────────────────────────────
function MapLegend() {
    const [expanded, setExpanded] = useState(true);

    const cardStyle = {
        position:     'absolute',
        bottom:       12,
        left:         12,
        zIndex:       1000,
        maxWidth:     180,
        background:   'rgba(15, 15, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8,
        border:       '1px solid rgba(255,255,255,0.08)',
        padding:      10,
        fontSize:     11,
        boxShadow:    '0 4px 16px rgba(0,0,0,0.4)',
        userSelect:   'none',
    };

    const sectionLabel = {
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color:         '#64748b',
        marginBottom:  5,
        marginTop:     8,
    };

    const row = {
        display:       'flex',
        alignItems:    'center',
        gap:           7,
        marginBottom:  3,
        color:         '#cbd5e1',
        lineHeight:    1.3,
    };

    const dot = (color) => ({
        width: 9, height: 9, borderRadius: '50%',
        background: color, flexShrink: 0,
    });

    const square = (color) => ({
        width: 13, height: 9, borderRadius: 2,
        background: color, opacity: 0.75, flexShrink: 0,
        border: `1px solid ${color}`,
    });

    const iconBadge = (color, emoji) => (
        <span style={{
            width: 16, height: 16, borderRadius: '50%',
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, flexShrink: 0,
            border: '1.5px solid rgba(255,255,255,0.3)',
        }}>{emoji}</span>
    );

    return (
        <div style={cardStyle}>
            {/* Header — click to collapse */}
            <div
                onClick={() => setExpanded(p => !p)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                    marginTop: 0,
                }}
            >
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8' }}>
                    Legend
                </span>
                <span style={{ fontSize: 10, color: '#475569', lineHeight: 1 }}>
                    {expanded ? '▲' : '▼'}
                </span>
            </div>

            {expanded && (
                <>
                    {/* ── Markers ── */}
                    <div style={{ ...sectionLabel, marginTop: 8 }}>Markers</div>

                    <div style={row}>{iconBadge(COLORS.healthy, '✚')}<span>Hospital</span></div>
                    <div style={row}>{iconBadge(COLORS.warning, '⚡')}<span>Power Station</span></div>
                    <div style={row}>{iconBadge(COLORS.healthy, '🏠')}<span>Shelter</span></div>
                    <div style={row}>{iconBadge(COLORS.critical, '🔥')}<span>Fire Station</span></div>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />

                    <div style={row}><span style={dot(COLORS.healthy)} /><span>Operational</span></div>
                    <div style={row}><span style={dot(COLORS.warning)} /><span>Degraded</span></div>
                    <div style={row}><span style={dot(COLORS.critical)} /><span>Failed</span></div>

                    {/* ── Risk Zones ── */}
                    <div style={{ ...sectionLabel, marginTop: 10 }}>Risk Zones</div>
                    <div style={row}><span style={square(COLORS.critical)} /><span>Critical &gt;70%</span></div>
                    <div style={row}><span style={square(COLORS.warning)}  /><span>Warning 40–70%</span></div>
                    <div style={row}><span style={square('#ca8a04')}        /><span>Moderate 15–40%</span></div>
                    <div style={row}><span style={square(COLORS.healthy)}   /><span>Low &lt;15%</span></div>
                </>
            )}
        </div>
    );
}

// ── Individual pill button with hover state ──────────────────────────────────
function PillButton({ label, accentColor, visible, onToggle }) {
    const [hovered, setHovered] = useState(false);

    let background, border, color, textDecoration, boxShadow;

    if (!visible) {
        // Toggled OFF — layer hidden
        background     = 'transparent';
        border         = '1px solid #475569';
        color          = '#475569';
        textDecoration = 'line-through';
        boxShadow      = 'none';
    } else if (hovered) {
        // Hovered while visible
        background     = '#1e293b';
        border         = `1px solid ${accentColor}`;
        color          = '#ffffff';
        textDecoration = 'none';
        boxShadow      = `inset 3px 0 0 ${accentColor}`;
    } else {
        // Default — visible, not hovered
        background     = '#1e293b';
        border         = '1px solid #334155';
        color          = '#94a3b8';
        textDecoration = 'none';
        boxShadow      = 'none';
    }

    return (
        <button
            onClick={onToggle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                padding:        '4px 12px',
                borderRadius:   6,
                fontSize:       13,
                fontWeight:     500,
                cursor:         'pointer',
                transition:     'all 0.15s ease',
                border,
                background,
                color,
                textDecoration,
                boxShadow,
                letterSpacing:  '0.02em',
                lineHeight:     1.4,
            }}
        >
            {label}
        </button>
    );
}

// ── Filter toggle pill bar (above the map) ────────────────────────────────────
function LayerFilterBar({ visibleLayers, onToggle, theme }) {
    return (
        <div style={{
            display:        'flex',
            alignItems:     'center',
            gap:            5,
            padding:        '5px 8px',
            background:     theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(10,14,26,0.90)',
            borderRadius:   8,
            border:         theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid #1e293b',
            backdropFilter: 'blur(6px)',
            flexWrap:       'wrap',
        }}>
            <span style={{
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                color: '#475569', marginRight: 4,
            }}>
                Layers
            </span>
            {LAYER_CONFIG.map(({ key, label, color }) => (
                <PillButton
                    key={key}
                    label={label}
                    accentColor={color}
                    visible={visibleLayers[key]}
                    onToggle={() => onToggle(key)}
                />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
const CityMap = React.memo(({ state, theme = 'dark', onZoneClick, userRole = 'admin', userDepartment = null }) => {
    const [currentZoom, setCurrentZoom] = useState(ZOOM);

    const [visibleLayers, setVisibleLayers] = useState({
        hospitals: true,
        roads:     true,
        power:     true,
        fire:      true,
        shelters:  true,
    });

    const toggleLayer = (key) =>
        setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }));

    const { zones = [], infrastructure = [], roads = [], ml_output = null } = state || {};
    const isPublic   = userRole === 'public';
    const isOperator = userRole === 'operator';

    const visibleInfra = useMemo(() => {
        if (isPublic) return infrastructure.filter(i => i.type === 'shelter');
        return infrastructure;
    }, [infrastructure, isPublic]);

    const hospitals     = useMemo(() => visibleInfra.filter(i => i.type === 'hospital'),      [visibleInfra]);
    const powerStations = useMemo(() => visibleInfra.filter(i => i.type === 'power_station'), [visibleInfra]);
    const shelters      = useMemo(() => visibleInfra.filter(i => i.type === 'shelter'),        [visibleInfra]);
    const fireStations  = useMemo(() => visibleInfra.filter(i => i.type === 'fire_station'),   [visibleInfra]);
    const otherInfra    = useMemo(() => visibleInfra.filter(i =>
        !['hospital', 'power_station', 'shelter', 'fire_station'].includes(i.type)
    ), [visibleInfra]);

    const showShelters   = currentZoom > 11;
    const showMinorInfra = currentZoom > 13;

    if (!state) return null;

    const tileUrl    = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const popupBg    = theme === 'light' ? '#fff'    : '#141b2d';
    const popupColor = theme === 'light' ? '#0f172a' : '#e2e8f0';

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* ── Layer filter pill bar (above map, hidden for public) ── */}
            {!isPublic && (
                <div style={{ padding: '4px 6px', flexShrink: 0 }}>
                    <LayerFilterBar visibleLayers={visibleLayers} onToggle={toggleLayer} theme={theme} />
                </div>
            )}

            {/* ── Map ── */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                <MapContainer
                    center={CENTER} zoom={ZOOM}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                    zoomControl={true}
                >
                    <MapUpdater center={CENTER} zoom={ZOOM} onZoomChange={setCurrentZoom} />
                    <TileLayer
                        key={theme}
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                        url={tileUrl}
                        subdomains='abc'
                        maxZoom={19}
                    />

                    {/* ── Risk Zones (always visible) ── */}
                    <LayerGroup>
                        {zones.map(zone => {
                            const isHighRisk = zone.risk_score > 60;
                            const mlPrediction = ml_output?.predictions?.find(p => p.zone_id === zone.id);
                            return (
                                <Polygon
                                    key={zone.id}
                                    positions={zone.polygon}
                                    pathOptions={{
                                        color:       getRiskColor(zone.risk_score),
                                        fillColor:   getRiskColor(zone.risk_score),
                                        fillOpacity: isHighRisk ? (theme === 'light' ? 0.22 : 0.18) : (theme === 'light' ? 0.1 : 0.07),
                                        weight:      isHighRisk ? (theme === 'light' ? 2.5 : 2)    : (theme === 'light' ? 1.5 : 1),
                                        opacity:     isHighRisk ? (theme === 'light' ? 0.9 : 0.8)  : (theme === 'light' ? 0.5 : 0.4),
                                    }}
                                    eventHandlers={{ click: () => onZoneClick?.(zone) }}
                                >
                                    <Popup>
                                        <div style={{ color: popupColor, background: popupBg, padding: 2 }}>
                                            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{zone.name}</div>
                                            {isPublic ? (
                                                <div style={{ fontSize: 11, color: getRiskColor(zone.risk_score), fontWeight: 600 }}>
                                                    {zone.risk_score > 70 ? '⚠ CRITICAL ZONE' : zone.risk_score > 40 ? '⚠ ALERT ZONE' : '✓ SAFE ZONE'}
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ fontSize: 11 }}>
                                                        Risk: <span style={{ color: getRiskColor(zone.risk_score), fontWeight: 600 }}>{zone.risk_score.toFixed(0)}%</span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: popupColor, opacity: 0.7 }}>Pop: {zone.population.toLocaleString()}</div>
                                                    {mlPrediction && (
                                                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(128,128,128,0.2)' }}>
                                                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>ML PREDICTIONS</div>
                                                            <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                                                                <span>Casualties:</span>
                                                                <span style={{ fontWeight: 600, color: '#ef4444' }}>{mlPrediction.predicted_casualties}</span>
                                                            </div>
                                                            <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                                                                <span>Risk CI:</span>
                                                                <span style={{ fontWeight: 600 }}>{mlPrediction.risk_confidence_low.toFixed(0)}% - {mlPrediction.risk_confidence_high.toFixed(0)}%</span>
                                                            </div>
                                                            <div style={{ fontSize: 10, marginTop: 4, display: 'flex', gap: 6 }}>
                                                                <div style={{ flex: 1, padding: 2, background: 'rgba(239,68,68,0.1)', borderRadius: 2, textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>
                                                                    {mlPrediction.ambulances_allocated} 🚑
                                                                </div>
                                                                <div style={{ flex: 1, padding: 2, background: 'rgba(245,158,11,0.1)', borderRadius: 2, textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>
                                                                    {mlPrediction.generators_allocated} ⚡
                                                                </div>
                                                                <div style={{ flex: 1, padding: 2, background: 'rgba(34,197,94,0.1)', borderRadius: 2, textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>
                                                                    {mlPrediction.shelter_buses_allocated} 🚌
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </Popup>
                                </Polygon>
                            );
                        })}

                        {/* Risk epicentres — high-risk zones only, zoomed out */}
                        {currentZoom < 14 && zones.filter(z => z.risk_score > 55).map(zone => (
                            <CircleMarker
                                key={`risk-${zone.id}`}
                                center={zone.center}
                                radius={Math.min(18, zone.risk_score / 5 + 3)}
                                pathOptions={{
                                    color:       getRiskColor(zone.risk_score),
                                    fillColor:   getRiskColor(zone.risk_score),
                                    fillOpacity: theme === 'light' ? zone.risk_score / 160 : zone.risk_score / 220,
                                    weight:      zone.risk_score > 70 ? (theme === 'light' ? 2.5 : 2) : (theme === 'light' ? 1 : 0.5),
                                }}
                            />
                        ))}
                    </LayerGroup>

                    {/* ── Roads — gated by pill toggle ── */}
                    {!isPublic && visibleLayers.roads && (
                        <LayerGroup>
                            {roads
                                .filter(road => road.blocked || road.status === 'degraded')
                                .map(road => {
                                    const mid   = road.points[Math.floor(road.points.length / 2)];
                                    const color = road.blocked ? COLORS.critical : COLORS.warning;
                                    return (
                                        <CircleMarker
                                            key={road.id}
                                            center={mid}
                                            radius={road.blocked ? 8 : 6}
                                            pathOptions={{
                                                color, fillColor: color,
                                                fillOpacity: theme === 'light' ? 0.7 : 0.6,
                                                weight: 2, opacity: 0.9,
                                            }}
                                        >
                                            <Popup>
                                                <div style={{ color: popupColor, background: popupBg }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{road.name}</div>
                                                    <div style={{ fontSize: 11, color, fontWeight: 600 }}>
                                                        {road.blocked ? '⛔ BLOCKED' : '⚠ DEGRADED'}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    );
                                })}
                        </LayerGroup>
                    )}

                    {/* ── Hospitals — gated by pill toggle ── */}
                    {!isPublic && visibleLayers.hospitals && (
                        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} showCoverageOnHover={false} maxClusterRadius={50}>
                            {hospitals.map(infra => (
                                <Marker key={infra.id} position={[infra.lat, infra.lng]} icon={createCustomIcon(infra.type, infra.status)}>
                                    <Popup>
                                        <div style={{ color: popupColor, background: popupBg }}>
                                            <div style={{ fontWeight: 600, fontSize: 12 }}>{infra.name}</div>
                                            <div style={{ fontSize: 11, color: getStatusColor(infra.status), fontWeight: 600 }}>{infra.status.toUpperCase()}</div>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>Damage: {infra.damage.toFixed(0)}% · Load: {infra.current_load}/{infra.capacity}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    )}

                    {/* ── Power — gated by pill toggle ── */}
                    {!isPublic && visibleLayers.power && (
                        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} showCoverageOnHover={false} maxClusterRadius={50}>
                            {powerStations.map(infra => (
                                <Marker key={infra.id} position={[infra.lat, infra.lng]} icon={createCustomIcon(infra.type, infra.status)}>
                                    <Popup>
                                        <div style={{ color: popupColor, background: popupBg }}>
                                            <div style={{ fontWeight: 600, fontSize: 12 }}>{infra.name}</div>
                                            <div style={{ fontSize: 11, color: getStatusColor(infra.status), fontWeight: 600 }}>{infra.status.toUpperCase()}</div>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>Damage: {infra.damage.toFixed(0)}%</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    )}

                    {/* ── Fire Stations — gated by pill toggle ── */}
                    {!isPublic && visibleLayers.fire && (
                        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} showCoverageOnHover={false} maxClusterRadius={50}>
                            {fireStations.map(infra => (
                                <Marker key={infra.id} position={[infra.lat, infra.lng]} icon={createCustomIcon(infra.type, infra.status)}>
                                    <Popup>
                                        <div style={{ color: popupColor, background: popupBg }}>
                                            <div style={{ fontWeight: 600, fontSize: 12 }}>{infra.name}</div>
                                            <div style={{ fontSize: 11, color: getStatusColor(infra.status), fontWeight: 600 }}>{infra.status.toUpperCase()}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    )}

                    {/* ── Shelters — gated by pill toggle + zoom ── */}
                    {(showShelters || isPublic) && visibleLayers.shelters && (
                        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} showCoverageOnHover={false} maxClusterRadius={50}>
                            {shelters.map(infra => (
                                <Marker key={infra.id} position={[infra.lat, infra.lng]} icon={createCustomIcon(infra.type, infra.status)}>
                                    <Popup>
                                        <div style={{ color: popupColor, background: popupBg }}>
                                            <div style={{ fontWeight: 600, fontSize: 12 }}>{infra.name}</div>
                                            <div style={{ fontSize: 11, color: getStatusColor(infra.status), fontWeight: 600 }}>{infra.status.toUpperCase()}</div>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>Capacity: {infra.capacity}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    )}

                    {/* ── Other infra (zoom-gated, no pill) ── */}
                    {showMinorInfra && !isPublic && (
                        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} showCoverageOnHover={false} maxClusterRadius={60}>
                            {otherInfra.map(infra => (
                                <Marker key={infra.id} position={[infra.lat, infra.lng]} icon={createCustomIcon(infra.type, infra.status)}>
                                    <Popup>
                                        <div style={{ color: popupColor, background: popupBg }}>
                                            <div style={{ fontWeight: 600, fontSize: 12 }}>{infra.name}</div>
                                            <div style={{ fontSize: 11, color: getStatusColor(infra.status), fontWeight: 600 }}>{infra.status.toUpperCase()}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    )}
                </MapContainer>

                {/* ── Compact collapsible legend — bottom-left ── */}
                <MapLegend />
            </div>
        </div>
    );
});

export default CityMap;
