'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalAudioTrack } from 'livekit-client';
import { Loader } from '@googlemaps/js-api-loader';
import { Vector2, ParticipantMetadata, UserPosition } from '@/types';
import { BoomboxMusicDialog } from './BoomboxMusicDialog';
import { MicrophoneButton } from './MicrophoneButton';
import { EarshotRadius } from './EarshotRadius';
import { useSpatialAudio } from '@/hooks/useSpatialAudio';

interface HuntersMapViewProps {
    room: string;
    username: string;
    avatar: string;
}

export function HuntersMapView({ room, username, avatar }: HuntersMapViewProps) {
    const [myPosition, setMyPosition] = useState<Vector2>({ x: 37.7749, y: -122.4194 });
    const [participants, setParticipants] = useState<Map<string, UserPosition>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [livekitRoom, setLivekitRoom] = useState<Room | null>(null);
    const [selectedMusicUser, setSelectedMusicUser] = useState<UserPosition | null>(null);
    const [isPublishingMusic, setIsPublishingMusic] = useState(false);
    const [isMusicPaused, setIsMusicPaused] = useState(false);
    const [listeningToMusic, setListeningToMusic] = useState<string | null>(null); // Track which participant's music we're listening to (only one at a time)
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);
    const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

    const [showVoiceRange, setShowVoiceRange] = useState(false);
    const [roomInfoExpanded, setRoomInfoExpanded] = useState(false);
    const [instructionsExpanded, setInstructionsExpanded] = useState(false);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<Map<string, any>>(new Map());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const voiceRangeCircleRef = useRef<any>(null);
    const watchIdRef = useRef<number | null>(null);
    const lastMetadataUpdateRef = useRef<number>(0);
    const metadataUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentMusicTrackRef = useRef<{ track: LocalAudioTrack; audioElement: HTMLAudioElement } | null>(null);

    // Initialize spatial audio
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
        const minUpdateInterval = 2000; // Minimum 2 seconds between updates

        const metadata: ParticipantMetadata = {
            username,
            avatar,
            position: myPosition,
            isPublishingMusic,
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
    }, [username, avatar, myPosition, isPublishingMusic, livekitRoom]);

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

    // Remove participant
    const removeParticipant = useCallback((identity: string) => {
        setParticipants(prev => {
            const updated = new Map(prev);
            updated.delete(identity);
            return updated;
        });

        // If we were listening to this participant's music, stop listening
        if (listeningToMusic === identity) {
            setListeningToMusic(null);
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
    }, [listeningToMusic, cleanupParticipant]);

    // Update participant from metadata
    const updateParticipantFromMetadata = useCallback((participant: RemoteParticipant) => {
        if (!participant.metadata) {
            console.log('Participant has no metadata yet:', participant.identity, '- skipping add until metadata arrives.');
            // Do not add to participants map until metadata is available
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
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
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

    // Show all participants on map by adjusting bounds
    const showAllParticipants = useCallback(() => {
        if (!mapRef.current || !window.google?.maps) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bounds = new (window.google.maps as any).LatLngBounds();

        // Add all participant positions (including local)
        participants.forEach((participant) => {
            bounds.extend({ lat: participant.position.x, lng: participant.position.y });
        });

        if (participants.size > 0) {
            mapRef.current.fitBounds(bounds);
            console.log('Map adjusted to show all', participants.size, 'participants');
        }
    }, [participants]);

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
                // Always update for all participants, including local, to ensure state is correct
                updateParticipantFromMetadata(participant);
                console.log('✅ Updated participant display for:', participant.identity);
            });

            newRoom.on(RoomEvent.TrackSubscribed, () => {
                updateTrackPositions();
            });

            newRoom.on(RoomEvent.TrackUnsubscribed, () => {
                updateTrackPositions();
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
    }, [room, username, publishMyMetadataThrottled, updateParticipantFromMetadata, removeParticipant, updateTrackPositions, isConnected, livekitRoom, isConnecting, refreshAllMarkers]);    // Initialize everything
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
            setListeningToMusic(null);
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

    // Ensure all participants have markers when map is ready or participants change
    useEffect(() => {
        if (mapRef.current && participants.size > 0) {
            console.log('🗺️ Map ready with', participants.size, 'participants, ensuring all markers exist...');
            refreshAllMarkers();
        }
    }, [participants.size, refreshAllMarkers]); // Trigger when participant count changes

    // Helper function to check if user is listening to any music
    const isListeningToAnyMusic = listeningToMusic !== null;

    // Stop music publishing
    const stopMusicPublishing = useCallback(async () => {
        if (!livekitRoom || !currentMusicTrackRef.current) {
            console.log('No room or track to stop');
            return;
        }

        try {
            console.log('Stopping music publishing...');

            // First stop the audio element to stop sound immediately
            if (currentMusicTrackRef.current.audioElement) {
                currentMusicTrackRef.current.audioElement.pause();
                currentMusicTrackRef.current.audioElement.currentTime = 0;
            }

            // Stop the track before unpublishing
            if (currentMusicTrackRef.current.track) {
                currentMusicTrackRef.current.track.stop();

                // Unpublish the track
                await livekitRoom.localParticipant.unpublishTrack(currentMusicTrackRef.current.track);
            }

            // Clean up audio element
            if (currentMusicTrackRef.current.audioElement) {
                // Revoke the object URL to free memory
                if (currentMusicTrackRef.current.audioElement.src && currentMusicTrackRef.current.audioElement.src.startsWith('blob:')) {
                    URL.revokeObjectURL(currentMusicTrackRef.current.audioElement.src);
                }
                currentMusicTrackRef.current.audioElement.src = '';
            }

            // Clean up references
            currentMusicTrackRef.current = null;

            // Update state
            setIsPublishingMusic(false);
            setIsMusicPaused(false);
            console.log('Music publishing stopped successfully');

        } catch (error) {
            console.error('Error stopping music:', error);
            // Still update state even if there's an error to prevent UI stuck state
            setIsPublishingMusic(false);
            setIsMusicPaused(false);
            currentMusicTrackRef.current = null;
        }
    }, [livekitRoom]);

    return (
        <div className="relative w-full h-screen bg-gray-900">
            {error && (
                <div className="absolute top-4 left-4 right-4 z-10 bg-red-500 text-white p-4 rounded-lg shadow-lg">
                    <div className="font-bold mb-2">Error</div>
                    <pre className="whitespace-pre-wrap text-sm">{error}</pre>
                </div>
            )}

            <div className="absolute top-4 left-4 z-10 bg-black/80 text-white rounded-lg backdrop-blur-sm">
                <button
                    onClick={() => setRoomInfoExpanded(!roomInfoExpanded)}
                    className="w-full p-3 text-left hover:bg-white/10 transition-colors rounded-lg"
                >
                    <div className="text-sm font-bold text-green-400 flex items-center justify-between">
                        <span>🎵 Vibes Hunters</span>
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
                                <div>Accuracy: <span className="text-cyan-300">{Math.round(gpsAccuracy)}m</span></div>
                            )}
                            <div className="border-t border-gray-600 pt-1 mt-2">
                                <div>Hunters Online: <span className="text-purple-300">{participants.size}</span></div>
                                {participants.size > 0 && (
                                    <div className="mt-1 text-xs">
                                        <div className="text-gray-300">Active Hunters:</div>
                                        {Array.from(participants.values()).slice(0, 5).map((participant) => (
                                            <div
                                                key={participant.userId}
                                                className="text-gray-400 truncate flex items-center justify-between hover:text-white hover:bg-gray-700 px-1 rounded cursor-pointer transition-colors"
                                                onClick={() => {
                                                    centerMapOnUser(participant.position);
                                                    console.log('Centered map on participant:', participant.username);
                                                }}
                                                title={`Click to center map on ${participant.username}`}
                                            >
                                                <span>
                                                    {participant.isPublishingMusic ? '🎵' : '👤'} {participant.username}
                                                </span>
                                                <div className="text-xs text-gray-500">
                                                    {Math.round(Math.sqrt(
                                                        Math.pow((participant.position.x - myPosition.x) * 111000, 2) +
                                                        Math.pow((participant.position.y - myPosition.y) * 111000, 2)
                                                    ))}m
                                                </div>
                                            </div>
                                        ))}
                                        {participants.size > 5 && (
                                            <div className="text-gray-500">...and {participants.size - 5} more</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => centerMapOnUser()}
                                className="mt-2 bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full"
                            >
                                📍 Center on Me
                            </button>
                            <button
                                onClick={() => showAllParticipants()}
                                className="mt-1 bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full"
                            >
                                🌍 Show All Hunters
                            </button>
                            {process.env.NODE_ENV === 'development' && (
                                <button
                                    onClick={() => {
                                        logParticipantState();
                                        refreshAllMarkers();
                                    }}
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
                            {showVoiceRange && (
                                <div className="mt-2 p-2 bg-black/40 rounded">
                                    <EarshotRadius
                                        show={showVoiceRange}
                                        radius={50}
                                        onToggle={() => setShowVoiceRange(!showVoiceRange)}
                                    />
                                </div>
                            )}

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

            {!error && (
                <div className="absolute bottom-4 left-4 z-10 bg-black/80 text-white rounded-lg backdrop-blur-sm">
                    <button
                        onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                        className="w-full p-3 text-left hover:bg-white/10 transition-colors rounded-lg"
                        title="Help & Instructions"
                    >
                        <div className="text-sm font-bold text-green-400 flex items-center justify-between">
                            <span>❓ Help</span>
                            <span className="text-xs">{instructionsExpanded ? '▼' : '▶'}</span>
                        </div>
                    </button>

                    {instructionsExpanded && (
                        <div className="p-3 pt-0">
                            <div className="text-sm space-y-1">
                                <div>• Your position updates automatically via GPS</div>
                                <div>• Click on the map for manual positioning</div>
                                <div>• Click on 📻 boombox to join music parties</div>
                                <div>• Use 🎤 button for proximity voice chat</div>
                                <div>• Experience spatial audio as you move around</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {locationPermission === 'denied' && (
                <div className="absolute bottom-4 right-4 z-10 bg-orange-600 text-white p-3 rounded-lg backdrop-blur-sm">
                    <div className="text-sm">
                        <div className="font-bold mb-1">📍 Enable GPS</div>
                        <div className="mb-2">For the best experience, enable location access in your browser.</div>
                        <button
                            onClick={async () => {
                                const result = await requestLocationPermission();
                                if (result.success) {
                                    startLocationTracking();
                                    // Recenter map on new location
                                    if (result.position) {
                                        centerMapOnUser(result.position);
                                    }
                                }
                            }}
                            className="bg-orange-500 hover:bg-orange-400 px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                            Request Location
                        </button>
                    </div>
                </div>
            )}

            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Microphone Button for Spatial Voice Chat */}
            <MicrophoneButton
                room={livekitRoom}
                localParticipant={livekitRoom?.localParticipant || null}
            />

            {/* Bottom Center Music Button */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                <button
                    onClick={async () => {
                        if (isPublishingMusic) {
                            if (isMusicPaused) {
                                // If paused, resume the music
                                if (currentMusicTrackRef.current?.audioElement) {
                                    try {
                                        await currentMusicTrackRef.current.audioElement.play();
                                        setIsMusicPaused(false);
                                        console.log('Music resumed');
                                    } catch (error) {
                                        console.error('Error resuming music:', error);
                                    }
                                }
                            } else {
                                // If playing, pause the music
                                if (currentMusicTrackRef.current?.audioElement) {
                                    currentMusicTrackRef.current.audioElement.pause();
                                    setIsMusicPaused(true);
                                    console.log('Music paused');
                                }
                            }
                        } else if (isListeningToAnyMusic) {
                            // If listening to someone else's music, show option to disconnect
                            const confirmLeave = confirm(`You are listening to a music party. Leave it?`);
                            if (confirmLeave && listeningToMusic) {
                                await leaveMusicParty(listeningToMusic);
                                setListeningToMusic(null);
                                console.log('Left music party');
                            }
                        } else {
                            // If not publishing or listening, show dialog to start
                            setSelectedMusicUser({
                                userId: 'self',
                                username,
                                avatar,
                                position: myPosition,
                                isPublishingMusic
                            });
                        }
                    }}
                    className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-300 ${isPublishingMusic
                        ? isMusicPaused
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        : isListeningToAnyMusic
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                        } flex items-center justify-center text-white text-2xl`}
                    title={
                        isPublishingMusic
                            ? isMusicPaused ? "Resume Music" : "Pause Music"
                            : isListeningToAnyMusic
                                ? "Disconnect from Music"
                                : "Start Music Party"
                    }
                >
                    {isPublishingMusic
                        ? isMusicPaused ? '▶️' : '⏸️'
                        : isListeningToAnyMusic ? '🎧' : '🎵'
                    }
                </button>

                {/* Stop Button - Only show when music is playing or paused */}
                {isPublishingMusic && (
                    <button
                        onClick={async () => {
                            await stopMusicPublishing();
                            setIsMusicPaused(false);
                        }}
                        className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center text-white text-lg"
                        title="Stop Music Party"
                    >
                        ⏹️
                    </button>
                )}

                {/* Music Status Indicator */}
                {isListeningToAnyMusic && (
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                        Listening to music party
                    </div>
                )}
            </div>

            {selectedMusicUser && (
                <BoomboxMusicDialog
                    user={selectedMusicUser}
                    onClose={() => setSelectedMusicUser(null)}
                    onJoin={async () => {
                        // Only relevant for remote users joining/leaving music parties
                        if (selectedMusicUser.userId !== 'self') {
                            console.log('Managing music party for:', selectedMusicUser.username, 'userId:', selectedMusicUser.userId);

                            const isCurrentlyListening = listeningToMusic === selectedMusicUser.userId;

                            try {
                                // Enable audio context first (important for mobile)
                                await enableAudioContext();

                                if (isCurrentlyListening) {
                                    // Leave the current music party
                                    const success = await leaveMusicParty(selectedMusicUser.userId);
                                    if (success) {
                                        setListeningToMusic(null);
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
                                        setSelectedMusicUser(null);
                                        return;
                                    }

                                    // Check if user is already listening to a different music party
                                    const currentMusicParty = getCurrentMusicParty();
                                    if (currentMusicParty && currentMusicParty !== selectedMusicUser.userId) {
                                        const currentPartyUser = participants.get(currentMusicParty);
                                        const confirmSwitch = confirm(`You are currently listening to ${currentPartyUser?.username || 'another user'}'s music party. Switch to ${selectedMusicUser.username}'s party?`);
                                        if (!confirmSwitch) {
                                            setSelectedMusicUser(null);
                                            return;
                                        }
                                    }

                                    // If already listening to another music party, leave it first
                                    if (listeningToMusic && listeningToMusic !== selectedMusicUser.userId) {
                                        console.log('Leaving current music party before joining new one');
                                        await leaveMusicParty(listeningToMusic);
                                        setListeningToMusic(null);
                                    }

                                    // Join the new music party
                                    const success = await subscribeToParticipant(selectedMusicUser.userId);
                                    if (success) {
                                        setListeningToMusic(selectedMusicUser.userId);
                                        console.log('Successfully joined music party:', selectedMusicUser.username);
                                        alert(`Joined ${selectedMusicUser.username}'s music party! 🎵`);
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
                        setSelectedMusicUser(null);
                    }}
                    room={livekitRoom}
                    isPublishing={isPublishingMusic}
                    isPaused={isMusicPaused}
                    onPublishStart={(filename, track, audioElement) => {
                        if (track && audioElement) {
                            currentMusicTrackRef.current = { track, audioElement };
                        }
                        setIsPublishingMusic(true);
                        setIsMusicPaused(false);
                        console.log(`Started publishing: ${filename}`);
                    }}
                    onPublishStop={() => {
                        setIsPublishingMusic(false);
                        setIsMusicPaused(false);
                        currentMusicTrackRef.current = null;
                        console.log('Stopped publishing music');
                    }}
                    onPublishPause={() => {
                        setIsMusicPaused(true);
                        console.log('Paused publishing music');
                    }}
                    onPublishResume={() => {
                        setIsMusicPaused(false);
                        console.log('Resumed publishing music');
                    }}
                    isListening={listeningToMusic === selectedMusicUser.userId}
                    isSelf={selectedMusicUser.userId === 'self'}
                />
            )}
        </div>
    );
}
