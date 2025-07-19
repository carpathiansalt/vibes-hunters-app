import React, { useState, useEffect } from 'react';

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
}

export default function AdminDashboard() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [adminData, setAdminData] = useState<AdminData | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Check if already authenticated on mount
    useEffect(() => {
        const savedAuth = sessionStorage.getItem('admin-authenticated');
        if (savedAuth === 'true') {
            setIsAuthenticated(true);
            fetchAdminData();
        }
    }, []);

    // Auto-refresh data every 10 seconds when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(() => {
            fetchAdminData();
        }, 10000);

        return () => clearInterval(interval);
    }, [isAuthenticated]);

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

    const fetchAdminData = async () => {
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

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Admin Dashboard</h1>
                        <p className="text-gray-600">Enter admin password to access LiveKit room management</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Admin Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                placeholder="Enter admin password"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !password.trim()}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? 'Authenticating...' : 'Access Admin Dashboard'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>🎵 Vibes Hunters Admin Panel</p>
                        <p>Manage LiveKit rooms and participants</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">🎵 Vibes Hunters Admin</h1>
                        <p className="text-sm text-gray-500">LiveKit Room & Participant Management</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        {lastUpdated && (
                            <div className="text-sm text-gray-500">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </div>
                        )}
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            🔄 Refresh
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Rooms</p>
                                <p className="text-3xl font-bold text-blue-600">
                                    {adminData?.rooms?.length || 0}
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🏠</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {adminData?.rooms?.reduce((total, room) => total + room.participants.length, 0) || 0}
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Music Publishers</p>
                                <p className="text-3xl font-bold text-purple-600">
                                    {adminData?.rooms?.reduce((total, room) => 
                                        total + room.participants.filter(p => p.isPublishingMusic).length, 0) || 0}
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🎵</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rooms Section */}
                {(!adminData?.rooms || adminData.rooms.length === 0) ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
                        <div className="text-6xl mb-4">🏜️</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Rooms</h3>
                        <p className="text-gray-600">
                            No rooms are currently active. Rooms will appear here when users join the application.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-800">Active Rooms ({adminData.rooms.length})</h2>
                        
                        {adminData.rooms.map((room) => (
                            <div key={room.name} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Room Header */}
                                <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                                🏠 {room.name}
                                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                    {room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}
                                                </span>
                                            </h3>
                                            {room.maxParticipants && (
                                                <p className="text-sm text-gray-600">
                                                    Max participants: {room.maxParticipants}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-sm text-gray-500">
                                                {room.participants.filter(p => p.isPublishingMusic).length} music publisher{room.participants.filter(p => p.isPublishingMusic).length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Participants */}
                                {room.participants.length === 0 ? (
                                    <div className="px-6 py-8 text-center text-gray-500">
                                        <span className="text-2xl mb-2 block">👤</span>
                                        No participants in this room
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        <div className="grid gap-4">
                                            {room.participants.map((participant) => (
                                                <div
                                                    key={participant.identity}
                                                    className={`p-4 rounded-lg border-2 transition-colors ${
                                                        participant.isPublishingMusic
                                                            ? 'border-purple-200 bg-purple-50'
                                                            : 'border-gray-200 bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-3 mb-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-lg">
                                                                        {participant.isPublishingMusic ? '🎵' : '👤'}
                                                                    </span>
                                                                    <span className="font-semibold text-gray-800">
                                                                        {participant.username || participant.identity}
                                                                    </span>
                                                                    {participant.username && participant.username !== participant.identity && (
                                                                        <span className="text-sm text-gray-500">({participant.identity})</span>
                                                                    )}
                                                                </div>
                                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                                    participant.state === 'active' 
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                    {participant.state}
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    {participant.avatar && (
                                                                        <p className="text-gray-600">
                                                                            <span className="font-medium">Avatar:</span> {participant.avatar}
                                                                        </p>
                                                                    )}
                                                                    {participant.position ? (
                                                                        <p className="text-green-600">
                                                                            <span className="font-medium">Position:</span> ({participant.position.x.toFixed(4)}, {participant.position.y.toFixed(4)})
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-red-600">
                                                                            <span className="font-medium">Position:</span> Not available
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div>
                                                                    {participant.isPublishingMusic && (
                                                                        <div className="space-y-1">
                                                                            {participant.musicTitle && (
                                                                                <p className="text-purple-600">
                                                                                    <span className="font-medium">Music:</span> {participant.musicTitle}
                                                                                </p>
                                                                            )}
                                                                            {participant.partyTitle && (
                                                                                <p className="text-purple-600">
                                                                                    <span className="font-medium">Party:</span> {participant.partyTitle}
                                                                                </p>
                                                                            )}
                                                                            {participant.partyDescription && (
                                                                                <p className="text-sm text-gray-600">
                                                                                    {participant.partyDescription}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {participant.tracks && participant.tracks.length > 0 && (
                                                                <div className="mt-3">
                                                                    <p className="text-sm font-medium text-gray-700 mb-1">Active Tracks:</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {participant.tracks.map((track) => (
                                                                            <span
                                                                                key={track.sid}
                                                                                className={`px-2 py-1 text-xs rounded ${
                                                                                    track.type === 'audio' 
                                                                                        ? 'bg-blue-100 text-blue-800'
                                                                                        : 'bg-gray-100 text-gray-800'
                                                                                } ${track.muted ? 'opacity-50' : ''}`}
                                                                            >
                                                                                {track.type} {track.muted && '(muted)'}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}