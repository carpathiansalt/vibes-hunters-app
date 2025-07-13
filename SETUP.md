# Vibes Hunters - Setup Instructions

## 🚀 Quick Start

### 1. Environment Configuration

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud

# Google Maps Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Getting LiveKit Credentials

1. Go to [LiveKit Cloud](https://cloud.livekit.io)
2. Create a free account
3. Create a new project
4. Copy your API Key, Secret, and WebSocket URL

### 3. Getting Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Maps JavaScript API"
4. Create credentials → API Key
5. Restrict the key to your domain for security

### 4. Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎵 How to Use

1. **Choose Your Vibe**: Select music genre and avatar
2. **Enter Your Name**: Create your username
3. **Explore the Map**: Click to move around
4. **Share Music**: Upload and share your favorite tracks
5. **Join Parties**: Click boombox icons to join music sessions
6. **Experience Spatial Audio**: Move closer/farther to change volume

## ✨ Features

- **Real-time Spatial Audio**: 3D positioned audio based on map location
- **Music Sharing**: Upload and broadcast music to others
- **Social Interaction**: See other users as character avatars
- **Live Movement**: Real-time position synchronization
- **Boombox Mode**: Visual indicators for music publishers
- **Cross-platform**: Works on desktop and mobile browsers

## 🛠️ Technical Details

- **Frontend**: Next.js 14 with TypeScript
- **Real-time Audio**: LiveKit WebRTC
- **Spatial Audio**: Web Audio API with PannerNode
- **Maps**: Google Maps JavaScript API
- **Styling**: Tailwind CSS

## 🚧 Known Limitations

- Chrome/Safari recommended for best audio experience
- Music files should be under 50MB
- Requires microphone permissions for voice chat

Enjoy hunting for vibes! 🎧✨
