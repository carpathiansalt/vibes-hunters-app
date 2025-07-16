"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { YouTubeService, YouTubeVideo } from '@/core/YouTubeService';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { createLocalAudioTrack, Track } from 'livekit-client';

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
        try {
            // Request screen capture with audio
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // Extract only audio tracks
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                alert('No audio found in the selected tab. Please make sure the tab is playing audio.');
                return;
            }

            // Create audio-only stream
            const audioStream = new MediaStream(audioTracks);

            // Stop video tracks to save bandwidth
            mediaStream.getVideoTracks().forEach(track => track.stop());

            await startAudioFromStream(audioStream, 'Tab Audio Capture');
        } catch (error) {
            console.error('Tab capture error:', error);
            alert('Failed to capture tab audio. Please try again.');
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

            await new Promise<void>((resolve, reject) => {
                audioElement.oncanplaythrough = () => resolve();
                audioElement.onerror = () => reject(new Error('Failed to load audio'));
                audioElement.load();
            });

            await audioElement.play();
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
            alert('Failed to start audio playback. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const startAudioFromStream = async (mediaStream: MediaStream, title: string) => {
        if (!room) return;

        try {
            // Create LiveKit audio track from MediaStream
            const audioTrack = await createLocalAudioTrack({
                deviceId: {
                    exact: mediaStream.getAudioTracks()[0].id
                }
            });

            // Publish the track with metadata
            await room.localParticipant.publishTrack(audioTrack, {
                name: 'music',
                source: Track.Source.Microphone
            });
            currentTrackRef.current = audioTrack;

            onPublishStart(title, audioTrack, audioElementRef.current || undefined);
        } catch (error) {
            console.error('Error publishing audio track:', error);
            alert('Failed to publish audio. Please try again.');
        }
    };

    const handleStop = async () => {
        if (currentTrackRef.current) {
            await currentTrackRef.current.stop();
            currentTrackRef.current = null;
        }

        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.src = '';
        }

        onPublishStop();
    };

    const handlePause = () => {
        if (audioElementRef.current) {
            audioElementRef.current.pause();
        }
        onPublishPause?.();
    };

    const handleResume = () => {
        if (audioElementRef.current) {
            audioElementRef.current.play();
        }
        onPublishResume?.();
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
                    <div className="space-y-2">
                        <button
                            onClick={handleTabCapture}
                            disabled={isLoading}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isLoading ? 'Starting...' : 'Capture Tab Audio'}
                        </button>
                        <p className="text-xs text-gray-500">
                            Share audio from any tab (Spotify, Apple Music, YouTube, etc.)
                        </p>
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
