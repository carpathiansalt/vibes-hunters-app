"use client";

import { RemoteAudioTrack, RemoteParticipant } from 'livekit-client';
import { Vector2 } from '@/types';

// Add a scaling factor to convert map units to meters for spatial audio
interface SpatialAudioControllerOptions {
    positionScale?: number; // Number of meters per map unit (default: 1)
}

interface SpatialAudioSource {
    participant: RemoteParticipant;
    track: RemoteAudioTrack;
    pannerNode: PannerNode;
    gainNode: GainNode;
    sourceNode: MediaStreamAudioSourceNode;
    audioElement: HTMLAudioElement; // Critical: HTML audio element required for MediaStream playback
    position: Vector2;
}

/**
 * SpatialAudioController
 *
 * positionScale: number of meters per map unit. If your map is 1000x1000 units and you want 1000 units to be 100 meters, use positionScale=0.1.
 * Tune refDistance, maxDistance, and rolloffFactor for your world size and desired attenuation.
 *
 * Example usage:
 *   const controller = new SpatialAudioController({ positionScale: 0.1 });
 */
export class SpatialAudioController {
    private _audioContext: AudioContext | null = null;
    private listenerPosition: Vector2 = { x: 0, y: 0 };
    private sources: Map<string, SpatialAudioSource> = new Map();
    private masterGain: GainNode | null = null;
    private isInitialized = false;
    private positionScale: number = 1; // Default: 1 map unit = 1 meter

    constructor(options?: SpatialAudioControllerOptions) {
        if (options?.positionScale && options.positionScale > 0) {
            this.positionScale = options.positionScale;
        }
    }

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

            // Create MediaStream from track (following LiveKit documentation)
            const mediaStream = new MediaStream([track.mediaStreamTrack]);

            // Create HTML audio element (CRITICAL: Required for MediaStream playback with WebAudio)
            const audioElement = document.createElement('audio');
            audioElement.muted = true; // Muted because audio comes through WebAudio pipeline
            audioElement.setAttribute('playsinline', 'true'); // For mobile compatibility
            audioElement.srcObject = mediaStream;

            // Create WebAudio nodes
            const sourceNode = this._audioContext.createMediaStreamSource(mediaStream);
            const pannerNode = this._audioContext.createPanner();
            const gainNode = this._audioContext.createGain();

            // Configure panner for 3D audio (following LiveKit documentation)
            pannerNode.panningModel = 'HRTF';
            pannerNode.distanceModel = 'exponential';
            pannerNode.coneOuterAngle = 360;
            pannerNode.coneInnerAngle = 360;
            pannerNode.coneOuterGain = 1;
            // Set more typical defaults for voice chat
            pannerNode.refDistance = 1; // 1 meter = full volume
            pannerNode.maxDistance = 50; // 50 meters = max attenuation
            pannerNode.rolloffFactor = 2;

            // Set initial position using relative coordinates, scaled to meters
            const relativePosition = {
                x: (this.listenerPosition.x - position.x) * this.positionScale,
                y: (position.y - this.listenerPosition.y) * this.positionScale
            };
            this.updatePannerPosition(pannerNode, relativePosition);
            console.log('[SpatialAudio] Add source', participant.identity, {
                position,
                listener: this.listenerPosition,
                relativePosition,
                scale: this.positionScale,
                refDistance: pannerNode.refDistance,
                maxDistance: pannerNode.maxDistance,
                rolloffFactor: pannerNode.rolloffFactor
            });

            // Connect audio graph: source -> gain -> panner -> master -> destination
            sourceNode.connect(gainNode);
            gainNode.connect(pannerNode);
            pannerNode.connect(this.masterGain);

            // Start audio playback (CRITICAL: Required for MediaStream audio)
            try {
                await audioElement.play();
                console.log('✅ Started spatial audio playback for:', participant.identity);
            } catch (playError) {
                console.warn('Autoplay blocked for spatial audio, will play on user interaction:', playError);
                // Add event listeners to start playback on user interaction
                const startPlayback = async () => {
                    try {
                        await audioElement.play();
                        console.log('✅ Started spatial audio playback after user interaction:', participant.identity);
                        document.removeEventListener('click', startPlayback);
                        document.removeEventListener('touchstart', startPlayback);
                    } catch (error) {
                        console.error('Failed to start spatial audio playback:', error);
                    }
                };
                document.addEventListener('click', startPlayback, { once: true });
                document.addEventListener('touchstart', startPlayback, { once: true });
            }

