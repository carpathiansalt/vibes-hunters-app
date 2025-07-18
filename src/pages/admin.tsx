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

    // Extract all participants with position metadata
    const participants = rooms.flatMap(room =>
        room.participants
            .map((p) => ({
                ...p,
                position: p.metadata ? (() => { try { return JSON.parse(p.metadata).position; } catch { return null; } })() : null
            }))
            .filter((p) => p.position)
    );

    // Use Google Maps JS API Loader for robust loading

    // Initialize map only once
    useEffect(() => {
        if (mapRef.current || participants.length === 0 || typeof window === 'undefined') return;
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
    }, [participants.length]);

    // Update markers when participants change
    useEffect(() => {
        const gmaps = (window as { google?: { maps?: unknown } }).google?.maps;
        if (!mapRef.current || typeof gmaps !== 'object' || gmaps === null || !('Marker' in gmaps)) return;
        // Remove old markers
        (markersRef.current as Array<{ setMap: (map: null) => void }>).forEach(marker => marker.setMap(null));
        markersRef.current = [];
        // Add new markers
        const MarkerConstructor = (gmaps as { Marker: new (opts: object) => unknown }).Marker;
        participants.forEach((p) => {
            const marker = new MarkerConstructor({
                position: { lat: p.position.x, lng: p.position.y },
                map: mapRef.current,
                title: p.identity
            });
            markersRef.current.push(marker);
        });
    }, [participants]);

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
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">Rooms & Participants</h2>
                        {rooms.map(room => (
                            <div key={room.name} className="mb-4">
                                <h3 className="font-bold">{room.name}</h3>
                                <ul>
                                    {room.participants.map((p) => (
                                        <li key={p.identity}>
                                            {p.identity} ({p.state}) {p.position ? `@ (${p.position.x}, ${p.position.y})` : ''}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">Live Map</h2>
                        <div id="admin-map" style={{ width: '100%', height: 400, borderRadius: 12, border: '1px solid #eee' }}></div>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Analytics</h2>
                        <p>Active rooms: {rooms.length}</p>
                        <p>Active participants: {participants.length}</p>
                    </div>
                </>
            )}
        </div>
    );
}
