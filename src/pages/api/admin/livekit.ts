import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Helper to get LiveKit JWT (for production, use a proper JWT generator)
function getLiveKitAuthHeader() {
    // For demo, use basic auth. For production, use JWT as per LiveKit docs.
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) throw new Error('LiveKit API credentials missing');
    // Replace with JWT if needed
    return `Bearer ${apiKey}:${apiSecret}`;
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
            headers: { Authorization: getLiveKitAuthHeader() }
        });
        const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : [];

        // Get details for each room
        const roomDetails = await Promise.all(
            rooms.map(async (room: { name: string }) => {
                const detailsRes = await axios.get(`${livekitUrl}/rooms/${room.name}`, {
                    headers: { Authorization: getLiveKitAuthHeader() }
                });
                return detailsRes.data;
            })
        );

        res.json({ rooms: roomDetails });
    } catch {
        res.status(500).json({ error: 'Failed to fetch LiveKit data' });
    }
}
