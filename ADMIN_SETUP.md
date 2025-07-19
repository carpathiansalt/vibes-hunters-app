# 🔐 Admin Dashboard Setup

The Vibes Hunters admin dashboard provides real-time monitoring and management of LiveKit rooms and participants.

## Access

The admin dashboard is available at: `/admin`

## Environment Configuration

Add the following environment variable to your `.env.local` file:

```bash
# Admin dashboard password
ADMIN_PASSWORD=your_secure_admin_password_here
```

**⚠️ Security Note:** Use a strong, unique password for production deployments.

## Features

### 🏠 Room Management
- View all active LiveKit rooms
- See participant counts per room
- Monitor room creation time and settings

### 👥 Participant Monitoring  
- Real-time participant list for each room
- View participant metadata (username, avatar, position)
- Track music publishers and active parties
- Monitor participant connection state
- View active audio/video tracks

### 📊 Live Statistics
- Total active rooms
- Total connected participants  
- Number of music publishers
- Auto-refresh every 10 seconds

### 🎵 Music Party Tracking
- Identify users broadcasting music
- View party titles and descriptions
- Track music titles being shared

## Authentication

The dashboard uses password-based authentication:

1. Navigate to `/admin`
2. Enter the password set in `ADMIN_PASSWORD` environment variable
3. Access is maintained in the browser session
4. Logout to clear authentication

## API Endpoint

The dashboard uses the `/api/admin/livekit` endpoint which:

- Authenticates using the `x-admin-password` header
- Uses the official LiveKit Server SDK (`RoomServiceClient`)
- Implements proper error handling and logging
- Returns structured room and participant data

## LiveKit Server SDK Integration

The implementation follows LiveKit's official documentation:

```typescript
const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
const rooms = await roomService.listRooms();
const participants = await roomService.listParticipants(roomName);
```

## Error Handling

The dashboard handles various error scenarios:

- **Authentication failures**: Invalid admin password
- **LiveKit connection issues**: Server unreachable
- **Configuration errors**: Missing environment variables
- **API errors**: Graceful error display with retry options

## Usage in Production

1. Set a strong `ADMIN_PASSWORD` in Vercel environment variables
2. Access the dashboard at `https://your-domain.com/admin`
3. Monitor rooms and participants in real-time
4. Use for debugging and user support

## Development

For development, set `ADMIN_PASSWORD` in your local `.env.local` file and access the dashboard at `http://localhost:3000/admin`.