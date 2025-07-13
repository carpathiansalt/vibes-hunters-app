"use client";

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import {
    TrackPublication,
    LocalTrackPublication,
} from 'livekit-client';
import type { Vector2, TrackPosition } from '@/types';

interface SpatialPublicationRendererProps {
    trackPublication: TrackPublication;
    position: Vector2;
    myPosition: Vector2;
    audioContext: AudioContext;
    maxDistance?: number;
    refDistance?: number;
    rolloffFactor?: number;
}

function SpatialPublicationRenderer({
    trackPublication,
    position,
    myPosition,
    audioContext,
    maxDistance = 500,
    refDistance = 100,
    rolloffFactor = 2,
}: SpatialPublicationRendererProps) {
    const audioEl = useRef<HTMLAudioElement | null>(null);
    const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
    const panner = useRef<PannerNode | null>(null);

    // Calculate relative position
    const relativePosition = useMemo(() => ({
        x: position.x - myPosition.x,
        y: position.y - myPosition.y,
    }), [position.x, position.y, myPosition.x, myPosition.y]);

    // Get the media stream from the track publication
    const mediaStream = useMemo(() => {
        if (
            trackPublication instanceof LocalTrackPublication &&
            trackPublication.track
        ) {
            const mediaStreamTrack = trackPublication.track.mediaStreamTrack;
            return new MediaStream([mediaStreamTrack]);
        }

        return trackPublication.track?.mediaStream || null;
    }, [trackPublication]);

    // Cleanup function for all of the WebAudio nodes we made
    const cleanupWebAudio = useCallback(() => {
        if (panner.current) {
            try {
                panner.current.disconnect();
            } catch {
                // Node may already be disconnected
            }
        }
        if (sourceNode.current) {
            try {
                sourceNode.current.disconnect();
            } catch {
                // Node may already be disconnected
            }
        }

        panner.current = null;
        sourceNode.current = null;
    }, []);

    // Setup panner node
    useEffect(() => {
        // Cleanup any other nodes we may have previously created
        cleanupWebAudio();

        // Early out if we're missing anything
        if (!audioEl.current || !trackPublication.track || !mediaStream) {
            return cleanupWebAudio;
        }

        try {
            // Create the entry-node into WebAudio
            sourceNode.current = audioContext.createMediaStreamSource(mediaStream);

            // Initialize the PannerNode and its values
            panner.current = audioContext.createPanner();
            panner.current.panningModel = 'HRTF';
            panner.current.distanceModel = 'exponential';
            panner.current.coneOuterAngle = 360;
            panner.current.coneInnerAngle = 360;
            panner.current.coneOuterGain = 1;
            panner.current.refDistance = refDistance;
            panner.current.maxDistance = maxDistance;
            panner.current.rolloffFactor = rolloffFactor;

            // Set initial position far away so we don't hear it at full volume
            panner.current.positionX.setValueAtTime(1000, audioContext.currentTime);
            panner.current.positionY.setValueAtTime(0, audioContext.currentTime);
            panner.current.positionZ.setValueAtTime(0, audioContext.currentTime);

            // Connect the nodes to each other
            sourceNode.current
                .connect(panner.current)
                .connect(audioContext.destination);

            // Attach the mediaStream to an AudioElement
            audioEl.current.srcObject = mediaStream;
            audioEl.current.play().catch(console.error);
        } catch (error) {
            console.error('Error setting up spatial audio:', error);
            cleanupWebAudio();
        }

        return cleanupWebAudio;
    }, [
        trackPublication.track,
        cleanupWebAudio,
        audioContext,
        mediaStream,
        maxDistance,
        refDistance,
        rolloffFactor,
    ]);

    // Update the PannerNode's position values
    useEffect(() => {
        if (!panner.current) return;

        try {
            const currentTime = audioContext.currentTime;
            // Use Z for what would be Y in 2D (depth)
            panner.current.positionX.setTargetAtTime(relativePosition.x, currentTime, 0.02);
            panner.current.positionZ.setTargetAtTime(relativePosition.y, currentTime, 0.02);
            panner.current.positionY.setTargetAtTime(0, currentTime, 0.02); // Keep Y at 0 for 2D
        } catch (error) {
            console.error('Error updating panner position:', error);
        }
    }, [relativePosition.x, relativePosition.y, audioContext]);

    return <audio ref={audioEl} muted style={{ display: 'none' }} />;
}

interface SpatialAudioControllerProps {
    trackPositions: TrackPosition[];
    myPosition: Vector2;
    maxDistance?: number;
    refDistance?: number;
    rolloffFactor?: number;
}

export function SpatialAudioController({
    trackPositions,
    myPosition,
    maxDistance = 500,
    refDistance = 100,
    rolloffFactor = 2,
}: SpatialAudioControllerProps) {
    const audioContext = useMemo(() => {
        if (typeof window !== 'undefined') {
            // Use a type assertion for webkit support
            const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            return AudioContextClass ? new AudioContextClass() : null;
        }
        return null;
    }, []);

    // Resume audio context if it's suspended (required for some browsers)
    useEffect(() => {
        if (!audioContext) return;

        const resumeAudioContext = async () => {
            if (audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                } catch (error) {
                    console.error('Failed to resume audio context:', error);
                }
            }
        };

        resumeAudioContext();
    }, [audioContext]);

    if (!audioContext) {
        return null;
    }

    return (
        <>
            {trackPositions.map((tp) => (
                <SpatialPublicationRenderer
                    key={tp.trackPublication.trackSid}
                    trackPublication={tp.trackPublication}
                    position={tp.position}
                    myPosition={myPosition}
                    audioContext={audioContext}
                    maxDistance={maxDistance}
                    refDistance={refDistance}
                    rolloffFactor={rolloffFactor}
                />
            ))}
        </>
    );
}
