"use client";

import { useEffect, useRef, useCallback } from 'react';
import { Room, RemoteAudioTrack, RemoteParticipant, RoomEvent, RemoteTrack, RemoteTrackPublication } from 'livekit-client';
import { SpatialAudioController } from '@/components/SpatialAudioController';
import { Vector2, UserPosition } from '@/types';

// Proximity-based voice chat configuration
const VOICE_CHAT_RADIUS = 50; // Distance in meters where voice chat becomes active

// Helper function to calculate distance between two positions
function calculateDistance(pos1: Vector2, pos2: Vector2): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function useSpatialAudio(room: Room | null, participants: Map<string, UserPosition>, myPosition: Vector2) {
    const controllerRef = useRef<SpatialAudioController | null>(null);
    const isInitializedRef = useRef(false);
    const subscriptionRetryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const reconnectionAttempts = useRef<Map<string, number>>(new Map());
    const joinedMusicTracks = useRef<Set<string>>(new Set()); // Track which music parties the user has explicitly joined

    // Initialize spatial audio controller
    useEffect(() => {
        if (!room || isInitializedRef.current) return;

        const initializeController = async () => {
            try {
                // Add delay to ensure room is fully connected
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Double check room is still valid and connected
                if (!room || room.state !== 'connected') {
                    console.log('Room not connected, skipping spatial audio initialization');
                    return;
                }

                if (!controllerRef.current) {
                    controllerRef.current = new SpatialAudioController();
                    await controllerRef.current.initialize();
                    isInitializedRef.current = true;
                    console.log('Spatial audio controller initialized successfully');
                }
            } catch (error) {
                console.error('Failed to initialize spatial audio:', error);
                // Reset state on failure
                isInitializedRef.current = false;
                if (controllerRef.current) {
                    try {
                        controllerRef.current.destroy();
                    } catch (destroyError) {
                        console.error('Error destroying spatial audio controller:', destroyError);
                    }
                    controllerRef.current = null;
                }
            }
        };

        // Only initialize if room is connected
        if (room.state === 'connected') {
            initializeController();
        } else {
            // Wait for room to connect
            const handleConnected = () => {
                console.log('Room connected, initializing spatial audio');
                initializeController();
                room.off('connected', handleConnected);
            };
            room.on('connected', handleConnected);

            return () => {
                room.off('connected', handleConnected);
            };
        }

        return () => {
            if (controllerRef.current) {
                controllerRef.current.destroy();
                controllerRef.current = null;
                isInitializedRef.current = false;
            }
        };
    }, [room]);

    // Cleanup on room disconnection or component unmount
    useEffect(() => {
        const cleanup = () => {
            // Clear all retry timeouts
            subscriptionRetryTimeouts.current.forEach(timeout => clearTimeout(timeout));
            subscriptionRetryTimeouts.current.clear();

            // Clear reconnection attempts
            reconnectionAttempts.current.clear();

            // Clean up all audio elements
            const audioElements = document.querySelectorAll('audio[data-participant]');
            audioElements.forEach(element => {
                const audioEl = element as HTMLAudioElement;
                audioEl.pause();
                audioEl.remove();
            });

            console.log('Spatial audio cleanup completed');
        };

        if (!room) {
            cleanup();
            return;
        }

        // Handle room disconnection
        const handleDisconnected = () => {
            console.log('Room disconnected, cleaning up spatial audio');
            cleanup();
        };

        const handleRoomReconnecting = () => {
            console.log('Room reconnecting...');
        };

        const handleRoomReconnected = () => {
            console.log('Room reconnected, reinitializing spatial audio');
            // Reset initialization state to allow re-initialization
            isInitializedRef.current = false;
        };

        room.on('disconnected', handleDisconnected);
        room.on('reconnecting', handleRoomReconnecting);
        room.on('reconnected', handleRoomReconnected);

        return () => {
            room.off('disconnected', handleDisconnected);
            room.off('reconnecting', handleRoomReconnecting);
            room.off('reconnected', handleRoomReconnected);
            cleanup();
        };
    }, [room]);

    // Update listener position when user moves
    useEffect(() => {
        if (controllerRef.current && myPosition) {
            controllerRef.current.updateListenerPosition(myPosition);
        }
    }, [myPosition]);

    // Update source positions when participants move
    useEffect(() => {
        if (!controllerRef.current) return;

        participants.forEach((participant, identity) => {
            controllerRef.current!.updateSourcePosition(identity, participant.position);
        });
    }, [participants]);

    // Proximity-based voice chat subscription management
    useEffect(() => {
        if (!room || !controllerRef.current || !myPosition) return;

        // Check each remote participant for proximity-based voice subscription
        room.remoteParticipants.forEach((participant) => {
            const participantData = participants.get(participant.identity);
            if (!participantData) return;

            const distance = calculateDistance(myPosition, participantData.position);
            const isWithinVoiceRange = distance <= VOICE_CHAT_RADIUS;

            // Check for voice tracks (not music tracks)
            participant.audioTrackPublications.forEach((publication) => {
                const isVoiceTrack = !publication.trackName?.startsWith('music-');

                if (isVoiceTrack && publication.track) {
                    if (isWithinVoiceRange && !controllerRef.current?.hasAudioSource(participant.identity)) {
                        // Add to spatial audio if close enough and not already added
                        if (publication.track instanceof RemoteAudioTrack && controllerRef.current) {
                            console.log(`🎤 Adding voice track for ${participant.identity} (entered range: ${distance.toFixed(1)}m)`);
                            controllerRef.current.addAudioSource(participant, publication.track, participantData.position, publication.trackName);

                            // Set volume based on distance
                            const volumeMultiplier = Math.max(0, 1 - (distance / VOICE_CHAT_RADIUS));
                            controllerRef.current.setSourceVolume(participant.identity, volumeMultiplier);
                        }
                    } else if (!isWithinVoiceRange && controllerRef.current?.hasAudioSource(participant.identity)) {
                        // Remove from spatial audio if too far away
                        console.log(`🔇 Removing voice track for ${participant.identity} (left range: ${distance.toFixed(1)}m)`);
                        controllerRef.current.removeAudioSource(participant.identity);
                    } else if (isWithinVoiceRange && controllerRef.current?.hasAudioSource(participant.identity)) {
                        // Update volume based on current distance
                        const volumeMultiplier = Math.max(0, 1 - (distance / VOICE_CHAT_RADIUS));
                        controllerRef.current.setSourceVolume(participant.identity, volumeMultiplier);
                    }
                }
            });
        });
    }, [room, participants, myPosition]);

    // Handle new remote audio tracks
    const handleTrackSubscribed = useCallback((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (!controllerRef.current || track.kind !== 'audio') return;

        try {
            const participantData = participants.get(participant.identity);
            if (participantData && track instanceof RemoteAudioTrack) {
                const isMusicTrack = publication.trackName?.startsWith('music-');

                if (isMusicTrack) {
                    // Music tracks: Only play if user has explicitly joined this participant's music party
                    const hasJoinedParty = joinedMusicTracks.current.has(participant.identity);

                    if (!hasJoinedParty) {
                        console.log('Music track available but user has not joined party for:', participant.identity);
                        return; // Don't auto-play music tracks
                    }

                    console.log('Playing music track for joined party:', publication.trackName, 'from:', participant.identity);

                    // Remove any existing audio elements for this participant to prevent duplicates
                    const existingElements = document.querySelectorAll(`audio[data-participant="${participant.identity}"]`);
                    existingElements.forEach(element => {
                        const audioEl = element as HTMLAudioElement;
                        audioEl.pause();
                        audioEl.remove();
                    });

                    // Create audio element for direct playback
                    const audioElement = document.createElement('audio');
                    audioElement.autoplay = true;
                    audioElement.setAttribute('playsinline', 'true'); // For mobile compatibility
                    audioElement.volume = 1.0; // Full volume for music
                    audioElement.setAttribute('data-participant', participant.identity);
                    audioElement.setAttribute('data-track', publication.trackName || 'music');

                    // Set the media stream
                    if (track.mediaStream) {
                        audioElement.srcObject = track.mediaStream;

                        // Handle autoplay restrictions
                        const playPromise = audioElement.play();
                        if (playPromise !== undefined) {
                            playPromise
                                .then(() => {
                                    console.log('✅ Music track audio element playing for joined party:', participant.identity);
                                })
                                .catch((error) => {
                                    console.warn('Autoplay prevented for music track. User interaction required:', error);

                                    // Enhanced mobile detection and handling
                                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                                    if (isMobile) {
                                        console.log('Mobile device detected, waiting for user interaction');
                                    }

                                    // Add multiple event handlers to resume playback
                                    const resumeAudio = () => {
                                        audioElement.play()
                                            .then(() => {
                                                console.log('✅ Music track resumed after user interaction');
                                                // Remove all event listeners after successful play
                                                document.removeEventListener('click', resumeAudio);
                                                document.removeEventListener('touchstart', resumeAudio);
                                                document.removeEventListener('keydown', resumeAudio);
                                                window.removeEventListener('focus', resumeAudio);
                                            })
                                            .catch(resumeError => {
                                                console.error('Failed to resume music after user interaction:', resumeError);
                                            });
                                    };

                                    // Multiple interaction event listeners for better compatibility
                                    document.addEventListener('click', resumeAudio, { once: true });
                                    document.addEventListener('touchstart', resumeAudio, { once: true });
                                    document.addEventListener('keydown', resumeAudio, { once: true });
                                    window.addEventListener('focus', resumeAudio, { once: true });

                                    // Cleanup after 30 seconds to prevent memory leaks
                                    setTimeout(() => {
                                        document.removeEventListener('click', resumeAudio);
                                        document.removeEventListener('touchstart', resumeAudio);
                                        document.removeEventListener('keydown', resumeAudio);
                                        window.removeEventListener('focus', resumeAudio);
                                    }, 30000);
                                });
                        }
                    } else {
                        console.error('No media stream available for music track:', participant.identity);
                    }
                } else {
                    // Voice tracks: Use spatial audio processing with proximity check
                    const distance = calculateDistance(myPosition, participantData.position);

                    if (distance <= VOICE_CHAT_RADIUS) {
                        console.log(`Adding spatial audio source for voice track (distance: ${distance.toFixed(1)}m):`, participant.identity, 'track:', publication.trackName);
                        controllerRef.current.addAudioSource(participant, track, participantData.position, publication.trackName);

                        // Calculate volume based on distance for proximity-based voice chat
                        const volumeMultiplier = Math.max(0, 1 - (distance / VOICE_CHAT_RADIUS));
                        controllerRef.current.setSourceVolume(participant.identity, volumeMultiplier);

                        console.log(`Voice chat enabled for ${participant.identity} at distance ${distance.toFixed(1)}m (volume: ${(volumeMultiplier * 100).toFixed(0)}%)`);
                    } else {
                        console.log(`Participant ${participant.identity} too far for voice chat (distance: ${distance.toFixed(1)}m > ${VOICE_CHAT_RADIUS}m)`);
                        // Don't add to spatial audio if too far
                    }
                }
            } else {
                console.log('Participant data not found or track not audio:', participant.identity);
            }
        } catch (error) {
            console.error('Error handling track subscription:', error);
        }
    }, [participants, myPosition]);

    // Handle removed remote audio tracks with enhanced cleanup
    const handleTrackUnsubscribed = useCallback((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (!controllerRef.current || track.kind !== 'audio') return;

        try {
            const isMusicTrack = publication.trackName?.startsWith('music-');

            if (isMusicTrack) {
                // Clean up music track audio element
                console.log('Cleaning up music track audio element for:', participant.identity);
                const audioElements = document.querySelectorAll(`audio[data-participant="${participant.identity}"]`);
                audioElements.forEach(element => {
                    const audioElement = element as HTMLAudioElement;
                    audioElement.pause();
                    // Revoke object URL if it exists to prevent memory leaks
                    if (audioElement.src && audioElement.src.startsWith('blob:')) {
                        URL.revokeObjectURL(audioElement.src);
                    }
                    audioElement.srcObject = null;
                    audioElement.remove();
                });
            } else {
                // Remove spatial audio source for voice tracks
                console.log('Removing spatial audio source for:', participant.identity);
                controllerRef.current.removeAudioSource(participant.identity);
            }

            // Clear any retry attempts for this participant
            const participantRetryKeys = Array.from(reconnectionAttempts.current.keys())
                .filter(key => key.startsWith(participant.identity));
            participantRetryKeys.forEach(key => {
                reconnectionAttempts.current.delete(key);
                const timeout = subscriptionRetryTimeouts.current.get(key);
                if (timeout) {
                    clearTimeout(timeout);
                    subscriptionRetryTimeouts.current.delete(key);
                }
            });
        } catch (error) {
            console.error('Error handling track unsubscription:', error);
        }
    }, []);

    // Setup room event listeners
    useEffect(() => {
        if (!room) return;

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

        return () => {
            room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
            room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        };
    }, [room, handleTrackSubscribed, handleTrackUnsubscribed]);

    // Utility functions
    const setMasterVolume = useCallback((volume: number) => {
        controllerRef.current?.setMasterVolume(volume);
    }, []);

    const setSourceVolume = useCallback((participantIdentity: string, volume: number) => {
        controllerRef.current?.setSourceVolume(participantIdentity, volume);
    }, []);

    // Enable audio context after user interaction (required for mobile)
    const enableAudioContext = useCallback(async () => {
        if (controllerRef.current?.audioContext && controllerRef.current.audioContext.state === 'suspended') {
            try {
                await controllerRef.current.audioContext.resume();
                console.log('✅ Audio context resumed after user interaction');
                return true;
            } catch (error) {
                console.error('Failed to resume audio context:', error);
                return false;
            }
        }
        return true;
    }, []); const subscribeToParticipant = useCallback(async (participantIdentity: string, maxRetries: number = 3) => {
        if (!room) {
            console.error('Room not available for subscription');
            return false;
        }

        if (!participantIdentity || participantIdentity === 'self') {
            console.error('Invalid participant identity:', participantIdentity);
            return false;
        }

        // Ensure audio context is enabled (especially important for mobile)
        await enableAudioContext();

        // Before joining a new music party, leave any currently joined party (only one party at a time)
        if (joinedMusicTracks.current.size > 0) {
            console.log('Leaving current music parties before joining new one (only one party allowed at a time)');
            const currentParties = Array.from(joinedMusicTracks.current);
            for (const currentPartyId of currentParties) {
                if (currentPartyId !== participantIdentity) {
                    console.log('Auto-leaving music party:', currentPartyId);

                    // Stop and remove audio elements for the current party
                    const audioElements = document.querySelectorAll(`audio[data-participant="${currentPartyId}"]`);
                    audioElements.forEach(element => {
                        const audioEl = element as HTMLAudioElement;
                        audioEl.pause();
                        audioEl.remove();
                    });

                    // Remove from joined set
                    joinedMusicTracks.current.delete(currentPartyId);

                    // Unsubscribe from music tracks
                    const currentParticipant = room.remoteParticipants.get(currentPartyId);
                    if (currentParticipant) {
                        for (const publication of currentParticipant.audioTrackPublications.values()) {
                            const isMusicTrack = publication.trackName?.startsWith('music-');
                            if (isMusicTrack && publication.isSubscribed) {
                                try {
                                    await publication.setSubscribed(false);
                                    console.log('Unsubscribed from music track for auto-leave:', publication.trackName);
                                } catch (error) {
                                    console.error('Failed to unsubscribe from music track during auto-leave:', error);
                                }
                            }
                        }
                    }
                }
            }
        }

        let attempts = 0;

        const attemptSubscription = async (): Promise<boolean> => {
            attempts++;

            try {
                const participant = room.remoteParticipants.get(participantIdentity);
                if (!participant) {
                    console.error('Participant not found:', participantIdentity, 'Available participants:', Array.from(room.remoteParticipants.keys()));
                    return false;
                }

                console.log(`Attempting to subscribe to participant: ${participantIdentity} (attempt ${attempts})`);

                // Subscribe to audio tracks (both music and voice)
                const audioTracks = participant.audioTrackPublications;
                let subscribed = false;

                console.log('Available audio tracks:', audioTracks.size);

                for (const publication of audioTracks.values()) {
                    // Priority for music tracks - users joining music parties want to hear the music
                    const isMusicTrack = publication.trackName?.startsWith('music-');
                    const trackType = isMusicTrack ? 'music track' : 'voice track';

                    console.log(`Processing ${trackType}:`, publication.trackName, 'isSubscribed:', publication.isSubscribed, 'hasTrack:', !!publication.track);

                    if (!publication.isSubscribed && publication.track === undefined) {
                        try {
                            console.log(`Subscribing to ${trackType}:`, publication.trackName);
                            await publication.setSubscribed(true);

                            // Wait a bit for subscription to take effect
                            await new Promise(resolve => setTimeout(resolve, 500));

                            subscribed = true;
                            console.log(`✅ Successfully subscribed to ${trackType} from:`, participantIdentity);
                        } catch (subError) {
                            console.error(`❌ Failed to subscribe to ${trackType}:`, subError);
                            throw subError; // Re-throw to trigger retry
                        }
                    } else if (publication.track) {
                        console.log(`✅ Already subscribed to ${trackType} from:`, participantIdentity);
                        subscribed = true;
                    }
                }

                if (subscribed) {
                    // Add participant to joined music tracks set
                    joinedMusicTracks.current.add(participantIdentity);
                    console.log('🎵 Successfully joined music party from:', participantIdentity);
                    console.log('👥 Currently joined music parties:', Array.from(joinedMusicTracks.current));
                    return true;
                } else {
                    console.warn('⚠️ No tracks were subscribed for participant:', participantIdentity);
                    return false;
                }
            } catch (error) {
                console.error(`❌ Failed to subscribe to participant (attempt ${attempts}):`, error);

                if (attempts < maxRetries) {
                    const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
                    console.log(`Retrying subscription to ${participantIdentity} in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return attemptSubscription();
                } else {
                    console.error(`❌ Failed to subscribe after ${maxRetries} attempts`);
                    return false;
                }
            }
        };

        return attemptSubscription();
    }, [room, enableAudioContext]);

    // Debug function to list active audio elements
    const getActiveAudioElements = useCallback(() => {
        const audioElements = document.querySelectorAll('audio[data-participant]');
        console.log('Active audio elements:', audioElements.length);
        audioElements.forEach(element => {
            const audioEl = element as HTMLAudioElement;
            console.log('- Participant:', audioEl.getAttribute('data-participant'),
                'Track:', audioEl.getAttribute('data-track'),
                'Playing:', !audioEl.paused,
                'Volume:', audioEl.volume,
                'ReadyState:', audioEl.readyState);
        });
        return audioElements;
    }, []);

    // Connection health monitoring
    const checkConnectionHealth = useCallback(() => {
        if (!room) return null;

        const health = {
            roomState: room.state,
            participantCount: room.remoteParticipants.size,
            localTracks: room.localParticipant.audioTrackPublications.size,
            subscribedTracks: 0,
            spatialSources: 0, // TODO: Add public method to get source count
            audioElements: document.querySelectorAll('audio[data-participant]').length
        };

        // Count subscribed tracks
        room.remoteParticipants.forEach(participant => {
            participant.audioTrackPublications.forEach(publication => {
                if (publication.isSubscribed && publication.track) {
                    health.subscribedTracks++;
                }
            });
        });

        console.log('🏥 Connection Health:', health);
        return health;
    }, [room]);

    // Retry subscription with exponential backoff
    const retrySubscription = useCallback(async (
        participantId: string,
        publication: RemoteTrackPublication,
        subscribe: boolean
    ) => {
        const maxRetries = 3;
        const retryKey = `${participantId}-${publication.trackSid}`;

        let attempts = reconnectionAttempts.current.get(retryKey) || 0;

        const attemptSubscription = async (): Promise<boolean> => {
            try {
                console.log(`${subscribe ? 'Subscribing to' : 'Unsubscribing from'} voice track for ${participantId} (attempt ${attempts + 1})`);
                await publication.setSubscribed(subscribe);

                // Reset attempts on success
                reconnectionAttempts.current.delete(retryKey);
                return true;
            } catch (error) {
                console.error(`Failed to ${subscribe ? 'subscribe' : 'unsubscribe'} voice track for ${participantId}:`, error);
                attempts++;
                reconnectionAttempts.current.set(retryKey, attempts);

                if (attempts < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, attempts) * 1000;
                    console.log(`Retrying ${subscribe ? 'subscription' : 'unsubscription'} for ${participantId} in ${delay}ms`);

                    const timeout = setTimeout(() => {
                        attemptSubscription();
                        subscriptionRetryTimeouts.current.delete(retryKey);
                    }, delay);

                    subscriptionRetryTimeouts.current.set(retryKey, timeout);
                    return false;
                } else {
                    console.error(`Failed to ${subscribe ? 'subscribe' : 'unsubscribe'} after ${maxRetries} attempts for ${participantId}`);
                    reconnectionAttempts.current.delete(retryKey);
                    return false;
                }
            }
        };

        return attemptSubscription();
    }, []);

    // Function to leave a music party (disconnect from a participant's music tracks)
    const leaveMusicParty = useCallback(async (participantIdentity: string) => {
        if (!room) {
            console.error('Room not available for leaving music party');
            return false;
        }

        try {
            const participant = room.remoteParticipants.get(participantIdentity);
            if (!participant) {
                console.error('Participant not found:', participantIdentity);
                return false;
            }

            console.log('Leaving music party from:', participantIdentity);

            // Remove from joined music tracks set
            joinedMusicTracks.current.delete(participantIdentity);

            // Stop and remove any audio elements for this participant
            const audioElements = document.querySelectorAll(`audio[data-participant="${participantIdentity}"]`);
            audioElements.forEach(element => {
                const audioEl = element as HTMLAudioElement;
                audioEl.pause();
                audioEl.remove();
            });

            // Unsubscribe from music tracks only (keep voice tracks if in proximity)
            for (const publication of participant.audioTrackPublications.values()) {
                const isMusicTrack = publication.trackName?.startsWith('music-');
                if (isMusicTrack && publication.isSubscribed) {
                    try {
                        await publication.setSubscribed(false);
                        console.log('Unsubscribed from music track:', publication.trackName);
                    } catch (error) {
                        console.error('Failed to unsubscribe from music track:', error);
                    }
                }
            }

            console.log('✅ Successfully left music party from:', participantIdentity);
            console.log('👥 Currently joined music parties:', Array.from(joinedMusicTracks.current));
            return true;

        } catch (error) {
            console.error('Error leaving music party:', error);
            return false;
        }
    }, [room]);

    // Check if user has joined a specific participant's music party
    const hasJoinedMusicParty = useCallback((participantIdentity: string) => {
        return joinedMusicTracks.current.has(participantIdentity);
    }, []);

    // Get the current music party the user is listening to (should be at most one)
    const getCurrentMusicParty = useCallback(() => {
        const parties = Array.from(joinedMusicTracks.current);
        return parties.length > 0 ? parties[0] : null;
    }, []);

    // Function to manage proximity-based voice subscriptions with retry logic
    const manageVoiceProximity = useCallback(async () => {
        if (!room || !myPosition) return;

        // Clear any previous retry timeouts
        subscriptionRetryTimeouts.current.forEach(timeout => clearTimeout(timeout));
        subscriptionRetryTimeouts.current.clear();

        // Iterate through all remote participants
        for (const [participantId, participant] of room.remoteParticipants) {
            const participantData = participants.get(participantId);
            if (!participantData) continue;

            const distance = calculateDistance(myPosition, participantData.position);
            const isWithinVoiceRange = distance <= VOICE_CHAT_RADIUS;

            // Check for voice tracks (exclude music tracks)
            for (const publication of participant.audioTrackPublications.values()) {
                const isVoiceTrack = !publication.trackName?.startsWith('music-');

                if (isVoiceTrack) {
                    if (isWithinVoiceRange && !publication.isSubscribed) {
                        // Subscribe to voice track if within range and not subscribed
                        await retrySubscription(participantId, publication, true);
                    } else if (!isWithinVoiceRange && publication.isSubscribed) {
                        // Unsubscribe from voice track if out of range
                        await retrySubscription(participantId, publication, false);
                    }
                }
            }
        }
    }, [room, myPosition, participants, retrySubscription]);

    // Trigger proximity management when positions change
    useEffect(() => {
        manageVoiceProximity();
    }, [manageVoiceProximity, participants, myPosition]);

    return {
        isInitialized: isInitializedRef.current,
        setMasterVolume,
        setSourceVolume,
        subscribeToParticipant,
        enableAudioContext,
        getActiveAudioElements,
        manageVoiceProximity,
        checkConnectionHealth,
        controller: controllerRef.current,
        leaveMusicParty,
        hasJoinedMusicParty,
        getCurrentMusicParty
    };
}
