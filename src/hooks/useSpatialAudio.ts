"use client";

import { useEffect, useRef, useCallback } from 'react';
import { Room, RemoteAudioTrack, RemoteParticipant, RoomEvent, RemoteTrack, RemoteTrackPublication } from 'livekit-client';
import { SpatialAudioController } from '@/components/SpatialAudioController';
import { Vector2, UserPosition } from '@/types';
import { haversineDistance } from '@/core/utils';
import { logger } from '@/core/utils';

// Proximity-based voice chat configuration
const VOICE_CHAT_RADIUS = 500; // Distance in meters where voice chat becomes active

// Helper function to calculate distance between two positions
// Use haversineDistance for real-world meters
const calculateDistance = haversineDistance;

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
                    logger.log('Room not connected, skipping spatial audio initialization');
                    return;
                }

                if (!controllerRef.current) {
                    controllerRef.current = new SpatialAudioController();
                    await controllerRef.current.initialize();
                    isInitializedRef.current = true;
                    logger.log('Spatial audio controller initialized successfully');
                }
            } catch (error) {
                logger.error('Failed to initialize spatial audio:', error);
                // Reset state on failure
                isInitializedRef.current = false;
                if (controllerRef.current) {
                    try {
                        controllerRef.current.destroy();
                    } catch (destroyError) {
                        logger.error('Error destroying spatial audio controller:', destroyError);
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
                logger.log('Room connected, initializing spatial audio');
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

            logger.log('Spatial audio cleanup completed');
        };

        if (!room) {
            cleanup();
            return;
        }

        // Handle room disconnection
        const handleDisconnected = () => {
            logger.log('Room disconnected, cleaning up spatial audio');
            cleanup();
        };

        const handleRoomReconnecting = () => {
            logger.log('Room reconnecting...');
        };

        const handleRoomReconnected = () => {
            logger.log('Room reconnected, reinitializing spatial audio');
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
                            logger.log(`🎤 Adding voice track for ${participant.identity} (entered range: ${distance.toFixed(1)}m)`);
                            controllerRef.current.addAudioSource(participant, publication.track, participantData.position, publication.trackName);

                            // Set volume based on distance (linear attenuation)
                            const volumeMultiplier = Math.max(0, 1 - (distance / VOICE_CHAT_RADIUS));
                            controllerRef.current.setSourceVolume(participant.identity, volumeMultiplier);
                        }
                    } else if (!isWithinVoiceRange && controllerRef.current?.hasAudioSource(participant.identity)) {
                        // Remove from spatial audio if too far away
                        logger.log(`🔇 Removing voice track for ${participant.identity} (left range: ${distance.toFixed(1)}m)`);
                        controllerRef.current.removeAudioSource(participant.identity);
                    } else if (isWithinVoiceRange && controllerRef.current?.hasAudioSource(participant.identity)) {
                        // Update volume based on current distance (linear attenuation)
                        const volumeMultiplier = Math.max(0, 1 - (distance / VOICE_CHAT_RADIUS));
                        controllerRef.current.setSourceVolume(participant.identity, volumeMultiplier);
                    }
                }
            });
        });
    }, [room, participants, myPosition]);

    // Handle new track publications (when tracks become available)
    const handleTrackPublished = useCallback((publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (publication.kind !== 'audio') return;

        const isMusicTrack = publication.trackName?.startsWith('music-');

        if (isMusicTrack) {
            // For music tracks, only subscribe if user has joined this participant's party
            const hasJoinedParty = joinedMusicTracks.current.has(participant.identity);

            if (hasJoinedParty) {
                logger.log('🎵 Music track published by joined party, subscribing:', publication.trackName, 'from:', participant.identity);

                // Subscribe to the track immediately since user has joined this party
                publication.setSubscribed(true);
            } else {
                logger.log('Music track published but user has not joined party for:', participant.identity);
            }
        } else {
            // For voice tracks, handle proximity-based subscription
            const participantData = participants.get(participant.identity);
            if (participantData) {
                const distance = calculateDistance(myPosition, participantData.position);
                if (distance <= VOICE_CHAT_RADIUS) {
                    logger.log('🎤 Voice track published within range, subscribing:', participant.identity);
                    publication.setSubscribed(true);
                }
            }
        }
    }, [participants, myPosition]);

    // Separate function to handle music track attachment
    const attachMusicTrack = useCallback((track: RemoteAudioTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        logger.log('🎵 Attaching music track for joined party:', publication.trackName, 'from:', participant.identity);

        // Remove any existing audio elements for this participant to prevent duplicates
        const existingElements = document.querySelectorAll(`audio[data-participant="${participant.identity}"][data-track-type="music"]`);
        existingElements.forEach(element => {
            const audioEl = element as HTMLAudioElement;
            track.detach(audioEl);
            audioEl.remove();
        });

        // Use LiveKit's recommended Track.attach() method for proper track management
        const audioElement = track.attach() as HTMLAudioElement;
        audioElement.setAttribute('data-participant', participant.identity);
        audioElement.setAttribute('data-track-type', 'music');
        audioElement.setAttribute('data-track', publication.trackName || 'music');
        audioElement.volume = 1.0; // Full volume for music
        audioElement.setAttribute('playsinline', 'true'); // For mobile compatibility

        // Append to document for playback
        document.body.appendChild(audioElement);

        // Handle autoplay restrictions more simply
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    logger.log('✅ Music track playing for joined party:', participant.identity);
                })
                .catch((error) => {
                    logger.warn('Autoplay prevented for music track. User interaction required:', error);

                    // Add single event listener to resume on next user interaction
                    const resumeAudio = () => {
                        audioElement.play()
                            .then(() => {
                                logger.log('✅ Music track resumed after user interaction');
                            })
                            .catch(resumeError => {
                                logger.error('Failed to resume music after user interaction:', resumeError);
                            });
                    };

                    // Use once option to automatically remove listener
                    document.addEventListener('click', resumeAudio, { once: true });
                    document.addEventListener('touchstart', resumeAudio, { once: true });
                });
        }
    }, []);

    // Handle new remote audio tracks - this is the primary entry point for all track handling
    const handleTrackSubscribed = useCallback((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (!controllerRef.current || track.kind !== 'audio') return;

        try {
            const participantData = participants.get(participant.identity);
            if (participantData && track instanceof RemoteAudioTrack) {
                const isMusicTrack = publication.trackName?.startsWith('music-');

                if (isMusicTrack) {
                    // Music tracks: Only attach/play if user has explicitly joined this participant's music party
                    const hasJoinedParty = joinedMusicTracks.current.has(participant.identity);

                    if (!hasJoinedParty) {
                        logger.log('🎵 Music track subscribed but user has not joined party, unsubscribing:', participant.identity);
                        // Immediately unsubscribe since user hasn't joined this party
                        publication.setSubscribed(false);
                        return;
                    }

                    logger.log('🎵 Music track subscribed for joined party, attaching and playing:', publication.trackName, 'from:', participant.identity);
                    attachMusicTrack(track, publication, participant);
                } else {
                    // Voice tracks: Use spatial audio processing with proximity check
                    const distance = calculateDistance(myPosition, participantData.position);

                    if (distance <= VOICE_CHAT_RADIUS) {
                        logger.log(`Adding spatial audio source for voice track (distance: ${distance.toFixed(1)}m):`, participant.identity, 'track:', publication.trackName);
                        controllerRef.current.addAudioSource(participant, track, participantData.position, publication.trackName);

                        // Calculate volume based on distance for proximity-based voice chat
                        const volumeMultiplier = Math.max(0, 1 - (distance / VOICE_CHAT_RADIUS));
                        controllerRef.current.setSourceVolume(participant.identity, volumeMultiplier);

                        logger.log(`Voice chat enabled for ${participant.identity} at distance ${distance.toFixed(1)}m (volume: ${(volumeMultiplier * 100).toFixed(0)}%)`);
                    } else {
                        logger.log(`Participant ${participant.identity} too far for voice chat (distance: ${distance.toFixed(1)}m > ${VOICE_CHAT_RADIUS}m)`);
                        // Don't add to spatial audio if too far
                    }
                }
            } else {
                logger.log('Participant data not found or track not audio:', participant.identity);
            }
        } catch (error) {
            logger.error('Error handling track subscription:', error);
        }
    }, [participants, myPosition, attachMusicTrack]);

    // Handle removed remote audio tracks with enhanced cleanup
    const handleTrackUnsubscribed = useCallback((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (!controllerRef.current || track.kind !== 'audio') return;

        try {
            const isMusicTrack = publication.trackName?.startsWith('music-');

            if (isMusicTrack) {
                // Clean up music track audio elements using proper detach method
                logger.log('🎵 Cleaning up music track audio element for:', participant.identity, 'track:', publication.trackName);
                
                // Remove from joined music tracks set if this was a joined party
                if (joinedMusicTracks.current.has(participant.identity)) {
                    logger.log('🎵 Removing from joined music parties:', participant.identity);
                    joinedMusicTracks.current.delete(participant.identity);
                }
                
                const audioElements = document.querySelectorAll(`audio[data-participant="${participant.identity}"][data-track-type="music"]`);
                audioElements.forEach(element => {
                    const audioElement = element as HTMLAudioElement;
                    // Use track.detach() for proper cleanup if available
                    if (track instanceof RemoteAudioTrack) {
                        track.detach(audioElement);
                    } else {
                        audioElement.pause();
                        audioElement.srcObject = null;
                    }
                    audioElement.remove();
                });
                
                // Additional cleanup: remove any audio elements that might have been missed
                const remainingAudioElements = document.querySelectorAll(`audio[data-participant="${participant.identity}"]`);
                remainingAudioElements.forEach(element => {
                    const audioElement = element as HTMLAudioElement;
                    const trackName = audioElement.getAttribute('data-track');
                    if (trackName && trackName.startsWith('music-')) {
                        logger.log('🎵 Cleaning up remaining music audio element for track:', trackName);
                        audioElement.pause();
                        audioElement.remove();
                    }
                });
            } else {
                // Remove spatial audio source for voice tracks
                logger.log('Removing spatial audio source for:', participant.identity);
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
            logger.error('Error handling track unsubscription:', error);
        }
    }, []);

    // Setup room event listeners
    useEffect(() => {
        if (!room) return;

        room.on(RoomEvent.TrackPublished, handleTrackPublished);
        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

        return () => {
            room.off(RoomEvent.TrackPublished, handleTrackPublished);
            room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
            room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        };
    }, [room, handleTrackPublished, handleTrackSubscribed, handleTrackUnsubscribed]);

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
                logger.log('✅ Audio context resumed after user interaction');
                return true;
            } catch (error) {
                logger.error('Failed to resume audio context:', error);
                return false;
            }
        }
        return true;
    }, []);

    const subscribeToParticipant = useCallback(async (participantIdentity: string, maxRetries: number = 3) => {
        if (!room) {
            logger.error('Room not available for subscription');
            return false;
        }

        if (!participantIdentity || participantIdentity === 'self') {
            logger.error('Invalid participant identity:', participantIdentity);
            return false;
        }

        // Ensure audio context is enabled (especially important for mobile)
        await enableAudioContext();

        // Before joining a new music party, leave any currently joined party (only one party at a time)
        if (joinedMusicTracks.current.size > 0) {
            logger.log('Leaving current music parties before joining new one (only one party allowed at a time)');
            const currentParties = Array.from(joinedMusicTracks.current);
            for (const currentPartyId of currentParties) {
                if (currentPartyId !== participantIdentity) {
                    logger.log('Auto-leaving music party:', currentPartyId);

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
                                    logger.log('Unsubscribed from music track for auto-leave:', publication.trackName);
                                } catch (error) {
                                    logger.error('Failed to unsubscribe from music track during auto-leave:', error);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Get fresh participant reference (in case it changed)
        const participant = room.remoteParticipants.get(participantIdentity);
        if (!participant) {
            logger.error('Participant not found after cleanup:', participantIdentity);
            return false;
        }

        // Double-check that the participant is still publishing music according to metadata
        let participantMetadata;
        try {
            participantMetadata = participant.metadata ? JSON.parse(participant.metadata) : null;
        } catch (error) {
            logger.error('Failed to parse participant metadata:', error);
            return false;
        }

        if (!participantMetadata?.isPublishingMusic) {
            logger.warn('❌ Participant metadata indicates they are not publishing music:', participantIdentity);
            return false;
        }

        logger.log(`🎵 Joining music party for: ${participantIdentity}`);

        // CRITICAL: Add to joined set BEFORE any subscription attempts
        // This ensures handleTrackSubscribed will process music tracks when they arrive
        joinedMusicTracks.current.add(participantIdentity);
        logger.log('👥 Currently joined music parties:', Array.from(joinedMusicTracks.current));

        let attempts = 0;

        const attemptSubscription = async (): Promise<boolean> => {
            attempts++;

            try {
                const participant = room.remoteParticipants.get(participantIdentity);
                if (!participant) {
                    logger.error('Participant not found:', participantIdentity);
                    joinedMusicTracks.current.delete(participantIdentity); // Cleanup on failure
                    return false;
                }

                logger.log(`Attempting to subscribe to participant: ${participantIdentity} (attempt ${attempts})`);

                const audioTracks = participant.audioTrackPublications;
                const musicTracks = Array.from(audioTracks.values()).filter(pub =>
                    pub.trackName?.startsWith('music-')
                );

                if (musicTracks.length === 0) {
                    logger.warn('❌ No music tracks found from participant:', participantIdentity);
                    joinedMusicTracks.current.delete(participantIdentity); // Cleanup on failure
                    return false;
                }

                logger.log(`Found ${musicTracks.length} music tracks, subscribing...`);

                // Subscribe to all music tracks from this participant
                for (const publication of musicTracks) {
                    if (!publication.isSubscribed) {
                        logger.log(`🎵 Subscribing to music track:`, publication.trackName);
                        await publication.setSubscribed(true);
                    }

                    // If track is already available, trigger immediate attachment
                    if (publication.track && publication.isSubscribed) {
                        logger.log(`🎵 Track immediately available, attaching:`, publication.trackName);
                        // Use setTimeout to ensure this runs after the current call stack
                        setTimeout(() => {
                            if (publication.track) {
                                handleTrackSubscribed(publication.track, publication, participant);
                            }
                        }, 100);
                    }
                }

                logger.log('✅ Successfully joined music party for:', participantIdentity);
                return true;

            } catch (error) {
                logger.error(`❌ Failed to subscribe to participant (attempt ${attempts}):`, error);

                if (attempts < maxRetries) {
                    const delay = Math.pow(2, attempts) * 500; // Exponential backoff
                    logger.log(`Retrying subscription to ${participantIdentity} in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return attemptSubscription();
                } else {
                    logger.error(`❌ Failed to subscribe after ${maxRetries} attempts`);
                    joinedMusicTracks.current.delete(participantIdentity); // Cleanup on final failure
                    return false;
                }
            }
        };

        return attemptSubscription();
    }, [room, enableAudioContext, handleTrackSubscribed]);

    // Debug function to list active audio elements
    const getActiveAudioElements = useCallback(() => {
        const audioElements = document.querySelectorAll('audio[data-participant]');
        logger.log('Active audio elements:', audioElements.length);
        audioElements.forEach(element => {
            const audioEl = element as HTMLAudioElement;
            logger.log('- Participant:', audioEl.getAttribute('data-participant'),
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

        logger.log('🏥 Connection Health:', health);
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
                logger.log(`${subscribe ? 'Subscribing to' : 'Unsubscribing from'} voice track for ${participantId} (attempt ${attempts + 1})`);
                await publication.setSubscribed(subscribe);

                // Reset attempts on success
                reconnectionAttempts.current.delete(retryKey);
                return true;
            } catch (error) {
                logger.error(`Failed to ${subscribe ? 'subscribe' : 'unsubscribe'} voice track for ${participantId}:`, error);
                attempts++;
                reconnectionAttempts.current.set(retryKey, attempts);

                if (attempts < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, attempts) * 1000;
                    logger.log(`Retrying ${subscribe ? 'subscription' : 'unsubscription'} for ${participantId} in ${delay}ms`);

                    const timeout = setTimeout(() => {
                        attemptSubscription();
                        subscriptionRetryTimeouts.current.delete(retryKey);
                    }, delay);

                    subscriptionRetryTimeouts.current.set(retryKey, timeout);
                    return false;
                } else {
                    logger.error(`Failed to ${subscribe ? 'subscribe' : 'unsubscribe'} after ${maxRetries} attempts for ${participantId}`);
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
            logger.error('Room not available for leaving music party');
            return false;
        }

        try {
            const participant = room.remoteParticipants.get(participantIdentity);
            if (!participant) {
                logger.error('Participant not found:', participantIdentity);
                return false;
            }

            logger.log('🎵 Leaving music party from:', participantIdentity);

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
                        logger.log('🎵 Unsubscribing from music track:', publication.trackName);
                        await publication.setSubscribed(false);
                        
                        // Force detach the track if it's attached to any audio elements
                        if (publication.track) {
                            const trackAudioElements = document.querySelectorAll(`audio[data-participant="${participantIdentity}"][data-track="${publication.trackName}"]`);
                            trackAudioElements.forEach(element => {
                                const audioEl = element as HTMLAudioElement;
                                if (publication.track instanceof RemoteAudioTrack) {
                                    publication.track.detach(audioEl);
                                }
                                audioEl.pause();
                                audioEl.remove();
                            });
                        }
                        
                        logger.log('✅ Successfully unsubscribed from music track:', publication.trackName);
                    } catch (error) {
                        logger.error('Failed to unsubscribe from music track:', error);
                    }
                }
            }

            // Additional cleanup: force unsubscribe from any music tracks that might still be subscribed
            // This handles edge cases where the track was unpublished but subscription wasn't cleared
            setTimeout(async () => {
                try {
                    const currentParticipant = room.remoteParticipants.get(participantIdentity);
                    if (currentParticipant) {
                        for (const publication of currentParticipant.audioTrackPublications.values()) {
                            const isMusicTrack = publication.trackName?.startsWith('music-');
                            if (isMusicTrack && publication.isSubscribed) {
                                logger.log('🎵 Force unsubscribing from remaining music track:', publication.trackName);
                                await publication.setSubscribed(false);
                            }
                        }
                    }
                } catch (error) {
                    logger.error('Error in delayed cleanup:', error);
                }
            }, 100);

            logger.log('✅ Successfully left music party from:', participantIdentity);
            logger.log('👥 Currently joined music parties:', Array.from(joinedMusicTracks.current));
            return true;

        } catch (error) {
            logger.error('Error leaving music party:', error);
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

    // Function to clean up when a participant disconnects
    const cleanupParticipant = useCallback((participantIdentity: string) => {
        // Remove from joined music tracks
        joinedMusicTracks.current.delete(participantIdentity);

        // Clean up any audio elements for this participant
        const audioElements = document.querySelectorAll(`audio[data-participant="${participantIdentity}"]`);
        audioElements.forEach(element => {
            const audioEl = element as HTMLAudioElement;
            audioEl.pause();
            audioEl.remove();
        });

        logger.log('Cleaned up participant:', participantIdentity);
        logger.log('👥 Remaining joined music parties:', Array.from(joinedMusicTracks.current));
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
        getCurrentMusicParty,
        cleanupParticipant
    };
}
