import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import jwt from 'jsonwebtoken';

// Helper to get LiveKit REST API Bearer JWT headers
function getLiveKitAuthHeaders() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) throw new Error('LiveKit API credentials missing');
    const token = jwt.sign({ iss: apiKey }, apiSecret, { expiresIn: '5m' });
    return { Authorization: `Bearer ${token}` };
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
        console.log('LiveKit /rooms response:', roomsRes.data);
        const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : [];

        // Define a type for LiveKit participant
        type LiveKitParticipant = {
            identity: string;
            state: string;
            metadata?: string;
            [key: string]: unknown;
        };

        // For each room, get participants
        const roomDetails = await Promise.all(
            rooms.map(async (room: { name: string }) => {
                const participantsRes = await axios.get(`${livekitUrl}/rooms/${room.name}/participants`, {
                    headers: getLiveKitAuthHeaders()
                });
                console.log(`LiveKit /rooms/${room.name}/participants response:`, participantsRes.data);
                // Parse participant metadata and position
                const participants = Array.isArray(participantsRes.data) ? participantsRes.data.map((p: LiveKitParticipant) => {
                    let position = null;
                    if (p.metadata) {
                        try {
                            const meta = JSON.parse(p.metadata);
                            if (meta.position && typeof meta.position.x === 'number' && typeof meta.position.y === 'number') {
                                position = meta.position;
                            }
                        } catch (err) {
                            console.warn('Failed to parse participant metadata:', p.metadata, err);
                        }
                    }
                    return {
                        ...p,
                        position
                    };
                }) : [];
                return {
                    name: room.name,
                    participants
                };
            })
        );

        // If no rooms or participants, return a sample for UI testing
        if (roomDetails.length === 0) {
            res.json({
                rooms: [
                    {
                        name: "TestRoom",
                        participants: [
                            {
                                identity: "test-user",
                                state: "connected",
                                metadata: JSON.stringify({
                                    username: "Test User",
                                    avatar: "char_001",
                                    position: { x: 37.7749, y: -122.4194 }
                                }),
                                position: { x: 37.7749, y: -122.4194 }
                            }
                        ]
                    }
                ]
            });
            return;
        }

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
