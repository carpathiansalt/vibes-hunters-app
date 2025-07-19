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
    const [adminInfoExpanded, setAdminInfoExpanded] = useState(true);

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
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">🔐</div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
                        <p className="text-gray-600">LiveKit Room & Participant Management</p>
                        <div className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border border-purple-200">
                            <p className="text-sm text-gray-700 font-medium">🎵 Vibes Hunters Control Panel</p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                🔑 Admin Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white/90"
                                placeholder="Enter admin password"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center">
                                    <span className="text-red-500 text-lg mr-2">⚠️</span>
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !password.trim()}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Authenticating...
                                </span>
                            ) : (
                                '🚀 Access Admin Dashboard'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
                        <div className="flex items-center justify-center space-x-4 text-xs">
                            <span className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                Real-time Monitoring
                            </span>
                            <span className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                LiveKit Integration
                            </span>
                        </div>
                        <p>Monitor active rooms, participants, and music parties</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
            {/* Admin Info Panel (glassmorphism overlay) */}
            <div className="absolute top-4 left-4 z-20 bg-black/80 text-white rounded-2xl backdrop-blur-md shadow-2xl border border-white/10">
                <button
                    onClick={() => setAdminInfoExpanded(!adminInfoExpanded)}
                    className="w-full p-3 text-left hover:bg-white/10 transition-colors rounded-lg"
                >
                    <div className="text-sm font-bold text-green-400 flex items-center justify-between">
                        <span>🔐 Admin Dashboard</span>
                        <span className="text-xs">{adminInfoExpanded ? '▼' : '▶'}</span>
                    </div>
                </button>

                {adminInfoExpanded && (
                    <div className="p-3 pt-0 space-y-2 max-w-sm">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="bg-blue-600/20 p-2 rounded text-center">
                                <div className="text-lg font-bold text-blue-300">
                                    {adminData?.summary?.totalRooms || adminData?.rooms?.length || 0}
                                </div>
                                <div className="text-xs text-blue-200">Rooms</div>
                            </div>
                            <div className="bg-green-600/20 p-2 rounded text-center">
                                <div className="text-lg font-bold text-green-300">
                                    {adminData?.summary?.totalParticipants ||
                                        adminData?.rooms?.reduce((total, room) => total + room.participants.length, 0) || 0}
                                </div>
                                <div className="text-xs text-green-200">Users</div>
                            </div>
                            <div className="bg-purple-600/20 p-2 rounded text-center">
                                <div className="text-lg font-bold text-purple-300">
                                    {adminData?.summary?.totalMusicPublishers ||
                                        adminData?.rooms?.reduce((total, room) =>
                                            total + room.participants.filter(p => p.isPublishingMusic).length, 0) || 0}
                                </div>
                                <div className="text-xs text-purple-200">Music</div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-600/20 p-2 rounded border border-red-500/30">
                                <div className="text-xs text-red-300">⚠️ {error}</div>
                            </div>
                        )}

                        {/* Room List */}
                        <div className="text-sm">
                            <div className="font-medium text-gray-300 mb-2">Active Rooms</div>
                            {(!adminData?.rooms || adminData.rooms.length === 0) ? (
                                <div className="text-amber-300 text-xs">No active rooms</div>
                            ) : (
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {adminData.rooms.map((room) => (
                                        <div key={room.name} className="bg-gray-700/50 p-2 rounded">
                                            <div className="font-medium text-blue-300">🏠 {room.name}</div>
                                            <div className="text-xs text-gray-400">
                                                {room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}
                                                {room.participants.filter(p => p.isPublishingMusic).length > 0 && (
                                                    <span className="ml-2 text-purple-300">
                                                        🎵 {room.participants.filter(p => p.isPublishingMusic).length} music
                                                    </span>
                                                )}
                                            </div>
                                            {room.participants.length > 0 && (
                                                <div className="mt-1 space-y-1">
                                                    {room.participants.slice(0, 3).map((participant) => (
                                                        <div key={participant.identity} className="text-xs text-gray-300 flex items-center">
                                                            <span className="mr-1">
                                                                {participant.isPublishingMusic ? '🎵' : '👤'}
                                                            </span>
                                                            <span className="truncate">
                                                                {participant.username || participant.identity}
                                                            </span>
                                                            {participant.position && (
                                                                <span className="ml-1 w-2 h-2 bg-green-500 rounded-full"></span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {room.participants.length > 3 && (
                                                        <div className="text-xs text-gray-500">
                                                            +{room.participants.length - 3} more
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="pt-2 border-t border-gray-600 space-y-2">
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleRefresh}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs font-medium transition-colors"
                                >
                                    🔄 Refresh
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs font-medium transition-colors"
                                >
                                    🚪 Logout
                                </button>
                            </div>
                            {lastUpdated && (
                                <div className="text-xs text-gray-500 text-center">
                                    Updated: {lastUpdated.toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Map Container (glassmorphism, always visible) */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-[80vw] h-[80vh] bg-white/10 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md overflow-hidden">
                    <div ref={mapContainerRef} className="w-full h-full" />
                    {/* Fallback content when Google Maps is not available */}
                    {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
                            <div className="text-center text-white p-8">
                                <div className="text-4xl mb-4">🗺️</div>
                                <h3 className="text-xl font-semibold mb-2">Map View Disabled</h3>
                                <p className="text-gray-300 text-sm">
                                    Google Maps API key not configured.<br />
                                    Participant data is still available in the admin panel.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}