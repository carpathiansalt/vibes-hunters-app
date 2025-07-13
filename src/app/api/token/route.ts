import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { room, username } = body;

        if (!room || !username) {
            return NextResponse.json(
                { error: 'Room and username are required' },
                { status: 400 }
            );
        }

        // Use environment variables for LiveKit credentials
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            console.error('Missing LiveKit environment variables');
            return NextResponse.json(
                {
                    error: 'LiveKit credentials not configured',
                    details: 'Please set up your .env.local file with LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL',
                    setupInstructions: 'Copy .env.local.example to .env.local and fill in your LiveKit credentials from https://cloud.livekit.io'
                },
                { status: 500 }
            );
        }

        // Create access token
        const at = new AccessToken(apiKey, apiSecret, {
            identity: username,
            ttl: '1h', // Token valid for 1 hour
        });

        // Grant permissions
        at.addGrant({
            room: room,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            canUpdateOwnMetadata: true,
        });

        const token = await at.toJwt();

        return NextResponse.json({
            token,
            wsUrl,
        });
    } catch (error) {
        console.error('Error generating token:', error);
        return NextResponse.json(
            { error: 'Failed to generate token' },
            { status: 500 }
        );
    }
}
