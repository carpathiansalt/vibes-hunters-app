import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
    return (
        <main className="min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4">
            {/* Hero Section */}
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-2xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400 mb-6">
                            🎵 Vibes Hunters
                        </h1>
                        <p className="text-lg sm:text-xl text-white mb-2 leading-relaxed">
                            Discover, share, and enjoy music together in a global, immersive spatial audio experience.
                        </p>
                        <p className="text-base text-white/80 mb-8">Join the global music hunt!</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-gray-900 shadow-lg transition-transform hover:scale-105 hover:shadow-2xl">
                            <div className="text-3xl mb-3">🌍</div>
                            <h3 className="font-semibold mb-2">Global</h3>
                            <p className="text-sm font-medium">Connect with music lovers worldwide</p>
                        </div>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-gray-900 shadow-lg transition-transform hover:scale-105 hover:shadow-2xl">
                            <div className="text-3xl mb-3">🎧</div>
                            <h3 className="font-semibold mb-2">Spatial Audio</h3>
                            <p className="text-sm font-medium">Experience music in 3D space</p>
                        </div>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-gray-900 shadow-lg transition-transform hover:scale-105 hover:shadow-2xl">
                            <div className="text-3xl mb-3">🤝</div>
                            <h3 className="font-semibold mb-2">Social</h3>
                            <p className="text-sm font-medium">Share your vibe with others</p>
                        </div>
                    </div>
                    <a
                        href="/prejoin"
                        className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-blue-500 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
                        title="Start your music hunt!"
                    >
                        Start Hunting
                    </a>
                </div>
            </div>
            {/* Footer */}
            <footer className="text-center text-white/80 text-sm py-8 space-y-4">
                {/* Legal Links */}
                <div className="flex flex-wrap justify-center gap-4 text-xs mb-4">
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
                <div className="text-xs mb-4">
                    <p>Questions or feedback? Contact us at:</p>
                    <a
                        href="mailto:info@vibes-hunters.com"
                        className="text-blue-300 hover:text-white transition-colors underline font-medium"
                    >
                        info@vibes-hunters.com
                    </a>
                </div>

                <p>
                    Created with <span className="text-pink-400">❤️</span> by{' '}
                    <a href="https://carpathiansalt.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">Carpathian Salt</a>
                </p>
            </footer>
        </main>
    );
}
