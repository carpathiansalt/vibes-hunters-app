"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { YouTubeService, YouTubeVideo } from '@/core/YouTubeService';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { LocalAudioTrack as LiveKitLocalAudioTrack } from 'livekit-client';

export type MusicSource = 'file' | 'youtube' | 'url' | 'tab-capture';

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
    const [youtubeQuery, setYoutubeQuery] = useState('');
    const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
    const [urlInput, setUrlInput] = useState('');
    const [audioGain, setAudioGain] = useState(volume);
    const [isSearching, setIsSearching] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioElementRef = useRef<HTMLAudioElement>(null);
    const currentTrackRef = useRef<LocalAudioTrack | null>(null);
    const youtubeService = YouTubeService.getInstance();

    useEffect(() => {
        if (onVolumeChange) {
            onVolumeChange(audioGain);
        }
    }, [audioGain, onVolumeChange]);

    // Cleanup on unmount
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

    const handleYouTubeSearch = async () => {
        if (!youtubeQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await youtubeService.searchVideos(youtubeQuery);
            setYoutubeResults(results.videos);
        } catch (error) {
            console.error('YouTube search error:', error);
            alert('Failed to search YouTube. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleYouTubeSelect = (video: YouTubeVideo) => {
        setUrlInput(video.url);
    };

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

    const handleUrlPlay = async () => {
        if (!urlInput.trim()) return;

        let videoTitle = 'Unknown';

        // Check if it's a YouTube URL
        if (youtubeService.isValidYouTubeUrl(urlInput)) {
            const videoId = youtubeService.extractVideoId(urlInput);
            if (videoId) {
                const videoDetails = await youtubeService.getVideoDetails(videoId);
                if (videoDetails) {
                    videoTitle = videoDetails.title;
                }
            }
        } else {
            // For other URLs, use the URL as title
            videoTitle = urlInput;
        }

        await startAudioPlayback(urlInput, videoTitle);
    };

    const handleTabCapture = async () => {
        setIsLoading(true);

        try {
            // Check if we're on mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile) {
                alert('Tab audio capture is not supported on mobile devices. Please use file upload or URL playback instead.');
                return;
            }

            // Check if getDisplayMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                alert('Screen capture is not supported in this browser. Please try Chrome, Edge, or Firefox.');
                return;
            }

            // Request screen capture with audio
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: 1,
                    height: 1,
                    frameRate: 1
                },
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100
                }
            });

            // Extract only audio tracks
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                alert('No audio found in the selected tab. Please make sure the tab is playing audio and try again.');
                // Stop video tracks
                mediaStream.getVideoTracks().forEach(track => track.stop());
                return;
            }

            // Create audio-only stream
            const audioStream = new MediaStream(audioTracks);

            // Stop video tracks to save bandwidth
            mediaStream.getVideoTracks().forEach(track => track.stop());

            // Add event listener for when the user stops sharing
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

    const startAudioPlayback = async (source: File | string, title: string) => {
        if (!room) return;

        setIsLoading(true);
        try {
            const audioElement = audioElementRef.current || new Audio();
            audioElementRef.current = audioElement;

            if (source instanceof File) {
                const audioURL = URL.createObjectURL(source);
                audioElement.src = audioURL;
            } else {
                audioElement.src = source;
            }

            audioElement.loop = true;
            audioElement.volume = audioGain;

            // Wait for the audio to be ready
            await new Promise<void>((resolve, reject) => {
                audioElement.oncanplaythrough = () => resolve();
                audioElement.onerror = () => reject(new Error('Failed to load audio'));
                audioElement.load();
            });

            // Start playing the audio first to ensure the stream has audio
            await audioElement.play();

            // Wait a bit for audio to start flowing
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture audio stream
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
        }
    };

    const startAudioFromStream = async (mediaStream: MediaStream, title: string) => {
        if (!room) return;

        try {
            // Get the audio track from the MediaStream
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('No audio tracks found in the media stream');
            }

            const audioTrack = audioTracks[0];

            // Verify the audio track is active
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
                name: `music-${title}`,
                dtx: false, // Disable discontinuous transmission
            });

            onPublishStart(title, localAudioTrack, audioElementRef.current || undefined);
        } catch (error) {
            console.error('Error publishing audio track:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to publish audio: ${errorMessage}`);

            // Clean up on error
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
            // First stop the audio element to stop sound immediately
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current.currentTime = 0;
            }

            // Stop and unpublish the track
            if (currentTrackRef.current) {
                // Stop the track before unpublishing
                currentTrackRef.current.stop();

                // Unpublish the track
                await room.localParticipant.unpublishTrack(currentTrackRef.current);
            }

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
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Stop
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
                        className={`px-3 py-2 rounded text-sm ${activeSource === 'file' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
                    >
                        📁 File
                    </button>
                    <button
                        onClick={() => setActiveSource('youtube')}
                        className={`px-3 py-2 rounded text-sm ${activeSource === 'youtube' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
                    >
                        🎬 YouTube
                    </button>
                    <button
                        onClick={() => setActiveSource('url')}
                        className={`px-3 py-2 rounded text-sm ${activeSource === 'url' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
                    >
                        🔗 URL
                    </button>
                    <button
                        onClick={() => setActiveSource('tab-capture')}
                        className={`px-3 py-2 rounded text-sm ${activeSource === 'tab-capture' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
                    >
                        🎵 Tab Audio
                    </button>
                </div>

                {activeSource === 'file' && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleFileSelect}
                            className="w-full p-2 border rounded"
                        />
                        <p className="text-xs text-gray-500 mt-1">Upload an audio file from your device</p>
                    </div>
                )}

                {activeSource === 'youtube' && (
                    <div className="space-y-4">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={youtubeQuery}
                                onChange={(e) => setYoutubeQuery(e.target.value)}
                                placeholder="Search YouTube..."
                                className="flex-1 p-2 border rounded"
                                onKeyPress={(e) => e.key === 'Enter' && handleYouTubeSearch()}
                            />
                            <button
                                onClick={handleYouTubeSearch}
                                disabled={isSearching}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                            >
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {youtubeResults.length > 0 && (
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {youtubeResults.map((video) => (
                                    <div
                                        key={video.id}
                                        onClick={() => handleYouTubeSelect(video)}
                                        className="flex items-center space-x-3 p-2 bg-white rounded cursor-pointer hover:bg-gray-100"
                                    >
                                        <Image
                                            src={video.thumbnail}
                                            alt={video.title}
                                            width={64}
                                            height={48}
                                            className="w-16 h-12 object-cover rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{video.title}</p>
                                            <p className="text-xs text-gray-500">{video.channelTitle} • {video.duration}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeSource === 'url' && (
                    <div className="space-y-2">
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Enter YouTube URL, Spotify Web URL, or any audio URL..."
                            className="w-full p-2 border rounded"
                        />
                        <button
                            onClick={handleUrlPlay}
                            disabled={!urlInput.trim() || isLoading}
                            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Play from URL'}
                        </button>
                        <p className="text-xs text-gray-500">
                            Paste a URL from YouTube, Spotify Web Player, or any direct audio link
                        </p>
                    </div>
                )}

                {activeSource === 'tab-capture' && (
                    <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2">📱 Device Compatibility</h4>
                            <p className="text-sm text-blue-800">
                                • <strong>Desktop:</strong> Chrome, Edge, Firefox ✅<br />
                                • <strong>Mobile:</strong> Not supported ❌
                            </p>
                        </div>

                        <button
                            onClick={handleTabCapture}
                            disabled={isLoading}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isLoading ? 'Starting...' : 'Share Tab Audio'}
                        </button>

                        <div className="text-xs text-gray-600 space-y-1">
                            <p><strong>How to use:</strong></p>
                            <p>1. Click &quot;Share Tab Audio&quot;</p>
                            <p>2. Select the tab playing music</p>
                            <p>3. Make sure &quot;Share audio&quot; is checked</p>
                            <p>4. Click &quot;Share&quot;</p>
                        </div>

                        <div className="text-xs text-gray-500">
                            <p><strong>Compatible with:</strong> Spotify Web, Apple Music, YouTube, SoundCloud, and any web audio</p>
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
