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
                controllerRef.current = new SpatialAudioController();
                await controllerRef.current.initialize();
                isInitializedRef.current = true;
                console.log('Spatial audio controller initialized');
            } catch (error) {
                console.error('Failed to initialize spatial audio:', error);
            }
        };

        initializeController();

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

        const participantData = participants.get(participant.identity);
        if (participantData && track instanceof RemoteAudioTrack) {
            controllerRef.current.addAudioSource(participant, track, participantData.position);
        }
    }, [participants]);

    // Handle removed remote audio tracks
    const handleTrackUnsubscribed = useCallback((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (!controllerRef.current || track.kind !== 'audio') return;

        controllerRef.current.removeAudioSource(participant.identity);
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

    return {
        isInitialized: isInitializedRef.current,
        setMasterVolume,
        setSourceVolume,
        controller: controllerRef.current
    };
}
