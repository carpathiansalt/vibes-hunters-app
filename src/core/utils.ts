import type { Vector2 } from '@/types';



/**
 * Calculate the Haversine (great-circle) distance between two lat/lng points in meters
 * pos1.x = latitude, pos1.y = longitude
 * pos2.x = latitude, pos2.y = longitude
 */
export function haversineDistance(pos1: Vector2, pos2: Vector2): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(pos2.x - pos1.x);
    const dLon = toRad(pos2.y - pos1.y);
    const lat1 = toRad(pos1.x);
    const lat2 = toRad(pos2.x);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Development-only logger to improve production performance
 */
export const logger = {
    log: process.env.NODE_ENV === 'development' ? console.log : () => {},
    warn: process.env.NODE_ENV === 'development' ? console.warn : () => {},
    error: console.error, // Always log errors
    info: process.env.NODE_ENV === 'development' ? console.info : () => {},
    debug: process.env.NODE_ENV === 'development' ? console.debug : () => {}
};


