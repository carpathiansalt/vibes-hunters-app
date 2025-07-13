"use client";

import { useEffect, useRef, useCallback } from 'react';
import { Room, RemoteAudioTrack, RemoteParticipant, RoomEvent, RemoteTrack, RemoteTrackPublication } from 'livekit-client';
import { SpatialAudioController } from '@/components/SpatialAudioController';
import { Vector2, UserPosition } from '@/types';

export function useSpatialAudio(room: Room | null, participants: Map<string, UserPosition>, myPosition: Vector2) {
    const controllerRef = useRef<SpatialAudioController | null>(null);
    const isInitializedRef = useRef(false);

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

    // Handle new remote audio tracks
    const handleTrackSubscribed = useCallback((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (!controllerRef.current || track.kind !== 'audio') return;

        try {
            const participantData = participants.get(participant.identity);
            if (participantData && track instanceof RemoteAudioTrack) {
                const isMusicTrack = publication.trackName?.startsWith('music-');

                if (isMusicTrack) {
                    // Music tracks: Play directly through HTML audio for full volume global playback
                    console.log('Setting up direct audio playback for music track:', publication.trackName);

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
                                    console.log('✅ Music track audio element playing for:', participant.identity);
                                })
                                .catch((error) => {
                                    console.warn('Autoplay prevented for music track. User interaction required:', error);

                                    // Show user notification for mobile compatibility
                                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                    if (isMobile) {
                                        // For mobile, show a more prominent notification
                                        alert('🎵 Tap anywhere to start hearing the music!');
                                    }

                                    // Add click handler to resume playback
                                    const resumeAudio = () => {
                                        audioElement.play()
                                            .then(() => {
                                                console.log('✅ Music track resumed after user interaction');
                                                document.removeEventListener('click', resumeAudio);
                                                document.removeEventListener('touchstart', resumeAudio);
                                            })
                                            .catch(console.error);
                                    };
                                    document.addEventListener('click', resumeAudio, { once: true });
                                    document.addEventListener('touchstart', resumeAudio, { once: true });
                                });
                        }
                    } else {
                        console.error('No media stream available for music track:', participant.identity);
                    }
                } else {
                    // Voice tracks: Use spatial audio processing
                    console.log('Adding spatial audio source for voice track:', participant.identity, 'track:', publication.trackName);
                    controllerRef.current.addAudioSource(participant, track, participantData.position, publication.trackName);
                }
            } else {
                console.log('Participant data not found or track not audio:', participant.identity);
            }
        } catch (error) {
            console.error('Error handling track subscription:', error);
        }
    }, [participants]);

    // Handle removed remote audio tracks
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
                    audioElement.remove();
                });
            } else {
                // Remove spatial audio source for voice tracks
                console.log('Removing spatial audio source for:', participant.identity);
                controllerRef.current.removeAudioSource(participant.identity);
            }
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
    }, []); const subscribeToParticipant = useCallback(async (participantIdentity: string) => {
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

        try {
            const participant = room.remoteParticipants.get(participantIdentity);
            if (!participant) {
                console.error('Participant not found:', participantIdentity, 'Available participants:', Array.from(room.remoteParticipants.keys()));
                return false;
            }

            console.log('Attempting to subscribe to participant:', participantIdentity);

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
                        subscribed = true;
                        console.log(`✅ Successfully subscribed to ${trackType} from:`, participantIdentity);
                    } catch (subError) {
                        console.error(`❌ Failed to subscribe to ${trackType}:`, subError);
                    }
                } else if (publication.track) {
                    console.log(`✅ Already subscribed to ${trackType} from:`, participantIdentity);
                    subscribed = true;
                }
            }

            if (subscribed) {
                console.log('🎵 Successfully joined music party from:', participantIdentity);
            } else {
                console.warn('⚠️ No tracks were subscribed for participant:', participantIdentity);
            }

            return subscribed;
        } catch (error) {
            console.error('❌ Failed to subscribe to participant:', error);
            return false;
        }
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
                'Volume:', audioEl.volume);
        });
        return audioElements;
    }, []);

    return {
        isInitialized: isInitializedRef.current,
        setMasterVolume,
        setSourceVolume,
        subscribeToParticipant,
        enableAudioContext,
        getActiveAudioElements,
        controller: controllerRef.current
    };
}
