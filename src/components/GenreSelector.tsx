'use client';

import React from 'react';
import Image from 'next/image';

interface Genre {
    name: string;
    image: string;
    color: string;
}

interface GenreSelectorProps {
    genres: Genre[];
    selectedGenre: string;
    onGenreChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function GenreSelector({ genres, selectedGenre, onGenreChange }: GenreSelectorProps) {
    return (
        <div className="fixed top-4 left-0 z-30 flex flex-row items-start justify-left px-4 pointer-events-none">
            <div className="w-full max-w-sm pointer-events-auto flex flex-col items-center">
                <div className="bg-white/90 rounded-3xl shadow-xl border border-purple-200 px-0 py-0 flex flex-col items-center gap-2" style={{ minWidth: '200px' }}>
                    <div className="relative w-full flex items-center justify-center">
                        <select
                            value={selectedGenre}
                            onChange={onGenreChange}
                            className="w-full p-3 rounded-2xl border-2 border-purple-400 focus:border-purple-500 focus:outline-none transition-colors text-lg text-gray-900 bg-white placeholder-gray-400 appearance-none pr-16 text-center font-semibold"
                            style={{ paddingRight: '64px', maxWidth: '100%' }}
                        >
                            {genres.map(g => (
                                <option key={g.name} value={g.name}>{g.name}</option>
                            ))}
                        </select>
                        {/* Genre image visually prominent, right aligned */}
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                            {(() => {
                                const selected = genres.find(g => g.name === selectedGenre);
                                return selected ? (
                                    <Image 
                                        src={selected.image} 
                                        alt={selected.name} 
                                        width={48} 
                                        height={48} 
                                        className="rounded-xl object-contain shadow-lg border-2 border-purple-300 bg-white" 
                                    />
                                ) : null;
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 