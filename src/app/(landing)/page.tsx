import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Globe, Handshake, Headphones, Heart, Music, Rocket } from 'lucide-react';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Vibes Hunters - Global Spatial Audio Music Experience',
    description: 'Join the global music hunt! Discover, share, and enjoy music together in an immersive spatial audio experience. Connect with music lovers worldwide in real-time.',
    keywords: [
        'spatial audio', 'music sharing', 'global music', 'social music', 
        'real-time audio', 'music discovery', 'WebRTC music', 'collaborative music',
        'music community', 'spatial sound', '3D audio', 'music hunters'
    ],
    authors: [{ name: 'Ocanom Ltd' }],
    creator: 'Ocanom Ltd',
    publisher: 'Vibes Hunters',
    robots: 'index, follow',
    openGraph: {
        title: 'Vibes Hunters - Global Spatial Audio Music Experience',
        description: 'Join the global music hunt! Experience music in 3D space with friends worldwide.',
        type: 'website',
        url: SITE_URL,
        siteName: 'Vibes Hunters',
        images: [
            {
                url: `${SITE_URL}/og-image.png`,
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
        images: [`${SITE_URL}/og-image.png`],
        creator: '@vibes_hunters',
    },
    alternates: {
        canonical: SITE_URL,
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
    url: SITE_URL,
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
        name: 'Ocanom Ltd',
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
                                className="mb-6 flex flex-col items-center justify-center gap-2 text-5xl font-extrabold sm:flex-row sm:gap-3 sm:text-7xl"
                            >
                                <Music className="h-10 w-10 shrink-0 text-yellow-300 sm:h-16 sm:w-16" aria-hidden="true" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400">
                                    Vibes Hunters
                                </span>
                            </h1>
                            <p className="text-lg sm:text-xl text-white mb-2 leading-relaxed">
                                Discover, share, and enjoy music together in a global, immersive spatial audio experience.
                            </p>
                            <p className="text-base text-white/80 mb-8">Join the global music hunt!</p>
                        </header>
                        
                        {/* Features Grid */}
                        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12" aria-label="Key features">
                            <article className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-gray-900 shadow-lg transition-transform hover:scale-105 hover:shadow-2xl focus-within:ring-2 focus-within:ring-pink-400">
                                <div className="mb-3 flex justify-center text-purple-700" role="img" aria-label="Globe icon">
                                    <Globe className="h-8 w-8" aria-hidden="true" />
                                </div>
                                <h3 className="font-semibold mb-2 text-lg text-gray-900">Global</h3>
                                <p className="text-sm font-medium text-gray-800">Connect with music lovers worldwide</p>
                            </article>
                            
                            <article className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-gray-900 shadow-lg transition-transform hover:scale-105 hover:shadow-2xl focus-within:ring-2 focus-within:ring-pink-400">
                                <div className="mb-3 flex justify-center text-purple-700" role="img" aria-label="Headphones icon">
                                    <Headphones className="h-8 w-8" aria-hidden="true" />
                                </div>
                                <h3 className="font-semibold mb-2 text-lg text-gray-900">Spatial Audio</h3>
                                <p className="text-sm font-medium text-gray-800">Experience music in 3D space</p>
                            </article>
                            
                            <article className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 text-gray-900 shadow-lg transition-transform hover:scale-105 hover:shadow-2xl focus-within:ring-2 focus-within:ring-pink-400">
                                <div className="mb-3 flex justify-center text-purple-700" role="img" aria-label="Handshake icon">
                                    <Handshake className="h-8 w-8" aria-hidden="true" />
                                </div>
                                <h3 className="font-semibold mb-2 text-lg text-gray-900">Social</h3>
                                <p className="text-sm font-medium text-gray-800">Share your vibe with others</p>
                            </article>
                        </section>
                        
                        {/* CTA Button */}
                        <Link
                            href="/prejoin"
                            className="inline-flex items-center px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-blue-500 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4 focus:ring-pink-400/50"
                            title="Start your music hunt adventure!"
                            aria-label="Start hunting for music - Begin your spatial audio journey"
                        >
                            <Rocket className="mr-2 inline h-5 w-5" aria-hidden="true" />
                            Start Hunting
                        </Link>
                    </div>
                </section>
                
                {/* Footer */}
                <footer className="text-center text-white/80 text-sm py-8 space-y-4" role="contentinfo">
                    {/* Social Media Links */}
                    <section className="mb-6 px-4" aria-label="Follow us on social media">
                        <h3 className="mb-4 flex items-center justify-center gap-2 text-base font-semibold text-white sm:text-lg">
                            <Music className="h-5 w-5" aria-hidden="true" />
                            Follow the Hunt
                        </h3>
                        <div className="flex justify-center items-center gap-4 sm:gap-6 mb-4">
                            <a
                                href="https://www.tiktok.com/@vibeshunters"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center p-3 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/30 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
                                aria-label="Follow us on TikTok @vibeshunters"
                                title="Follow @vibeshunters on TikTok"
                            >
                                <Image
                                    src="/media_brands/TikTok.png"
                                    alt="TikTok"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8"
                                />
                            </a>
                            <a
                                href="https://www.youtube.com/@vibes-hunters"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center p-3 bg-red-600/20 backdrop-blur-sm rounded-full hover:bg-red-600/30 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                                aria-label="Subscribe to our YouTube channel @vibes-hunters"
                                title="Subscribe to @vibes-hunters on YouTube"
                            >
                                <Image
                                    src="/media_brands/YouTube.png"
                                    alt="YouTube"
                                    width={40}
                                    height={28}
                                    className="w-10 h-7"
                                />
                            </a>
                            <a
                                href="https://www.instagram.com/vibes.hunters"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-full hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                                aria-label="Follow us on Instagram @vibes.hunters"
                                title="Follow @vibes.hunters on Instagram"
                            >
                                <Image
                                    src="/media_brands/Instagram.png"
                                    alt="Instagram"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8"
                                />
                            </a>
                        </div>
                        <p className="text-xs text-white/60 px-2">
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
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="text-blue-300 hover:text-white transition-colors underline font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                        >
                            {CONTACT_EMAIL}
                        </a>
                    </address>

                    <p className="flex items-center justify-center gap-1">
                        Created with <Heart className="h-4 w-4 text-pink-400" fill="currentColor" aria-label="heart" /> by Ocanom Ltd
                    </p>
                </footer>
            </main>
        </>
    );
}
