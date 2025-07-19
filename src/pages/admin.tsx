import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

// Google Maps will be available globally after loading

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

export default function AdminDashboard() {
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
    };

    const handleRefresh = () => {
        fetchAdminData();
    };

    // Initialize Google Maps
    const initializeMap = useCallback(async () => {
        if (!mapContainerRef.current) {
            console.log('❌ Map container not available');
            return;
        }

        try {
            const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!GOOGLE_MAPS_API_KEY) {
                console.log('❌ Google Maps API key not configured. Map will be disabled.');
                return;
            }

            console.log('🗺️ Loading Google Maps for admin dashboard...');
            const loader = new Loader({
                apiKey: GOOGLE_MAPS_API_KEY,
                version: 'weekly',
                libraries: ['places'],
            });

            await loader.load();
            console.log('✅ Google Maps loaded successfully');

            if (!window.google?.maps) {
                throw new Error('Google Maps failed to load properly');
            }

            // Create map with admin-friendly settings
            const map = new google.maps.Map(mapContainerRef.current, {
                center: { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
                zoom: 2, // World view for admin
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
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

    // Update map markers for participants
    const updateMapMarkers = useCallback(() => {
        console.log('🗺️ updateMapMarkers called');

        if (!mapRef.current) {
            console.log('❌ Map not ready, skipping marker update');
            return;
        }

        if (!window.google?.maps) {
            console.log('❌ Google Maps not loaded, skipping marker update');
            return;
        }

        if (!adminData?.rooms) {
            console.log('❌ No admin data available, skipping marker update');
            return;
        }

        console.log('🗺️ Clearing existing markers...');
        // Clear existing markers
        markersRef.current.forEach(marker => {
            marker.setMap(null);
        });
        markersRef.current.clear();

        let totalParticipantsWithPosition = 0;

        // Add markers for all participants with positions
        adminData.rooms.forEach(room => {
            console.log(`🏠 Processing room: ${room.name} with ${room.participants.length} participants`);

            room.participants.forEach(participant => {
                console.log(`👤 Processing participant: ${participant.identity}`, {
                    username: participant.username,
                    position: participant.position,
                    isPublishingMusic: participant.isPublishingMusic,
                    avatar: participant.avatar
                });

                // Validate position data (same as HuntersMapView)
                if (!participant.position ||
                    typeof participant.position.x !== 'number' ||
                    typeof participant.position.y !== 'number' ||
                    isNaN(participant.position.x) ||
                    isNaN(participant.position.y)) {
                    console.warn(`❌ Invalid position for participant ${participant.identity}:`, participant.position);
                    return;
                }

                totalParticipantsWithPosition++;

                // Ensure avatar icon URL always ends with .png (same logic as HuntersMapView)
                let avatarFile = participant.avatar;
                if (avatarFile && !avatarFile.endsWith('.png')) {
                    avatarFile = avatarFile + '.png';
                }

                const iconUrl = participant.isPublishingMusic ? '/boombox.png' : `/characters_001/${avatarFile}`;
                const markerSize = participant.isPublishingMusic ? 60 : 50; // Same sizes as HuntersMapView

                console.log(`📍 Creating marker for ${participant.identity} at (${participant.position.x}, ${participant.position.y})`);

                const marker = new google.maps.Marker({
                    position: { lat: participant.position.x, lng: participant.position.y },
                    map: mapRef.current,
                    icon: {
                        url: iconUrl,
                        scaledSize: new google.maps.Size(markerSize, markerSize),
                    },
                    title: `${participant.username || participant.identity} (${room.name})${participant.isPublishingMusic ? ' 🎵' : ''}`,
                    zIndex: participant.isPublishingMusic ? 999 : 500,
                });

                // Add info window on click
                const infoWindow = new google.maps.InfoWindow({
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

                marker.addListener('click', () => {
                    infoWindow.open(mapRef.current, marker);
                });

                markersRef.current.set(participant.identity, marker);
                console.log(`✅ Created marker for ${participant.identity}`);
            });
        });

        console.log(`🗺️ Created ${markersRef.current.size} markers for ${totalParticipantsWithPosition} participants with valid positions`);

        // Adjust map bounds to show all markers if any exist
        if (markersRef.current.size > 0 && window.google?.maps) {
            console.log('🗺️ Adjusting map bounds to show all markers');
            const bounds = new google.maps.LatLngBounds();
            markersRef.current.forEach(marker => {
                const position = marker.getPosition();
                if (position) {
                    bounds.extend(position);
                }
            });
            mapRef.current?.fitBounds(bounds);
        } else {
            console.log('🗺️ No markers to show, keeping default view');
        }

    }, [adminData]);

    // Initialize map when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            console.log('🔐 User authenticated, initializing map...');
            initializeMap();
        }
    }, [isAuthenticated, initializeMap]);

    // Update markers when data changes
    useEffect(() => {
        if (adminData && mapRef.current) {
            console.log('📊 Admin data updated, refreshing markers...');
            updateMapMarkers();
        }
    }, [adminData, updateMapMarkers]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 flex flex-col items-center">
                    <div className="flex items-center mb-6">
                        <img src="/logo.png" alt="Vibes Hunters Logo" className="w-12 h-12 mr-3 rounded-full border-2 border-white/40 shadow-lg" />
                        <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow">Admin Login</h1>
                    </div>
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
                            <span className="text-lg">🚀</span> Access Admin Dashboard
                        </button>
                    </form>
                    <div className="mt-8 text-white/80 text-center text-base">
                        <span className="font-semibold">Vibes Hunters</span> <span className="font-mono">Admin Panel</span>
                        <br />
                        <span className="text-white/60">Monitor rooms, participants, and music parties in real time.</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 overflow-hidden">
            {/* Admin Info Panel (glassmorphism overlay) */}
            <div className="absolute top-4 left-4 z-20 bg-white/10 text-white rounded-3xl backdrop-blur-lg shadow-2xl border border-white/20 p-8 min-w-[320px] max-w-[420px] flex flex-col gap-4">
                <div className="flex items-center mb-2">
                    <img src="/logo.png" alt="Logo" className="w-10 h-10 mr-3 rounded-full border-2 border-white/30 shadow" />
                    <span className="font-bold text-3xl tracking-tight drop-shadow">Admin Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mb-2">
                    <div className="bg-purple-700/40 rounded-xl p-2 flex flex-col items-center">
                        <span className="text-2xl">🏠</span>
                        <span className="font-semibold">Rooms</span>
                        <span className="text-xl font-bold">{adminData?.summary?.totalRooms ?? 0}</span>
                    </div>
                    <div className="bg-blue-700/40 rounded-xl p-2 flex flex-col items-center">
                        <span className="text-2xl">🧑‍🤝‍🧑</span>
                        <span className="font-semibold">Users</span>
                        <span className="text-xl font-bold">{adminData?.summary?.totalParticipants ?? 0}</span>
                    </div>
                    <div className="bg-pink-700/40 rounded-xl p-2 flex flex-col items-center">
                        <span className="text-2xl">🎶</span>
                        <span className="font-semibold">Music</span>
                        <span className="text-xl font-bold">{adminData?.summary?.totalMusicPublishers ?? 0}</span>
                    </div>
                </div>
                <div className="mb-2">
                    <span className="font-semibold text-lg">Active Rooms</span>
                    <div className="mt-2 flex flex-col gap-3">
                        {adminData?.rooms?.length === 0 && (
                            <div className="text-white/60 text-sm">No active rooms</div>
                        )}
                        {adminData?.rooms?.map(room => (
                            <div key={room.name} className="bg-white/10 rounded-xl p-3 shadow border border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">🏠</span>
                                    <span className="font-bold text-base">{room.name}</span>
                                    <span className="text-xs text-white/60">({room.numParticipants} participant{room.numParticipants !== 1 ? 's' : ''})</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {room.participants.map(p => (
                                        <div key={p.identity} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-500/30 via-blue-500/20 to-pink-500/30 shadow border border-white/10">
                                            {p.avatar ? (
                                                <img src={p.avatar} alt="avatar" className="w-7 h-7 rounded-full border-2 border-white/30 shadow" />
                                            ) : (
                                                <span className="text-lg">🧑</span>
                                            )}
                                            <span className="font-semibold text-sm">{p.username ?? p.identity}</span>
                                            {p.isPublishingMusic && <span className="ml-1 text-pink-400">🎶</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={handleRefresh} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 flex items-center gap-1">
                        <span>🔄</span> Refresh
                    </button>
                    <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold shadow hover:bg-red-700 flex items-center gap-1">
                        <span>🚪</span> Logout
                    </button>
                </div>
                <div className="mt-2 text-xs text-white/60">
                    Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}
                </div>
            </div>

            {/* Map Container (glassmorphism, always visible) */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-[80vw] h-[80vh] bg-white/10 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg flex items-center justify-center relative">
                    <div ref={mapContainerRef} className="w-full h-full rounded-3xl" />
                    {/* Overlay for missing API key or error */}
                    {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-3xl">
                            <span className="text-4xl mb-2">⚠️</span>
                            <span className="text-white font-bold text-lg">Google Maps API Key Missing</span>
                            <span className="text-white/70 mt-2">Please set <span className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span> in your environment.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}