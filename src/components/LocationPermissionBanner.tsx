'use client';

import React from 'react';

interface LocationPermissionBannerProps {
    locationPermission: 'granted' | 'denied' | 'prompt';
    onRequestLocation: () => Promise<void>;
}

export function LocationPermissionBanner({ 
    locationPermission, 
    onRequestLocation 
}: LocationPermissionBannerProps) {
    if (locationPermission !== 'denied') {
        return null;
    }

    return (
        <div className="absolute bottom-4 right-4 z-30 bg-orange-600 text-white p-3 rounded-lg backdrop-blur-sm">
            <div className="text-sm">
                <div className="font-bold mb-1">📍 Enable GPS</div>
                <div className="mb-2">For the best experience, enable location access in your browser.</div>
                <button
                    onClick={onRequestLocation}
                    className="bg-orange-500 hover:bg-orange-400 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                    Request Location
                </button>
            </div>
        </div>
    );
} 