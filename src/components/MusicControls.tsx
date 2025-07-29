'use client';

import React from 'react';

interface MusicControlsProps {
    isPublishingMusic: boolean;
    isListeningToMusic: boolean;
    musicStateSource: 'file' | 'tab-capture' | undefined;
    onMusicButtonClick: () => void;
    onStopMusic: () => void;
    getMusicButtonStyle: () => string;
    getMusicButtonIcon: () => string;
    getMusicButtonTitle: () => string;
}

export function MusicControls({
    isPublishingMusic,
    isListeningToMusic,
    musicStateSource,
    onMusicButtonClick,
    onStopMusic,
    getMusicButtonStyle,
    getMusicButtonIcon,
    getMusicButtonTitle
}: MusicControlsProps) {
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
            {isPublishingMusic && musicStateSource === 'tab-capture' && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    Tab Audio Capture
                </div>
            )}
        </div>
    );
} 