"use client";

import React, { useState, useRef } from 'react';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { LocalAudioTrack as LocalAudioTrackClass } from 'livekit-client';

interface MusicPublisherProps {
    room: Room | null;
    onPublishStart: (filename: string) => void;
    onPublishStop: () => void;
    isPublishing: boolean;
    spatialAudioEnabled?: boolean;
    volume?: number;
    onVolumeChange?: (volume: number) => void;
}

export function MusicPublisher({
    room,
    onPublishStart,
    onPublishStop,
    isPublishing,
    spatialAudioEnabled = false,
    volume = 1.0,
    onVolumeChange
}: MusicPublisherProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [audioGain, setAudioGain] = useState(volume);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioElementRef = useRef<HTMLAudioElement>(null);
    const currentTrackRef = useRef<LocalAudioTrack | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !room) return;

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            alert('Please select an audio file');
            return;
        }

        // Check file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('File size must be less than 50MB');
            return;
        }

        setIsLoading(true);

        try {
            // Create audio element for playback
            const audioElement = audioElementRef.current || new Audio();
            audioElementRef.current = audioElement;

            // Create object URL for the file
            const audioURL = URL.createObjectURL(file);
            audioElement.src = audioURL;
            audioElement.loop = true; // Loop the music

            // Wait for the audio to be ready
            await new Promise<void>((resolve, reject) => {
                audioElement.oncanplaythrough = () => resolve();
                audioElement.onerror = () => reject(new Error('Failed to load audio file'));
                audioElement.load();
            });

            // Capture the audio stream from the audio element
            let mediaStream: MediaStream;

            if (spatialAudioEnabled) {
                // Create audio context for spatial audio processing
                const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                audioContextRef.current = audioContext;

                // Create audio source from element
                const source = audioContext.createMediaElementSource(audioElement);

                // Create gain node for volume control
                const gainNode = audioContext.createGain();
                gainNodeRef.current = gainNode;
                gainNode.gain.value = audioGain;

                // Create destination for capturing
                const destination = audioContext.createMediaStreamDestination();

                // Connect: source -> gain -> destination
                source.connect(gainNode);
                gainNode.connect(destination);

                // Also connect to audio context destination for local playback
                gainNode.connect(audioContext.destination);

                mediaStream = destination.stream;
            } else {
                // Standard capture without spatial processing
                // Type assertion for captureStream method
                const audioWithCapture = audioElement as HTMLAudioElement & {
                    captureStream?: () => MediaStream;
                    mozCaptureStream?: () => MediaStream;
                };

                if (audioWithCapture.captureStream) {
                    mediaStream = audioWithCapture.captureStream();
                } else if (audioWithCapture.mozCaptureStream) {
                    mediaStream = audioWithCapture.mozCaptureStream();
                } else {
                    throw new Error('Audio capture not supported in this browser');
                }
            }

            // Create LocalAudioTrack from the stream
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('No audio tracks found in the media stream');
            }

            // Create LocalAudioTrack directly from the MediaStreamTrack
            const audioTrack = new LocalAudioTrackClass(
                audioTracks[0],
                undefined,
                false,
                undefined
            );

            currentTrackRef.current = audioTrack;

            // Publish the track
            await room.localParticipant.publishTrack(audioTrack, {
                name: `music-${file.name}`,
            });

            // Start playing the audio
            await audioElement.play();

            onPublishStart(file.name);

        } catch (error) {
            console.error('Error publishing music:', error);
            alert('Failed to publish music. Please try again.');
        } finally {
            setIsLoading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleStopPublishing = async () => {
        if (!room || !currentTrackRef.current) return;

        setIsLoading(true);

        try {
            // Stop and unpublish the track
            await room.localParticipant.unpublishTrack(currentTrackRef.current);

            // Stop the track
            currentTrackRef.current.stop();

            // Stop the audio element
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current.src = '';
            }

            // Clean up audio context
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            // Clean up references
            gainNodeRef.current = null;
            currentTrackRef.current = null;
            onPublishStop();

        } catch (error) {
            console.error('Error stopping music:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setAudioGain(newVolume);

        // Update gain node if exists
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = newVolume;
        }

        // Update audio element volume for non-spatial audio
        if (audioElementRef.current && !spatialAudioEnabled) {
            audioElementRef.current.volume = newVolume;
        }

        onVolumeChange?.(newVolume);
    };

    if (!room) {
        return null;
    }

    return (
        <div className="music-publisher space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={isLoading || isPublishing}
            />

            <div className="flex items-center space-x-4">
                {!isPublishing ? (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50"
                    >
                        {isLoading ? '🎵 Loading...' : '🎵 Share Music'}
                    </button>
                ) : (
                    <button
                        onClick={handleStopPublishing}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Stopping...' : '⏹️ Stop Music'}
                    </button>
                )}

                {spatialAudioEnabled && (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">🔊</span>
                        <span className="text-xs text-purple-600 font-medium">Spatial Audio</span>
                    </div>
                )}
            </div>

            {/* Volume Control */}
            {isPublishing && (
                <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">🔊</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={audioGain}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 min-w-[3rem]">
                        {Math.round(audioGain * 100)}%
                    </span>
                </div>
            )}
        </div>
    );
}
