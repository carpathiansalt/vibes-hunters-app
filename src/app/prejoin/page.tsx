"use client";

import React, { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Memoized genres array to prevent unnecessary re-renders
const genres = [
    { name: 'Ambient', image: '/music_gendre/ambient.png' },
    { name: 'Blues', image: '/music_gendre/blues.png' },
    { name: 'Classical', image: '/music_gendre/classical.png' },
    { name: 'Disco', image: '/music_gendre/disco.png' },
    { name: 'Folk', image: '/music_gendre/folk.png' },
    { name: 'Funk', image: '/music_gendre/funk.png' },
    { name: 'Hip-Hop', image: '/music_gendre/hip-hop.png' },
    { name: 'Jazz', image: '/music_gendre/jazz.png' },
    { name: 'Pop', image: '/music_gendre/pop.png' },
    { name: 'Punk', image: '/music_gendre/punk.png' },
    { name: 'Reggae', image: '/music_gendre/raggae.png' },
    { name: 'Rock', image: '/music_gendre/rock.png' },
    { name: 'Soul', image: '/music_gendre/soul.png' },
    { name: 'Techno', image: '/music_gendre/techno.png' },
] as const;

// Dynamically generate avatar filenames (supporting up to 25 for now)
const avatarCount = 25;
const avatars = Array.from({ length: avatarCount }, (_, i) => `char_${String(i + 1).padStart(3, '0')}`);

export default function PreJoinPage() {
    const router = useRouter();
    const [genre, setGenre] = useState('Pop');
    const [avatar, setAvatar] = useState('char_001');
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ username?: string }>({});

    // Memoized selected genre to prevent unnecessary recalculations
    const selectedGenre = useMemo(() => 
        genres.find(g => g.name === genre), 
        [genre]
    );

    // Optimized form validation
    const validateForm = useCallback(() => {
        const newErrors: { username?: string } = {};
        
        if (!username.trim()) {
            newErrors.username = 'Please enter a hunter name';
        } else if (username.trim().length < 2) {
            newErrors.username = 'Hunter name must be at least 2 characters';
        } else if (username.trim().length > 20) {
            newErrors.username = 'Hunter name must be 20 characters or less';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
            newErrors.username = 'Hunter name can only contain letters, numbers, hyphens, and underscores';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [username]);

    const handleJoinRoom = useCallback(async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        
        try {
            const params = new URLSearchParams({
                room: genre,
                avatar,
                username: username.trim(),
            });

            // Add a small delay to prevent double-clicks and show loading state
            await new Promise(resolve => setTimeout(resolve, 300));
            
            router.push(`/map?${params.toString()}`);
        } catch (error) {
            console.error('Navigation error:', error);
            setIsLoading(false);
        }
    }, [genre, avatar, username, router, validateForm]);

    const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value);
        // Clear errors when user starts typing
        if (errors.username) {
            setErrors(prev => ({ ...prev, username: undefined }));
        }
    }, [errors.username]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleJoinRoom();
        }
    }, [handleJoinRoom, isLoading]);

    return (
        <main className="h-screen flex flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 overflow-hidden">
            {/* Header */}
            <header className="text-center text-white pt-4 pb-2 px-4 flex-shrink-0">
                <div className="mb-2">
                    <div className="text-3xl sm:text-4xl lg:text-5xl mb-1" role="img" aria-label="Music note">🎵</div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">Vibes Hunters</h1>
                </div>
                <p className="text-purple-200 text-xs sm:text-sm lg:text-base">Find your tribe through music</p>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-3 sm:px-4 lg:px-6 pb-2 overflow-y-auto">
                <section className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 lg:p-6 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto" aria-labelledby="setup-heading">
                    <h2 id="setup-heading" className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 text-center text-gray-800">
                        Choose Your Vibe
                    </h2>

                    <form className="space-y-4 sm:space-y-5" onSubmit={(e) => { e.preventDefault(); handleJoinRoom(); }} noValidate>
                        {/* Music Genre Selection */}
                        <div>
                            <label htmlFor="genre-select" className="block font-semibold mb-2 sm:mb-3 text-gray-900 text-sm sm:text-base">
                                Music Genre
                            </label>
                            <div className="relative">
                                <select
                                    id="genre-select"
                                    value={genre}
                                    onChange={e => setGenre(e.target.value)}
                                    className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base lg:text-lg text-gray-900 bg-white placeholder-gray-400 appearance-none pr-16 sm:pr-20"
                                    aria-describedby="genre-description"
                                >
                                    {genres.map(g => (
                                        <option key={g.name} value={g.name}>{g.name}</option>
                                    ))}
                                </select>
                                <div id="genre-description" className="sr-only">
                                    Select your preferred music genre to join others with similar taste
                                </div>
                                {/* Show selected genre image inside the select box (right side) */}
                                <div className="pointer-events-none absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center">
                                    {selectedGenre && (
                                        <Image 
                                            src={selectedGenre.image} 
                                            alt={`${selectedGenre.name} genre icon`} 
                                            width={40} 
                                            height={40} 
                                            className="rounded-lg object-contain shadow-md border border-purple-200 w-12 h-12 sm:w-10 sm:h-10 lg:w-12 lg:h-12"
                                            priority={genre === 'Pop'}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Avatar Selection */}
                        <fieldset>
                            <legend className="block font-semibold mb-2 sm:mb-3 text-gray-900 text-sm sm:text-base">Choose Your Avatar</legend>
                            <div className="w-full">
                                <AvatarCarousel 
                                    avatars={avatars} 
                                    avatar={avatar} 
                                    setAvatar={setAvatar}
                                    aria-describedby="avatar-description"
                                />
                            </div>
                            <div id="avatar-description" className="sr-only">
                                Select an avatar to represent you as a music hunter
                            </div>
                        </fieldset>

                        {/* Hunter Name Input */}
                        <div>
                            <label htmlFor="username-input" className="block font-semibold mb-2 sm:mb-3 text-gray-900 text-sm sm:text-base">
                                Hunter Name
                            </label>
                            <input
                                id="username-input"
                                type="text"
                                value={username}
                                onChange={handleUsernameChange}
                                className={`w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 focus:outline-none focus:ring-2 transition-all text-sm sm:text-base lg:text-lg text-gray-900 bg-white placeholder-gray-400 ${
                                    errors.username 
                                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                                }`}
                                placeholder="Enter your hunter name..."
                                onKeyPress={handleKeyPress}
                                aria-describedby="username-help username-error"
                                aria-invalid={!!errors.username}
                                maxLength={20}
                                autoComplete="off"
                            />
                            <div id="username-help" className="text-xs text-gray-500 mt-1">
                                Choose your hunter name (2-20 characters, letters, numbers, hyphens, and underscores only)
                            </div>
                            {errors.username && (
                                <div id="username-error" className="text-red-500 text-sm mt-1" role="alert">
                                    {errors.username}
                                </div>
                            )}
                        </div>

                        {/* Join Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-4 sm:mt-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg lg:text-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            aria-describedby="join-button-description"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                                    <span className="text-sm sm:text-base lg:text-lg">Joining...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-base sm:text-lg lg:text-xl">🎵</span>
                                    <span className="text-sm sm:text-base lg:text-lg">Join the Hunt</span>
                                </>
                            )}
                        </button>
                        <div id="join-button-description" className="sr-only">
                            Click to start hunting for music vibes with your selected preferences
                        </div>
                    </form>
                </section>
            </div>

            {/* Footer */}
            <footer className="text-center text-purple-200 text-xs px-4 pb-2 flex-shrink-0" role="contentinfo">
                <p className="text-xs mb-2">Connect with others who share your musical taste</p>

                {/* Legal Links */}
                <nav className="flex flex-wrap justify-center gap-2 text-xs mb-2" aria-label="Legal and information links">
                    <Link href="/legal/about" className="hover:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-1">
                        About
                    </Link>
                    <Link href="/legal/privacy" className="hover:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-1">
                        Privacy
                    </Link>
                    <Link href="/legal/terms" className="hover:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-1">
                        Terms
                    </Link>
                    <Link href="/legal/faq" className="hover:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-1">
                        FAQ
                    </Link>
                </nav>

                {/* Contact Info */}
                <address className="text-xs not-italic">
                    <a
                        href="mailto:info@vibes-hunters.com"
                        className="text-purple-300 hover:text-white transition-colors underline font-medium focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-1"
                    >
                        Contact us
                    </a>
                </address>
            </footer>
        </main>
    );
}

