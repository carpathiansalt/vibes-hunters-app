"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import type { UserPosition } from '@/types';

import type { Room, LocalAudioTrack } from 'livekit-client';
import { EnhancedMusicPlayer } from './EnhancedMusicPlayer';

type UserMetadata = {
    musicTitle?: string;
    musicDescription?: string;
    [key: string]: unknown;
};

type BoomboxMusicDialogProps = {
    user: UserPosition & { metadata?: string | UserMetadata };
    onClose: () => void;
    onJoin: () => void;
    room?: Room | null;
    onPublishStart?: (filename: string, track?: LocalAudioTrack, audioElement?: HTMLAudioElement) => void;
    onPublishStop?: () => void;
    isSelf?: boolean; // New prop to distinguish self vs others
    isListening?: boolean; // Whether the user is currently listening to this participant's music
    musicTitle?: string;
    setMusicTitle?: (title: string) => void;
    musicDescription?: string;
    setMusicDescription?: (desc: string) => void;
};

export function BoomboxMusicDialog({
    user,
    onClose,
    onJoin,
    room,
    onPublishStart,
    onPublishStop,
    isSelf = false,
    isListening = false,
    musicTitle,
    setMusicTitle,
    musicDescription,
    setMusicDescription
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

    // Extract musicTitle and musicDescription from user.metadata if available (for remote users)
    let remoteMusicTitle = user.musicTitle;
    let remoteMusicDescription = user.musicDescription;
    if (user.metadata) {
        try {
            const meta: UserMetadata = typeof user.metadata === 'string' ? JSON.parse(user.metadata) : user.metadata;
            if (meta.musicTitle) remoteMusicTitle = meta.musicTitle;
            if (meta.musicDescription) remoteMusicDescription = meta.musicDescription;
        } catch {
            // ignore parse errors
        }
    }
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 flex flex-col max-h-[90vh] relative">
                {/* Close Button (always top-right, accessible) */}
                <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-gray-800 bg-opacity-80 hover:bg-opacity-100 text-white flex items-center justify-center text-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    tabIndex={0}
                >
                    ×
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 pt-10 text-white text-center rounded-t-2xl">
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
                <div className="p-6 flex-1 overflow-y-auto">
                    {isSelf ? (
                        /* Self - Show Music Upload */
                        <div>
                            {/* Enhanced Music Player Section */}
                            {room && (
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <EnhancedMusicPlayer
                                        room={room}
                                        onPublishStart={(filename, track, audioElement) => {
                                            onPublishStart?.(filename, track, audioElement);
                                            // Always close dialog after starting a party
                                            onClose?.();
                                        }}
                                        onPublishStop={onPublishStop || (() => { })}
                                        onClose={onClose}
                                        musicTitle={musicTitle}
                                        setMusicTitle={setMusicTitle}
                                        musicDescription={musicDescription}
                                        setMusicDescription={setMusicDescription}
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
                                    {remoteMusicTitle && (
                                        <p className="text-purple-700 text-base font-bold mt-1">
                                            <span className="font-bold">Event/Venue:</span> {remoteMusicTitle}
                                        </p>
                                    )}
                                    {remoteMusicDescription && remoteMusicDescription.trim() !== '' && (
                                        <p className="text-gray-800 text-sm mt-1">
                                            <span className="font-bold">Description:</span> {remoteMusicDescription}
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

                    {/* Action Buttons: Only render for remote user dialogs */}
                    {!isSelf && (
                        <div className="flex space-x-3 pt-4 pb-2 bg-white sticky bottom-0 z-10 border-t border-gray-200">
                            {/* Others - Show Join/Cancel Buttons */}
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
                        </div>
                    )}
                </div>

                {/* Footer: Only show for remote user dialogs */}
                {!isSelf && (
                    <div className="bg-gray-50 px-6 py-4 text-center">
                        <p className="text-xs text-gray-500">
                            Move closer to hear your tribe louder • Move away to make it quieter
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
