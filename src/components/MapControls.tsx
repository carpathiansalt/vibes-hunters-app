'use client';

import React from 'react';
import { GenreSelector } from './GenreSelector';
import { RoomInfoPanel } from './RoomInfoPanel';
import { Vector2 } from '@/types';

interface Genre {
    name: string;
    image: string;
    color: string;
}

interface MapControlsProps {
    genres: Genre[];
    currentGenre: string;
    onGenreChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    participants: Map<string, any>;
    myPosition: Vector2;
    roomInfoExpanded: boolean;
    onToggleRoomInfo: () => void;
    onCenterMapOnUser: () => void;
    isLoading: boolean;
}

export function MapControls({
    genres,
    currentGenre,
    onGenreChange,
    participants,
    myPosition,
    roomInfoExpanded,
    onToggleRoomInfo,
    onCenterMapOnUser,
    isLoading
}: MapControlsProps) {
    return (
        <>
            {/* Genre Selector */}
            <GenreSelector
                genres={genres}
                value={currentGenre}
                onChange={onGenreChange}
                disabled={isLoading}
            />

            {/* Room Info Panel */}
            <RoomInfoPanel
                participants={participants}
                myPosition={myPosition}
                expanded={roomInfoExpanded}
                onToggle={onToggleRoomInfo}
                onCenterMapOnUser={onCenterMapOnUser}
            />
        </>
    );
}