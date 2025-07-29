'use client';

import React from 'react';


interface MusicControlsProps {
    isPublishingMusic: boolean;
    isListeningToMusic: boolean;
    isMusicPaused: boolean;
    isLoading: boolean;
    onMusicButtonClick: () => void;
}

export function MusicControls({
    isPublishingMusic,
    isListeningToMusic,
    isMusicPaused,
    isLoading,
    onMusicButtonClick
}: MusicControlsProps) {
    const getButtonText = () => {
        if (isPublishingMusic) {
            return isMusicPaused ? '▶️ Resume' : '⏸️ Pause';
        } else if (isListeningToMusic) {
            return '🚪 Leave Party';
        } else {
            return '🎵 Start Party';
        }
    };

    const getButtonColor = () => {
        if (isPublishingMusic) {
            return 'bg-purple-600 hover:bg-purple-700';
        } else if (isListeningToMusic) {
            return 'bg-blue-600 hover:bg-blue-700';
        } else {
            return 'bg-green-600 hover:bg-green-700';
        }
    };

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <button
                onClick={onMusicButtonClick}
                disabled={isLoading}
                className={`px-6 py-3 rounded-full text-white font-medium shadow-lg transition-all duration-200 ${getButtonColor()} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {getButtonText()}
            </button>
        </div>
    );
} 