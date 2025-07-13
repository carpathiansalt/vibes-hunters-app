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
    private _audioContext: AudioContext | null = null;
    private listenerPosition: Vector2 = { x: 0, y: 0 };
    private sources: Map<string, SpatialAudioSource> = new Map();
    private masterGain: GainNode | null = null;
    private isInitialized = false;

    // Getter for audioContext to allow external access
    get audioContext(): AudioContext | null {
        return this._audioContext;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('SpatialAudioController already initialized');
            return;
        }

        try {
            // Create audio context with explicit sample rate
            this._audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
                sampleRate: 44100
            });

            // Resume audio context if suspended
            if (this._audioContext.state === 'suspended') {
                await this._audioContext.resume();
            }

            this.masterGain = this._audioContext.createGain();
            this.masterGain.connect(this._audioContext.destination);

            // Configure 3D audio listener
            if (this._audioContext.listener.positionX) {
                // Modern browsers
                this._audioContext.listener.positionX.setValueAtTime(0, this._audioContext.currentTime);
                this._audioContext.listener.positionY.setValueAtTime(0, this._audioContext.currentTime);
                this._audioContext.listener.positionZ.setValueAtTime(0, this._audioContext.currentTime);
                this._audioContext.listener.forwardX.setValueAtTime(0, this._audioContext.currentTime);
                this._audioContext.listener.forwardY.setValueAtTime(-1, this._audioContext.currentTime);
                this._audioContext.listener.forwardZ.setValueAtTime(0, this._audioContext.currentTime);
                this._audioContext.listener.upX.setValueAtTime(0, this._audioContext.currentTime);
                this._audioContext.listener.upY.setValueAtTime(0, this._audioContext.currentTime);
                this._audioContext.listener.upZ.setValueAtTime(1, this._audioContext.currentTime);
                console.log('Using modern AudioListener API');
            } else {
                // Fallback for older browsers
                (this._audioContext.listener as AudioListener & {
                    setPosition: (x: number, y: number, z: number) => void;
                    setOrientation: (x: number, y: number, z: number, xUp: number, yUp: number, zUp: number) => void
                }).setPosition(0, 0, 0);
                (this._audioContext.listener as AudioListener & {
                    setPosition: (x: number, y: number, z: number) => void;
                    setOrientation: (x: number, y: number, z: number, xUp: number, yUp: number, zUp: number) => void
                }).setOrientation(0, -1, 0, 0, 0, 1);
                console.log('Using legacy AudioListener API');
            }

            this.isInitialized = true;
            console.log('SpatialAudioController initialized successfully', {
                sampleRate: this._audioContext.sampleRate,
                state: this._audioContext.state
            });
        } catch (error) {
            console.error('Failed to initialize SpatialAudioController:', error);
            this.isInitialized = false;
        }
    }

    async addAudioSource(participant: RemoteParticipant, track: RemoteAudioTrack, position: Vector2, trackName?: string): Promise<void> {
        if (!this._audioContext || !this.masterGain) {
            console.error('SpatialAudioController not initialized');
            return;
        }

        // Skip music tracks - they should be heard at full volume without spatial processing
        if (trackName && trackName.startsWith('music-')) {
            console.log('Skipping music track for spatial audio:', trackName);
            return;
        }

        // Check if source already exists
        if (this.sources.has(participant.identity)) {
            console.log('Audio source already exists for:', participant.identity);
            return;
        }

        try {
            // Validate track
            if (!track.mediaStreamTrack) {
                console.error('Invalid track - no mediaStreamTrack:', participant.identity);
                return;
            }

            console.log('Adding spatial audio source for voice track:', participant.identity);

            // Get MediaStream from track
            const mediaStream = new MediaStream([track.mediaStreamTrack]);
            const source = this._audioContext.createMediaStreamSource(mediaStream);

            // Create spatial audio nodes
            const pannerNode = this._audioContext.createPanner();
            const gainNode = this._audioContext.createGain();

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
            console.error('Failed to add audio source for', participant.identity, ':', error);
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

    hasAudioSource(participantIdentity: string): boolean {
        return this.sources.has(participantIdentity);
    }

    updateListenerPosition(position: Vector2): void {
        if (!this._audioContext) return;

        this.listenerPosition = position;

        if (this._audioContext.listener.positionX) {
            // Modern browsers
            this._audioContext.listener.positionX.setValueAtTime(position.x, this._audioContext.currentTime);
            this._audioContext.listener.positionY.setValueAtTime(position.y, this._audioContext.currentTime);
        } else {
            // Fallback for older browsers
            (this._audioContext.listener as AudioListener & { setPosition: (x: number, y: number, z: number) => void }).setPosition(position.x, position.y, 0);
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
        if (!this._audioContext) return;

        if (pannerNode.positionX) {
            // Modern browsers
            pannerNode.positionX.setValueAtTime(position.x, this._audioContext.currentTime);
            pannerNode.positionY.setValueAtTime(position.y, this._audioContext.currentTime);
            pannerNode.positionZ.setValueAtTime(0, this._audioContext.currentTime);
        } else {
            // Fallback for older browsers
            (pannerNode as PannerNode & { setPosition: (x: number, y: number, z: number) => void }).setPosition(position.x, position.y, 0);
        }
    }

    setMasterVolume(volume: number): void {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(volume, this._audioContext!.currentTime);
        }
    }

    setSourceVolume(participantIdentity: string, volume: number): void {
        const source = this.sources.get(participantIdentity);
        if (source) {
            source.gainNode.gain.setValueAtTime(volume, this._audioContext!.currentTime);
        }
    }

    destroy(): void {
        this.sources.forEach((source) => {
            source.gainNode.disconnect();
            source.pannerNode.disconnect();
        });
        this.sources.clear();

        if (this._audioContext && this._audioContext.state !== 'closed') {
            this._audioContext.close();
        }

        this.isInitialized = false;
        console.log('SpatialAudioController destroyed');
    }
}
