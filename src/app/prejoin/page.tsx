"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


const genres = [
    'Ambient', 'Blues', 'Classical', 'Disco', 'Folk', 'Funk', 'Hip-Hop', 'Jazz', 'Pop', 'Punk', 'R&B', 'Reggae','Rock', 'Soul', 'Techno'
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
                <div className="mb-4">
                    <div className="text-6xl mb-2">🎵</div>
                    <h1 className="text-4xl sm:text-5xl font-bold mb-2">Vibes Hunters</h1>
                </div>
                <p className="text-purple-200 text-lg sm:text-xl">Find your tribe through music</p>
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
                            className="w-full mt-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                        >
                            🎵 Join the Hunt
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-purple-200 text-sm mt-8 pb-8 space-y-4">
                <p>Connect with others who share your musical taste</p>

                {/* New streaming capabilities highlight */}
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 max-w-lg mx-auto border border-white/20">
                    <h3 className="font-bold text-white mb-3 text-lg">🎵 Share Your Music</h3>
                    <div className="text-sm space-y-2 text-white">
                        <p>• Upload audio files from your device</p>
                        <p>• Capture audio from any tab (desktop)</p>
                        <p>• Works with Spotify, YouTube, Apple Music</p>
                        <p>• Real-time spatial audio voice chat</p>
                    </div>
                </div>

                {/* Legal Links */}
                <div className="flex flex-wrap justify-center gap-4 text-xs">
                    <Link href="/legal/about" className="hover:text-white transition-colors underline">
                        About
                    </Link>
                    <Link href="/legal/privacy" className="hover:text-white transition-colors underline">
                        Privacy Policy
                    </Link>
                    <Link href="/legal/terms" className="hover:text-white transition-colors underline">
                        Terms of Service
                    </Link>
                    <Link href="/legal/faq" className="hover:text-white transition-colors underline">
                        FAQ
                    </Link>
                </div>

                {/* Contact Info */}
                <div className="text-xs">
                    <p>Questions or feedback? Contact us at:</p>
                    <a
                        href="mailto:info@vibes-hunters.com"
                        className="text-purple-300 hover:text-white transition-colors underline font-medium"
                    >
                        info@vibes-hunters.com
                    </a>
                </div>
            </div>
        </main>
    );
}

// AvatarCarousel component for scrolling avatars
function AvatarCarousel({ avatars, avatar, setAvatar }: { avatars: string[], avatar: string, setAvatar: (a: string) => void }) {
    const [start, setStart] = React.useState(0);
    const [visibleCount, setVisibleCount] = React.useState(4); // Default to 4 for mobile

    // Adjust visible count based on screen size
    React.useEffect(() => {
        const updateVisibleCount = () => {
            const width = window.innerWidth;
            if (width >= 640) { // sm breakpoint
                setVisibleCount(5);
            } else if (width >= 480) {
                setVisibleCount(4);
            } else {
                setVisibleCount(3);
            }
        };

        updateVisibleCount();
        window.addEventListener('resize', updateVisibleCount);
        return () => window.removeEventListener('resize', updateVisibleCount);
    }, []);

    const end = Math.min(start + visibleCount, avatars.length);

    const handlePrev = () => setStart(s => Math.max(0, s - 1));
    const handleNext = () => setStart(s => Math.min(avatars.length - visibleCount, s + 1));

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handlePrev}
                disabled={start === 0}
                className="px-2 py-2 rounded bg-gray-200 text-gray-600 disabled:opacity-50 min-w-[32px]"
                aria-label="Previous avatars"
            >
                &#8592;
            </button>
            <div className="flex gap-2 overflow-hidden">
                {avatars.slice(start, end).map(a => (
                    <button
                        type="button"
                        key={a}
                        onClick={() => setAvatar(a)}
                        className={`relative rounded-2xl border-3 p-2 transition-all min-w-[72px] min-h-[72px] ${avatar === a
                            ? 'border-purple-500 bg-purple-50 scale-105'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Image
                            src={`/characters_001/${a}.png`}
                            alt={a}
                            width={56}
                            height={56}
                            className="min-w-[56px] min-h-[56px] w-14 h-14 rounded-xl object-cover"
                            style={{ width: '56px', height: '56px' }}
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
                className="px-2 py-2 rounded bg-gray-200 text-gray-600 disabled:opacity-50 min-w-[32px]"
                aria-label="Next avatars"
            >
                &#8594;
            </button>
        </div>
    );
}
