"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { LocalAudioTrack as LiveKitLocalAudioTrack } from 'livekit-client';

export type MusicSource = 'file' | 'tab-capture';

interface EnhancedMusicPlayerProps {
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

export function EnhancedMusicPlayer({
    room,
    onPublishStart,
    onPublishStop,
    onPublishPause,
    onPublishResume,
    isPublishing,
    isPaused = false,
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

        if (!file.type.startsWith('audio/')) {
            alert('Please select an audio file');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            alert('File size must be less than 50MB');
            return;
        }

        await startAudioPlayback(file, file.name);
    };

    const handleTabCapture = async () => {
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

            const audioStream = new MediaStream(audioTracks);
            mediaStream.getVideoTracks().forEach(track => track.stop());

            audioTracks[0].addEventListener('ended', () => {
                console.log('Tab sharing ended by user');
                handleStop();
            });

            await startAudioFromStream(audioStream, 'Tab Audio Capture');
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

    const startAudioPlayback = async (source: File, title: string) => {
        if (!room) return;

        setIsLoading(true);
        try {
            const audioElement = audioElementRef.current || new Audio();
            audioElementRef.current = audioElement;

            const audioURL = URL.createObjectURL(source);
            audioElement.src = audioURL;
            audioElement.loop = true;
            audioElement.volume = audioGain;

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Audio loading timeout'));
                }, 30000);

                audioElement.oncanplaythrough = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                audioElement.onerror = (e) => {
                    clearTimeout(timeout);
                    console.error('Audio loading error:', e);
                    reject(new Error('Failed to load audio file'));
                };
                audioElement.load();
            });

            await audioElement.play();
            await new Promise(resolve => setTimeout(resolve, 500));

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

            await startAudioFromStream(mediaStream, title);
        } catch (error) {
            console.error('Audio playback error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to start audio playback: ${errorMessage}`);

            if (audioElementRef.current) {
                audioElementRef.current.pause();
                if (audioElementRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioElementRef.current.src);
                }
                audioElementRef.current.src = '';
            }

            if (currentTrackRef.current) {
                currentTrackRef.current.stop();
                currentTrackRef.current = null;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const startAudioFromStream = async (mediaStream: MediaStream, title: string) => {
        if (!room) return;

        try {
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('No audio tracks found in the media stream');
            }

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
                name: `music-${title}`,
                dtx: false,
            });

            onPublishStart(title, localAudioTrack, audioElementRef.current || undefined);
        } catch (error) {
            console.error('Error publishing audio track:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to publish audio: ${errorMessage}`);

            if (currentTrackRef.current) {
                currentTrackRef.current.stop();
                currentTrackRef.current = null;
            }
        }
    };

    const handleStop = async () => {
        if (!room) return;

        setIsLoading(true);

        try {
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current.currentTime = 0;
            }

            if (currentTrackRef.current) {
                await room.localParticipant.unpublishTrack(currentTrackRef.current);
                currentTrackRef.current.stop();
            }

            if (audioElementRef.current) {
                if (audioElementRef.current.src && audioElementRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioElementRef.current.src);
                }
                audioElementRef.current.src = '';
            }

            currentTrackRef.current = null;
            onPublishStop();

        } catch (error) {
            console.error('Error stopping music:', error);
            onPublishStop();
        } finally {
            setIsLoading(false);
        }
    };

    const handlePause = async () => {
        try {
            if (audioElementRef.current) {
                audioElementRef.current.pause();
            }
            if (currentTrackRef.current) {
                currentTrackRef.current.mute();
            }
            onPublishPause?.();
        } catch (error) {
            console.error('Error pausing music:', error);
        }
    };

    const handleResume = async () => {
        try {
            if (audioElementRef.current) {
                await audioElementRef.current.play();
            }
            if (currentTrackRef.current) {
                currentTrackRef.current.unmute();
            }
            onPublishResume?.();
        } catch (error) {
            console.error('Error resuming music:', error);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setAudioGain(newVolume);
        if (audioElementRef.current) {
            audioElementRef.current.volume = newVolume;
        }
    };

    if (isPublishing) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Broadcasting Music</span>
                    </div>
                    <button
                        onClick={handleStop}
                        disabled={isLoading}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                        {isLoading ? 'Stopping...' : 'Stop'}
                    </button>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                    <button
                        onClick={isPaused ? handleResume : handlePause}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium">Volume</label>
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

    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
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
                            📱 <strong>Mobile Mode:</strong> File upload works great! For streaming services, use desktop version.
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
                            <h4 className="font-medium text-blue-900 mb-2">🎵 Capture Tab Audio</h4>
                            <p className="text-sm text-blue-800">
                                Share audio from any tab playing music (Spotify, YouTube, Apple Music, etc.)
                            </p>
                        </div>

                        <button
                            onClick={handleTabCapture}
                            disabled={isLoading}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isLoading ? 'Starting...' : 'Start Tab Audio Capture'}
                        </button>

                        <div className="text-xs text-gray-600 space-y-1">
                            <p><strong>How to use:</strong></p>
                            <p>1. Click &quot;Start Tab Audio Capture&quot;</p>
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
