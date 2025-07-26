// Core types for Vibes Hunters

export interface Vector2 {
    x: number;
    y: number;
}

export interface UserPosition {
    userId: string;
    username: string;
    avatar: string;
    position: Vector2;
    isPublishingMusic?: boolean;
    musicTitle?: string;
    partyTitle?: string;
    partyDescription?: string;
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


