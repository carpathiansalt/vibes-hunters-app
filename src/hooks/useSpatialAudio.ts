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
                console.log('Adding spatial audio source for:', participant.identity, 'track:', publication.trackName);
                controllerRef.current.addAudioSource(participant, track, participantData.position, publication.trackName);
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
            console.log('Removing spatial audio source for:', participant.identity);
            controllerRef.current.removeAudioSource(participant.identity);
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
    }, []); const subscribeToParticipant = useCallback(async (participantIdentity: string) => {
        if (!room) {
            console.error('Room not available for subscription');
            return false;
        }

        try {
            const participant = room.remoteParticipants.get(participantIdentity);
            if (!participant) {
                console.error('Participant not found:', participantIdentity);
                return false;
            }

            console.log('Attempting to subscribe to participant:', participantIdentity);

            // Subscribe to audio tracks (both music and voice)
            const audioTracks = participant.audioTrackPublications;
            let subscribed = false;

            for (const publication of audioTracks.values()) {
                // Priority for music tracks - users joining music parties want to hear the music
                const isMusicTrack = publication.trackName?.startsWith('music-');

                if (!publication.isSubscribed && publication.track === undefined) {
                    try {
                        await publication.setSubscribed(true);
                        subscribed = true;
                        const trackType = isMusicTrack ? 'music track' : 'voice track';
                        console.log(`Successfully subscribed to ${trackType} from:`, participantIdentity);
                    } catch (subError) {
                        console.error('Failed to subscribe to track:', subError);
                    }
                } else if (publication.track) {
                    const trackType = isMusicTrack ? 'music track' : 'voice track';
                    console.log(`Already subscribed to ${trackType} from:`, participantIdentity);
                    subscribed = true;
                }
            }

            return subscribed;
        } catch (error) {
            console.error('Failed to subscribe to participant:', error);
            return false;
        }
    }, [room]);

    return {
        isInitialized: isInitializedRef.current,
        setMasterVolume,
        setSourceVolume,
        subscribeToParticipant,
        controller: controllerRef.current
    };
}