            // Store source reference
            const spatialSource: SpatialAudioSource = {
                participant,
                track,
                pannerNode,
                gainNode,
                sourceNode,
                audioElement,
                position
            };

            this.sources.set(participant.identity, spatialSource);
            console.log('✅ Added spatial audio source for:', participant.identity, 'at position:', position);

        } catch (error) {
            console.error('Failed to add audio source for', participant.identity, ':', error);
        }
    }

    removeAudioSource(participantIdentity: string): void {
        const source = this.sources.get(participantIdentity);
        if (source) {
            // Disconnect WebAudio nodes
            source.sourceNode.disconnect();
            source.gainNode.disconnect();
            source.pannerNode.disconnect();

            // Clean up HTML audio element
            source.audioElement.pause();
            source.audioElement.srcObject = null;
            source.audioElement.remove();

            this.sources.delete(participantIdentity);
            console.log('✅ Removed spatial audio source for:', participantIdentity);
        }
    }

    hasAudioSource(participantIdentity: string): boolean {
        return this.sources.has(participantIdentity);
    }

    updateListenerPosition(position: Vector2): void {
        if (!this._audioContext) return;

        this.listenerPosition = position;

        // Update listener position in WebAudio
        if (this._audioContext.listener.positionX) {
            // Modern browsers - keep listener at origin for relative positioning
            this._audioContext.listener.positionX.setValueAtTime(0, this._audioContext.currentTime);
            this._audioContext.listener.positionY.setValueAtTime(0, this._audioContext.currentTime);
            this._audioContext.listener.positionZ.setValueAtTime(0, this._audioContext.currentTime);
        } else {
            // Fallback for older browsers
            (this._audioContext.listener as AudioListener & { setPosition: (x: number, y: number, z: number) => void }).setPosition(0, 0, 0);
        }

        // Update all source positions relative to new listener position
        this.sources.forEach((source) => {
            const relativePosition = {
                x: (this.listenerPosition.x - source.position.x) * this.positionScale,
                y: (source.position.y - this.listenerPosition.y) * this.positionScale
            };
            this.updatePannerPosition(source.pannerNode, relativePosition);
            console.log('[SpatialAudio] Update source', source.participant.identity, {
                position: source.position,
                listener: this.listenerPosition,
                relativePosition,
                scale: this.positionScale
            });
        });

        console.log('Updated listener position to:', position, 'affecting', this.sources.size, 'spatial sources');
    }

    updateSourcePosition(participantIdentity: string, position: Vector2): void {
        const source = this.sources.get(participantIdentity);
        if (source) {
            source.position = position;
            // Update using relative position, scaled to meters
            const relativePosition = {
                x: (this.listenerPosition.x - position.x) * this.positionScale,
                y: (position.y - this.listenerPosition.y) * this.positionScale
            };
            this.updatePannerPosition(source.pannerNode, relativePosition);
            console.log('[SpatialAudio] Update source position', participantIdentity, {
                position,
                listener: this.listenerPosition,
                relativePosition,
                scale: this.positionScale
            });
        }
    }

    private updatePannerPosition(pannerNode: PannerNode, relativePosition: Vector2): void {
        if (!this._audioContext) return;

        // Use relative positioning as per LiveKit documentation
        // Map 2D coordinates: x -> x, y -> z (since PannerNode uses y as vertical)
        if (pannerNode.positionX) {
            // Modern browsers - use setTargetAtTime for smooth transitions
            pannerNode.positionX.setTargetAtTime(relativePosition.x, this._audioContext.currentTime, 0.02);
            pannerNode.positionY.setTargetAtTime(0, this._audioContext.currentTime, 0.02); // Keep at ground level
            pannerNode.positionZ.setTargetAtTime(relativePosition.y, this._audioContext.currentTime, 0.02);
        } else {
            // Fallback for older browsers
            (pannerNode as PannerNode & { setPosition: (x: number, y: number, z: number) => void }).setPosition(
                relativePosition.x, 0, relativePosition.y
            );
        }
        // Log for debugging
        console.log('[SpatialAudio] Panner position', {
            x: relativePosition.x,
            y: 0,
            z: relativePosition.y
        });
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
            // Clean up WebAudio nodes
            source.sourceNode.disconnect();
            source.gainNode.disconnect();
            source.pannerNode.disconnect();

            // Clean up HTML audio element
            source.audioElement.pause();
            source.audioElement.srcObject = null;
        });
        this.sources.clear();

        if (this._audioContext && this._audioContext.state !== 'closed') {
            this._audioContext.close();
        }

        this.isInitialized = false;
        console.log('SpatialAudioController destroyed');
    }
}
