import type { NextApiRequest, NextApiResponse } from 'next';
import { RoomServiceClient } from 'livekit-server-sdk';

interface ParticipantInfo {
    identity: string;
    state: string;
    username?: string;
    avatar?: string;
    position?: { x: number; y: number };
    isPublishingMusic?: boolean;
    musicTitle?: string;
    partyTitle?: string;
    partyDescription?: string;
    joinedAt?: string;
    tracks?: Array<{
        sid: string;
        name: string;
        type: string;
        muted: boolean;
    }>;
}

interface RoomInfo {
    name: string;
    participants: ParticipantInfo[];
    numParticipants: number;
    creationTime?: string;
    emptyTimeout?: number;
    maxParticipants?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Authentication check
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check required environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
        return res.status(500).json({ 
            error: 'LiveKit configuration incomplete',
            details: 'Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL environment variables'
        });
    }

    try {
        // Initialize RoomServiceClient using LiveKit Server SDK
        const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
        console.log('🔗 Connecting to LiveKit server:', livekitUrl);

        // List all rooms using the official SDK
        const rooms = await roomService.listRooms();
        console.log('🏠 Found rooms:', rooms.length);

        // Get detailed information for each room
        const roomDetails: RoomInfo[] = await Promise.all(
            rooms.map(async (room) => {
                try {
                    // List participants for each room
                    const participantsList = await roomService.listParticipants(room.name);
                    console.log(`👥 Room ${room.name} has ${participantsList.length} participants`);

                    // Parse participant metadata and format data
                    const participants: ParticipantInfo[] = participantsList.map((participant) => {
                        let parsedMetadata: Record<string, unknown> = {};
                        let position: { x: number; y: number } | undefined;

                        // Parse participant metadata
                        if (participant.metadata) {
                            try {
                                parsedMetadata = JSON.parse(participant.metadata);
                                
                                // Extract position data
                                if (parsedMetadata.position && 
                                    typeof parsedMetadata.position === 'object' &&
                                    parsedMetadata.position !== null &&
                                    'x' in parsedMetadata.position &&
                                    'y' in parsedMetadata.position &&
                                    typeof parsedMetadata.position.x === 'number' && 
                                    typeof parsedMetadata.position.y === 'number') {
                                    position = { x: parsedMetadata.position.x, y: parsedMetadata.position.y };
                                }
                            } catch (err) {
                                console.warn(`Failed to parse metadata for participant ${participant.identity}:`, err);
                            }
                        }

                        // Parse track information
                        const tracks = participant.tracks?.map(track => ({
                            sid: track.sid,
                            name: track.name || 'unnamed',
                            type: track.type.toString(),
                            muted: track.muted
                        })) || [];

                        return {
                            identity: participant.identity,
                            state: participant.state.toString(),
                            username: typeof parsedMetadata.username === 'string' ? parsedMetadata.username : undefined,
                            avatar: typeof parsedMetadata.avatar === 'string' ? parsedMetadata.avatar : undefined,
                            position,
                            isPublishingMusic: Boolean(parsedMetadata.isPublishingMusic),
                            musicTitle: typeof parsedMetadata.musicTitle === 'string' ? parsedMetadata.musicTitle : undefined,
                            partyTitle: typeof parsedMetadata.partyTitle === 'string' ? parsedMetadata.partyTitle : undefined,
                            partyDescription: typeof parsedMetadata.partyDescription === 'string' ? parsedMetadata.partyDescription : undefined,
                            joinedAt: participant.joinedAt ? new Date(Number(participant.joinedAt) * 1000).toISOString() : undefined,
                            tracks: tracks.length > 0 ? tracks : undefined
                        };
                    });

                    return {
                        name: room.name,
                        participants,
                        numParticipants: room.numParticipants,
                        creationTime: room.creationTime ? new Date(Number(room.creationTime) * 1000).toISOString() : undefined,
                        emptyTimeout: room.emptyTimeout,
                        maxParticipants: room.maxParticipants
                    };
                } catch (participantError) {
                    console.error(`Error fetching participants for room ${room.name}:`, participantError);
                    
                    // Return room info with empty participants list if participant fetch fails
                    return {
                        name: room.name,
                        participants: [],
                        numParticipants: room.numParticipants,
                        creationTime: room.creationTime ? new Date(Number(room.creationTime) * 1000).toISOString() : undefined,
                        emptyTimeout: room.emptyTimeout,
                        maxParticipants: room.maxParticipants
                    };
                }
            })
        );

        // Calculate summary statistics
        const totalParticipants = roomDetails.reduce((total, room) => total + room.participants.length, 0);
        const totalMusicPublishers = roomDetails.reduce((total, room) => 
            total + room.participants.filter(p => p.isPublishingMusic).length, 0);

        console.log(`📊 Admin Summary: ${roomDetails.length} rooms, ${totalParticipants} participants, ${totalMusicPublishers} music publishers`);

        // Return structured response
        const response = {
            rooms: roomDetails,
            summary: {
                totalRooms: roomDetails.length,
                totalParticipants,
                totalMusicPublishers,
                timestamp: new Date().toISOString()
            }
        };

        res.status(200).json(response);

    } catch (error: unknown) {
        console.error('❌ LiveKit Admin API Error:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
        
        // Handle different types of errors
        if (error instanceof Error) {
            if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
                console.error('Connection refused to LiveKit server:', livekitUrl);
                return res.status(503).json({
                    error: 'Unable to connect to LiveKit server',
                    details: 'Please check your LIVEKIT_URL configuration and ensure the LiveKit server is running.',
                    livekitUrl: livekitUrl
                });
            }
            
            if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                console.error('LiveKit authentication failed with API key:', apiKey?.substring(0, 8) + '...');
                return res.status(500).json({
                    error: 'LiveKit authentication failed',
                    details: 'Please check your LIVEKIT_API_KEY and LIVEKIT_API_SECRET configuration.'
                });
            }

            return res.status(500).json({
                error: 'LiveKit API error',
                details: error.message
            });
        }

        return res.status(500).json({
            error: 'Unknown error occurred',
            details: 'An unexpected error occurred while fetching LiveKit data.'
        });
    }
}