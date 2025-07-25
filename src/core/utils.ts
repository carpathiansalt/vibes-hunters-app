import type { Vector2 } from '@/types';

/**
 * Calculate the Euclidean distance between two 2D points
 */
export function calculateDistance(pos1: Vector2, pos2: Vector2): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the volume based on distance using exponential falloff
 */
export function calculateVolumeFromDistance(
    distance: number,
    refDistance: number = 100,
    maxDistance: number = 500,
    rolloffFactor: number = 2
): number {
    if (distance <= refDistance) {
        return 1.0;
    }

    if (distance >= maxDistance) {
        return 0.0;
    }

    // Exponential distance model
    return Math.pow(distance / refDistance, -rolloffFactor);
}

/**
 * Check if two users are within voice chat range
 */
export function isWithinVoiceRange(
    pos1: Vector2,
    pos2: Vector2,
    maxRange: number = 200
): boolean {
    return calculateDistance(pos1, pos2) <= maxRange;
}

/**
 * Check if a user is within music discovery range
 */
export function isWithinMusicRange(
    pos1: Vector2,
    pos2: Vector2,
    maxRange: number = 300
): boolean {
    return calculateDistance(pos1, pos2) <= maxRange;
}

/**
 * Convert Google Maps LatLng to a normalized 2D coordinate system
 */
export function latLngToPosition(lat: number, lng: number, bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
}, mapSize: { width: number; height: number }): Vector2 {
    // Normalize lat/lng to 0-1 range within bounds
    const normalizedX = (lng - bounds.west) / (bounds.east - bounds.west);
    const normalizedY = (bounds.north - lat) / (bounds.north - bounds.south);

    // Convert to pixel coordinates
    return {
        x: normalizedX * mapSize.width,
        y: normalizedY * mapSize.height
    };
}

/**
 * Convert 2D position back to Google Maps LatLng
 */
export function positionToLatLng(position: Vector2, bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
}, mapSize: { width: number; height: number }): { lat: number; lng: number } {
    // Convert pixel coordinates back to normalized 0-1 range
    const normalizedX = position.x / mapSize.width;
    const normalizedY = position.y / mapSize.height;

    // Convert back to lat/lng
    const lng = bounds.west + normalizedX * (bounds.east - bounds.west);
    const lat = bounds.north - normalizedY * (bounds.north - bounds.south);

    return { lat, lng };
}

/**
 * Generate a random position within given bounds
 */
export function generateRandomPosition(
    minX: number = 0,
    maxX: number = 1000,
    minY: number = 0,
    maxY: number = 1000
): Vector2 {
    return {
        x: Math.random() * (maxX - minX) + minX,
        y: Math.random() * (maxY - minY) + minY
    };
}

/**
 * Clamp a position within bounds
 */
export function clampPosition(
    position: Vector2,
    minX: number = 0,
    maxX: number = 1000,
    minY: number = 0,
    maxY: number = 1000
): Vector2 {
    return {
        x: Math.max(minX, Math.min(maxX, position.x)),
        y: Math.max(minY, Math.min(maxY, position.y))
    };
}

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
