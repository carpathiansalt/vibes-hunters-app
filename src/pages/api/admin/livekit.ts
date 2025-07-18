import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Helper to get LiveKit REST API Basic Auth headers
function getLiveKitAuthHeaders() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) throw new Error('LiveKit API credentials missing');
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    return { Authorization: `Basic ${auth}` };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Simple password check
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const livekitUrl = process.env.LIVEKIT_API_URL;
    if (!livekitUrl) return res.status(500).json({ error: 'LiveKit URL not configured' });

    try {
        // Get all rooms
        const roomsRes = await axios.get(`${livekitUrl}/rooms`, {
            headers: getLiveKitAuthHeaders()
        });
        const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : [];

        // Get details for each room
        const roomDetails = await Promise.all(
            rooms.map(async (room: { name: string }) => {
                const detailsRes = await axios.get(`${livekitUrl}/rooms/${room.name}`, {
                    headers: getLiveKitAuthHeaders()
                });
                return detailsRes.data;
            })
        );

        res.json({ rooms: roomDetails });
    } catch (error: unknown) {
        // Log error for debugging
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const errObj = error as { response?: { data?: Record<string, unknown>; status?: number }; message?: string };
            console.error('LiveKit API error:', errObj.response?.data || errObj.message || error);
            if (errObj.response?.data) {
                res.status(errObj.response.status || 500).json({ error: errObj.response.data });
            } else {
                res.status(500).json({ error: errObj.message || 'Failed to fetch LiveKit data' });
            }
        } else {
            console.error('LiveKit API error:', error);
            res.status(500).json({ error: 'Failed to fetch LiveKit data' });
        }
    }
}
