import type { Metadata } from 'next'
import './globals.css'

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
        icon: '/favicon.ico',
    },
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
            </body>
        </html>
    )
}
