"use client";

import React, { useState } from 'react';
type Genre = {
    name: string;
    image: string;
};
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


// Dynamically use all images from public/music_gendre
const genreImages = [
    'ambient.png',
    'blues.png',
    'classical.png',
    'disco.png',
    'folk.png',
    'funk.png',
    'hip-hop.png',
    'jazz.png',
    'pop.png',
    'punk.png',
    'R&B.png',
    'raggae.png',
    'rock.png',
    'soul.png',
    'techno.png',
];

const genres = genreImages.map(img => ({
    image: `/music_gendre/${img}`,
    name: img.replace('.png', ''), // Used for selection only
}));

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

                    <div className="space-y-8">
                        {/* Music Genre */}
                        <div className="pb-2">
                            <label className="block font-semibold mb-3 text-gray-900">Music Genre</label>
                            <div className="bg-gray-50 rounded-2xl shadow-sm px-3 py-4 border border-gray-200">
                                <GenreCarousel genres={genres} genre={genre} setGenre={setGenre} />
                            </div>
                        </div>
                        {/* Avatar Selection */}
                        <div className="pb-2">
                            <label className="block font-semibold mb-3 text-gray-900">Choose Your Avatar</label>
                            <div className="bg-gray-50 rounded-2xl shadow-sm px-3 py-4 border border-gray-200">
                                <AvatarCarousel avatars={avatars} avatar={avatar} setAvatar={setAvatar} />
                            </div>
                        </div>
                        {/* Username Input */}
                        <div className="pb-2">
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
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        const currentIdx = avatars.findIndex(a => a === avatar);
        if (currentIdx !== -1) setIndex(currentIdx);
    }, [avatar, avatars]);

    const handlePrev = () => setIndex(i => Math.max(0, i - 1));
    const handleNext = () => setIndex(i => Math.min(avatars.length - 1, i + 1));

    return (
        <div className="flex items-center justify-center gap-4">
            <button
                type="button"
                onClick={handlePrev}
                disabled={index === 0}
                className="p-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 shadow-lg hover:scale-110 transition-all disabled:opacity-50"
                aria-label="Previous avatar"
            >
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
                type="button"
                onClick={() => setAvatar(avatars[index])}
                className={`relative rounded-3xl border-4 p-2 transition-all w-28 h-28 flex items-center justify-center bg-white shadow-xl ${avatar === avatars[index]
                    ? 'border-purple-500 scale-105'
                    : 'border-gray-200 hover:border-purple-300'}`}
            >
                <Image
                    src={`/characters_001/${avatars[index]}.png`}
                    alt={avatars[index]}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-2xl object-cover"
                    style={{ width: '96px', height: '96px' }}
                />
                {avatar === avatars[index] && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </button>
            <button
                type="button"
                onClick={handleNext}
                disabled={index === avatars.length - 1}
                className="p-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 shadow-lg hover:scale-110 transition-all disabled:opacity-50"
                aria-label="Next avatar"
            >
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
}

// GenreCarousel component for scrolling genres with arrows (like AvatarCarousel)
function GenreCarousel({ genres, genre, setGenre }: { genres: Genre[], genre: string, setGenre: (g: string) => void }) {
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        const currentIdx = genres.findIndex(g => g.name === genre);
        if (currentIdx !== -1) setIndex(currentIdx);
    }, [genre, genres]);

    const handlePrev = () => setIndex(i => Math.max(0, i - 1));
    const handleNext = () => setIndex(i => Math.min(genres.length - 1, i + 1));

    return (
        <div className="flex items-center justify-center gap-4">
            <button
                type="button"
                onClick={handlePrev}
                disabled={index === 0}
                className="p-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 shadow-lg hover:scale-110 transition-all disabled:opacity-50"
                aria-label="Previous genre"
            >
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
                type="button"
                onClick={() => setGenre(genres[index].name)}
                className={`relative rounded-3xl border-4 p-2 transition-all w-28 h-28 flex items-center justify-center bg-white shadow-xl ${genre === genres[index].name
                    ? 'border-purple-500 scale-105'
                    : 'border-gray-200 hover:border-purple-300'}`}
            >
                <Image
                    src={genres[index].image}
                    alt={genres[index].name}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-2xl object-cover"
                    style={{ width: '96px', height: '96px' }}
                />
                {genre === genres[index].name && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </button>
            <button
                type="button"
                onClick={handleNext}
                disabled={index === genres.length - 1}
                className="p-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 shadow-lg hover:scale-110 transition-all disabled:opacity-50"
                aria-label="Next genre"
            >
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
}
