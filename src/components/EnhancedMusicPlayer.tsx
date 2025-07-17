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
    musicTitle?: string;
    setMusicTitle?: (title: string) => void;
    musicDescription?: string;
    setMusicDescription?: (desc: string) => void;
}

export function EnhancedMusicPlayer({
    room,
    onPublishStart,
    onPublishStop,
    onClose,
    volume = 1.0,
    onVolumeChange,
    musicTitle = '',
    setMusicTitle,
    musicDescription = '',
    setMusicDescription
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
            // Don't clean up the audio element or track here!
            // The parent component (HuntersMapView) will manage their lifecycle
            // This prevents the music from stopping when the dialog closes
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
            // Set party metadata (title and description) on the local participant
            if (room.localParticipant && (musicTitle || musicDescription)) {
                const metadata = {
                    musicTitle: musicTitle || '',
                    musicDescription: musicDescription || ''
                };
                await room.localParticipant.setMetadata(JSON.stringify(metadata));
            }
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

            // Clean up on error - but let parent handle the audio element lifecycle
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

    const handleStop = async () => {
        if (!room || !currentTrackRef.current) return;

        setIsLoading(true);

        try {
            // Don't touch the audio element here - let the parent handle it
            // Just stop and unpublish the track
            currentTrackRef.current.stop();
            await room.localParticipant.unpublishTrack(currentTrackRef.current);

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
    // Tab audio capture handler
    const handleTabCapture = async () => {
        if (!room) return;

        setIsLoading(true);

        try {
            // Set party metadata (title and description) on the local participant
            if (room.localParticipant && (musicTitle || musicDescription)) {
                const metadata = {
                    musicTitle: musicTitle || '',
                    musicDescription: musicDescription || ''
                };
                await room.localParticipant.setMetadata(JSON.stringify(metadata));
            }
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

    return (
        <div className="relative p-4 bg-gray-50 rounded-xl border border-gray-200">
            {/* The close button is now only rendered by the parent dialog. */}
            <div className="mb-4 mt-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">🎉 Event / Venue Info</h3>
                <p className="text-sm text-gray-600 mb-4">Describe your party, club, pub, or event. This info will be shown to others when they join your broadcast.</p>

                {/* Event Title and Description Fields */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-900">Event or Venue Name <span className="text-xs text-gray-400">(max 50 chars)</span></label>
                    <input
                        type="text"
                        maxLength={50}
                        value={musicTitle}
                        onChange={e => setMusicTitle && setMusicTitle(e.target.value)}
                        className="w-full p-2 border rounded mb-2 text-gray-900 placeholder-gray-500 bg-white focus:border-purple-600 focus:outline-none border-gray-400"
                        placeholder="e.g. Friday Night at Club XYZ, Rooftop Party, etc."
                    />
                    <label className="block text-sm font-medium mb-1 text-gray-900">Event Description <span className="text-xs text-gray-400">(max 200 chars)</span></label>
                    <textarea
                        maxLength={200}
                        value={musicDescription}
                        onChange={e => setMusicDescription && setMusicDescription(e.target.value)}
                        className="w-full p-2 border rounded text-gray-900 placeholder-gray-500 bg-white focus:border-purple-600 focus:outline-none border-gray-400 mb-2"
                        placeholder="Describe your event, venue, or vibe..."
                        rows={2}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <button
                        onClick={() => setActiveSource('file')}
                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSource === 'file'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        📁 Upload File
                    </button>
                    <button
                        onClick={() => setActiveSource('tab-capture')}
                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSource === 'tab-capture'
                            ? 'bg-purple-600 text-white shadow-md'
                            : isMobile
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        disabled={isMobile}
                    >
                        🎵 Tab Audio {isMobile ? '(Desktop Only)' : ''}
                    </button>
                </div>

                {isMobile && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start space-x-3">
                            <div className="text-blue-600 text-lg">📱</div>
                            <div>
                                <p className="text-sm font-medium text-blue-900 mb-1">Mobile Device Detected</p>
                                <p className="text-xs text-blue-700">
                                    Tab audio capture is not supported on mobile. Upload an audio file instead.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeSource === 'file' && (
                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleFileSelect}
                                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl bg-white focus:border-purple-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                disabled={isLoading}
                            />
                        </div>
                        <p className="text-xs text-gray-600 text-center">
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing your music...
                                </span>
                            ) : (
                                'Upload an audio file (MP3, WAV, FLAC, etc.) - Max 50MB'
                            )}
                        </p>
                    </div>
                )}

                {activeSource === 'tab-capture' && (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
                            <div className="flex items-start space-x-3">
                                <div className="text-blue-600 text-xl">🎵</div>
                                <div>
                                    <h4 className="font-semibold text-blue-900 mb-1">Tab Audio Capture</h4>
                                    <p className="text-sm text-blue-800">
                                        Share audio from any tab (Spotify, YouTube, Apple Music, etc.)
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleTabCapture}
                            disabled={isLoading || isMobile}
                            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Starting capture...
                                </span>
                            ) : (
                                '🎵 Capture Tab Audio'
                            )}
                        </button>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900 mb-3">📋 How to use:</p>
                            <div className="text-sm text-blue-800 space-y-2">
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 font-semibold">1.</span>
                                    <span>Click &quot;Capture Tab Audio&quot; above</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 font-semibold">2.</span>
                                    <span>Select the tab playing music</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 font-semibold">3.</span>
                                    <span>Make sure &quot;Share audio&quot; is checked</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 font-semibold">4.</span>
                                    <span>Click &quot;Share&quot; to start broadcasting</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-800">Broadcast Volume</label>
                    <span className="text-sm font-medium text-purple-600">{Math.round(audioGain * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioGain}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider:bg-purple-600"
                />
                <p className="text-xs text-gray-600 mt-1 text-center">
                    This controls how loud your music will be for other users
                </p>
            </div>
        </div>
    );
}
