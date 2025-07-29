'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalAudioTrack, DisconnectReason, RemoteTrack, TrackPublication } from 'livekit-client';
import { Loader } from '@googlemaps/js-api-loader';
import { Vector2, ParticipantMetadata, UserPosition } from '@/types';
import { useSpatialAudio } from '@/hooks/useSpatialAudio';

// Import UI components
import { LocationPermissionBanner } from './LocationPermissionBanner';
import { ErrorDisplay } from './ErrorDisplay';

// Import new optimized components
import { MapControls } from './MapControls';
import { ParticipantList } from './ParticipantList';
import { MusicControls } from './MusicControls';

// Lazy load heavy components
const BoomboxMusicDialog = lazy(() => import('./BoomboxMusicDialog').then(mod => ({ default: mod.BoomboxMusicDialog })));
const MicrophoneButton = lazy(() => import('./MicrophoneButton').then(mod => ({ default: mod.MicrophoneButton })));


// Loading components
const MapLoadingSpinner = () => (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p>Loading map...</p>
        </div>
    </div>
);

const ComponentLoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
    </div>
);

interface HuntersMapViewProps {
    room: string;
    username: string;
    avatar: string;
}

// Music state enum for better type safety
type MusicState = 'idle' | 'publishing' | 'paused' | 'listening';

// Consolidated music state interface
interface MusicStateData {
    state: MusicState;
    source?: 'file' | 'tab-capture';
    listeningTo?: string;
    isPaused?: boolean;
}

