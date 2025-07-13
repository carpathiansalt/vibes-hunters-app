"use client";

import { RemoteAudioTrack, RemoteParticipant } from 'livekit-client';
import { Vector2 } from '@/types';

interface SpatialAudioSource {
    participant: RemoteParticipant;
    track: RemoteAudioTrack;
    pannerNode: PannerNode;
    gainNode: GainNode;
    position: Vector2;
}

export class SpatialAudioController {
    private audioContext: AudioContext | null = null;
    private listenerPosition: Vector2 = { x: 0, y: 0 };
    private sources: Map<string, SpatialAudioSource> = new Map();
    private masterGain: GainNode | null = null;
    private isInitialized = false;

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);

            // Configure 3D audio listener
            if (this.audioContext.listener.positionX) {
                // Modern browsers
                this.audioContext.listener.positionX.setValueAtTime(0, this.audioContext.currentTime);
                this.audioContext.listener.positionY.setValueAtTime(0, this.audioContext.currentTime);
                this.audioContext.listener.positionZ.setValueAtTime(0, this.audioContext.currentTime);
                this.audioContext.listener.forwardX.setValueAtTime(0, this.audioContext.currentTime);
                this.audioContext.listener.forwardY.setValueAtTime(-1, this.audioContext.currentTime);
                this.audioContext.listener.forwardZ.setValueAtTime(0, this.audioContext.currentTime);
                this.audioContext.listener.upX.setValueAtTime(0, this.audioContext.currentTime);
                this.audioContext.listener.upY.setValueAtTime(0, this.audioContext.currentTime);
                this.audioContext.listener.upZ.setValueAtTime(1, this.audioContext.currentTime);
            } else {
                // Fallback for older browsers
                (this.audioContext.listener as AudioListener & {
                    setPosition: (x: number, y: number, z: number) => void;
                    setOrientation: (x: number, y: number, z: number, xUp: number, yUp: number, zUp: number) => void
                }).setPosition(0, 0, 0);
                (this.audioContext.listener as AudioListener & {
                    setPosition: (x: number, y: number, z: number) => void;
                    setOrientation: (x: number, y: number, z: number, xUp: number, yUp: number, zUp: number) => void
                }).setOrientation(0, -1, 0, 0, 0, 1);
            }

            this.isInitialized = true;
            console.log('SpatialAudioController initialized');
        } catch (error) {
            console.error('Failed to initialize SpatialAudioController:', error);
        }
    }

    async addAudioSource(participant: RemoteParticipant, track: RemoteAudioTrack, position: Vector2): Promise<void> {
        if (!this.audioContext || !this.masterGain) {
            console.error('SpatialAudioController not initialized');
            return;
        }

        try {
            // Get MediaStream from track
            const mediaStream = new MediaStream([track.mediaStreamTrack]);
            const source = this.audioContext.createMediaStreamSource(mediaStream);

            // Create spatial audio nodes
            const pannerNode = this.audioContext.createPanner();
            const gainNode = this.audioContext.createGain();

            // Configure panner for 3D audio
            pannerNode.panningModel = 'HRTF';
            pannerNode.distanceModel = 'inverse';
            pannerNode.refDistance = 1;
            pannerNode.maxDistance = 10000;
            pannerNode.rolloffFactor = 1;
            pannerNode.coneInnerAngle = 360;
            pannerNode.coneOuterAngle = 0;
            pannerNode.coneOuterGain = 0;

            // Set initial position
            this.updateSourcePositionInternal(pannerNode, position);

            // Connect audio graph
            source.connect(gainNode);
            gainNode.connect(pannerNode);
            pannerNode.connect(this.masterGain);

            // Store source reference
            const spatialSource: SpatialAudioSource = {
                participant,
                track,
                pannerNode,
                gainNode,
                position
            };

            this.sources.set(participant.identity, spatialSource);
            console.log('Added spatial audio source for:', participant.identity);

        } catch (error) {
            console.error('Failed to add audio source:', error);
        }
    }

    removeAudioSource(participantIdentity: string): void {
        const source = this.sources.get(participantIdentity);
        if (source) {
            // Disconnect audio nodes
            source.gainNode.disconnect();
            source.pannerNode.disconnect();

            this.sources.delete(participantIdentity);
            console.log('Removed spatial audio source for:', participantIdentity);
        }
    }

    updateListenerPosition(position: Vector2): void {
        if (!this.audioContext) return;

        this.listenerPosition = position;

        if (this.audioContext.listener.positionX) {
            // Modern browsers
            this.audioContext.listener.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
        } else {
            // Fallback for older browsers
            (this.audioContext.listener as AudioListener & { setPosition: (x: number, y: number, z: number) => void }).setPosition(position.x, position.y, 0);
        }
    }

    updateSourcePosition(participantIdentity: string, position: Vector2): void {
        const source = this.sources.get(participantIdentity);
        if (source) {
            source.position = position;
            this.updateSourcePositionInternal(source.pannerNode, position);
        }
    }

    private updateSourcePositionInternal(pannerNode: PannerNode, position: Vector2): void {
        if (!this.audioContext) return;

        if (pannerNode.positionX) {
            // Modern browsers
            pannerNode.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
            pannerNode.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
            pannerNode.positionZ.setValueAtTime(0, this.audioContext.currentTime);
        } else {
            // Fallback for older browsers
            (pannerNode as PannerNode & { setPosition: (x: number, y: number, z: number) => void }).setPosition(position.x, position.y, 0);
        }
    }

    setMasterVolume(volume: number): void {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(volume, this.audioContext!.currentTime);
        }
    }

    setSourceVolume(participantIdentity: string, volume: number): void {
        const source = this.sources.get(participantIdentity);
        if (source) {
            source.gainNode.gain.setValueAtTime(volume, this.audioContext!.currentTime);
        }
    }

    destroy(): void {
        this.sources.forEach((source) => {
            source.gainNode.disconnect();
            source.pannerNode.disconnect();
        });
        this.sources.clear();

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        this.isInitialized = false;
        console.log('SpatialAudioController destroyed');
    }
}
