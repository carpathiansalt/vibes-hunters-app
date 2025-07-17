// Core types for Vibes Hunters
import type { Room, TrackPublication } from 'livekit-client';

export interface Vector2 {
    x: number;
    y: number;
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface UserPosition {
    userId: string;
    username: string;
    avatar: string;
    position: Vector2;
    isPublishingMusic?: boolean;
    musicTitle?: string;
    partyTitle?: string;        // ✅ Add this
    partyDescription?: string;  // ✅ Add this
}

export interface TrackPosition {
    trackPublication: TrackPublication;
    position: Vector2;
}

export interface SpatialAudioControllerProps {
    trackPositions: TrackPosition[];
    myPosition: Vector2;
}

export interface GameUser {
    id: string;
    username: string;
    avatar: string;
    position: Vector2;
    isPublishingMusic?: boolean;
    isSpeaking?: boolean;
    audioLevel?: number;
    musicTitle?: string;
}

export interface RoomState {
    participants: Map<string, GameUser>;
    localUser: GameUser | null;
    room: Room | null;
    isConnected: boolean;
    isPublishingMusic: boolean;
    currentMusicFile: File | null;
}

export interface MusicFile {
    file: File;
    title: string;
    artist?: string;
    duration?: number;
}

export interface BoomboxDialogData {
    user: GameUser;
    isJoining: boolean;
    position: Vector2;
}

// LiveKit related types
export interface ParticipantMetadata {
    username: string;
    avatar: string;
    position: Vector2;
    isPublishingMusic?: boolean;
    musicTitle?: string;
    musicDescription?: string;
    partyTitle?: string;        // ✅ Add this
    partyDescription?: string;  // ✅ Add this
}

// Distance calculation constants
export const AUDIO_CONFIG = {
    MAX_AUDIO_DISTANCE: 500,
    REF_DISTANCE: 100,
    ROLLOFF_FACTOR: 2,
    VOICE_PROXIMITY_THRESHOLD: 200,
    MUSIC_DISCOVERY_THRESHOLD: 300,
} as const;

// Character avatar utility
export const AVATAR_COUNT = 25;
export const getAvatarPath = (avatar: string) => `/characters_001/${avatar}.png`;
export const getBoomboxIconPath = () => '/boombox.png';
