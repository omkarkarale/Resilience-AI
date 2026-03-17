import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Polygon, Popup, useMap, useMapEvents, LayersControl, LayerGroup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const { Overlay } = LayersControl;

const CENTER = [19.0760, 72.8777];
const ZOOM = 11;

const COLORS = {
    critical: '#ef4444',
    warning: '#f59e0b',
    healthy: '#22c55e',
    info: '#3b82f6',
    muted: '#64748b',
};

function getRiskColor(score) {
    if (score > 70) return COLORS.critical;
    if (score > 40) return COLORS.warning;
    if (score > 15) return '#ca8a04';
    return COLORS.healthy;
}

function getStatusColor(status) {
    if (status === 'failed') return COLORS.critical;
    if (status === 'degraded') return COLORS.warning;
    return COLORS.healthy;
}

function createCustomIcon(type, status) {
    const color = getStatusColor(status);
    let svgIcon = '';
    
    // Solid SVG icons for different types
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
            svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.5,10.6c0-0.1,0-0.2,0-0.2c-0.6-2-2.3-3.6-4.5-4.3C13,6.2,13.1,6.3,13.1,6.5c0,1-0.9,1.9-2,1.9c-0.5,0-1,0-1,0 c0-2.3,1-4.4,2.7-5.8C12.4,2.3,12,2,11.5,2C9,3.5,6,6.3,6,11.5C6,16,8.7,20,13,20c3.3,0,6-2.7,6-6C19,12.7,18.4,11.5,17.5,10.6z M13,18 c-2.2,0-4-1.8-4-4c0-0.9,0.3-1.8,0.8-2.5c0.6-0.8,1.4-1.3,2.4-1.5c1-0.2,2.1,0,3,0.6c0.8,0.6,1.4,1.4,1.6,2.4 c0.1,1,0,2.1-0.6,3C15.6,17.2,14.3,18,13,18z"/></svg>`;
            break;
        case 'police_station':
             svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C12 2 5 5 5 12C5 18 12 22 12 22C12 22 19 18 19 12C19 5 12 2 12 2ZM12 7.5L13.5 11H17L14 13L15 16.5L12 14.5L9 16.5L10 13L7 11H10.5L12 7.5Z" /></svg>`;
             break;
        default:
             svgIcon = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8"/></svg>`;
    }

    return L.divIcon({
        html: `<div style="background-color: ${color}; border-radius: 50%; padding: 4px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">${svgIcon}</div>`,
        className: 'custom-infra-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

function createClusterCustomIcon(cluster) {
    const count = cluster.getChildCount();
    return L.divIcon({
        html: `<div style="background-color: #475569; color: white; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 700; font-family: Inter, system-ui; width: 28px; height: 28px; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">${count}</div>`,
        className: 'marker-cluster',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

function MapUpdater({ center, zoom, onZoomChange }) {
    const map = useMap();
    useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
    useMapEvents({ zoomend() { onZoomChange(map.getZoom()); } });
    return null;
}

// Department → infrastructure type mapping for operator filtering
const DEPT_INFRA_MAP = {
    medical: ['hospital'],
    fire: ['fire_station'],
    traffic: ['road'],
    power: ['power_station'],
    logistics: ['shelter'],
};

const CityMap = React.memo(({ state, theme = 'dark', onZoneClick, userRole = 'admin', userDepartment = null }) => {
    const [currentZoom, setCurrentZoom] = useState(ZOOM);
    const [legendOpen, setLegendOpen] = useState(false);

    const { zones = [], infrastructure = [], roads = [] } = state || {};
    const isPublic = userRole === 'public';
    const isOperator = userRole === 'operator';

    // Filter infrastructure based on role
    const visibleInfra = useMemo(() => {
        if (isPublic) return infrastructure.filter(i => i.type === 'shelter');
        return infrastructure;
    }, [infrastructure, isPublic]);

    const hospitals = useMemo(() => visibleInfra.filter(i => i.type === 'hospital'), [visibleInfra]);
    const powerStations = useMemo(() => visibleInfra.filter(i => i.type === 'power_station'), [visibleInfra]);
    const shelters = useMemo(() => visibleInfra.filter(i => i.type === 'shelter'), [visibleInfra]);
    const otherInfra = useMemo(() => visibleInfra.filter(i => !['hospital', 'power_station', 'shelter'].includes(i.type)), [visibleInfra]);

    // For operators, check if infra type matches their department
    const isDeptRelevant = (type) => {
        if (!isOperator || !userDepartment) return true;
        const relevant = DEPT_INFRA_MAP[userDepartment] || [];
        return relevant.includes(type);
    };

    // Visibility thresholds — show less by default
    const showShelters = currentZoom > 11;
    const showMinorInfra = currentZoom > 13;
    // Minor roads now checked inline (currentZoom > 12)

    if (!state) return null;

    // Use OSM tiles for both modes — dark mode is inverted via CSS filter
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const popupBg = theme === 'light' ? '#fff' : '#141b2d';
    const popupColor = theme === 'light' ? '#0f172a' : '#e2e8f0';

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={true}>
                <MapUpdater center={CENTER} zoom={ZOOM} onZoomChange={setCurrentZoom} />
                <TileLayer
                    key={theme}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                    url={tileUrl}
                    subdomains='abc'
                    maxZoom={19}
                />

                <LayersControl position="topright">
                    <Overlay checked name="Risk Zones">
                        <LayerGroup>
                            {zones.map(zone => {
                                const isHighRisk = zone.risk_score > 60;
                                return (
                                    <Polygon
                                        key={zone.id}
                                        positions={zone.polygon}
                                        pathOptions={{
                                            color: getRiskColor(zone.risk_score),
                                            fillColor: getRiskColor(zone.risk_score),
                                            fillOpacity: isHighRisk ? (theme === 'light' ? 0.22 : 0.18) : (theme === 'light' ? 0.1 : 0.07),
                                            weight: isHighRisk ? (theme === 'light' ? 2.5 : 2) : (theme === 'light' ? 1.5 : 1),
                                            opacity: isHighRisk ? (theme === 'light' ? 0.9 : 0.8) : (theme === 'light' ? 0.5 : 0.4),
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
                                                    </>
                                                )}
                                            </div>
                                        </Popup>
                                    </Polygon>
                                );
                            })}

                            {/* Risk epicenters — only high risk areas */}
                            {currentZoom < 14 && zones.filter(z => z.risk_score > 55).map(zone => (
                                <CircleMarker
                                    key={`risk-${zone.id}`}
                                    center={zone.center}
                                    radius={Math.min(18, zone.risk_score / 5 + 3)}
                                    pathOptions={{
                                        color: getRiskColor(zone.risk_score),
                                        fillColor: getRiskColor(zone.risk_score),
                                        fillOpacity: theme === 'light' ? zone.risk_score / 160 : zone.risk_score / 220,
                                        weight: zone.risk_score > 70 ? (theme === 'light' ? 2.5 : 2) : (theme === 'light' ? 1 : 0.5),
                                    }}
                                />
                            ))}
                        </LayerGroup>
                    </Overlay>

                    {!isPublic && <Overlay checked name="Road Status">
                        <LayerGroup>
                            {roads
                                .filter(road => road.blocked || road.status === 'degraded')
                                .map(road => {
                                    // Show disrupted roads as a circle indicator at the road's midpoint
                                    const mid = road.points[Math.floor(road.points.length / 2)];
                                    const color = road.blocked ? COLORS.critical : COLORS.warning;
                                    return (
                                        <CircleMarker
                                            key={road.id}
                                            center={mid}
                                            radius={road.blocked ? 8 : 6}
                                            pathOptions={{
                                                color: color,
                                                fillColor: color,
                                                fillOpacity: theme === 'light' ? 0.7 : 0.6,
                                                weight: 2,
                                                opacity: 0.9,
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
                    </Overlay>}

                    {!isPublic && <Overlay checked name="Hospitals">
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
                    </Overlay>}

                    {!isPublic && <Overlay checked name="Power">
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
                    </Overlay>}

                    {(showShelters || isPublic) && (
                        <Overlay checked name="Shelters">
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
                        </Overlay>
                    )}

                    {showMinorInfra && !isPublic && (
                        <Overlay checked name="Other">
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
                        </Overlay>
                    )}
                </LayersControl>
            </MapContainer>

            {/* Map Index / Legend — collapsible panel */}
            {legendOpen && (
                <div style={{
                    position: 'absolute', bottom: 44, left: 8, zIndex: 1000,
                    padding: '10px 14px',
                    background: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 15, 25, 0.95)',
                    borderRadius: 8,
                    fontSize: 11,
                    border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    minWidth: 180, maxHeight: 340, overflowY: 'auto',
                    boxShadow: theme === 'light' ? '0 4px 16px rgba(0,0,0,0.1)' : '0 4px 16px rgba(0,0,0,0.4)',
                }}>
                    {/* Section: Infrastructure */}
                    <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme === 'light' ? '#475569' : '#94a3b8', marginBottom: 6 }}>
                        Infrastructure
                    </div>
                    {[
                        { label: 'Hospital', color: COLORS.healthy, icon: '✚' },
                        { label: 'Power Station', color: COLORS.healthy, icon: '⚡' },
                        { label: 'Shelter', color: COLORS.healthy, icon: '🏠' },
                        { label: 'Fire Station', color: COLORS.healthy, icon: '🔥' },
                        { label: 'Police Station', color: COLORS.healthy, icon: '🛡' },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                            <span style={{ width: 18, height: 18, borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </div>
                    ))}

                    {/* Section: Status Colors */}
                    <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme === 'light' ? '#475569' : '#94a3b8', marginTop: 10, marginBottom: 6 }}>
                        Status Colors
                    </div>
                    {[
                        { label: 'Operational', color: COLORS.healthy },
                        { label: 'Degraded', color: COLORS.warning },
                        { label: 'Failed / Critical', color: COLORS.critical },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                            <span>{item.label}</span>
                        </div>
                    ))}

                    {/* Section: Risk Zones */}
                    <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme === 'light' ? '#475569' : '#94a3b8', marginTop: 10, marginBottom: 6 }}>
                        Risk Zones
                    </div>
                    {[
                        { label: 'Critical (>70%)', color: COLORS.critical },
                        { label: 'Warning (40–70%)', color: COLORS.warning },
                        { label: 'Moderate (15–40%)', color: '#ca8a04' },
                        { label: 'Low (<15%)', color: COLORS.healthy },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                            <span style={{ width: 16, height: 10, borderRadius: 2, background: item.color, opacity: 0.7, display: 'inline-block', flexShrink: 0, border: `1px solid ${item.color}` }} />
                            <span>{item.label}</span>
                        </div>
                    ))}

                    {/* Section: Road Status */}
                    <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme === 'light' ? '#475569' : '#94a3b8', marginTop: 10, marginBottom: 6 }}>
                        Road Status
                    </div>
                    {[
                        { label: 'Blocked', color: COLORS.critical, icon: '⛔' },
                        { label: 'Degraded', color: COLORS.warning, icon: '⚠' },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, flexShrink: 0 }}>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Toggle button for legend */}
            <button
                onClick={() => setLegendOpen(prev => !prev)}
                style={{
                    position: 'absolute', bottom: 8, left: 8, zIndex: 1000,
                    padding: '5px 10px',
                    background: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 15, 25, 0.95)',
                    borderRadius: 6,
                    fontSize: 10, fontWeight: 600,
                    color: theme === 'light' ? '#475569' : '#94a3b8',
                    border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', gap: 4,
                    boxShadow: theme === 'light' ? '0 2px 6px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.3)',
                }}
            >
                <span style={{ fontSize: 12 }}>{legendOpen ? '✕' : '☰'}</span>
                <span>Map Index</span>
            </button>
        </div>
    );
});

export default CityMap;
