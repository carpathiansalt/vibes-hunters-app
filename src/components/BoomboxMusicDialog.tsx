"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import type { UserPosition } from '@/types';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { EnhancedMusicPlayer } from './EnhancedMusicPlayer';

interface BoomboxMusicDialogProps {
    user: UserPosition;
    onClose: () => void;
    onJoin: () => void;
    room?: Room | null;
    onPublishStart?: (filename: string, track?: LocalAudioTrack, audioElement?: HTMLAudioElement) => void;
    onPublishStop?: () => void;
    isSelf?: boolean; // New prop to distinguish self vs others
    isListening?: boolean; // Whether the user is currently listening to this participant's music
}

export function BoomboxMusicDialog({
    user,
    onClose,
    onJoin,
    room,
    onPublishStart,
    onPublishStop,
    isSelf = false,
    isListening = false
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
                    <div className="text-4xl mb-2">{isSelf ? '🎵' : '🎧'}</div>
                    <h2 className="text-2xl font-bold">
                        {isSelf ? 'Start Music Party!' : isListening ? 'Leave Music Party?' : 'Join Music Party!'}
                    </h2>
                    <p className="text-purple-100 text-sm mt-1">
                        {isSelf ? 'Share your music with nearby hunters' :
                            isListening ? 'You are currently listening to this party' :
                                'Someone is sharing their vibe'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isSelf ? (
                        /* Self - Show Music Upload */
                        <div>
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">🎵</div>
                                <h3 className="font-bold text-gray-800 text-lg mb-2">Share Your Music</h3>
                                <p className="text-gray-600 text-sm">
                                    Play music from YouTube, Spotify, Apple Music, or upload from your device!
                                </p>
                            </div>

                            {/* Enhanced Music Player Section */}
                            {room && (
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <EnhancedMusicPlayer
                                        room={room}
                                        onPublishStart={(filename, track, audioElement) => {
                                            onPublishStart?.(filename, track, audioElement);
                                        }}
                                        onPublishStop={onPublishStop || (() => { })}
                                        onClose={onClose}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Others - Show Join Party */
                        <div>
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
                            <div className={`${isListening ? 'bg-green-50 border-green-200' : user.isPublishingMusic ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} rounded-xl p-4 mb-6 border`}>
                                <div className="flex items-start space-x-3">
                                    <div className={`${isListening ? 'text-green-500' : user.isPublishingMusic ? 'text-blue-500' : 'text-orange-500'} text-lg`}>
                                        {isListening ? '🎵' : user.isPublishingMusic ? 'ℹ️' : '⚠️'}
                                    </div>
                                    <div className={`${isListening ? 'text-green-700' : user.isPublishingMusic ? 'text-blue-700' : 'text-orange-700'} text-sm`}>
                                        {isListening ? (
                                            <div>
                                                <p className="font-medium mb-1">You are listening to this music party!</p>
                                                <ul className="text-xs space-y-1">
                                                    <li>• Click &quot;Leave Party&quot; to stop listening</li>
                                                    <li>• Move around to experience spatial audio</li>
                                                    <li>• Only one music party can be active at a time</li>
                                                </ul>
                                            </div>
                                        ) : user.isPublishingMusic ? (
                                            <div>
                                                <p className="font-medium mb-1">Join this music party to:</p>
                                                <ul className="text-xs space-y-1">
                                                    <li>• Listen to the same music together</li>
                                                    <li>• Experience spatial audio as you move</li>
                                                    <li>• Chat while the music plays</li>
                                                </ul>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-medium mb-1">No music is currently playing</p>
                                                <ul className="text-xs space-y-1">
                                                    <li>• Wait for {user.username} to start playing music</li>
                                                    <li>• The join button will become available when music starts</li>
                                                    <li>• Try refreshing or check back later</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        {isSelf ? (
                            /* Self - Show Close Button */
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        ) : (
                            /* Others - Show Join/Cancel Buttons */
                            <>
                                <button
                                    onClick={handleJoin}
                                    disabled={isJoining || (!user.isPublishingMusic && !isListening)}
                                    className={`flex-1 ${isListening
                                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                                        : user.isPublishingMusic
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                                            : 'bg-gray-400 cursor-not-allowed'
                                        } text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isJoining ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {isListening ? 'Leaving...' : 'Joining...'}
                                        </span>
                                    ) : isListening ? (
                                        '🚪 Leave Party'
                                    ) : user.isPublishingMusic ? (
                                        '🎧 Join Party'
                                    ) : (
                                        '⏳ No Music Playing'
                                    )}
                                </button>
                                <button
                                    onClick={onClose}
                                    disabled={isJoining}
                                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
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
