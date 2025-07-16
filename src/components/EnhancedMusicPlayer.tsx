"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { LocalAudioTrack as LiveKitLocalAudioTrack } from 'livekit-client';

export type MusicSource = 'file' | 'tab-capture';

interface EnhancedMusicPlayerProps {
    room: Room | null;
    onPublishStart: (filename: string, track?: LocalAudioTrack, audioElement?: HTMLAudioElement) => void;
    onPublishStop: () => void;
    onClose?: () => void; // Add onClose callback to close the dialog
    volume?: number;
    onVolumeChange?: (volume: number) => void;
}

export function EnhancedMusicPlayer({
    room,
    onPublishStart,
    onPublishStop,
    onClose,
    volume = 1.0,
    onVolumeChange
}: EnhancedMusicPlayerProps) {
    const [activeSource, setActiveSource] = useState<MusicSource>('file');
    const [isLoading, setIsLoading] = useState(false);
    const [audioGain, setAudioGain] = useState(volume);
    const [isMobile, setIsMobile] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioElementRef = useRef<HTMLAudioElement>(null);
    const currentTrackRef = useRef<LocalAudioTrack | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(mobile);
        };
        checkMobile();
    }, []);

    useEffect(() => {
        if (onVolumeChange) {
            onVolumeChange(audioGain);
        }
    }, [audioGain, onVolumeChange]);

    useEffect(() => {
        return () => {
            if (currentTrackRef.current) {
                currentTrackRef.current.stop();
            }
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                if (audioElementRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioElementRef.current.src);
                }
                audioElementRef.current.src = '';
            }
        };
    }, []);

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
            audioElement.volume = audioGain;

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
            const audioWithCapture = audioElement as HTMLAudioElement & {
                captureStream?: () => MediaStream;
                mozCaptureStream?: () => MediaStream;
            };

            let mediaStream: MediaStream;
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
            const localAudioTrack = new LiveKitLocalAudioTrack(
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

            // Close the dialog after successful music start
            onClose?.();

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

    const handleTabCapture = async () => {
        if (!room) return;

        setIsLoading(true);

        try {
            if (isMobile) {
                alert('Tab audio capture is not supported on mobile devices. Please use file upload instead.');
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                alert('Screen capture is not supported in this browser. Please try Chrome, Edge, or Firefox.');
                return;
            }

            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: { width: 1, height: 1, frameRate: 1 },
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100
                }
            });

            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                alert('No audio found in the selected tab. Please make sure the tab is playing audio and try again.');
                mediaStream.getVideoTracks().forEach(track => track.stop());
                return;
            }

            mediaStream.getVideoTracks().forEach(track => track.stop());

            audioTracks[0].addEventListener('ended', () => {
                console.log('Tab sharing ended by user');
                handleStop();
            });

            // Create LocalAudioTrack from the stream
            const audioTrack = audioTracks[0];
            if (audioTrack.readyState !== 'live') {
                throw new Error('Audio track is not active');
            }

            const localAudioTrack = new LiveKitLocalAudioTrack(
                audioTrack,
                undefined,
                false,
                undefined
            );

            currentTrackRef.current = localAudioTrack;

            await room.localParticipant.publishTrack(localAudioTrack, {
                name: 'music-tab-capture',
                dtx: false,
            });

            onPublishStart('Tab Audio Capture', localAudioTrack, undefined);

            // Close the dialog after successful tab capture start
            onClose?.();

        } catch (error) {
            console.error('Tab capture error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorName = error instanceof Error ? error.name : '';

            if (errorName === 'NotAllowedError') {
                alert('Screen capture permission denied. Please allow screen sharing and try again.');
            } else if (errorName === 'NotSupportedError') {
                alert('Screen capture is not supported in this browser. Please try Chrome, Edge, or Firefox.');
            } else {
                alert(`Failed to capture tab audio: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleStop = async () => {
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

    const handleVolumeChange = (newVolume: number) => {
        setAudioGain(newVolume);
        if (audioElementRef.current) {
            audioElementRef.current.volume = newVolume;
        }
    };

    // This component is now only for music selection, not controls
    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">🎵 Select Music Source</h3>
                <p className="text-sm text-gray-600 mb-4">Choose how you want to share music with others</p>

                <div className="flex space-x-2 mb-4">
                    <button
                        onClick={() => setActiveSource('file')}
                        className={`px-3 py-2 rounded text-sm ${activeSource === 'file' ? 'bg-purple-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                        📁 Upload File
                    </button>
                    <button
                        onClick={() => setActiveSource('tab-capture')}
                        className={`px-3 py-2 rounded text-sm ${activeSource === 'tab-capture' ? 'bg-purple-500 text-white' : isMobile ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 hover:bg-gray-300'}`}
                        disabled={isMobile}
                    >
                        🎵 Tab Audio {isMobile ? '(Desktop Only)' : ''}
                    </button>
                </div>

                {isMobile && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            📱 <strong>Mobile:</strong> Tab audio capture is not supported. Upload an audio file instead.
                        </p>
                    </div>
                )}

                {activeSource === 'file' && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleFileSelect}
                            className="w-full p-2 border rounded"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {isLoading ? 'Loading...' : 'Upload an audio file from your device (MP3, WAV, etc.)'}
                        </p>
                    </div>
                )}

                {activeSource === 'tab-capture' && (
                    <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2">🎵 Tab Audio Capture</h4>
                            <p className="text-sm text-blue-800">
                                Share audio from any tab (Spotify, YouTube, Apple Music, etc.)
                            </p>
                        </div>

                        <button
                            onClick={handleTabCapture}
                            disabled={isLoading || isMobile}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isLoading ? 'Starting...' : 'Capture Tab Audio'}
                        </button>

                        <div className="text-xs text-gray-600 space-y-1">
                            <p><strong>How to use:</strong></p>
                            <p>1. Click &quot;Capture Tab Audio&quot;</p>
                            <p>2. Select the tab playing music</p>
                            <p>3. Make sure &quot;Share audio&quot; is checked</p>
                            <p>4. Click &quot;Share&quot;</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium">Broadcast Volume</label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioGain}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full"
                />
                <span className="text-xs text-gray-500">{Math.round(audioGain * 100)}%</span>
            </div>
        </div>
    );
}
