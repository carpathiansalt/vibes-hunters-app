import React from 'react';
import Image from 'next/image';

// Genres are defined in parent and passed as props

export function GenreSelector({ genres, genre, setGenre, className }: { genres: { name: string; image: string }[]; genre: string; setGenre: (g: string) => void; className?: string }) {
    const [start, setStart] = React.useState(0);
    const [visibleCount, setVisibleCount] = React.useState(4);

    React.useEffect(() => {
        const updateVisibleCount = () => {
            const width = window.innerWidth;
            if (width >= 640) {
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

    const end = Math.min(start + visibleCount, genres.length);
    const handlePrev = () => setStart(s => Math.max(0, s - 1));
    const handleNext = () => setStart(s => Math.min(genres.length - visibleCount, s + 1));

    return (
        <div className={`flex items-center gap-2 ${className || ''}`}>
            <button
                type="button"
                onClick={handlePrev}
                disabled={start === 0}
                className="px-2 py-2 rounded bg-gray-200 text-gray-600 disabled:opacity-50 min-w-[32px]"
                aria-label="Previous genres"
            >
                &#8592;
            </button>
            <div className="flex gap-2 overflow-hidden">
                {genres.slice(start, end).map((g: { name: string; image: string }) => (
                    <button
                        type="button"
                        key={g.image}
                        onClick={() => setGenre(g.name)}
                        className={`relative rounded-2xl border-3 p-2 transition-all min-w-[72px] min-h-[72px] ${genre === g.name
                            ? 'border-purple-500 bg-purple-50 scale-105'
                            : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <Image
                            src={g.image}
                            alt={g.name}
                            width={56}
                            height={56}
                            className="min-w-[56px] min-h-[56px] w-14 h-14 rounded-xl object-cover"
                            style={{ width: '56px', height: '56px' }}
                        />
                        {/* No text overlay, only image */}
                        {genre === g.name && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
                <div style={{ minWidth: '24px' }} />
            </div>
            <button
                type="button"
                onClick={handleNext}
                disabled={end >= genres.length}
                className="px-2 py-2 rounded bg-gray-200 text-gray-600 disabled:opacity-50 min-w-[32px]"
                aria-label="Next genres"
            >
                &#8594;
            </button>
        </div>
    );
}
