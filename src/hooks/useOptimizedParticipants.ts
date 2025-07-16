import { useCallback, useMemo } from 'react';
import type { UserPosition, Vector2 } from '@/types';

interface ParticipantState {
    participants: Map<string, UserPosition>;
    myPosition: Vector2;
}

interface ParticipantActions {
    updateParticipant: (identity: string, updates: Partial<UserPosition>) => void;
    removeParticipant: (identity: string) => void;
    updateMyPosition: (position: Vector2) => void;
    getNearbyParticipants: (radius: number) => UserPosition[];
    getParticipantDistance: (identity: string) => number | null;
}

interface ParticipantComputedValues {
    participantArray: UserPosition[];
    musicPublishers: UserPosition[];
    voiceParticipants: UserPosition[];
    participantCount: number;
}

/**
 * Custom hook to optimize participant state management and reduce re-renders
 * This hook provides memoized operations and efficient state updates
 */
export function useOptimizedParticipants(
    participants: Map<string, UserPosition>,
    setParticipants: React.Dispatch<React.SetStateAction<Map<string, UserPosition>>>,
    myPosition: Vector2
): ParticipantState & ParticipantActions & ParticipantComputedValues {

    /**
     * Efficiently update a single participant without causing unnecessary re-renders
     */
    const updateParticipant = useCallback((identity: string, updates: Partial<UserPosition>) => {
        setParticipants(prev => {
            const current = prev.get(identity);
            if (!current) {
                console.warn('Attempted to update non-existent participant:', identity);
                return prev;
            }

            // Create updated participant
            const updated = { ...current, ...updates };

            // Check if anything actually changed to prevent unnecessary re-renders
            if (JSON.stringify(current) === JSON.stringify(updated)) {
                return prev; // No change, return same reference
            }

            // Create new map with updated participant
            const newMap = new Map(prev);
            newMap.set(identity, updated);
            return newMap;
        });
    }, [setParticipants]);

    /**
     * Remove a participant from the map
     */
    const removeParticipant = useCallback((identity: string) => {
        setParticipants(prev => {
            if (!prev.has(identity)) {
                return prev; // No change needed
            }

            const newMap = new Map(prev);
            newMap.delete(identity);
            return newMap;
        });
    }, [setParticipants]);

    /**
     * Update my position efficiently
     */
    const updateMyPosition = useCallback((position: Vector2) => {
        // This would be handled by the parent component
        // but we can provide validation here
        if (typeof position.x !== 'number' || typeof position.y !== 'number') {
            console.warn('Invalid position provided:', position);
            return;
        }

        if (isNaN(position.x) || isNaN(position.y)) {
            console.warn('Position contains NaN values:', position);
            return;
        }

        // Parent component should handle the actual update
        console.log('Position update requested:', position);
    }, []);

    /**
     * Get participants within a certain radius (memoized)
     */
    const getNearbyParticipants = useCallback((radius: number) => {
        const nearby: UserPosition[] = [];

        participants.forEach((participant, identity) => {
            if (identity === 'me') return; // Skip self

            const distance = calculateDistance(myPosition, participant.position);
            if (distance <= radius) {
                nearby.push(participant);
            }
        });

        return nearby.sort((a, b) => {
            const distA = calculateDistance(myPosition, a.position);
            const distB = calculateDistance(myPosition, b.position);
            return distA - distB;
        });
    }, [participants, myPosition]);

    /**
     * Get distance to a specific participant
     */
    const getParticipantDistance = useCallback((identity: string) => {
        const participant = participants.get(identity);
        if (!participant) return null;

        return calculateDistance(myPosition, participant.position);
    }, [participants, myPosition]);

    /**
     * Memoized participant array for efficient rendering
     */
    const participantArray = useMemo(() => {
        return Array.from(participants.entries()).map(([identity, user]) => ({
            identity,
            ...user
        }));
    }, [participants]);

    /**
     * Memoized music publishers for efficient filtering
     */
    const musicPublishers = useMemo(() => {
        return participantArray.filter(p => p.isPublishingMusic);
    }, [participantArray]);

    /**
     * Memoized voice participants for efficient filtering
     */
    const voiceParticipants = useMemo(() => {
        return participantArray.filter(p => !p.isPublishingMusic);
    }, [participantArray]);

    /**
     * Memoized participant count
     */
    const participantCount = useMemo(() => {
        return participants.size;
    }, [participants]);

    return {
        // State
        participants,
        myPosition,

        // Actions
        updateParticipant,
        removeParticipant,
        updateMyPosition,
        getNearbyParticipants,
        getParticipantDistance,

        // Computed values (memoized)
        participantArray,
        musicPublishers,
        voiceParticipants,
        participantCount
    };
}

/**
 * Calculate distance between two positions using Haversine formula
 */
function calculateDistance(pos1: Vector2, pos2: Vector2): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (pos1.x * Math.PI) / 180;
    const lat2Rad = (pos2.x * Math.PI) / 180;
    const deltaLatRad = ((pos2.x - pos1.x) * Math.PI) / 180;
    const deltaLngRad = ((pos2.y - pos1.y) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Debounce function for reducing excessive updates
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    delay: number
): T {
    let timeoutId: NodeJS.Timeout;

    return ((...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
}

/**
 * Throttle function for limiting update frequency
 */
export function throttle<T extends (...args: unknown[]) => void>(
    func: T,
    limit: number
): T {
    let inThrottle: boolean;

    return ((...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }) as T;
}

export default useOptimizedParticipants;