// AvatarCarousel component for scrolling avatars
interface AvatarCarouselProps {
    avatars: string[];
    avatar: string;
    setAvatar: (avatar: string) => void;
    'aria-describedby'?: string;
}

function AvatarCarousel({ avatars, avatar, setAvatar, 'aria-describedby': ariaDescribedBy }: AvatarCarouselProps) {
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent, avatarId: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setAvatar(avatarId);
        }
    }, [setAvatar]);

    return (
        <div className="w-full" role="radiogroup" aria-describedby={ariaDescribedBy}>
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3 justify-items-center">
                {avatars.slice(0, 20).map((a, index) => (
                    <button
                        type="button"
                        key={a}
                        onClick={() => setAvatar(a)}
                        onKeyDown={(e) => handleKeyDown(e, a)}
                        className={`relative rounded-lg sm:rounded-xl border-2 p-1.5 sm:p-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                            avatar === a
                                ? 'border-purple-500 bg-purple-50 scale-110'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        style={{ 
                            width: 'clamp(50px, 8vw, 60px)', 
                            height: 'clamp(50px, 8vw, 60px)',
                            minWidth: '45px',
                            minHeight: '45px',
                        }}
                        role="radio"
                        aria-checked={avatar === a}
                        aria-label={`Select avatar ${a}`}
                        tabIndex={avatar === a ? 0 : -1}
                    >
                        <Image
                            src={`/characters_001/${a}.png`}
                            alt={`Avatar ${a}`}
                            width={60}
                            height={60}
                            className="w-full h-full rounded object-cover"
                            style={{ 
                                width: '100%', 
                                height: '100%',
                                minWidth: '45px',
                                minHeight: '45px',
                            }}
                            priority={index < 10}
                            loading={index < 10 ? 'eager' : 'lazy'}
                        />
                        {avatar === a && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-purple-500 rounded-full flex items-center justify-center" aria-hidden="true">
                                <svg className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
