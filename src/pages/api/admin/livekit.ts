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
    console.log('ENV DEBUG', {
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
      LIVEKIT_URL: process.env.LIVEKIT_URL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    });
    
    // Authentication check
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
        console.warn('[LiveKit API] Unauthorized access attempt');
        return res.status(401).json({ error: 'Unauthorized', code: 401 });
    }

    // Check required environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
        console.error('[LiveKit API] Configuration incomplete');
        return res.status(500).json({
            error: 'LiveKit configuration incomplete',
            details: 'Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL environment variables',
            code: 500
        });
    }

    try {
        // Initialize RoomServiceClient using LiveKit Server SDK
        const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
        console.log('🔗 Connecting to LiveKit server:', livekitUrl);

        // Handle different HTTP methods for admin controls
        if (req.method === 'POST') {
            return handleAdminControl(req, res, roomService);
        } else if (req.method === 'GET') {
            return handleGetData(req, res, roomService);
        } else {
            console.warn('[LiveKit API] Method not allowed:', req.method);
            return res.status(405).json({ error: 'Method not allowed', code: 405 });
        }

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

// Handle GET requests for data fetching
async function handleGetData(req: NextApiRequest, res: NextApiResponse, roomService: RoomServiceClient) {
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

    // Calculate summary
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
}

// Handle POST requests for admin controls
async function handleAdminControl(req: NextApiRequest, res: NextApiResponse, roomService: RoomServiceClient) {
    const { action, roomName, participantIdentity, trackSid } = req.body;

    if (!action || !roomName || !participantIdentity) {
        return res.status(400).json({
            error: 'Missing required parameters',
            details: 'action, roomName, and participantIdentity are required'
        });
    }

    try {
        let result;
        
        switch (action) {
            case 'disconnect':
                console.log(`🚪 Admin disconnecting participant ${participantIdentity} from room ${roomName}`);
                
                // Disconnect the participant
                try {
                    await roomService.removeParticipant(roomName, participantIdentity);
                    console.log(`✅ Successfully disconnected ${participantIdentity} from room ${roomName}`);
                    result = { success: true, message: `Disconnected ${participantIdentity} from ${roomName}` };
                } catch (disconnectError) {
                    console.error(`❌ Failed to disconnect ${participantIdentity} from room ${roomName}:`, disconnectError);
                    throw new Error(`Failed to disconnect participant: ${disconnectError instanceof Error ? disconnectError.message : 'Unknown error'}`);
                }
                break;

            case 'mute_audio':
                console.log(`🔇 Admin muting audio for participant ${participantIdentity} in room ${roomName}`);
                // Note: LiveKit server SDK doesn't have direct mute methods, using updateParticipant instead
                await roomService.updateParticipant(roomName, participantIdentity, { 
                    metadata: JSON.stringify({ audioMuted: true, adminAction: 'mute_audio' })
                });
                result = { success: true, message: `Muted audio for ${participantIdentity}` };
                break;

            case 'unmute_audio':
                console.log(`🔊 Admin unmuting audio for participant ${participantIdentity} in room ${roomName}`);
                await roomService.updateParticipant(roomName, participantIdentity, { 
                    metadata: JSON.stringify({ audioMuted: false, adminAction: 'unmute_audio' })
                });
                result = { success: true, message: `Unmuted audio for ${participantIdentity}` };
                break;

            case 'mute_video':
                console.log(`📹 Admin muting video for participant ${participantIdentity} in room ${roomName}`);
                await roomService.updateParticipant(roomName, participantIdentity, { 
                    metadata: JSON.stringify({ videoMuted: true, adminAction: 'mute_video' })
                });
                result = { success: true, message: `Muted video for ${participantIdentity}` };
                break;

            case 'unmute_video':
                console.log(`📹 Admin unmuting video for participant ${participantIdentity} in room ${roomName}`);
                await roomService.updateParticipant(roomName, participantIdentity, { 
                    metadata: JSON.stringify({ videoMuted: false, adminAction: 'unmute_video' })
                });
                result = { success: true, message: `Unmuted video for ${participantIdentity}` };
                break;

            case 'mute_track':
                if (!trackSid) {
                    return res.status(400).json({
                        error: 'Missing trackSid',
                        details: 'trackSid is required for mute_track action'
                    });
                }
                console.log(`🔇 Admin muting track ${trackSid} for participant ${participantIdentity} in room ${roomName}`);
                // Note: LiveKit server SDK doesn't have direct track mute methods, using updateParticipant instead
                await roomService.updateParticipant(roomName, participantIdentity, { 
                    metadata: JSON.stringify({ 
                        mutedTracks: { [trackSid]: true }, 
                        adminAction: 'mute_track',
                        trackSid 
                    })
                });
                result = { success: true, message: `Muted track ${trackSid} for ${participantIdentity}` };
                break;

            case 'unmute_track':
                if (!trackSid) {
                    return res.status(400).json({
                        error: 'Missing trackSid',
                        details: 'trackSid is required for unmute_track action'
                    });
                }
                console.log(`🔊 Admin unmuting track ${trackSid} for participant ${participantIdentity} in room ${roomName}`);
                await roomService.updateParticipant(roomName, participantIdentity, { 
                    metadata: JSON.stringify({ 
                        mutedTracks: { [trackSid]: false }, 
                        adminAction: 'unmute_track',
                        trackSid 
                    })
                });
                result = { success: true, message: `Unmuted track ${trackSid} for ${participantIdentity}` };
                break;

            case 'force_mute_track':
                if (!trackSid) {
                    return res.status(400).json({
                        error: 'Missing trackSid',
                        details: 'trackSid is required for force_mute_track action'
                    });
                }
                console.log(`🚫 Admin force-muting/unpublishing track ${trackSid} for participant ${participantIdentity} in room ${roomName}`);
                // 1. Mute the published track
                await roomService.mutePublishedTrack(roomName, participantIdentity, trackSid, true);
                // 2. Send a data message to the participant with a default reason
                const defaultReason = 'Your track was unpublished by an admin for violating the terms of use.';
                const data = Buffer.from(JSON.stringify({
                    type: 'admin_track_muted',
                    message: defaultReason,
                    trackSid
                }));
                try {
                    await roomService.sendData(
                        roomName,
                        data,
                        0, // DataPacket_Kind.RELIABLE
                        { destinationIdentities: [participantIdentity] }
                    );
                    console.log(`📢 Sent track mute notification to ${participantIdentity} in room ${roomName}`);
                } catch (dataError) {
                    console.warn(`⚠️ Failed to send track mute notification to ${participantIdentity}:`, dataError);
                }
                // 3. Notify all participants in the room
                const notifyAllData = Buffer.from(JSON.stringify({
                    type: 'admin_track_unpublished',
                    message: 'A track was unpublished for terms violation.',
                    trackSid,
                    publisherIdentity: participantIdentity
                }));
                try {
                    await roomService.sendData(
                        roomName,
                        notifyAllData,
                        0 // DataPacket_Kind.RELIABLE
                        // No destinationIdentities: send to all
                    );
                    console.log(`📢 Notified all participants in ${roomName} about unpublished track ${trackSid}`);
                } catch (dataError) {
                    console.warn(`⚠️ Failed to notify all participants about unpublished track:`, dataError);
                }
                result = { success: true, message: `Track ${trackSid} unpublished and participant notified.` };
                break;

            case 'update_metadata':
                const { metadata } = req.body;
                if (!metadata) {
                    return res.status(400).json({
                        error: 'Missing metadata',
                        details: 'metadata is required for update_metadata action'
                    });
                }
                console.log(`📝 Admin updating metadata for participant ${participantIdentity} in room ${roomName}`);
                await roomService.updateParticipant(roomName, participantIdentity, { metadata: JSON.stringify(metadata) });
                result = { success: true, message: `Updated metadata for ${participantIdentity}` };
                break;

            default:
                return res.status(400).json({
                    error: 'Invalid action',
                    details: `Unknown action: ${action}. Supported actions: disconnect, mute_audio, unmute_audio, mute_video, unmute_video, mute_track, unmute_track, force_mute_track, update_metadata`
                });
        }

        console.log(`✅ Admin action completed: ${action} for ${participantIdentity} in ${roomName}`);
        res.status(200).json(result);

    } catch (error: unknown) {
        console.error(`❌ Admin action failed: ${action} for ${participantIdentity} in ${roomName}:`, error);
        
        if (error instanceof Error) {
            return res.status(500).json({
                error: 'Admin action failed',
                details: error.message,
                action,
                participantIdentity,
                roomName
            });
        }

        return res.status(500).json({
            error: 'Unknown error occurred during admin action',
            details: 'An unexpected error occurred while performing the admin action.',
            action,
            participantIdentity,
            roomName
        });
    }
}