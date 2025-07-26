'use client';

import React, { useCallback } from 'react';

// Music state enum for better type safety
type MusicState = 'idle' | 'publishing' | 'paused' | 'listening';

// Consolidated music state interface
interface MusicStateData {
    state: MusicState;
    source?: 'file' | 'tab-capture';
    listeningTo?: string;
    isPaused?: boolean;
}

interface MusicControlsProps {
    musicState: MusicStateData;
    isLoading: boolean;
    onMusicButtonClick: () => void;
    onStopMusic: () => void;
}

export function MusicControls({
    musicState,
    isLoading,
    onMusicButtonClick,
    onStopMusic
}: MusicControlsProps) {
    // Computed values
    const isPublishingMusic = musicState.state === 'publishing';
    const isListeningToMusic = musicState.state === 'listening';
    const isMusicPaused = musicState.state === 'paused';

    // Enhanced music button styling
    const getMusicButtonStyle = useCallback(() => {
        const baseClasses = 'w-16 h-16 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center text-white text-2xl';
        
        if (isLoading) {
            return `${baseClasses} bg-gray-500 cursor-not-allowed`;
        }
        
        if (isPublishingMusic) {
            if (musicState.source === 'file') {
                return isMusicPaused 
                    ? `${baseClasses} bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700`
                    : `${baseClasses} bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700`;
            } else {
                return `${baseClasses} bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700`;
            }
        } else if (isListeningToMusic) {
            return `${baseClasses} bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700`;
        } else {
            return `${baseClasses} bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700`;
        }
    }, [isPublishingMusic, isListeningToMusic, isMusicPaused, musicState.source, isLoading]);

    // Enhanced music button icon
    const getMusicButtonIcon = useCallback(() => {
        if (isLoading) return '⏳';
        if (isPublishingMusic) {
            if (musicState.source === 'file') {
                return isMusicPaused ? '▶️' : '⏸️';
            } else {
                return '📺';
            }
        } else if (isListeningToMusic) {
            return '🎧';
        } else {
            return '🎵';
        }
    }, [isPublishingMusic, isListeningToMusic, isMusicPaused, musicState.source, isLoading]);

    // Enhanced music button title
    const getMusicButtonTitle = useCallback(() => {
        if (isLoading) return 'Loading...';
        if (isPublishingMusic) {
            if (musicState.source === 'file') {
                return isMusicPaused ? 'Resume Music' : 'Pause Music';
            } else {
                return 'Tab Audio Capture (Control in source tab)';
            }
        } else if (isListeningToMusic) {
            return 'Disconnect from Music';
        } else {
            return 'Start Music Party';
        }
    }, [isPublishingMusic, isListeningToMusic, isMusicPaused, musicState.source, isLoading]);

    return (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
            <button
                onClick={onMusicButtonClick}
                className={getMusicButtonStyle()}
                title={getMusicButtonTitle()}
            >
                {getMusicButtonIcon()}
            </button>

            {/* Stop Button - Only show when music is playing or paused */}
            {isPublishingMusic && (
                <button
                    onClick={onStopMusic}
                    className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center text-white text-lg"
                    title="Stop Music Party"
                >
                    ⏹️
                </button>
            )}

            {/* Music Status Indicator */}
            {isListeningToMusic && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    Listening to music party
                </div>
            )}

            {/* Music Source Indicator for Publishing */}
            {isPublishingMusic && musicState.source === 'tab-capture' && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    Tab Audio Capture
                </div>
            )}
        </div>
    );
} 