export function HuntersMapView({ room, username, avatar }: HuntersMapViewProps) {
    // Core state
    const [myPosition, setMyPosition] = useState<Vector2>({ x: 51.5074, y: -0.1278 });
    const [participants, setParticipants] = useState<Map<string, UserPosition>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [livekitRoom, setLivekitRoom] = useState<Room | null>(null);
    const [selectedMusicUser, setSelectedMusicUser] = useState<UserPosition | null>(null);

    // Consolidated music state
    const [musicState, setMusicState] = useState<MusicStateData>({ state: 'idle' });

    // Party info
    const [partyTitle, setPartyTitle] = useState<string>('');
    const [partyDescription, setPartyDescription] = useState<string>('');
    // Music info - using party info as music info for now
    const musicTitle = partyTitle;
    const musicDescription = partyDescription;

    // Location tracking
    const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

    // UI state
    const [roomInfoExpanded, setRoomInfoExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

    // Computed values
    const isPublishingMusic = musicState.state === 'publishing';
    const isListeningToMusic = musicState.state === 'listening';
    const isMusicPaused = musicState.state === 'paused';

    // Refs
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const voiceRangeCircleRef = useRef<google.maps.Circle | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const lastMetadataUpdateRef = useRef<number>(0);
    const metadataUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentMusicTrackRef = useRef<{ track: LocalAudioTrack; audioElement: HTMLAudioElement | null; musicTitle?: string; musicDescription?: string } | null>(null);
    const musicStateRef = useRef<MusicStateData>({ state: 'idle' });

    // Spatial audio hook
    const {
        subscribeToParticipant,
        leaveMusicParty,
        enableAudioContext,
        getCurrentMusicParty,
        cleanupParticipant
    } = useSpatialAudio(livekitRoom, participants, myPosition);

    // Throttled metadata publishing to prevent timeout errors
    const publishMyMetadataThrottled = useCallback(async (roomInstance?: Room) => {
        const currentRoom = roomInstance || livekitRoom;
        if (!currentRoom) return;

        const now = Date.now();
        const timeSinceLastUpdate = now - lastMetadataUpdateRef.current;
        const minUpdateInterval = 500; // Reduced from 2000ms to 500ms for more responsive updates

        const metadata: ParticipantMetadata = {
            username,
            avatar,
            position: myPosition,
            isPublishingMusic: isPublishingMusic,
            musicTitle: partyTitle, // Assuming musicTitle is derived from partyTitle for now
            musicDescription: partyDescription, // Assuming musicDescription is derived from partyDescription for now
            partyTitle: partyTitle,
            partyDescription: partyDescription,
        };

        const doUpdate = async () => {
            try {
                lastMetadataUpdateRef.current = Date.now();
                await currentRoom.localParticipant.setMetadata(JSON.stringify(metadata));
                console.log('Published metadata:', metadata);
            } catch (error) {
                console.error('Error publishing metadata:', error);
                // Reset the timer on error to allow retry
                lastMetadataUpdateRef.current = 0;
            }
        };

        // Clear any pending update
        if (metadataUpdateTimeoutRef.current) {
            clearTimeout(metadataUpdateTimeoutRef.current);
        }

        if (timeSinceLastUpdate >= minUpdateInterval) {
            // Enough time has passed, update immediately
            await doUpdate();
        } else {
            // Schedule update for later
            const delay = minUpdateInterval - timeSinceLastUpdate;
            metadataUpdateTimeoutRef.current = setTimeout(doUpdate, delay);
        }
    }, [username, avatar, myPosition, isPublishingMusic, partyTitle, partyDescription, livekitRoom]);

    // Update my position in room
    const updateMyPositionInRoom = useCallback(async (position: Vector2) => {
        if (!livekitRoom) return;

        setMyPosition(position);
        // No direct marker update here; marker will be updated via participants state and updateMapMarker
        await publishMyMetadataThrottled();
    }, [livekitRoom, publishMyMetadataThrottled]);

    // Update map marker
    const updateMapMarker = useCallback((identity: string, user: UserPosition) => {
        console.log('🗺️ updateMapMarker called for:', identity, 'position:', user.position);

        if (!mapRef.current || !window.google?.maps) {
            console.log('❌ Map not ready, skipping marker update for:', identity);
            return;
        }

        // Validate position
        if (
            typeof user.position?.x !== 'number' ||
            typeof user.position?.y !== 'number' ||
            isNaN(user.position.x) ||
            isNaN(user.position.y)
        ) {
            console.warn('❌ Invalid position for marker:', identity, user.position);
            return;
        }

        let marker = markersRef.current.get(identity);
        // Ensure avatar icon URL always ends with .png
        let avatarFile = user.avatar;
        if (avatarFile && !avatarFile.endsWith('.png')) {
            avatarFile = avatarFile + '.png';
        }
        const iconUrl = user.isPublishingMusic ? '/boombox.png' : `/characters_001/${avatarFile}`;
        const markerSize = user.isPublishingMusic ? 60 : 50;

        console.log('🔍 Creating/updating marker:', {
            identity,
            hasExistingMarker: !!marker,
            iconUrl,
            position: user.position,
            mapRef: !!mapRef.current
        });

        if (marker) {
            // Update existing marker
            marker.setPosition({ lat: user.position.x, lng: user.position.y });
            marker.setIcon({
                url: iconUrl,
                scaledSize: new window.google.maps.Size(markerSize, markerSize),
            });
            marker.setTitle(`${user.username}${user.isPublishingMusic ? ' 🎵' : ''}`);
            marker.setZIndex(user.isPublishingMusic ? 999 : 500);

            // Clear existing listeners and add new one with current music state
            window.google.maps.event.clearListeners(marker, 'click');
            marker.addListener('click', () => {
                console.log('Clicked on participant:', user.username, 'isPublishingMusic:', user.isPublishingMusic);
                if (user.isPublishingMusic) {
                    setSelectedMusicUser(user);
                } else {
                    console.log('Clicked on non-music participant:', user.username);
                }
            });

            console.log('✅ Updated existing marker for:', user.username, 'at:', user.position);
        } else {
            // Create new marker
            marker = new window.google.maps.Marker({
                position: { lat: user.position.x, lng: user.position.y },
                map: mapRef.current,
                icon: {
                    url: iconUrl,
                    scaledSize: new window.google.maps.Size(markerSize, markerSize),
                },
                title: `${user.username}${user.isPublishingMusic ? ' 🎵' : ''}`,
                zIndex: user.isPublishingMusic ? 999 : 500,
            });

            marker.addListener('click', () => {
                console.log('Clicked on participant:', user.username, 'isPublishingMusic:', user.isPublishingMusic);
                if (user.isPublishingMusic) {
                    setSelectedMusicUser(user);
                } else {
                    console.log('Clicked on non-music participant:', user.username);
                }
            });

            markersRef.current.set(identity, marker);
            console.log('✅ Created new marker for:', user.username, 'at:', user.position, 'marker:', marker);
        }
    }, []);

    // Refresh all participant markers (useful after map initialization)
    const refreshAllMarkers = useCallback(() => {
        if (!mapRef.current || !window.google?.maps) {
            console.log('Map not ready, cannot refresh markers');
            return;
        }

        console.log('Refreshing all participant markers, total participants:', participants.size);
        participants.forEach((user, identity) => {
            updateMapMarker(identity, user);
        });
    }, [participants, updateMapMarker]);

    // Debug function to log current state
    const logParticipantState = useCallback(() => {
        console.log('=== PARTICIPANT STATE DEBUG ===');
        console.log('Total participants in state:', participants.size);
        console.log('Markers in ref:', markersRef.current.size);
        console.log('LiveKit room participants:', livekitRoom?.remoteParticipants.size || 0);
        console.log('Participants data:', Array.from(participants.entries()));
        console.log('Marker identities:', Array.from(markersRef.current.keys()));
        console.log('===============================');
    }, [participants, livekitRoom]);

    // Enhanced music state management
    const updateMusicState = useCallback((newState: Partial<MusicStateData>) => {
        const oldState = musicStateRef.current;
        setMusicState(prev => {
            const updated = { ...prev, ...newState };
            musicStateRef.current = updated;
            console.log('🎵 Music state changed:', {
                from: oldState,
                to: updated,
                timestamp: new Date().toISOString()
            });
            return updated;
        });
    }, []);

    // Enhanced stop music function
    const stopMusicPublishing = useCallback(async () => {
        if (!livekitRoom || !currentMusicTrackRef.current) {
            console.log('No room or track to stop');
            return;
        }

        setIsLoading(true);
        try {
            console.log('Stopping music publishing...');

            // Handle audio element cleanup for file uploads
            if (currentMusicTrackRef.current.audioElement && musicState.source === 'file') {
                currentMusicTrackRef.current.audioElement.pause();
                currentMusicTrackRef.current.audioElement.currentTime = 0;
            }

            // Stop the track before unpublishing
            if (currentMusicTrackRef.current.track) {
                currentMusicTrackRef.current.track.stop();
                await livekitRoom.localParticipant.unpublishTrack(currentMusicTrackRef.current.track);
            }

            // Clean up audio element for file uploads
            if (currentMusicTrackRef.current.audioElement && musicState.source === 'file') {
                if (currentMusicTrackRef.current.audioElement.src && currentMusicTrackRef.current.audioElement.src.startsWith('blob:')) {
                    URL.revokeObjectURL(currentMusicTrackRef.current.audioElement.src);
                }
                currentMusicTrackRef.current.audioElement.src = '';
            }

            // Clean up references
            currentMusicTrackRef.current = null;
            updateMusicState({ state: 'idle', source: undefined, isPaused: false });
            console.log('Music publishing stopped successfully');

        } catch (error) {
            console.error('Error stopping music:', error);
            setError('Failed to stop music');
            // Still update state even if there's an error
            updateMusicState({ state: 'idle', source: undefined, isPaused: false });
        } finally {
            setIsLoading(false);
        }
    }, [livekitRoom, musicState.source, updateMusicState]);

    // Remove participant
    const removeParticipant = useCallback((identity: string) => {
        setParticipants(prev => {
            const updated = new Map(prev);
            updated.delete(identity);
            return updated;
        });

        // If we were listening to this participant's music, stop listening
        if (musicState.listeningTo === identity) {
            updateMusicState({ state: 'idle', listeningTo: undefined });
            console.log('Stopped listening to music from disconnected participant:', identity);
        }

        // Clean up spatial audio and music tracks for this participant
        cleanupParticipant(identity);

        const marker = markersRef.current.get(identity);
        if (marker) {
            marker.setMap(null);
            markersRef.current.delete(identity);
        }
        console.log('Removed participant:', identity);
    }, [musicState.listeningTo, cleanupParticipant, updateMusicState]);

    // Update participant from metadata
    const updateParticipantFromMetadata = useCallback((participant: RemoteParticipant) => {
        if (!participant.metadata) {
            console.log('Participant has no metadata yet:', participant.identity, '- skipping add until metadata arrives.');
            return;
        }

        try {
            const metadata: ParticipantMetadata = JSON.parse(participant.metadata);
            if (!metadata.position || typeof metadata.position.x !== 'number' || typeof metadata.position.y !== 'number') {
                console.warn('Skipping participant with invalid position metadata:', participant.identity, metadata);
                return;
            }
            const userPosition: UserPosition = {
                userId: participant.identity,
                username: metadata.username,
                avatar: metadata.avatar,
                position: metadata.position,
                isPublishingMusic: metadata.isPublishingMusic || false,
                musicTitle: metadata.musicTitle,
                partyTitle: metadata.partyTitle,
                partyDescription: metadata.partyDescription,
            };

            // Update participants state
            setParticipants(prev => {
                const updated = new Map(prev);
                updated.set(participant.identity, userPosition);
                console.log('All participant positions after metadata update:', Array.from(updated.entries()).map(([id, u]) => ({ id, pos: u.position })));
                return updated;
            });

            // Update map marker
            updateMapMarker(participant.identity, userPosition);
            console.log('Updated participant with metadata:', participant.identity, metadata);
        } catch (error) {
            console.error('Error parsing participant metadata for', participant.identity, ':', error);
            console.log('Raw metadata:', participant.metadata);
        }
    }, [updateMapMarker]);

    // Update track positions for spatial audio
    const updateTrackPositions = useCallback(() => {
        // This will be implemented with spatial audio controller
        console.log('Updating track positions for spatial audio');
    }, []);

    // Request GPS location permission and start tracking
    const requestLocationPermission = useCallback(async () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser');
            return { success: false, position: null };
        }

        return new Promise<{ success: boolean; position: Vector2 | null }>((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocationPermission('granted');
                    const newPosition = {
                        x: position.coords.latitude,
                        y: position.coords.longitude
                    };
                    setMyPosition(newPosition);
                    setGpsAccuracy(position.coords.accuracy);
                    console.log('GPS location granted:', newPosition, 'accuracy:', position.coords.accuracy);
                    resolve({ success: true, position: newPosition });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setLocationPermission('denied');
                    setError(`Location access denied: ${error.message}`);
                    resolve({ success: false, position: null });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }, []);

    // Start GPS location tracking
    const startLocationTracking = useCallback(() => {
        if (!navigator.geolocation || watchIdRef.current !== null) return;

        setIsTrackingLocation(true);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const newPosition = {
                    x: position.coords.latitude,
                    y: position.coords.longitude
                };

                setGpsAccuracy(position.coords.accuracy);
                console.log('GPS position updated:', newPosition, 'accuracy:', position.coords.accuracy);

                // Only update if position changed significantly (more than ~10 meters)
                const currentPos = myPosition;
                const distance = Math.sqrt(
                    Math.pow((newPosition.x - currentPos.x) * 111000, 2) +
                    Math.pow((newPosition.y - currentPos.y) * 111000, 2)
                );

                if (distance > 10) {
                    setMyPosition(newPosition);
                    // Marker will be updated via participants state and updateMapMarker
                    // Update room metadata - will be handled by useEffect watching myPosition
                }
            },
            (error) => {
                console.error('GPS tracking error:', error);
                setError(`GPS tracking error: ${error.message}`);
                setIsTrackingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            }
        );
    }, [myPosition]);

    // Stop GPS location tracking
    const stopLocationTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            setIsTrackingLocation(false);
            console.log('GPS tracking stopped');
        }
    }, []);

    // Initialize Google Maps
    const initializeMap = useCallback(async (centerPosition?: Vector2) => {
        if (!mapContainerRef.current) return;

        const mapCenter = centerPosition || myPosition;
        console.log('Initializing map with center position:', mapCenter);

        try {
            const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!GOOGLE_MAPS_API_KEY) {
                throw new Error('Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.');
            }

            console.log('Loading Google Maps...');

            const loader = new Loader({
                apiKey: GOOGLE_MAPS_API_KEY,
                version: 'weekly',
                libraries: ['places'],
            });

            await loader.load();
            console.log('Google Maps loaded successfully');

            if (!window.google?.maps) {
                throw new Error('Google Maps failed to load properly');
            }

            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: { lat: mapCenter.x, lng: mapCenter.y },
                zoom: 16,
                minZoom: 3, // Prevent zooming out too far
                maxZoom: 20, // Prevent zooming in too far
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
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
            console.log('Google Maps initialized successfully at position:', mapCenter);

            // Add click listener for movement
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.addListener('click', (event?: any) => {
                if (event?.latLng) {
                    const newPosition = {
                        x: event.latLng.lat(),
                        y: event.latLng.lng()
                    };
                    console.log('User clicked to move to:', newPosition);
                    updateMyPositionInRoom(newPosition);
                }
            });

            // Update the state position if we used GPS
            if (centerPosition && (centerPosition.x !== myPosition.x || centerPosition.y !== myPosition.y)) {
                setMyPosition(centerPosition);
                console.log('Updated state position to GPS location:', centerPosition);
            }

        } catch (err) {
            console.error('Error loading Google Maps:', err);
            setError(`Failed to load Google Maps: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }, [myPosition, updateMyPositionInRoom]);

    // Center map on user position
    const centerMapOnUser = useCallback((position?: Vector2) => {
        if (!mapRef.current) return;

        const targetPosition = position || myPosition;
        mapRef.current.setCenter({ lat: targetPosition.x, lng: targetPosition.y });
        mapRef.current.setZoom(16);
        console.log('Map centered on position:', targetPosition);
    }, [myPosition]);



    // Voice range circle management
    const updateVoiceRangeCircle = useCallback(() => {
        if (!mapRef.current || !window.google?.maps || !showVoiceRange) {
            // Remove circle if it exists and shouldn't be shown
            if (voiceRangeCircleRef.current) {
                voiceRangeCircleRef.current.setMap(null);
                voiceRangeCircleRef.current = null;
            }
            return;
        }

        const voiceRangeMeters = 50; // Voice chat radius in meters

        if (voiceRangeCircleRef.current) {
            // Update existing circle position
            voiceRangeCircleRef.current.setCenter({ lat: myPosition.x, lng: myPosition.y });
        } else {
            // Create new circle
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            voiceRangeCircleRef.current = new (window.google.maps as any).Circle({
                strokeColor: '#3B82F6', // Blue color
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#3B82F6',
                fillOpacity: 0.15,
                map: mapRef.current,
                center: { lat: myPosition.x, lng: myPosition.y },
                radius: voiceRangeMeters
            });
        }
    }, [myPosition, showVoiceRange]);

    // Update voice range circle when position or visibility changes
    useEffect(() => {
        updateVoiceRangeCircle();
    }, [updateVoiceRangeCircle]);

    // Connect to LiveKit
    const connectToLiveKit = useCallback(async () => {
        // Prevent multiple connections
        if (livekitRoom || isConnected || isConnecting) {
            console.log('Already connected or connecting to LiveKit');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            console.log('Connecting to LiveKit room:', room);
            const response = await fetch('/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room, username }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.setupInstructions) {
                    throw new Error(`${errorData.error}\n\n${errorData.setupInstructions}`);
                }
                throw new Error(errorData.error || 'Failed to get access token');
            }

            const { token, wsUrl } = await response.json();
            console.log('Received LiveKit token, connecting...');

            const newRoom = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            newRoom.on(RoomEvent.Connected, () => {
                setIsConnected(true);
                setIsConnecting(false);
                console.log('Connected to room:', room, 'with', newRoom.remoteParticipants.size, 'existing participants');

                // Remove all old markers from the map before clearing
                markersRef.current.forEach((marker) => {
                    if (marker && marker.setMap) marker.setMap(null);
                });
                markersRef.current.clear();

                // Clear old participants
                setParticipants(new Map());

                // Process all participants: local and remote
                const newParticipants = new Map();

                // Add local participant (yourself)
                const localParticipant = newRoom.localParticipant;
                let localUserPosition;
                if (localParticipant.metadata) {
                    try {
                        const metadata = JSON.parse(localParticipant.metadata);
                        localUserPosition = {
                            userId: localParticipant.identity,
                            username: metadata.username,
                            avatar: metadata.avatar,
                            position: metadata.position,
                            isPublishingMusic: metadata.isPublishingMusic || false,
                            musicTitle: metadata.musicTitle,
                        };
                    } catch (error) {
                        console.error('Error parsing local participant metadata:', error);
                        // Skip local participant if metadata is invalid - will be added when correct metadata is published
                        console.log('Local participant metadata is invalid, skipping until valid metadata is published');
                        localUserPosition = null;
                    }
                } else {
                    // Skip local participant if no metadata - will be added when metadata is published
                    console.log('Local participant has no metadata yet, skipping until metadata is published');
                    localUserPosition = null;
                }

                if (localUserPosition) {
                    newParticipants.set(localParticipant.identity, localUserPosition);
                }

                // Add remote participants
                newRoom.remoteParticipants.forEach((participant) => {
                    console.log('Processing existing participant:', participant.identity, 'metadata:', participant.metadata ? 'present' : 'missing');
                    if (participant.metadata) {
                        try {
                            const metadata = JSON.parse(participant.metadata);
                            const userPosition = {
                                userId: participant.identity,
                                username: metadata.username,
                                avatar: metadata.avatar,
                                position: metadata.position,
                                isPublishingMusic: metadata.isPublishingMusic || false,
                                musicTitle: metadata.musicTitle,
                            };
                            newParticipants.set(participant.identity, userPosition);
                        } catch (error) {
                            console.error('Error parsing participant metadata for', participant.identity, ':', error);
                        }
                    } else {
                        // Skip participants without metadata - they will be added when metadata arrives
                        console.log('Participant has no metadata yet, skipping:', participant.identity);
                    }
                });
                setParticipants(newParticipants);
                // After state is set, refresh all markers for all participants
                setTimeout(() => {
                    refreshAllMarkers();
                    // Remove any markers for users not in the newParticipants map
                    markersRef.current.forEach((marker, identity) => {
                        if (!newParticipants.has(identity)) {
                            if (marker && marker.setMap) marker.setMap(null);
                            markersRef.current.delete(identity);
                        }
                    });
                }, 0);
            });

            newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
                console.log('🟢 Participant connected:', participant.identity, 'name:', participant.name);
                // Only add participant when they have metadata
                if (participant.metadata) {
                    updateParticipantFromMetadata(participant);
                }

                // Listen for when they publish their metadata
                const checkMetadata = () => {
                    if (participant.metadata) {
                        console.log('📝 Received metadata for newly connected participant:', participant.identity);
                        updateParticipantFromMetadata(participant);
                    } else {
                        // Retry after a short delay if no metadata yet
                        setTimeout(checkMetadata, 1000);
                    }
                };

                // Only start checking if they don't have metadata yet
                if (!participant.metadata) {
                    checkMetadata();
                }
            });

            newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
                console.log('🔴 Participant disconnected:', participant.identity);
                removeParticipant(participant.identity);
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newRoom.on(RoomEvent.ParticipantMetadataChanged, (metadata: string | undefined, participant: RemoteParticipant | any) => {
                console.log('📝 Participant metadata changed:', participant.identity, 'new metadata:', metadata);
                
                // Check if this is the participant we're listening to and they stopped publishing music
                if (musicStateRef.current.listeningTo === participant.identity && metadata) {
                    try {
                        const parsedMetadata = JSON.parse(metadata);
                        if (!parsedMetadata.isPublishingMusic) {
                            console.log('🎵 Publisher stopped publishing music, resetting music state for:', participant.identity);
                            
                            // Stop listening to this participant's music
                            leaveMusicParty(participant.identity).then((success) => {
                                if (success) {
                                    updateMusicState({ state: 'idle', listeningTo: undefined });
                                    setSelectedMusicUser(null);
                                    console.log('Successfully stopped listening to music from:', participant.identity);
                                } else {
                                    console.error('Failed to stop listening to music from:', participant.identity);
                                    // Still reset UI state even if leaveMusicParty fails
                                    updateMusicState({ state: 'idle', listeningTo: undefined });
                                    setSelectedMusicUser(null);
                                }
                            }).catch((error) => {
                                console.error('Error stopping music listening:', error);
                                // Still reset UI state even if there's an error
                                updateMusicState({ state: 'idle', listeningTo: undefined });
                                setSelectedMusicUser(null);
                            });
                        }
                    } catch (error) {
                        console.error('Error parsing participant metadata:', error);
                    }
                }
                
                // Always update for all participants, including local, to ensure state is correct
                updateParticipantFromMetadata(participant);
                console.log('✅ Updated participant display for:', participant.identity);
            });

            newRoom.on(RoomEvent.TrackSubscribed, () => {
                updateTrackPositions();
            });

            newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
                console.log('🎵 Track unsubscribed:', track.sid, 'from participant:', participant.identity);
                updateTrackPositions();
                
                // Check if this is a music track that we were listening to
                const trackName = (publication as { name?: string }).name;
                if (trackName && trackName.startsWith('music-') && musicStateRef.current.listeningTo === participant.identity) {
                    console.log('🎵 Music track unsubscribed, stopping music listening for:', participant.identity);
                    
                    // Stop listening to this participant's music
                    leaveMusicParty(participant.identity).then((success) => {
                        if (success) {
                            updateMusicState({ state: 'idle', listeningTo: undefined });
                            setSelectedMusicUser(null);
                            console.log('Successfully stopped listening to music from:', participant.identity);
                        } else {
                            console.error('Failed to stop listening to music from:', participant.identity);
                            // Still reset UI state even if leaveMusicParty fails
                            updateMusicState({ state: 'idle', listeningTo: undefined });
                            setSelectedMusicUser(null);
                        }
                    }).catch((error) => {
                        console.error('Error stopping music listening:', error);
                        // Still reset UI state even if there's an error
                        updateMusicState({ state: 'idle', listeningTo: undefined });
                        setSelectedMusicUser(null);
                    });
                }
            });

            // Also listen for TrackUnpublished event (when publisher unpublishes)
            newRoom.on(RoomEvent.TrackUnpublished, (publication: TrackPublication, participant: RemoteParticipant) => {
                const trackSid = (publication as { sid?: string }).sid;
                console.log('🎵 Track unpublished:', trackSid, 'from participant:', participant.identity);
                
                // Check if this is a music track that we were listening to
                const trackName = (publication as { name?: string }).name;
                if (trackName && trackName.startsWith('music-') && musicStateRef.current.listeningTo === participant.identity) {
                    console.log('🎵 Music track unpublished, immediately stopping music listening for:', participant.identity);
                    
                    // Immediately reset UI state first for responsive feedback
                    updateMusicState({ state: 'idle', listeningTo: undefined });
                    setSelectedMusicUser(null);
                    
                    // Then stop listening to this participant's music
                    leaveMusicParty(participant.identity).then((success) => {
                        if (success) {
                            console.log('Successfully stopped listening to music from:', participant.identity);
                        } else {
                            console.error('Failed to stop listening to music from:', participant.identity);
                        }
                    }).catch((error) => {
                        console.error('Error stopping music listening:', error);
                    });
                }
            });

            // Listen for admin track mute/unpublish notifications
            newRoom.on(RoomEvent.DataReceived, async (payload: Uint8Array) => {
                try {
                    const data = JSON.parse(new TextDecoder().decode(payload));
                    if (data.type === 'admin_track_muted') {
                        // If this user is publishing music, stop publishing and reset UI
                        if (isPublishingMusic && currentMusicTrackRef.current && currentMusicTrackRef.current.track && currentMusicTrackRef.current.track.sid === data.trackSid) {
                            await stopMusicPublishing();
                            updateMusicState({ state: 'idle', source: undefined, isPaused: false });
                            setSelectedMusicUser(null);
                            alert(`Admin Notice: ${data.message}\n(Track SID: ${data.trackSid})`);
                        }
                    } else if (data.type === 'admin_track_unpublished') {
                        console.log('🎵 Admin track unpublished data received:', data);
                        // Check if this user is listening to the participant whose track was unpublished
                        if (musicStateRef.current.listeningTo && data.publisherIdentity && musicStateRef.current.listeningTo === data.publisherIdentity) {
                            console.log('🎵 User is listening to the unpublished track, stopping music listening');
                            // Stop listening to this participant's music using the spatial audio hook
                            const success = await leaveMusicParty(data.publisherIdentity);
                            if (success) {
                                updateMusicState({ state: 'idle', listeningTo: undefined });
                                setSelectedMusicUser(null);
                                alert(`Admin Notice: ${data.message}\n(Music you were listening to was unpublished by admin)`);
                            } else {
                                console.error('Failed to leave music party after admin unpublish');
                                // Still reset UI state even if leaveMusicParty fails
                                updateMusicState({ state: 'idle', listeningTo: undefined });
                                setSelectedMusicUser(null);
                                alert(`Admin Notice: ${data.message}\n(Music you were listening to was unpublished by admin)`);
                            }
                        } else {
                            console.log('🎵 User is not listening to the unpublished track, showing general notification');
                            // Show a notification to all users
                            alert(`Admin Notice: ${data.message}`);
                        }
                        
                        // Update the publisher's metadata to reflect they're no longer publishing music
                        if (data.publisherIdentity) {
                            const publisher = newRoom.remoteParticipants.get(data.publisherIdentity);
                            if (publisher) {
                                try {
                                    const currentMetadata = publisher.metadata ? JSON.parse(publisher.metadata) : {};
                                    // Update the participant's metadata in our local state
                                    const updatedUserPosition: UserPosition = {
                                        userId: publisher.identity,
                                        username: currentMetadata.username || publisher.identity,
                                        avatar: currentMetadata.avatar || 'char_001',
                                        position: currentMetadata.position || { x: 0, y: 0 },
                                        isPublishingMusic: false,
                                        musicTitle: undefined,
                                        partyTitle: undefined,
                                        partyDescription: undefined
                                    };
                                    
                                    // Update participants state
                                    setParticipants(prev => {
                                        const updated = new Map(prev);
                                        updated.set(publisher.identity, updatedUserPosition);
                                        return updated;
                                    });
                                    
                                    // Update the map marker to show regular avatar instead of boombox
                                    updateMapMarker(publisher.identity, updatedUserPosition);
                                    
                                    console.log('Updated publisher metadata after admin unpublish:', publisher.identity);
                                } catch (error) {
                                    console.error('Error updating publisher metadata after admin unpublish:', error);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Failed to parse data message:', error);
                }
            });

            // Handle when the local participant is disconnected (e.g., by admin)
            newRoom.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
                console.log('🔴 Local participant disconnected from room:', reason);
                setIsConnected(false);
                setIsConnecting(false);
                
                // Determine disconnect reason for better user feedback
                let disconnectMessage = 'You have been disconnected from the room.';
                if (reason === DisconnectReason.SERVER_SHUTDOWN) {
                    disconnectMessage = 'The server has been shut down. You will be redirected to the prejoin page.';
                } else if (reason === DisconnectReason.CLIENT_INITIATED) {
                    disconnectMessage = 'You have been disconnected from the room. You will be redirected to the prejoin page.';
                } else if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
                    disconnectMessage = 'Another user with the same identity joined the room. You will be redirected to the prejoin page.';
                } else if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
                    disconnectMessage = 'You have been removed from the room by an administrator. You will be redirected to the prejoin page.';
                } else {
                    disconnectMessage = 'You have been disconnected from the room. You will be redirected to the prejoin page.';
                }
                // Show alert ONLY for admin-initiated disconnect
                if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
                    alert(disconnectMessage);
                }
                // Clean up any ongoing music publishing
                if (currentMusicTrackRef.current) {
                    stopMusicPublishing();
                }
                // Clear any listening state
                updateMusicState({ state: 'idle', listeningTo: undefined });
                // Redirect to prejoin page after a short delay
                setTimeout(() => {
                    try {
                        window.location.href = '/prejoin';
                    } catch (error) {
                        console.error('Failed to redirect to prejoin page:', error);
                        // Fallback: try to reload the page
                        window.location.reload();
                    }
                }, 2000);
            });

            await newRoom.connect(wsUrl, token);
            setLivekitRoom(newRoom);
            console.log('LiveKit room connected successfully');

            await publishMyMetadataThrottled(newRoom);

        } catch (err) {
            console.error('Error connecting to LiveKit:', err);
            setError(`Failed to connect to audio service: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsConnecting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room, username, publishMyMetadataThrottled, updateParticipantFromMetadata, removeParticipant, updateTrackPositions, isConnected, livekitRoom, isConnecting, refreshAllMarkers, isPublishingMusic, currentMusicTrackRef, musicState.listeningTo, updateMusicState, stopMusicPublishing]);    // Initialize everything
    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            if (!mounted || livekitRoom || isConnected) return; // Prevent multiple connections

            console.log('Initializing Hunters Map View...');

            // Request GPS location first and get the actual coordinates
            const locationResult = await requestLocationPermission();
            let centerPosition = myPosition; // fallback to default

            if (locationResult.success && locationResult.position) {
                centerPosition = locationResult.position;
                startLocationTracking();
                console.log('Map will center on GPS location:', centerPosition);
            } else {
                console.log('Map will center on default location:', centerPosition);
            }

            // Initialize map with the correct center position
            await initializeMap(centerPosition);

            if (!mounted || livekitRoom) return;
            await connectToLiveKit();
        };

        initialize();

        return () => {
            mounted = false;
            stopLocationTracking();
            // Clear any pending metadata update
            if (metadataUpdateTimeoutRef.current) {
                clearTimeout(metadataUpdateTimeoutRef.current);
            }
            // Stop music if publishing
            if (currentMusicTrackRef.current) {
                stopMusicPublishing();
            }
            // Clear listening state
            updateMusicState({ state: 'idle', listeningTo: undefined });
            if (livekitRoom) {
                console.log('Disconnecting from LiveKit room');
                livekitRoom.disconnect();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Update metadata when publishing music changes
    useEffect(() => {
        if (livekitRoom && isConnected) {
            console.log('Music publishing state changed:', isPublishingMusic);
            publishMyMetadataThrottled();
        }
    }, [isPublishingMusic, publishMyMetadataThrottled, livekitRoom, isConnected]);

    // Update metadata when position changes (for GPS updates)
    useEffect(() => {
        if (livekitRoom && isConnected) {
            publishMyMetadataThrottled();
        }
    }, [myPosition, publishMyMetadataThrottled, livekitRoom, isConnected]);

    // Debug logging in development mode
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && isConnected) {
            const interval = setInterval(() => {
                logParticipantState();
            }, 10000); // Log every 10 seconds

            return () => clearInterval(interval);
        }
    }, [isConnected, logParticipantState]);

    // Periodic check to ensure music state consistency
    useEffect(() => {
        if (isConnected && musicStateRef.current.listeningTo) {
            const checkMusicState = () => {
                // Check if the participant we're listening to still exists and is publishing music
                const targetParticipant = participants.get(musicStateRef.current.listeningTo!);
                if (!targetParticipant || !targetParticipant.isPublishingMusic) {
                    console.log('🎵 Music state inconsistency detected, resetting to idle');
                    updateMusicState({ state: 'idle', listeningTo: undefined });
                    setSelectedMusicUser(null);
                }
            };

            const interval = setInterval(checkMusicState, 2000); // Reduced from 5000ms to 2000ms for faster detection
            return () => clearInterval(interval);
        }
    }, [isConnected, participants, updateMusicState]);

    // Ensure all participants have markers when map is ready or participants change
    useEffect(() => {
        if (mapRef.current && participants.size > 0) {
            console.log('🗺️ Map ready with', participants.size, 'participants, ensuring all markers exist...');
            refreshAllMarkers();
        }
    }, [participants.size, refreshAllMarkers]); // Trigger when participant count changes





    // Participant list handler
    const handleParticipantClick = useCallback((position: Vector2) => {
        centerMapOnUser(position);
    }, [centerMapOnUser]);

    // Enhanced genre change handler with loading state
    const handleGenreChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGenre = e.target.value;
        if (newGenre === genre) return;

        setIsLoading(true);
        try {
            if (livekitRoom) {
                await livekitRoom.disconnect();
                setLivekitRoom(null);
                setIsConnected(false);
                setParticipants(new Map());
            }
            setGenre(newGenre);
            window.location.replace(`/map?room=${newGenre}&username=${username}&avatar=${avatar}`);
        } catch (error) {
            console.error('Error changing genre:', error);
            setError('Failed to change genre. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [genre, livekitRoom, username, avatar]);

    // Enhanced music button click handler
    const handleMusicButtonClick = useCallback(async () => {
        if (isLoading) return;

        if (isPublishingMusic) {
            if (musicState.source === 'file') {
                if (isMusicPaused) {
                    // Resume music
                    if (currentMusicTrackRef.current?.audioElement) {
                        try {
                            await currentMusicTrackRef.current.audioElement.play();
                            updateMusicState({ state: 'publishing', isPaused: false });
                        } catch (error) {
                            console.error('Error resuming music:', error);
                            setError('Failed to resume music');
                        }
                    }
                } else {
                    // Pause music
                    if (currentMusicTrackRef.current?.audioElement) {
                        currentMusicTrackRef.current.audioElement.pause();
                        updateMusicState({ state: 'paused', isPaused: true });
                    }
                }
            } else if (musicState.source === 'tab-capture') {
                // Show better UX for tab capture
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                notification.textContent = 'Tab audio capture cannot be paused. Control playback in the source tab.';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 4000);
            }
        } else if (isListeningToMusic) {
            // Enhanced leave music party UX
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.innerHTML = `
                <div class="flex items-center gap-2">
                    <span>Leave music party?</span>
                    <button class="bg-white text-blue-500 px-2 py-1 rounded text-sm font-medium" onclick="this.parentElement.parentElement.remove(); window.leaveMusicParty()">Yes</button>
                    <button class="bg-white/20 text-white px-2 py-1 rounded text-sm" onclick="this.parentElement.parentElement.remove()">No</button>
                </div>
            `;
            document.body.appendChild(notification);
            
            // Add global function for the notification
            (window as unknown as Record<string, unknown>).leaveMusicParty = async () => {
                if (musicStateRef.current.listeningTo) {
                    await leaveMusicParty(musicStateRef.current.listeningTo);
                    updateMusicState({ state: 'idle', listeningTo: undefined });
                }
                notification.remove();
                delete (window as unknown as Record<string, unknown>).leaveMusicParty;
            };
        } else {
            // Start music party
            setSelectedMusicUser({
                userId: 'self',
                username,
                avatar,
                position: myPosition,
                isPublishingMusic: false
            });
        }
    }, [isPublishingMusic, isListeningToMusic, isMusicPaused, musicState, isLoading, myPosition, username, avatar, leaveMusicParty, updateMusicState]);

    return (
        <div className="fixed inset-0 w-full h-full bg-gray-900" style={{ zIndex: 0 }}>
            {/* Error Display */}
            <ErrorDisplay error={error} />

            {/* Map Controls */}
            <MapControls
                genres={genres}
                currentGenre={genre}
                onGenreChange={handleGenreChange}
                participants={participants}
                myPosition={myPosition}
                roomInfoExpanded={roomInfoExpanded}
                onToggleRoomInfo={() => setRoomInfoExpanded(!roomInfoExpanded)}
                onCenterMapOnUser={() => centerMapOnUser()}
                isLoading={isLoading}
            />

            {/* Participant List */}
            <ParticipantList
                participants={participants}
                myPosition={myPosition}
                onParticipantClick={handleParticipantClick}
            />


            {/* Location Permission Banner */}
            <LocationPermissionBanner
                locationPermission={locationPermission}
                onRequestLocation={async () => {
                    const result = await requestLocationPermission();
                    if (result.success) {
                        startLocationTracking();
                        // Recenter map on new location
                        if (result.position) {
                            centerMapOnUser(result.position);
                        }
                    }
                }}
            />

            <Suspense fallback={<MapLoadingSpinner />}>
                <div
                    ref={mapContainerRef}
                    className="absolute top-0 left-0 w-full h-full z-20"
                    style={{ width: '100%', height: '100%', top: 0, left: 0 }}
                />
            </Suspense>

            {/* Microphone Button for Spatial Voice Chat */}
            <div className="absolute bottom-30 right-4 z-30">
                <Suspense fallback={<ComponentLoadingSpinner />}>
                    <MicrophoneButton
                        room={livekitRoom}
                        localParticipant={livekitRoom?.localParticipant || null}
                    />
                </Suspense>
            </div>

            {/* Music Controls */}
            <MusicControls
                isPublishingMusic={isPublishingMusic}
                isListeningToMusic={isListeningToMusic}
                isMusicPaused={isMusicPaused}
                isLoading={isLoading}
                onMusicButtonClick={handleMusicButtonClick}
            />

            {selectedMusicUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" style={{ pointerEvents: 'auto' }}>
                    <div className="relative w-full max-w-lg mx-auto my-8 max-h-[90vh] overflow-y-auto flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
                        <Suspense fallback={<ComponentLoadingSpinner />}>
                            <BoomboxMusicDialog
                            user={selectedMusicUser}
                            onClose={() => setSelectedMusicUser(null)}
                            onJoin={async () => {
                                // Only relevant for remote users joining/leaving music parties
                                if (selectedMusicUser.userId !== 'self') {
                                    console.log('Managing music party for:', selectedMusicUser.username, 'userId:', selectedMusicUser.userId);

                                    const isCurrentlyListening = musicStateRef.current.listeningTo === selectedMusicUser.userId;

                                    try {
                                        // Enable audio context first (important for mobile)
                                        await enableAudioContext();

                                        if (isCurrentlyListening) {
                                            // Leave the current music party
                                            const success = await leaveMusicParty(selectedMusicUser.userId);
                                            if (success) {
                                                updateMusicState({ state: 'idle', listeningTo: undefined });
                                                console.log('Successfully left music party:', selectedMusicUser.username);
                                                alert(`Left ${selectedMusicUser.username}'s music party! 🎵`);
                                            } else {
                                                console.error('Failed to leave music party:', selectedMusicUser.username);
                                                alert('Failed to leave music party. Please try again.');
                                            }
                                        } else {
                                            // Before joining, check if the user is actually publishing music
                                            if (!selectedMusicUser.isPublishingMusic) {
                                                alert(`${selectedMusicUser.username} is not currently playing music. Wait for them to start a music party!`);
                                                return;
                                            }

                                            // Check if user is already listening to a different music party
                                            const currentMusicParty = getCurrentMusicParty();
                                            if (currentMusicParty && currentMusicParty !== selectedMusicUser.userId) {
                                                const currentPartyUser = participants.get(currentMusicParty);
                                                const confirmSwitch = confirm(`You are currently listening to ${currentPartyUser?.username || 'another user'}'s music party. Switch to ${selectedMusicUser.username}'s party?`);
                                                if (!confirmSwitch) {
                                                    return;
                                                }
                                            }

                                            // If already listening to another music party, leave it first
                                            if (musicStateRef.current.listeningTo && musicStateRef.current.listeningTo !== selectedMusicUser.userId) {
                                                console.log('Leaving current music party before joining new one');
                                                await leaveMusicParty(musicStateRef.current.listeningTo);
                                                updateMusicState({ state: 'idle', listeningTo: undefined });
                                            }

                                            // Join the new music party
                                            const success = await subscribeToParticipant(selectedMusicUser.userId);
                                            if (success) {
                                                updateMusicState({ state: 'listening', listeningTo: selectedMusicUser.userId });
                                                console.log('Successfully joined music party:', selectedMusicUser.username);
                                                alert(`Joined ${selectedMusicUser.username}'s music party! 🎵`);
                                                // Close the dialog after successful join
                                                setSelectedMusicUser(null);
                                            } else {
                                                console.error('Failed to join music party:', selectedMusicUser.username);
                                                alert(`Failed to join ${selectedMusicUser.username}'s music party. They might not be actively streaming music right now. Try again when they start playing music!`);
                                            }
                                        }
                                    } catch (error) {
                                        console.error('Error managing music party:', error);
                                        alert('Failed to manage music party. Please try again.');
                                    }
                                } else {
                                    console.log('Self music dialog - no subscription needed');
                                }
                            }}
                            room={livekitRoom}
                            partyTitle={partyTitle}
                            setPartyTitle={setPartyTitle}
                            partyDescription={partyDescription}
                            setPartyDescription={setPartyDescription}
                            onPublishStart={(filename, track, audioElement) => {
                                if (track && audioElement) {
                                    currentMusicTrackRef.current = { track, audioElement, musicTitle, musicDescription };
                                    updateMusicState({ state: 'publishing', source: 'file' });
                                } else if (track && !audioElement) {
                                    // Tab capture - no audio element to control
                                    currentMusicTrackRef.current = { track, audioElement: null, musicTitle, musicDescription };
                                    updateMusicState({ state: 'publishing', source: 'tab-capture' });
                                }
                                updateMusicState({ state: 'publishing', isPaused: false });
                                console.log(`Started publishing: ${filename}, source: ${audioElement ? 'file' : 'tab-capture'}, musicTitle: ${musicTitle}, musicDescription: ${musicDescription}`);
                                // Don't close the dialog automatically - let the user close it manually
                                // The music will continue playing even after dialog closes
                            }}
                            onPublishStop={() => {
                                // This will be called from the dialog, but we also have our own stop function
                                stopMusicPublishing();
                            }}
                            isListening={musicStateRef.current.listeningTo === selectedMusicUser.userId}
                            isSelf={selectedMusicUser.userId === 'self'}
                        />
                        </Suspense>
                        {/* Close button for desktop accessibility */}
                        <button
                            onClick={() => setSelectedMusicUser(null)}
                            className="absolute top-2 right-2 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
                            title="Close dialog"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
