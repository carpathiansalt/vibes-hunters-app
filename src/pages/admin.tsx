
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant } from 'livekit-client';

type ParticipantInfo = {
    identity: string;
    state: string;
    username?: string;
    avatar?: string;
    position?: { x: number; y: number };
    [key: string]: unknown;
};

export default function AdminDashboard() {
    const [token, setToken] = useState('');
    const [roomName, setRoomName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [participants, setParticipants] = useState<Map<string, ParticipantInfo>>(new Map());
    const [livekitRoom, setLivekitRoom] = useState<Room | null>(null);
    // Use any for mapRef and markersRef to match HuntersMapView and avoid type errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<Map<string, any>>(new Map());

    // Connect to LiveKit and listen for participants
    const connectToLiveKit = useCallback(async () => {
        if (!token || !roomName || livekitRoom) return;
        setLoading(true);
        setError('');
        try {
            const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || 'wss://your.livekit.server';
            const room = new Room({ adaptiveStream: true, dynacast: true });
            room.on(RoomEvent.Connected, () => {
                setLoading(false);
                setLivekitRoom(room);
                const newParticipants = new Map<string, ParticipantInfo>();
                room.remoteParticipants.forEach((participant: RemoteParticipant) => {
                    if (participant.metadata) {
                        try {
                            const metadata = JSON.parse(participant.metadata);
                            // Use explicit cast for state property
                            const state = (participant as RemoteParticipant & { state?: string }).state || 'connected';
                            newParticipants.set(participant.identity, {
                                ...metadata,
                                identity: participant.identity,
                                state,
                            });
                        } catch { }
                    }
                });
                setParticipants(newParticipants);
            });
            room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
                if (participant.metadata) {
                    try {
                        const metadata = JSON.parse(participant.metadata);
                        const state = (participant as RemoteParticipant & { state?: string }).state || 'connected';
                        setParticipants(prev => {
                            const updated = new Map(prev);
                            updated.set(participant.identity, {
                                ...metadata,
                                identity: participant.identity,
                                state,
                            });
                            return updated;
                        });
                    } catch { }
                }
            });
            room.on(RoomEvent.ParticipantMetadataChanged, (metadata: string | undefined, participant: RemoteParticipant | LocalParticipant) => {
                if (metadata && participant.identity) {
                    try {
                        const parsed = JSON.parse(metadata);
                        const state = (participant as RemoteParticipant & { state?: string }).state || 'connected';
                        setParticipants(prev => {
                            const updated = new Map(prev);
                            updated.set(participant.identity, {
                                ...parsed,
                                identity: participant.identity,
                                state,
                            });
                            return updated;
                        });
                    } catch { }
                }
            });
            room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
                setParticipants(prev => {
                    const updated = new Map(prev);
                    updated.delete(participant.identity);
                    return updated;
                });
            });
            await room.connect(wsUrl, token);
        } catch (err) {
            setError('Failed to connect to LiveKit: ' + (err instanceof Error ? err.message : 'Unknown error'));
            setLoading(false);
        }
    }, [token, roomName, livekitRoom]);

    // Prepare participant lists
    const allParticipants: ParticipantInfo[] = Array.from(participants.values());
    const participantsWithPosition: ParticipantInfo[] = allParticipants.filter(p => p.position && typeof p.position.x === 'number' && typeof p.position.y === 'number');

    // Initialize map only once (even if no participants)
    useEffect(() => {
        if (mapRef.current || typeof window === 'undefined') return;
        const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!GOOGLE_MAPS_API_KEY) return;
        const loader = new Loader({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly', libraries: ['places'] });
        loader.load().then(() => {
            const mapDiv = document.getElementById('admin-map');
            const gmaps = typeof window !== 'undefined' && window.google && window.google.maps ? window.google.maps : undefined;
            if (!mapDiv || typeof gmaps !== 'object' || gmaps === null || !('Map' in gmaps)) return;
            const MapConstructor = gmaps.Map;
            mapRef.current = new MapConstructor(mapDiv as HTMLElement, {
                center: { lat: 37.7749, lng: -122.4194 },
                zoom: 3
            });
        });
    }, []);

    // Update markers when participants with position change
    useEffect(() => {
        const gmaps = typeof window !== 'undefined' && window.google && window.google.maps ? window.google.maps : undefined;
        if (!mapRef.current || typeof gmaps !== 'object' || gmaps === null || !('Marker' in gmaps)) return;
        // Remove old markers
        markersRef.current.forEach(marker => {
            if (typeof marker === 'object' && marker !== null && 'setMap' in marker) {
                marker.setMap(null);
            }
        });
        markersRef.current.clear();
        // Add new markers
        participantsWithPosition.forEach((p) => {
            if (
                p.position &&
                typeof p.position.x === 'number' &&
                typeof p.position.y === 'number' &&
                mapRef.current &&
                typeof window !== 'undefined' &&
                window.google &&
                window.google.maps
            ) {
                const marker = new window.google.maps.Marker({
                    position: { lat: p.position.x, lng: p.position.y },
                    map: mapRef.current,
                    title: p.identity
                });
                if (marker) {
                    markersRef.current.set(p.identity, marker);
                }
            }
        });
    }, [participantsWithPosition]);

    // Helper to trigger connect only once
    function ConnectLiveKit({ connectToLiveKit }: { connectToLiveKit: () => void }) {
        useEffect(() => { connectToLiveKit(); }, [connectToLiveKit]);
        return null;
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            {!token || !roomName ? (
                <form onSubmit={e => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const tokenInput = form.elements.namedItem('token') as HTMLInputElement | null;
                    const roomInput = form.elements.namedItem('room') as HTMLInputElement | null;
                    setToken(tokenInput?.value || '');
                    setRoomName(roomInput?.value || '');
                }}>
                    <input type="text" name="room" placeholder="Room name" className="border p-2 mr-2" />
                    <input type="text" name="token" placeholder="Admin token" className="border p-2 mr-2" />
                    <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded">Connect</button>
                </form>
            ) : loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p className="text-red-600">{error}</p>
            ) : (
                <>
                    {/* Connect to LiveKit on first render with token/room */}
                    <ConnectLiveKit connectToLiveKit={connectToLiveKit} />
                    {/* Info box above the map */}
                    <div className="mb-4 p-4 bg-gray-100 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <span className="font-semibold">Total participants:</span> {allParticipants.length}
                            <span className="ml-6 font-semibold">Participants with position:</span> {participantsWithPosition.length}
                        </div>
                        {allParticipants.length === 0 && (
                            <span className="text-amber-600 font-medium">No users are currently online.</span>
                        )}
                        {allParticipants.length > 0 && participantsWithPosition.length === 0 && (
                            <span className="text-amber-600 font-medium">⚠️ No participants have valid position data.</span>
                        )}
                    </div>

                    {/* Map always visible */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">Live Map</h2>
                        <div id="admin-map" style={{ width: '100%', height: 400, borderRadius: 12, border: '1px solid #eee' }}></div>
                    </div>

                    {/* Participant details below map */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">Participants</h2>
                        {allParticipants.length === 0 ? (
                            <p className="text-amber-600">No active participants found</p>
                        ) : (
                            <ul className="space-y-1">
                                {allParticipants.map((p) => (
                                    <li key={p.identity} className="border-b pb-1">
                                        <strong>{p.identity}</strong> ({p.state})<br />
                                        <span className="text-xs">
                                            {(p.position && typeof p.position.x === 'number' && typeof p.position.y === 'number')
                                                ? <span className="text-green-600">Has position: ({p.position.x}, {p.position.y})</span>
                                                : <span className="text-red-600">No position data</span>
                                            }
                                        </span><br />
                                        <span className="text-xs text-gray-500">
                                            {p.username ? <span>Username: {p.username}</span> : <span>No username</span>}
                                            {p.avatar ? <span>, Avatar: {p.avatar}</span> : null}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
