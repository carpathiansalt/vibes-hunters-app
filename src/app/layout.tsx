import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from "@vercel/analytics/next";

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
            <body className="antialiased">
                {children}
                <Analytics />
            </body>
        </html>
    )
}
