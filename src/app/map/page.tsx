"use client";

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HuntersMapView } from '@/components/HuntersMapView';

export default function MapPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // URL parameters
    const room = searchParams.get('room') || 'default';
    const avatar = searchParams.get('avatar') || 'char_001';
    const username = searchParams.get('username');

    // Validate required parameters
    if (!username) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
                <div className="text-center text-white max-w-md mx-4">
                    <div className="text-4xl mb-4">⚠️</div>
                    <div className="text-xl mb-4">Missing Information</div>
                    <div className="text-sm mb-6 bg-white/10 p-4 rounded-lg">
                        Username is required to join the social experience.
                    </div>
                    <button
                        onClick={() => router.push('/prejoin')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                        Go Back to Setup
                    </button>
                </div>
            </div>
        );
    }

    return (
        <HuntersMapView
            room={room}
            username={username}
            avatar={avatar}
        />
    );
}
