import type { Metadata } from 'next';

// SEO Metadata for prejoin page
export const metadata: Metadata = {
    title: 'Join the Hunt - Choose Your Music Vibe | Vibes Hunters',
    description: 'Select your music genre, avatar, and username to join the global spatial audio music experience. Connect with music lovers who share your taste.',
    keywords: [
        'join music room', 'select music genre', 'avatar selection', 'music community',
        'spatial audio setup', 'music preferences', 'social music', 'music discovery'
    ],
    robots: 'index, follow',
    openGraph: {
        title: 'Join the Hunt - Choose Your Music Vibe',
        description: 'Select your music genre and avatar to join the global music community.',
        type: 'website',
        url: 'https://vibes-hunters.com/prejoin',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Join the Hunt - Choose Your Music Vibe',
        description: 'Select your music genre and avatar to join the global music community.',
    },
    alternates: {
        canonical: 'https://vibes-hunters.com/prejoin',
    },
};

// JSON-LD Structured Data
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Join the Hunt - Music Room Selection',
    description: 'Select your music preferences and avatar to join the global spatial audio music community.',
    url: 'https://vibes-hunters.com/prejoin',
    isPartOf: {
        '@type': 'WebSite',
        name: 'Vibes Hunters',
        url: 'https://vibes-hunters.com',
    },
    breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://vibes-hunters.com',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Join the Hunt',
                item: 'https://vibes-hunters.com/prejoin',
            },
        ],
    },
};

export default function PreJoinLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
} 