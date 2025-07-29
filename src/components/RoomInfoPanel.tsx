'use client';

import React, { Suspense } from 'react';
import { UserPosition } from '@/types';

interface RoomInfoPanelProps {
    room: string;
    username: string;
    isConnecting: boolean;
    isConnected: boolean;
    locationPermission: 'granted' | 'denied' | 'prompt';
    isTrackingLocation: boolean;
    gpsAccuracy: number | null;
    participants: Map<string, UserPosition>;
    roomInfoExpanded: boolean;
    showVoiceRange: boolean;
    onToggleRoomInfo: () => void;
    onToggleVoiceRange: () => void;
    onCenterMapOnUser: () => void;
    onShowAllParticipants: () => void;
    onLogParticipantState: () => void;
    onRefreshAllMarkers: () => void;
    getGpsAccuracyColor: (accuracy: number) => string;
    renderParticipantList: () => React.ReactNode;
    ComponentLoadingSpinner: React.ComponentType;
    EarshotRadius: React.ComponentType<{
        show: boolean;
        radius: number;
        onToggle: () => void;
    }>;
}

export function RoomInfoPanel({
    room,
    username,
    isConnecting,
    isConnected,
    locationPermission,
    isTrackingLocation,
    gpsAccuracy,
    participants,
    roomInfoExpanded,
    showVoiceRange,
    onToggleRoomInfo,
    onToggleVoiceRange,
    onCenterMapOnUser,
    onShowAllParticipants,
    onLogParticipantState,
    onRefreshAllMarkers,
    getGpsAccuracyColor,
    renderParticipantList,
    ComponentLoadingSpinner,
    EarshotRadius
}: RoomInfoPanelProps) {
    return (
        <div className="absolute bottom-4 left-4 z-30 bg-black/80 text-white rounded-lg backdrop-blur-sm shadow-lg w-auto" style={{ minWidth: 0, maxWidth: '100%', width: 'auto' }}>
            <button
                onClick={onToggleRoomInfo}
                className="w-full p-3 text-left hover:bg-white/10 transition-colors rounded-lg"
            >
                <div className="text-sm font-bold text-green-400 flex items-center justify-between">
                    <span>🎵 Info</span>
                    <span className="text-xs">{roomInfoExpanded ? '▼' : '▶'}</span>
                </div>
            </button>

            {roomInfoExpanded && (
                <div className="p-3 pt-0 space-y-1 max-w-xs">
                    <div className="text-sm">
                        <div>Room: <span className="text-blue-300">{room}</span></div>
                        <div>Hunter: <span className="text-yellow-300">{username}</span></div>
                        <div>Status: {
                            isConnecting ? '🟡 Connecting...' :
                                isConnected ? '🟢 Connected' :
                                    '🔴 Disconnected'
                        }</div>
                        <div>GPS: {
                            locationPermission === 'granted' ?
                                isTrackingLocation ? '🟢 Tracking' : '🟡 Available' :
                                locationPermission === 'denied' ? '🔴 Denied' :
                                    '🟡 Requesting...'
                        }</div>
                        {gpsAccuracy && (
                            <div>Accuracy: <span className={`${getGpsAccuracyColor(gpsAccuracy)}`}>{Math.round(gpsAccuracy)}m</span></div>
                        )}
                        <div className="border-t border-gray-600 pt-1 mt-2">
                            <div>Hunters Online: <span className="text-purple-300">{participants.size}</span></div>
                            {participants.size > 0 && (
                                <div className="mt-1 text-xs">
                                    <div className="text-gray-300">Active Hunters:</div>
                                    {renderParticipantList()}
                                    {participants.size > 5 && (
                                        <div className="text-gray-500">...and {participants.size - 5} more</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onCenterMapOnUser}
                            className="mt-2 bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full"
                        >
                            📍 Center on Me
                        </button>
                        <button
                            onClick={onShowAllParticipants}
                            className="mt-1 bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full"
                        >
                            🌍 Show All Hunters
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                            <button
                                onClick={() => {
                                    onLogParticipantState();
                                    onRefreshAllMarkers();
                                }}
                                className="mt-1 bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full"
                            >
                                🔧 Debug & Refresh
                            </button>
                        )}
                        <button
                            onClick={onToggleVoiceRange}
                            className="mt-2 bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs font-medium transition-colors w-full flex items-center justify-between"
                        >
                            <span>🎤 Voice Range</span>
                            <span className="text-xs">{showVoiceRange ? '✓' : '○'}</span>
                        </button>
                        {showVoiceRange && (
                            <div className="mt-2 p-2 bg-black/40 rounded">
                                <Suspense fallback={<ComponentLoadingSpinner />}>
                                    <EarshotRadius
                                        show={showVoiceRange}
                                        radius={50}
                                        onToggle={onToggleVoiceRange}
                                    />
                                </Suspense>
                            </div>
                        )}

                        {/* Legal Links */}
                        <div className="mt-4 pt-2 border-t border-gray-600">
                            <div className="text-xs text-gray-400 space-y-1">
                                <div className="flex flex-wrap gap-2">
                                    <a href="/legal/about" className="hover:text-white transition-colors underline">About</a>
                                    <a href="/legal/faq" className="hover:text-white transition-colors underline">FAQ</a>
                                    <a href="/legal/privacy" className="hover:text-white transition-colors underline">Privacy</a>
                                </div>
                                <div>
                                    <a href="mailto:info@vibes-hunters.com" className="text-blue-300 hover:text-white transition-colors text-xs">
                                        info@vibes-hunters.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 