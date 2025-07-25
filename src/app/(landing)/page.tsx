import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Vibes Hunters - Global Spatial Audio Music Experience',
    description: 'Join the global music hunt! Discover, share, and enjoy music together in an immersive spatial audio experience. Connect with music lovers worldwide in real-time.',
    keywords: [
        'spatial audio', 'music sharing', 'global music', 'social music', 
        'real-time audio', 'music discovery', 'WebRTC music', 'collaborative music',
        'music community', 'spatial sound', '3D audio', 'music hunters'
    ],
    authors: [{ name: 'Carpathian Salt', url: 'https://carpathiansalt.com' }],
    creator: 'Carpathian Salt',
    publisher: 'Vibes Hunters',
    robots: 'index, follow',
    openGraph: {
        title: 'Vibes Hunters - Global Spatial Audio Music Experience',
        description: 'Join the global music hunt! Experience music in 3D space with friends worldwide.',
        type: 'website',
        url: 'https://vibes-hunters.com',
        siteName: 'Vibes Hunters',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Vibes Hunters - Global Music Experience',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Vibes Hunters - Global Spatial Audio Music Experience',
        description: 'Join the global music hunt! Experience music in 3D space with friends worldwide.',
        images: ['/og-image.png'],
        creator: '@vibes_hunters',
    },
    alternates: {
        canonical: 'https://vibes-hunters.com',
    },
    other: {
        'theme-color': '#8B5CF6',
        'color-scheme': 'dark light',
    },
};

// JSON-LD Structured Data
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Vibes Hunters',
    description: 'Global spatial audio music sharing platform',
    url: 'https://vibes-hunters.com',
    applicationCategory: 'MusicApplication',
    operatingSystem: 'Web Browser',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
    },
    creator: {
        '@type': 'Organization',
        name: 'Carpathian Salt',
        url: 'https://carpathiansalt.com',
    },
    aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '150',
    },
};

export default function LandingPage() {
    return (
        <>
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            
            <main className="min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4">
                {/* Hero Section */}
                <section className="flex-1 flex items-center justify-center" aria-labelledby="hero-heading">
                    <div className="text-center max-w-2xl mx-auto">
                        <header className="mb-8">
                            <h1 
                                id="hero-heading"
                                className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400 mb-6"
                            >
                                🎵 Vibes Hunters
                            </h1>
                            <p className="text-lg sm:text-xl text-white mb-2 leading-relaxed">
                                Discover, share, and enjoy music together in a global, immersive spatial audio experience.
                            </p>
                            <p className="text-base text-white/80 mb-8">Join the global music hunt!</p>
                        </header>
                        
                        {/* Features Grid */}
                        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12" aria-label="Key features">
                            <article className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-white shadow-lg transition-transform hover:scale-105 hover:shadow-2xl focus-within:ring-2 focus-within:ring-pink-400">
                                <div className="text-3xl mb-3" role="img" aria-label="Globe icon">🌍</div>
                                <h3 className="font-semibold mb-2 text-lg">Global</h3>
                                <p className="text-sm font-medium text-white/90">Connect with music lovers worldwide</p>
                            </article>
                            
                            <article className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-white shadow-lg transition-transform hover:scale-105 hover:shadow-2xl focus-within:ring-2 focus-within:ring-pink-400">
                                <div className="text-3xl mb-3" role="img" aria-label="Headphones icon">🎧</div>
                                <h3 className="font-semibold mb-2 text-lg">Spatial Audio</h3>
                                <p className="text-sm font-medium text-white/90">Experience music in 3D space</p>
                            </article>
                            
                            <article className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-white shadow-lg transition-transform hover:scale-105 hover:shadow-2xl focus-within:ring-2 focus-within:ring-pink-400">
                                <div className="text-3xl mb-3" role="img" aria-label="Handshake icon">🤝</div>
                                <h3 className="font-semibold mb-2 text-lg">Social</h3>
                                <p className="text-sm font-medium text-white/90">Share your vibe with others</p>
                            </article>
                        </section>
                        
                        {/* CTA Button */}
                        <Link
                            href="/prejoin"
                            className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-blue-500 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4 focus:ring-pink-400/50"
                            title="Start your music hunt adventure!"
                            aria-label="Start hunting for music - Begin your spatial audio journey"
                        >
                            🚀 Start Hunting
                        </Link>
                    </div>
                </section>
                
                {/* Footer */}
                <footer className="text-center text-white/80 text-sm py-8 space-y-4" role="contentinfo">
                    {/* Social Media Links */}
                    <section className="mb-6" aria-label="Follow us on social media">
                        <h3 className="text-white font-semibold mb-3">🎵 Follow the Hunt</h3>
                        <div className="flex justify-center gap-6 mb-4">
                            <a
                                href="https://www.tiktok.com/@vibeshunters"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-400"
                                aria-label="Follow us on TikTok @vibeshunters"
                            >
                                <span className="text-lg">🎬</span>
                                <span className="font-medium">TikTok</span>
                            </a>
                            <a
                                href="https://www.youtube.com/@vibes-hunters"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400"
                                aria-label="Subscribe to our YouTube channel @vibes-hunters"
                            >
                                <span className="text-lg">📺</span>
                                <span className="font-medium">YouTube</span>
                            </a>
                            <a
                                href="https://www.instagram.com/vibes.hunters"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                aria-label="Follow us on Instagram @vibes.hunters"
                            >
                                <span className="text-lg">📸</span>
                                <span className="font-medium">Instagram</span>
                            </a>
                        </div>
                        <p className="text-xs text-white/60">
                            Join our community for updates, tips, and behind-the-scenes content!
                        </p>
                    </section>

                    {/* Legal Links */}
                    <nav className="flex flex-wrap justify-center gap-4 text-xs mb-4" aria-label="Legal and information links">
                        <Link href="/legal/about" className="hover:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-pink-400 rounded">
                            About
                        </Link>
                        <Link href="/legal/privacy" className="hover:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-pink-400 rounded">
                            Privacy Policy
                        </Link>
                        <Link href="/legal/terms" className="hover:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-pink-400 rounded">
                            Terms of Service
                        </Link>
                        <Link href="/legal/faq" className="hover:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-pink-400 rounded">
                            FAQ
                        </Link>
                    </nav>

                    {/* Contact Info */}
                    <address className="text-xs mb-4 not-italic">
                        <p>Questions or feedback? Contact us at:</p>
                        <a
                            href="mailto:info@vibes-hunters.com"
                            className="text-blue-300 hover:text-white transition-colors underline font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                        >
                            info@vibes-hunters.com
                        </a>
                    </address>

                    <p>
                        Created with <span className="text-pink-400" role="img" aria-label="heart">❤️</span> by{' '}
                        <a 
                            href="https://carpathiansalt.com" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="underline hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                        >
                            Carpathian Salt
                        </a>
                    </p>
                </footer>
            </main>
        </>
    );
}
