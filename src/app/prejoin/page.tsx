"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';


const genres = [
    'Pop', 'Rock', 'Jazz', 'Classical', 'Hip-Hop', 'Electronic', 'World', 'Reggae', 'Folk', 'Other'
];

// Dynamically generate avatar filenames (supporting up to 25 for now)
const avatarCount = 25;
const avatars = Array.from({ length: avatarCount }, (_, i) => `char_${String(i + 1).padStart(3, '0')}`);

export default function PreJoinPage() {
    const router = useRouter();
    const [genre, setGenre] = useState('Pop');
    const [avatar, setAvatar] = useState('char_001');
    const [username, setUsername] = useState('');

    const handleJoinRoom = () => {
        if (!username.trim()) {
            alert('Please enter a username');
            return;
        }

        const params = new URLSearchParams({
            room: genre,
            avatar,
            username: username.trim(),
        });

        router.push(`/map?${params.toString()}`);
    };

    return (
        <main className="min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4">
            {/* Header */}
            <div className="text-center text-white mb-8 pt-8">
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">🎵 Vibes Hunters</h1>
                <p className="text-purple-200 text-sm sm:text-base">Find your tribe through music</p>
            </div>

            {/* Main Card */}
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-800">Choose Your Vibe</h2>

                    <div className="space-y-6">
                        {/* Music Genre */}
                        <div>
                            <label className="block font-semibold mb-3 text-gray-900">Music Genre</label>
                            <select
                                value={genre}
                                onChange={e => setGenre(e.target.value)}
                                className="w-full p-4 rounded-2xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none transition-colors text-lg text-gray-900 bg-white/80 placeholder-gray-400"
                            >
                                {genres.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        {/* Avatar Selection */}
                        <div>
                            <label className="block font-semibold mb-3 text-gray-900">Choose Your Avatar</label>
                            <AvatarCarousel avatars={avatars} avatar={avatar} setAvatar={setAvatar} />
                        </div>

                        {/* Username Input */}
                        <div>
                            <label className="block font-semibold mb-3 text-gray-900">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full p-4 rounded-2xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none transition-colors text-lg text-gray-900 bg-white/80 placeholder-gray-400"
                                placeholder="Type your username..."
                                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                            />
                        </div>

                        {/* Join Button */}
                        <button
                            onClick={handleJoinRoom}
                            className="w-full mt-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
                        >
                            🚀 Enter the Map
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-purple-200 text-sm mt-8 pb-8">
                <p>Connect with others who share your musical taste</p>
            </div>
        </main>
    );
}

// AvatarCarousel component for scrolling avatars
function AvatarCarousel({ avatars, avatar, setAvatar }: { avatars: string[], avatar: string, setAvatar: (a: string) => void }) {
    const [start, setStart] = React.useState(0);
    const visibleCount = 5;
    const end = Math.min(start + visibleCount, avatars.length);

    const handlePrev = () => setStart(s => Math.max(0, s - 1));
    const handleNext = () => setStart(s => Math.min(avatars.length - visibleCount, s + 1));

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handlePrev}
                disabled={start === 0}
                className="px-2 py-1 rounded bg-gray-200 text-gray-600 disabled:opacity-50"
                aria-label="Previous avatars"
            >
                &#8592;
            </button>
            <div className="flex gap-3">
                {avatars.slice(start, end).map(a => (
                    <button
                        type="button"
                        key={a}
                        onClick={() => setAvatar(a)}
                        className={`relative rounded-2xl border-3 p-2 transition-all ${avatar === a
                            ? 'border-purple-500 bg-purple-50 scale-105'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Image
                            src={`/characters_001/${a}.png`}
                            alt={a}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-xl object-cover"
                            style={{ width: 'auto', height: 'auto' }}
                        />
                        {avatar === a && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={handleNext}
                disabled={end >= avatars.length}
                className="px-2 py-1 rounded bg-gray-200 text-gray-600 disabled:opacity-50"
                aria-label="Next avatars"
            >
                &#8594;
            </button>
        </div>
    );
}
