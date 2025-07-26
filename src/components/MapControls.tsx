'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Vector2, UserPosition } from '@/types';

interface MapControlsProps {
    room: string;
    username: string;
    participants: Map<string, UserPosition>;
    myPosition: Vector2;
    isConnected: boolean;
    isConnecting: boolean;
    locationPermission: 'granted' | 'denied' | 'prompt';
    isTrackingLocation: boolean;
    gpsAccuracy: number | null;
    showVoiceRange: boolean;
    setShowVoiceRange: (show: boolean) => void;
    onGenreChange: (genre: string) => void;
    onCenterMap: () => void;
    onShowAllParticipants: () => void;
    onRequestLocation: () => void;
    onDebug?: () => void;
}

export function MapControls({
    room,
    username,
    participants,
    myPosition,
    isConnected,
    isConnecting,
    locationPermission,
    isTrackingLocation,
    gpsAccuracy,
    showVoiceRange,
    setShowVoiceRange,
    onGenreChange,
    onCenterMap,
    onShowAllParticipants,
    onRequestLocation,
    onDebug
}: MapControlsProps) {
    const [roomInfoExpanded, setRoomInfoExpanded] = useState(false);

    // Genres data
    const genres = useMemo(() => [
        { name: 'Ambient', image: '/music_gendre/ambient.png', color: 'from-emerald-500 to-teal-600' },
        { name: 'Blues', image: '/music_gendre/blues.png', color: 'from-blue-600 to-indigo-700' },
        { name: 'Classical', image: '/music_gendre/classical.png', color: 'from-amber-500 to-orange-600' },
        { name: 'Disco', image: '/music_gendre/disco.png', color: 'from-pink-500 to-purple-600' },
        { name: 'Folk', image: '/music_gendre/folk.png', color: 'from-green-500 to-emerald-600' },
        { name: 'Funk', image: '/music_gendre/funk.png', color: 'from-purple-500 to-pink-600' },
        { name: 'Hip-hop', image: '/music_gendre/hip-hop.png', color: 'from-red-500 to-pink-600' },
        { name: 'Jazz', image: '/music_gendre/jazz.png', color: 'from-yellow-500 to-orange-600' },
        { name: 'Pop', image: '/music_gendre/pop.png', color: 'from-purple-500 to-pink-600' },
        { name: 'Punk', image: '/music_gendre/punk.png', color: 'from-red-600 to-orange-700' },
        { name: 'Reggae', image: '/music_gendre/raggae.png', color: 'from-green-600 to-yellow-600' },
        { name: 'Rock', image: '/music_gendre/rock.png', color: 'from-gray-600 to-black' },
        { name: 'Soul', image: '/music_gendre/soul.png', color: 'from-blue-500 to-purple-600' },
        { name: 'Techno', image: '/music_gendre/techno.png', color: 'from-cyan-500 to-blue-600' },
    ], []);

    const [genreIndex] = useState(() => {
        const idx = genres.findIndex(g => g.name === room);
        return idx >= 0 ? idx : genres.findIndex(g => g.name === 'pop');
    });
    const [genre, setGenre] = useState(genres[genreIndex]?.name || 'pop');

    // Enhanced GPS accuracy indicator
    const getGpsAccuracyColor = useCallback((accuracy: number) => {
        if (accuracy <= 10) return 'text-green-400';
        if (accuracy <= 50) return 'text-yellow-400';
        return 'text-red-400';
    }, []);

    // Enhanced participant list with better UX
    const renderParticipantList = useCallback(() => {
        const participantArray = Array.from(participants.values());
        const sortedParticipants = participantArray.sort((a, b) => {
            // Sort by distance to user
            const distanceA = Math.sqrt(
                Math.pow((a.position.x - myPosition.x) * 111000, 2) +
                Math.pow((a.position.y - myPosition.y) * 111000, 2)
            );
            const distanceB = Math.sqrt(
                Math.pow((b.position.x - myPosition.x) * 111000, 2) +
                Math.pow((b.position.y - myPosition.y) * 111000, 2)
            );
            return distanceA - distanceB;
        });

        return sortedParticipants.slice(0, 5).map((participant) => {
            const distance = Math.round(Math.sqrt(
                Math.pow((participant.position.x - myPosition.x) * 111000, 2) +
                Math.pow((participant.position.y - myPosition.y) * 111000, 2)
            ));
            
            return (
                <div
                    key={participant.userId}
                    className="text-gray-400 truncate flex items-center justify-between hover:text-white hover:bg-gray-700 px-2 py-1 rounded cursor-pointer transition-colors"
                    onClick={() => {
                        onCenterMap();
                        console.log('Centered map on participant:', participant.username);
                    }}
                    title={`Click to center map on ${participant.username} (${distance}m away)`}
                >
                    <span className="flex items-center gap-1">
                        {participant.isPublishingMusic ? '🎵' : '👤'} 
                        <span className="truncate">{participant.username}</span>
                    </span>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>{distance}m</span>
                        {participant.isPublishingMusic && (
                            <span className="text-pink-400">●</span>
                        )}
                    </div>
                </div>
            );
        });
    }, [participants, myPosition, onCenterMap]);

    // Enhanced genre change handler
    const handleGenreChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGenre = e.target.value;
        if (newGenre === genre) return;

        setGenre(newGenre);
        onGenreChange(newGenre);
    }, [genre, onGenreChange]);

    return (
        <>
            {/* Genre Selector */}
            <div className="fixed top-4 left-0 z-30 flex flex-row items-start justify-left px-4 pointer-events-none">
                <div className="w-full max-w-sm pointer-events-auto flex flex-col items-center">
                    <div className="bg-white/90 rounded-3xl shadow-xl border border-purple-200 px-0 py-0 flex flex-col items-center gap-2" style={{ minWidth: '200px' }}>
                        <div className="relative w-full flex items-center justify-center">
                            <select
                                value={genre}
                                onChange={handleGenreChange}
                                className="w-full p-3 rounded-2xl border-2 border-purple-400 focus:border-purple-500 focus:outline-none transition-colors text-lg text-gray-900 bg-white placeholder-gray-400 appearance-none pr-16 text-center font-semibold"
                                style={{ paddingRight: '64px', maxWidth: '100%' }}
                            >
                                {genres.map(g => (
                                    <option key={g.name} value={g.name}>{g.name}</option>
                                ))}
                            </select>
                            {/* Genre image visually prominent, right aligned */}
                            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                                {(() => {
                                    const selected = genres.find(g => g.name === genre);
                                    return selected ? (
                                        <Image src={selected.image} alt={selected.name} width={48} height={48} className="rounded-xl object-contain shadow-lg border-2 border-purple-300 bg-white" />
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="absolute bottom-4 left-4 z-30 bg-black/80 text-white rounded-lg backdrop-blur-sm shadow-lg w-auto" style={{ minWidth: 0, maxWidth: '100%', width: 'auto' }}>
                <button
                    onClick={() => setRoomInfoExpanded(!roomInfoExpanded)}
                    className="w-full p-3 text-left hover:bg-white/10 transition-colors rounded-lg"
                >
                    <div className="text-sm font-bold text-green-400 flex items-center justify-between">
                        <span>🎵 Info</span>
                        <span className="text-xs">{roomInfoExpanded ? '▼' : '▶'}</span>
                    </div>
                </button>

                {roomInfoExpanded && (
                    <div className="p-3 pt-0 space-y-1 max-w-xs">
                        <div className="text-sm">
                            <div>Room: <span className="text-blue-300">{room}</span></div>
                            <div>Hunter: <span className="text-yellow-300">{username}</span></div>
                            <div>Status: {
                                isConnecting ? '🟡 Connecting...' :
                                    isConnected ? '🟢 Connected' :
                                        '🔴 Disconnected'
                            }</div>
                            <div>GPS: {
                                locationPermission === 'granted' ?
                                    isTrackingLocation ? '🟢 Tracking' : '🟡 Available' :
                                    locationPermission === 'denied' ? '🔴 Denied' :
                                        '🟡 Requesting...'
                            }</div>
                            {gpsAccuracy && (
                                <div>Accuracy: <span className={`${getGpsAccuracyColor(gpsAccuracy)}`}>{Math.round(gpsAccuracy)}m</span></div>
                            )}
                            <div className="border-t border-gray-600 pt-1 mt-2">
                                <div>Hunters Online: <span className="text-purple-300">{participants.size}</span></div>
                                {participants.size > 0 && (
                                    <div className="mt-1 text-xs">
                                        <div className="text-gray-300">Active Hunters:</div>
                                        {renderParticipantList()}
                                        {participants.size > 5 && (
                                            <div className="text-gray-500">...and {participants.size - 5} more</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={onCenterMap}
                                className="mt-2 bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full"
                            >
                                📍 Center on Me
                            </button>
                            <button
                                onClick={onShowAllParticipants}
                                className="mt-1 bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full"
                            >
                                🌍 Show All Hunters
                            </button>
                            {process.env.NODE_ENV === 'development' && onDebug && (
                                <button
                                    onClick={onDebug}
                                    className="mt-1 bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full"
                                >
                                    🔧 Debug & Refresh
                                </button>
                            )}
                            <button
                                onClick={() => setShowVoiceRange(!showVoiceRange)}
                                className="mt-2 bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full flex items-center justify-between"
                            >
                                <span>🎤 Voice Range</span>
                                <span className="text-xs">{showVoiceRange ? '✓' : '○'}</span>
                            </button>

                            {/* Legal Links */}
                            <div className="mt-4 pt-2 border-t border-gray-600">
                                <div className="text-xs text-gray-400 space-y-1">
                                    <div className="flex flex-wrap gap-2">
                                        <a href="/legal/about" className="hover:text-white transition-colors underline">About</a>
                                        <a href="/legal/faq" className="hover:text-white transition-colors underline">FAQ</a>
                                        <a href="/legal/privacy" className="hover:text-white transition-colors underline">Privacy</a>
                                    </div>
                                    <div>
                                        <a href="mailto:info@vibes-hunters.com" className="text-blue-300 hover:text-white transition-colors text-xs">
                                            info@vibes-hunters.com
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Location Permission Warning */}
            {locationPermission === 'denied' && (
                <div className="absolute bottom-4 right-4 z-30 bg-orange-600 text-white p-3 rounded-lg backdrop-blur-sm">
                    <div className="text-sm">
                        <div className="font-bold mb-1">📍 Enable GPS</div>
                        <div className="mb-2">For the best experience, enable location access in your browser.</div>
                        <button
                            onClick={onRequestLocation}
                            className="bg-orange-500 hover:bg-orange-400 px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                            Request Location
                        </button>
                    </div>
                </div>
            )}
        </>
    );
} 