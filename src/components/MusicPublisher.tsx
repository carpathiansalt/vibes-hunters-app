"use client";

import React, { useState, useRef } from 'react';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { createLocalAudioTrack } from 'livekit-client';

interface MusicPublisherProps {
    room: Room | null;
    onPublishStart: (filename: string) => void;
    onPublishStop: () => void;
    isPublishing: boolean;
}

export function MusicPublisher({
    room,
    onPublishStart,
    onPublishStop,
    isPublishing
}: MusicPublisherProps) {
    const [isLoading, setIsLoading] = useState(false);
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

            // Capture the audio stream from the audio element
            let mediaStream: MediaStream;

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

            // Create LocalAudioTrack from the stream
            const audioTrack = await createLocalAudioTrack({
                // @ts-expect-error - using the captured stream
                track: mediaStream.getAudioTracks()[0],
            });

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

            // Stop the audio element
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current.src = '';
            }

            // Clean up
            currentTrackRef.current = null;
            onPublishStop();

        } catch (error) {
            console.error('Error stopping music:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!room) {
        return null;
    }

    return (
        <div className="music-publisher">
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={isLoading || isPublishing}
            />

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
        </div>
    );
}
