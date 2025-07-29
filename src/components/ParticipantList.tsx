'use client';

import React, { useMemo } from 'react';
import { Vector2, UserPosition } from '@/types';

interface ParticipantListProps {
    participants: Map<string, UserPosition>;
    myPosition: Vector2;
    onParticipantClick: (position: Vector2) => void;
}

export function ParticipantList({ participants, myPosition, onParticipantClick }: ParticipantListProps) {
    const sortedParticipants = useMemo(() => {
        return Array.from(participants.values()).sort((a, b) => {
            const distanceA = Math.sqrt(
                Math.pow((a.position.x - myPosition.x) * 111000, 2) +
                Math.pow((a.position.y - myPosition.y) * 111000, 2)
            );
            const distanceB = Math.sqrt(
                Math.pow((b.position.x - myPosition.x) * 111000, 2) +
                Math.pow((b.position.y - myPosition.y) * 111000, 2)
            );
            return distanceA - distanceB;
        });
    }, [participants, myPosition]);

    const nearestParticipants = useMemo(() => {
        return sortedParticipants.slice(0, 5).map((participant) => {
            const distance = Math.round(Math.sqrt(
                Math.pow((participant.position.x - myPosition.x) * 111000, 2) +
                Math.pow((participant.position.y - myPosition.y) * 111000, 2)
            ));
            
            return (
                <div
                    key={participant.userId}
                    className="text-gray-400 truncate flex items-center justify-between hover:text-white hover:bg-gray-700 px-2 py-1 rounded cursor-pointer transition-colors"
                    onClick={() => {
                        onParticipantClick(participant.position);
                        console.log('Centered map on participant:', participant.username);
                    }}
                    title={`Click to center map on ${participant.username} (${distance}m away)`}
                >
                    <span className="flex items-center gap-1">
                        {participant.isPublishingMusic ? '🎵' : '👤'} 
                        <span className="truncate">{participant.username}</span>
                    </span>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>{distance}m</span>
                        {participant.isPublishingMusic && (
                            <span className="text-pink-400">●</span>
                        )}
                    </div>
                </div>
            );
        });
    }, [sortedParticipants, myPosition, onParticipantClick]);

    return (
        <div className="absolute top-20 right-4 bg-gray-800 rounded-lg shadow-lg p-2 max-w-48 z-10">
            <div className="text-white text-sm font-medium mb-2">Nearby Hunters</div>
            <div className="space-y-1">
                {nearestParticipants}
            </div>
        </div>
    );
}