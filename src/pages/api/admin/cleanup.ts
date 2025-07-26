import type { NextApiRequest, NextApiResponse } from 'next';
import { RoomServiceClient } from 'livekit-server-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Authentication check
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
        console.warn('[Cleanup API] Unauthorized access attempt');
        return res.status(401).json({ error: 'Unauthorized', code: 401 });
    }

    // Check required environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
        console.error('[Cleanup API] Configuration incomplete');
        return res.status(500).json({
            error: 'LiveKit configuration incomplete',
            details: 'Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL environment variables',
            code: 500
        });
    }

    try {
        // Initialize RoomServiceClient
        const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
        console.log('🧹 Starting automatic room cleanup...');

        // Get all rooms
        const allRooms = await roomService.listRooms();
        console.log(`🏠 Found ${allRooms.length} total rooms`);

        // Filter empty rooms (rooms with 0 participants)
        const emptyRooms = allRooms.filter(room => room.numParticipants === 0);
        console.log(`📭 Found ${emptyRooms.length} empty rooms`);

        if (emptyRooms.length === 0) {
            console.log('✅ No empty rooms to clean up');
            return res.status(200).json({
                success: true,
                message: 'No empty rooms to clean up',
                summary: {
                    totalRooms: allRooms.length,
                    emptyRooms: 0,
                    cleanedRooms: 0,
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Define result type for better type safety
        type DeleteResult = 
            | { room: string; success: true }
            | { room: string; success: false; error: string };

        // Delete all empty rooms
        const deletePromises = emptyRooms.map(room => 
            roomService.deleteRoom(room.name).then(() => {
                console.log(`✅ Deleted empty room: ${room.name}`);
                return { room: room.name, success: true } as DeleteResult;
            }).catch(error => {
                console.warn(`⚠️ Failed to delete room ${room.name}:`, error);
                return { 
                    room: room.name, 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                } as DeleteResult;
            })
        );
        
        const deleteResults = await Promise.all(deletePromises);
        const successfulDeletes = deleteResults.filter(result => result.success).length;
        const failedDeletes = deleteResults.filter(result => !result.success).length;
        
        console.log(`✅ Cleanup completed: ${successfulDeletes} rooms deleted, ${failedDeletes} failed`);

        return res.status(200).json({
            success: true,
            message: `Cleaned up ${successfulDeletes} empty rooms`,
            summary: {
                totalRooms: allRooms.length,
                emptyRooms: emptyRooms.length,
                cleanedRooms: successfulDeletes,
                failedDeletes,
                timestamp: new Date().toISOString()
            },
            details: {
                successful: deleteResults.filter((r): r is { room: string; success: true } => r.success).map(r => r.room),
                failed: deleteResults.filter((r): r is { room: string; success: false; error: string } => !r.success).map(r => ({ room: r.room, error: r.error }))
            }
        });

    } catch (error: unknown) {
        console.error('❌ Cleanup API Error:', error);
        
        if (error instanceof Error) {
            return res.status(500).json({
                error: 'Cleanup failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }

        return res.status(500).json({
            error: 'Unknown error occurred during cleanup',
            details: 'An unexpected error occurred while cleaning up empty rooms.',
            timestamp: new Date().toISOString()
        });
    }
} 