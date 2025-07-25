"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Loader } from '@googlemaps/js-api-loader';

interface ParticipantInfo {
    identity: string;
    state: string;
    username?: string;
    avatar?: string;
    position?: { x: number; y: number };
    isPublishingMusic?: boolean;
    musicTitle?: string;
    partyTitle?: string;
    partyDescription?: string;
    joinedAt?: string;
    tracks?: Array<{
        sid: string;
        name: string;
        type: string;
        muted: boolean;
    }>;
}

interface RoomInfo {
    name: string;
    participants: ParticipantInfo[];
    numParticipants: number;
    creationTime?: string;
    emptyTimeout?: number;
    maxParticipants?: number;
}

interface AdminData {
    rooms: RoomInfo[];
    summary?: {
        totalRooms: number;
        totalParticipants: number;
        totalMusicPublishers: number;
        timestamp: string;
    };
}

export default function AdminMapView() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [adminData, setAdminData] = useState<AdminData | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Map refs
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

    const fetchAdminData = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const response = await fetch('/api/admin/livekit', {
                method: 'GET',
                headers: {
                    'x-admin-password': password,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 401) {
                setIsAuthenticated(false);
                sessionStorage.removeItem('admin-authenticated');
                setError('Authentication expired');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch data');
                return;
            }

            const data = await response.json();
            setAdminData(data);
            setLastUpdated(new Date());
            setError('');

        } catch (err) {
            console.error('Failed to fetch admin data:', err);
            setError('Failed to fetch admin data');
        }
    }, [isAuthenticated, password]);

    // Check if already authenticated on mount
    useEffect(() => {
        const savedAuth = sessionStorage.getItem('admin-authenticated');
        if (savedAuth === 'true') {
            setIsAuthenticated(true);
            fetchAdminData();
        }
    }, [fetchAdminData]);

    // Auto-refresh data every 10 seconds when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(() => {
            fetchAdminData();
        }, 10000);

        return () => clearInterval(interval);
    }, [isAuthenticated, fetchAdminData]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setError('Please enter the admin password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/livekit', {
                method: 'GET',
                headers: {
                    'x-admin-password': password,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 401) {
                setError('Invalid admin password');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to authenticate');
                return;
            }

            const data = await response.json();
            setAdminData(data);
            setIsAuthenticated(true);
            setLastUpdated(new Date());
            sessionStorage.setItem('admin-authenticated', 'true');

        } catch (err) {
            console.error('Admin login error:', err);
            setError('Failed to connect to admin API');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPassword('');
        setAdminData(null);
        setError('');
        sessionStorage.removeItem('admin-authenticated');
        mapRef.current = null;
    };

    // Reset mapRef when authentication is lost (e.g., after logout or session expiration)
    useEffect(() => {
        if (!isAuthenticated) {
            mapRef.current = null;
        }
    }, [isAuthenticated]);

    const handleRefresh = () => {
        fetchAdminData();
    };

    // Initialize Google Maps
    const initializeMap = useCallback(async () => {
        if (!mapContainerRef.current || mapRef.current) {
            // Map already initialized or container missing
            return;
        }

        try {
            const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!GOOGLE_MAPS_API_KEY) {
                console.log('❌ Google Maps API key not configured. Map will be disabled.');
                return;
            }

            const loader = new Loader({
                apiKey: GOOGLE_MAPS_API_KEY,
                version: 'weekly',
                libraries: ['places'],
            });

            await loader.load();

            if (!window.google?.maps) {
                throw new Error('Google Maps failed to load properly');
            }

            // Use default center/zoom
            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: { lat: 37.7749, lng: -122.4194 },
                zoom: 2,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                restriction: {
                    latLngBounds: {
                        north: 85,
                        south: -85,
                        west: -180,
                        east: 180,
                    },
                    strictBounds: true,
                },
                styles: [
                    {
                        featureType: 'poi',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });

            mapRef.current = map;
            console.log('✅ Admin Google Maps initialized successfully');

        } catch (err) {
            console.error('❌ Error loading Google Maps for admin:', err);
        }
    }, []);

    // Room selection state
    const [selectedRoom, setSelectedRoom] = useState<string>('__all__');
    // Update map markers for participants (filtered by selectedRoom)
    const updateMapMarkers = useCallback(() => {
        if (!mapRef.current || !window.google?.maps || !adminData?.rooms) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current.clear();

        // Find the room(s) to display
        let roomsToShow = adminData.rooms;
        if (selectedRoom && selectedRoom !== '__all__') {
            roomsToShow = adminData.rooms.filter(r => r.name === selectedRoom);
        }

        let totalParticipantsWithPosition = 0;
        const bounds = new window.google.maps.LatLngBounds();

        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        roomsToShow.forEach(room => {
            room.participants.forEach(participant => {
                // Validate position
                if (!participant.position || typeof participant.position.x !== 'number' || typeof participant.position.y !== 'number' || isNaN(participant.position.x) || isNaN(participant.position.y)) return;
                totalParticipantsWithPosition++;
                // Avatar icon logic (same as HuntersMapView)
                let avatarFile = participant.avatar;
                if (!avatarFile) avatarFile = 'char_001.png';
                if (avatarFile && !avatarFile.endsWith('.png')) {
                    avatarFile = avatarFile + '.png';
                }
                let relIconUrl = participant.isPublishingMusic ? '/boombox.png' : `/characters_001/${avatarFile}`;
                // Ensure no double slashes
                relIconUrl = relIconUrl.replace(/\\/g, '/').replace(/\\/g, '/');
                const iconUrl = origin + relIconUrl;
                const markerSize = participant.isPublishingMusic ? 60 : 50;
                try {
                    const marker = new window.google.maps.Marker({
                        position: { lat: participant.position.x, lng: participant.position.y },
                        map: mapRef.current,
                        icon: {
                            url: iconUrl,
                            scaledSize: new window.google.maps.Size(markerSize, markerSize),
                        },
                        title: `${participant.username || participant.identity} (${room.name})${participant.isPublishingMusic ? ' 🎵' : ''}`,
                        zIndex: participant.isPublishingMusic ? 999 : 500,
                    });
                    // Info window
                    const infoWindow = new window.google.maps.InfoWindow({
                        content: `
                            <div class="p-2">
                                <div class="font-semibold text-gray-800">${participant.username || participant.identity}</div>
                                <div class="text-sm text-gray-600">Room: ${room.name}</div>
                                <div class="text-sm text-gray-600">State: ${participant.state}</div>
                                ${participant.isPublishingMusic ? `
                                    <div class="text-sm text-purple-600 font-medium">🎵 Publishing Music</div>
                                    ${participant.partyTitle ? `<div class="text-xs text-purple-600">${participant.partyTitle}</div>` : ''}
                                ` : ''}
                                <div class="text-xs text-gray-500 mt-1">
                                    Position: (${participant.position.x.toFixed(4)}, ${participant.position.y.toFixed(4)})
                                </div>
                            </div>
                        `
                    });
                    marker.addListener('click', () => infoWindow.open(mapRef.current, marker));
                    markersRef.current.set(participant.identity, marker);
                    bounds.extend({ lat: participant.position.x, lng: participant.position.y });
                } catch (err) {
                    // Log marker creation errors for debugging
                    console.error('Failed to create marker for', participant, 'with icon', iconUrl, err);
                }
            });
        });
        // Fit map to markers only if there are any
        if (totalParticipantsWithPosition > 0) {
            mapRef.current!.fitBounds(bounds);
        } else if (mapRef.current) {
            // If no participants, reset to default center/zoom
            mapRef.current.setCenter({ lat: 51.5074, lng: -0.1278 });
            mapRef.current.setZoom(2);
        }
    }, [adminData, selectedRoom]);

    // Initialize map when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            initializeMap();
        }
    }, [isAuthenticated, initializeMap]);

    // Update markers when data or selectedRoom changes
    useEffect(() => {
        if (adminData && mapRef.current) {
            updateMapMarkers();
        }
    }, [adminData, updateMapMarkers, selectedRoom]);

    // Collapsible panel state
    const [panelCollapsed, setPanelCollapsed] = useState(false);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4">
                <div className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 flex flex-col items-center">
                    <div className="flex items-center mb-4">
                        <span className="text-4xl mr-2">🔒</span>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Login</h1>
                    </div>
                    <p className="text-white/80 mb-2 text-center">Access the Vibes Hunters Control Panel</p>
                    <form className="w-full flex flex-col gap-4" onSubmit={handleLogin}>
                        <label className="flex items-center gap-2 text-white/90 font-medium">
                            <span className="text-xl">🔑</span> Admin Password
                        </label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-white/60"
                            placeholder="Enter admin password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full py-2 mt-2 rounded-xl bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                            disabled={loading}
                        >
                            <span className="text-lg">🚀</span> Access Dashboard
                        </button>
                    </form>
                    <div className="mt-6 text-white/70 text-center text-sm">
                        <span className="font-semibold">🚫 Unauthorized Access Prohibited</span>
                        <br />All login attempts are logged and monitored.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 overflow-hidden">
            {/* Admin Info Panel (glassmorphism overlay, collapsible) */}
            <div
                className={`absolute bottom-4 left-4 z-20 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white rounded-2xl shadow-2xl border border-white/20 transition-all duration-300 ${panelCollapsed ? 'p-2 min-w-[48px] max-w-[60px] h-[56px] flex items-center justify-center' : 'p-0 min-w-[0px] max-w-[90vw]'} ${panelCollapsed ? 'overflow-hidden' : ''}`}
                style={{
                    maxHeight: panelCollapsed ? '60px' : '90vh',
                    width: panelCollapsed ? '56px' : 'clamp(320px, 90vw, 380px)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                    borderRadius: '1.25rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                {/* Collapse/Expand Button */}
                <button
                    className={`absolute top-3 right-3 bg-white/10 text-white rounded-full p-2 shadow hover:bg-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 ${panelCollapsed ? 'w-8 h-8 flex items-center justify-center' : ''}`}
                    style={{ zIndex: 30 }}
                    aria-label={panelCollapsed ? 'Expand panel' : 'Collapse panel'}
                    onClick={() => setPanelCollapsed(c => !c)}
                >
                    {panelCollapsed ? <span className="text-xl">▶️</span> : <span className="text-xl">⬅️</span>}
                </button>
                {/* Panel Content */}
                {!panelCollapsed && (
                    <div className="flex flex-col items-center justify-center px-6 py-6 gap-4 w-full">
                        <div className="flex items-center gap-3 mb-2 w-full justify-center">
                            <span className="font-extrabold text-2xl tracking-tight">Admin Dashboard</span>
                        </div>
                        <div className="flex flex-row gap-6 justify-between w-full mb-2">
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-sm">Rooms</span>
                                <span className="font-bold text-lg">{adminData?.summary?.totalRooms ?? 0}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-sm">Users</span>
                                <span className="font-bold text-lg">{adminData?.summary?.totalParticipants ?? 0}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-sm">Music</span>
                                <span className="font-bold text-lg">{adminData?.summary?.totalMusicPublishers ?? 0}</span>
                            </div>
                        </div>
                        {/* Room selector dropdown (like prejoin page) */}
                        <div className="w-full mb-2">
                            <label className="block text-white/90 font-medium mb-1 text-center">Select Room</label>
                            <select
                                className="w-full px-3 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                value={selectedRoom}
                                onChange={e => setSelectedRoom(e.target.value)}
                            >
                                <option value="__all__">All Rooms</option>
                                {adminData?.rooms?.map(room => (
                                    <option key={room.name} value={room.name}>{room.name} ({room.numParticipants})</option>
                                ))}
                            </select>
                        </div>
                        {/* Active Rooms and Participants */}
                        <div className="w-full mb-2">
                            <span className="font-semibold">Active Rooms</span>
                            <ul className="ml-2 mt-2">
                                {(selectedRoom && selectedRoom !== '__all__' ? adminData?.rooms?.filter(r => r.name === selectedRoom) : adminData?.rooms)?.map(room => (
                                    <li key={room.name} className="mb-2">
                                        <span className="mr-1">🏠</span> <span className="font-bold">{room.name}</span> <span className="text-xs text-white/60">({room.numParticipants} participant{room.numParticipants !== 1 ? 's' : ''})</span>
                                        <ul className="ml-4">
                                            {room.participants.map(p => (
                                                <li key={p.identity} className="flex items-center gap-2 text-sm mt-1">
                                                    {p.avatar ? (
                                                        <Image
                                                            src={p.isPublishingMusic ? '/boombox.png' : `/characters_001/${p.avatar.endsWith('.png') ? p.avatar : p.avatar + '.png'}`}
                                                            alt="avatar"
                                                            width={24}
                                                            height={24}
                                                            className="w-6 h-6 rounded-full inline-block border-2 border-white/30 object-cover"
                                                            style={{ objectFit: 'cover' }}
                                                            unoptimized={p.isPublishingMusic}
                                                        />
                                                    ) : (
                                                        <span className="text-lg">🧑</span>
                                                    )}
                                                    <span className="font-semibold">{p.username ?? p.identity}</span>
                                                    {p.isPublishingMusic && <span className="ml-1 text-pink-400">🎶</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex flex-row gap-3 w-full justify-center mt-2">
                            <button onClick={handleRefresh} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold shadow hover:bg-blue-700 flex items-center gap-2 text-base">
                                <span>🔄</span> Refresh
                            </button>
                            <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold shadow hover:bg-red-700 flex items-center gap-2 text-base">
                                <span>🚪</span> Logout
                            </button>
                        </div>
                        <div className="mt-2 text-xs text-white/60 text-center w-full">
                            Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}
                        </div>
                    </div>
                )}
            </div>

            {/* Map Container (full screen, absolutely positioned, like HuntersMapView) */}
            <div className="absolute inset-0 z-10">
                <div
                    ref={mapContainerRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ width: '100%', height: '100%', top: 0, left: 0 }}
                ></div>
                {/* Overlay for missing API key or error */}
                {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                        <span className="text-4xl mb-2">⚠️</span>
                        <span className="text-white font-bold text-lg">Google Maps API Key Missing</span>
                        <span className="text-white/70 mt-2">Please set <span className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span> in your environment.</span>
                    </div>
                )}
            </div>
        </div>
    );
}
