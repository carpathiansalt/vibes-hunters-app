import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from "@vercel/analytics/next";
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
    title: 'Vibes Hunters - Spatial Audio Social Experience',
    description: 'Discover, share, and enjoy music together in a global, immersive spatial audio experience.',
    keywords: ['music', 'social', 'spatial audio', 'WebRTC', 'real-time'],
    authors: [{ name: 'Carpathian Salt' }],
    openGraph: {
        title: 'Vibes Hunters',
        description: 'Join the global music hunt! Experience music in 3D space with friends.',
        type: 'website',
    },
    icons: {
        icon: [
            { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
            { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon.ico' }
        ],
        apple: '/apple-touch-icon.png',
        other: [
            { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
    },
    manifest: '/site.webmanifest',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                {/* Resource preloading for better performance */}
                <link rel="preload" href="/api/token" as="fetch" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="maps.googleapis.com" />
                <link rel="dns-prefetch" href="api.livekit.io" />
                <link rel="preconnect" href="https://maps.googleapis.com" />
                <link rel="preconnect" href="https://api.livekit.io" />
                
                {/* Preload critical images */}
                <link rel="preload" href="/music_gendre/ambient.png" as="image" />
                <link rel="preload" href="/music_gendre/rock.png" as="image" />
                <link rel="preload" href="/music_gendre/pop.png" as="image" />
            </head>
            <body className="antialiased">
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
                <Analytics />
            </body>
        </html>
    )
}
