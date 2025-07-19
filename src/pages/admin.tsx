import { useState, useEffect, FormEvent, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

// Google Maps API key is read inside useEffect only

export default function AdminDashboard() {
    const [password, setPassword] = useState('');
    const [rooms, setRooms] = useState<Array<{ name: string; participants: Array<{ identity: string; state: string; metadata?: string; position?: { x: number; y: number } }> }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // Use type assertions for window.google and runtime checks
    const mapRef = useRef<unknown>(null);
    const markersRef = useRef<unknown[]>([]);

    useEffect(() => {
        if (!password) return;
        setLoading(true);
        fetch('/api/admin/livekit', {
            headers: { 'x-admin-password': password }
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) setError(data.error);
                else setRooms(data.rooms || []);
                setLoading(false);
            });
    }, [password]);

    // Filter out the default test room if real rooms exist
    const realRooms = rooms.filter(room => room.name !== "TestRoom");
    const displayRooms = realRooms.length > 0 ? realRooms : rooms;
    const allParticipants = displayRooms.flatMap(room => room.participants);
    const participantsWithPosition = displayRooms.flatMap(room =>
        room.participants
            .map((p) => {
                let position = null;
                let parsedMetadata = null;
                if (p.metadata) {
                    try {
                        parsedMetadata = JSON.parse(p.metadata);
                        position = parsedMetadata?.position;
                    } catch {
                        console.warn(`Failed to parse metadata for ${p.identity}:`, p.metadata);
                    }
                }
                return {
                    ...p,
                    parsedMetadata,
                    position
                };
            })
            .filter(p => p.position && typeof p.position.x === 'number' && typeof p.position.y === 'number')
    );

    // Use Google Maps JS API Loader for robust loading

    // Initialize map only once (even if no participants)
    useEffect(() => {
        if (mapRef.current || typeof window === 'undefined') return;
        const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!GOOGLE_MAPS_API_KEY) return;
        const loader = new Loader({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly', libraries: ['places'] });
        loader.load().then(() => {
            const mapDiv = document.getElementById('admin-map');
            const gmaps = (window as { google?: { maps?: unknown } }).google?.maps;
            if (!mapDiv || typeof gmaps !== 'object' || gmaps === null || !('Map' in gmaps)) return;
            const MapConstructor = (gmaps as { Map: new (el: HTMLElement, opts: object) => unknown }).Map;
            mapRef.current = new MapConstructor(mapDiv as HTMLElement, {
                center: { lat: 37.7749, lng: -122.4194 },
                zoom: 3
            });
        });
    }, []);

    // Update markers when participants with position change
    useEffect(() => {
        const gmaps = (window as { google?: { maps?: unknown } }).google?.maps;
        if (!mapRef.current || typeof gmaps !== 'object' || gmaps === null || !('Marker' in gmaps)) return;
        // Remove old markers
        (markersRef.current as Array<{ setMap: (map: null) => void }>).forEach(marker => marker.setMap(null));
        markersRef.current = [];
        // Add new markers
        const MarkerConstructor = (gmaps as { Marker: new (opts: object) => unknown }).Marker;
        participantsWithPosition.forEach((p) => {
            const marker = new MarkerConstructor({
                position: { lat: p.position.x, lng: p.position.y },
                map: mapRef.current,
                title: p.identity
            });
            markersRef.current.push(marker);
        });
    }, [participantsWithPosition]);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            {!password ? (
                <form onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem('password') as HTMLInputElement | null;
                    setPassword(input?.value || '');
                }}>
                    <input type="password" name="password" placeholder="Admin password" className="border p-2 mr-2" />
                    <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded">Login</button>
                </form>
            ) : loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p className="text-red-600">{error}</p>
            ) : (
                <>
                    {/* Info box above the map */}
                    <div className="mb-4 p-4 bg-gray-100 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <span className="font-semibold">Active rooms:</span> {displayRooms.length}
                            <span className="ml-6 font-semibold">Total participants:</span> {allParticipants.length}
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

                    {/* Room and participant details below map */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">Rooms & Participants</h2>
                        {displayRooms.length === 0 ? (
                            <p className="text-amber-600">No active rooms found</p>
                        ) : (
                            displayRooms.map(room => (
                                <div key={room.name} className="mb-4 p-3 border rounded-lg">
                                    <h3 className="font-bold">{room.name}</h3>
                                    {room.participants.length === 0 ? (
                                        <p className="text-gray-500 italic">No participants in this room</p>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-600 mb-2">Total participants: {room.participants.length}</p>
                                            <ul className="space-y-1">
                                                {room.participants.map((p) => (
                                                    <li key={p.identity} className="border-b pb-1">
                                                        <strong>{p.identity}</strong> ({p.state})<br />
                                                        <span className="text-xs">
                                                            {p.position
                                                                ? <span className="text-green-600">Has position: ({p.position.x}, {p.position.y})</span>
                                                                : <span className="text-red-600">No position data</span>
                                                            }
                                                        </span><br />
                                                        <span className="text-xs text-gray-500">
                                                            {p.metadata
                                                                ? <span>Has metadata: {p.metadata.substring(0, 50)}{p.metadata.length > 50 ? '...' : ''}</span>
                                                                : <span>No metadata</span>
                                                            }
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
