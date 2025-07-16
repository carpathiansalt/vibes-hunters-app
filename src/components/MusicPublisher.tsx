"use client";

import React, { useState, useRef } from 'react';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { LocalAudioTrack as LocalAudioTrackClass } from 'livekit-client';

interface MusicPublisherProps {
    room: Room | null;
    onPublishStart: (filename: string, track?: LocalAudioTrack, audioElement?: HTMLAudioElement) => void;
    onPublishStop: () => void;
    onPublishPause?: () => void;
    onPublishResume?: () => void;
    isPublishing: boolean;
    isPaused?: boolean;
    volume?: number;
    onVolumeChange?: (volume: number) => void;
}

export function MusicPublisher({
    room,
    onPublishStart,
    onPublishStop,
    onPublishPause,
    onPublishResume,
    isPublishing,
    isPaused = false,
    volume = 1.0,
    onVolumeChange
}: MusicPublisherProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [audioGain, setAudioGain] = useState(volume);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioElementRef = useRef<HTMLAudioElement>(null);
    const currentTrackRef = useRef<LocalAudioTrack | null>(null);

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

            // Start playing the audio first to ensure the stream has audio
            await audioElement.play();

            // Wait a bit for audio to start flowing
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture the audio stream from the audio element
            let mediaStream: MediaStream;

            // For music, we always use standard capture (no spatial processing)
            // Music should be heard at full volume by everyone like a virtual concert
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

            // Start playing the audio first to ensure the stream has audio
            await audioElement.play();

            // Wait a bit for audio to start flowing
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create LocalAudioTrack from the stream
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('No audio tracks found in the media stream');
            }

            // Verify the audio track is active
            const audioTrack = audioTracks[0];
            if (audioTrack.readyState !== 'live') {
                throw new Error('Audio track is not active');
            }

            // Create LocalAudioTrack directly from the MediaStreamTrack
            const localAudioTrack = new LocalAudioTrackClass(
                audioTrack,
                undefined,
                false,
                undefined
            );

            currentTrackRef.current = localAudioTrack;

            // Publish the track with additional options to prevent silence detection
            await room.localParticipant.publishTrack(localAudioTrack, {
                name: `music-${file.name}`,
                dtx: false, // Disable discontinuous transmission
            });

            onPublishStart(file.name, localAudioTrack, audioElement);

        } catch (error) {
            console.error('Error publishing music:', error);
            alert('Failed to publish music. Please try again.');

            // Clean up on error
            if (audioElementRef.current && audioElementRef.current.src.startsWith('blob:')) {
                audioElementRef.current.pause();
                URL.revokeObjectURL(audioElementRef.current.src);
                audioElementRef.current.src = '';
            }

            if (currentTrackRef.current) {
                currentTrackRef.current.stop();
                currentTrackRef.current = null;
            }
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
            // First stop the audio element to stop sound immediately
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current.currentTime = 0;
            }

            // Stop the track before unpublishing
            currentTrackRef.current.stop();

            // Unpublish the track
            await room.localParticipant.unpublishTrack(currentTrackRef.current);

            // Clean up audio element
            if (audioElementRef.current) {
                // Revoke the object URL to free memory
                if (audioElementRef.current.src && audioElementRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioElementRef.current.src);
                }
                audioElementRef.current.src = '';
            }

            // Clean up references
            currentTrackRef.current = null;

            onPublishStop();

        } catch (error) {
            console.error('Error stopping music:', error);
            // Still call onPublishStop even if there's an error to update UI state
            onPublishStop();
        } finally {
            setIsLoading(false);
        }
    };

    const handlePauseMusic = async () => {
        if (!audioElementRef.current || !currentTrackRef.current) return;

        try {
            // Pause the audio element
            audioElementRef.current.pause();
            onPublishPause?.();
            console.log('Music paused');
        } catch (error) {
            console.error('Error pausing music:', error);
        }
    };

    const handleResumeMusic = async () => {
        if (!audioElementRef.current || !currentTrackRef.current) return;

        try {
            // Resume the audio element
            await audioElementRef.current.play();
            onPublishResume?.();
            console.log('Music resumed');
        } catch (error) {
            console.error('Error resuming music:', error);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setAudioGain(newVolume);

        // Update audio element volume directly
        if (audioElementRef.current) {
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
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={isPaused ? handleResumeMusic : handlePauseMusic}
                            disabled={isLoading}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : isPaused ? '▶️ Resume' : '⏸️ Pause'}
                        </button>
                        <button
                            onClick={handleStopPublishing}
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Stopping...' : '⏹️ Stop Music'}
                        </button>
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
