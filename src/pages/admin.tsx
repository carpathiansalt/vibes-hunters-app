import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

// --- Interfaces (keep these as you had) ---
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
        // eslint-disable-next-line
    }, []);

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
                setLoading(false);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to authenticate');
                setLoading(false);
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
        if (!mapContainerRef.current) return;
        try {
            const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!GOOGLE_MAPS_API_KEY) return;
            const loader = new Loader({
                apiKey: GOOGLE_MAPS_API_KEY,
                version: 'weekly',
                libraries: ['places'],
            });
            await loader.load();
            if (!window.google?.maps) throw new Error('Google Maps failed to load');
            const map = new google.maps.Map(mapContainerRef.current, {
                center: { lat: 37.7749, lng: -122.4194 },
                zoom: 2,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
            });
            mapRef.current = map;
        } catch (err) {
            console.error('Error loading Google Maps for admin:', err);
        }
    }, []);

    // Update map markers for participants
    const updateMapMarkers = useCallback(() => {
        if (!mapRef.current || !window.google?.maps || !adminData?.rooms) return;
        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current.clear();

        adminData.rooms.forEach(room => {
            room.participants.forEach(participant => {
                if (!participant.position ||
                    typeof participant.position.x !== 'number' ||
                    typeof participant.position.y !== 'number' ||
                    isNaN(participant.position.x) ||
                    isNaN(participant.position.y)) {
                    return;
                }

                let avatarFile = participant.avatar;
                if (avatarFile && !avatarFile.endsWith('.png')) {
                    avatarFile = avatarFile + '.png';
                }
                const iconUrl = participant.isPublishingMusic ? '/boombox.png' : `/characters_001/${avatarFile}`;
                const markerSize = participant.isPublishingMusic ? 60 : 50;
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
            });
        });
        // Adjust map bounds to show all markers if any exist
        if (markersRef.current.size > 0 && window.google?.maps) {
            const bounds = new google.maps.LatLngBounds();
            markersRef.current.forEach(marker => {
                const position = marker.getPosition();
                if (position) {
                    bounds.extend(position);
                }
            });
            mapRef.current?.fitBounds(bounds);
        }
    }, [adminData]);

    useEffect(() => {
        if (isAuthenticated) {
            initializeMap();
        }
    }, [isAuthenticated, initializeMap]);

    useEffect(() => {
        if (adminData && mapRef.current) {
            updateMapMarkers();
        }
    }, [adminData, updateMapMarkers]);

    // LOGIN VIEW
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#3B1F8A] via-[#22287C] to-[#FF4586] px-2">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 flex flex-col items-center">
                    <img src="/logo.png" alt="Vibes Hunters Logo" className="w-16 h-16 mb-6 drop-shadow-2xl" />
                    <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">Admin Login</h1>
                    <div className="mb-8 text-lg text-white/80 text-center">
                        Vibes Hunters <span className="font-semibold">Admin Panel</span><br />
                        <span className="text-white/60 text-base">Monitor rooms, participants, and music parties in real time.</span>
                    </div>
                    <form className="w-full flex flex-col gap-5" onSubmit={handleLogin}>
                        <div>
                            <label className="text-white/90 font-semibold text-lg flex gap-2 items-center">
                                <span className="text-2xl">🔑</span> Admin Password
                            </label>
                            <input
                                type="password"
                                className="w-full mt-2 px-4 py-3 rounded-xl bg-white/20 text-white text-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-400 placeholder-white/60"
                                placeholder="Enter admin password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-red-300 text-base">
                                <span className="text-xl">⚠️</span> {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#834dff] via-[#377dff] to-[#ff4586] text-white text-lg font-bold shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                            disabled={loading}
                        >
                            <span className="text-2xl">🚀</span> Access Admin Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // DASHBOARD VIEW
    return (
        <div className="relative w-full min-h-screen bg-gradient-to-br from-[#3B1F8A] via-[#22287C] to-[#FF4586] overflow-hidden">
            {/* Main glass dashboard panel */}
            <div className="absolute top-0 left-0 right-0 flex flex-col md:flex-row gap-8 items-start z-20 p-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 min-w-[340px] max-w-md w-full flex flex-col gap-6">
                    <div className="flex items-center gap-3 mb-4">
                        <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-2xl shadow border-2 border-white/30" />
                        <div>
                            <span className="block font-extrabold text-3xl text-white tracking-tight drop-shadow">Admin</span>
                            <span className="block font-bold text-lg text-white/60">Vibes Hunters</span>
                        </div>
                    </div>
                    {/* Dashboard Stat Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-[#834dff]/40 text-center py-3">
                            <span className="block text-3xl">🏠</span>
                            <span className="block text-xs text-white/80">Rooms</span>
                            <span className="block text-2xl font-bold">{adminData?.summary?.totalRooms ?? 0}</span>
                        </div>
                        <div className="rounded-xl bg-[#377dff]/40 text-center py-3">
                            <span className="block text-3xl">🧑‍🤝‍🧑</span>
                            <span className="block text-xs text-white/80">Users</span>
                            <span className="block text-2xl font-bold">{adminData?.summary?.totalParticipants ?? 0}</span>
                        </div>
                        <div className="rounded-xl bg-[#ff4586]/40 text-center py-3">
                            <span className="block text-3xl">🎶</span>
                            <span className="block text-xs text-white/80">Music</span>
                            <span className="block text-2xl font-bold">{adminData?.summary?.totalMusicPublishers ?? 0}</span>
                        </div>
                    </div>
                    {/* Room List */}
                    <div>
                        <span className="font-bold text-lg text-white">Active Rooms</span>
                        <div className="mt-2 flex flex-col gap-4">
                            {adminData?.rooms?.length === 0 && (
                                <div className="text-white/60 text-sm">No active rooms</div>
                            )}
                            {adminData?.rooms?.map(room => (
                                <div key={room.name} className="bg-white/10 rounded-xl p-4 shadow border border-white/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">🏠</span>
                                        <span className="font-bold text-lg">{room.name}</span>
                                        <span className="text-xs text-white/60">
                                            ({room.numParticipants} participant{room.numParticipants !== 1 ? 's' : ''})
                                        </span>
                                    </div>
                                    {/* Participants */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {room.participants.map(p => (
                                            <div key={p.identity} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r from-[#834dff]/30 via-[#377dff]/20 to-[#ff4586]/20 shadow border border-white/10">
                                                {p.avatar ? (
                                                    <img src={p.avatar} alt="avatar" className="w-7 h-7 rounded-full border-2 border-white/30 shadow" />
                                                ) : (
                                                    <span className="text-lg">🧑</span>
                                                )}
                                                <span className="font-semibold text-sm text-white/90">{p.username ?? p.identity}</span>
                                                {p.isPublishingMusic && <span className="ml-1 text-[#ff4586]">🎶</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Controls */}
                    <div className="flex gap-2 mt-2">
                        <button onClick={handleRefresh}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#377dff] to-[#834dff] text-white font-semibold shadow hover:scale-105 transition-transform flex items-center gap-1"
                        >
                            <span>🔄</span> Refresh
                        </button>
                        <button onClick={handleLogout}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff4586] to-[#834dff] text-white font-semibold shadow hover:scale-105 transition-transform flex items-center gap-1"
                        >
                            <span>🚪</span> Logout
                        </button>
                    </div>
                    <div className="mt-2 text-xs text-white/60">
                        Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}
                    </div>
                </div>
            </div>
            {/* Map Glass Panel */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-[80vw] h-[80vh] bg-white/10 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg flex items-center justify-center relative">
                    <div ref={mapContainerRef} className="w-full h-full rounded-3xl" />
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
