"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import type { UserPosition } from '@/types';
import type { Room } from 'livekit-client';
import { MusicPublisher } from './MusicPublisher';

interface BoomboxMusicDialogProps {
    user: UserPosition;
    onClose: () => void;
    onJoin: () => void;
    room?: Room | null;
    spatialAudioEnabled?: boolean;
    isPublishing?: boolean;
    onPublishStart?: (filename: string) => void;
    onPublishStop?: () => void;
}

export function BoomboxMusicDialog({
    user,
    onClose,
    onJoin,
    room,
    spatialAudioEnabled = false,
    isPublishing = false,
    onPublishStart,
    onPublishStop
}: BoomboxMusicDialogProps) {
    const [isJoining, setIsJoining] = useState(false);

    const handleJoin = async () => {
        setIsJoining(true);
        try {
            await onJoin();
        } catch (error) {
            console.error('Error joining music party:', error);
            alert('Failed to join music party. Please try again.');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white text-center">
                    <div className="text-4xl mb-2">🎵</div>
                    <h2 className="text-2xl font-bold">Music Party!</h2>
                    <p className="text-purple-100 text-sm mt-1">Someone is sharing their vibe</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* User Info */}
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="relative">
                            <Image
                                src={`/characters_001/${user.avatar}.png`}
                                alt={user.username}
                                width={60}
                                height={60}
                                className="w-15 h-15 rounded-full object-cover border-3 border-purple-200"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                <span className="text-xs">🎵</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">{user.username}</h3>
                            <p className="text-gray-600 text-sm">is sharing music nearby</p>
                            {user.musicTitle && (
                                <p className="text-purple-600 text-sm font-medium mt-1">
                                    Playing: {user.musicTitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                        <div className="flex items-start space-x-3">
                            <div className="text-blue-500 text-lg">ℹ️</div>
                            <div className="text-blue-700 text-sm">
                                <p className="font-medium mb-1">Join this music party to:</p>
                                <ul className="text-xs space-y-1">
                                    <li>• Listen to the same music together</li>
                                    <li>• Experience spatial audio as you move</li>
                                    <li>• Chat while the music plays</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Music Publisher Section */}
                    {room && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                                <span>🎵</span>
                                <span>Share Your Music</span>
                                {spatialAudioEnabled && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                        Spatial Audio
                                    </span>
                                )}
                            </div>
                            <MusicPublisher
                                room={room}
                                isPublishing={isPublishing}
                                spatialAudioEnabled={spatialAudioEnabled}
                                onPublishStart={onPublishStart || (() => { })}
                                onPublishStop={onPublishStop || (() => { })}
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            onClick={handleJoin}
                            disabled={isJoining}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isJoining ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Joining...
                                </span>
                            ) : (
                                '🎧 Join Party'
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isJoining}
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 text-center">
                    <p className="text-xs text-gray-500">
                        Move closer to hear the music louder • Move away to make it quieter
                    </p>
                </div>
            </div>
        </div>
    );
}
