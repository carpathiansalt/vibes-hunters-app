'use client';

import React from 'react';
import { GenreSelector } from './GenreSelector';


interface Genre {
    name: string;
    image: string;
    color: string;
}

interface MapControlsProps {
    genres: Genre[];
    currentGenre: string;
    onGenreChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function MapControls({
    genres,
    currentGenre,
    onGenreChange
}: MapControlsProps) {
    return (
        <GenreSelector
            genres={genres}
            selectedGenre={currentGenre}
            onGenreChange={onGenreChange}
        />
    );
}