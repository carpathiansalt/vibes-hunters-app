# 🎵 Vibes Hunters - Spatial Audio Social Experience

**Vibes Hunters** is a revolutionary real-time spatial audio social platform that transforms how people share music and connect in virtual spaces. Built with cutting-edge WebRTC technology and Google Maps integration, it creates an immersive social experience where users can discover, share, and enjoy music together in a location-based virtual environment.

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd vibes-hunters
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Google Maps API Key (Required for map functionality)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# LiveKit Configuration (Required for real-time audio)
LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
```

### 3. Getting API Keys

#### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Maps JavaScript API"
4. Create credentials (API Key)
5. Restrict the key to your domain for security

#### LiveKit Credentials
1. Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Copy your API Key, Secret, and WebSocket URL

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Features

### ✅ Currently Working
- **Landing Page** - Beautiful gradient hero with feature highlights
- **Character Selection** - Choose from 25+ unique avatars
- **Genre-based Rooms** - Join rooms based on music preferences
- **Google Maps Integration** - Interactive map interface
- **Basic UI Components** - Polished user interface
- **Responsive Design** - Works on all screen sizes

### 🚧 In Development
- **LiveKit Integration** - Real-time audio communication
- **Spatial Audio** - 3D positional audio system
- **Music Sharing** - Upload and broadcast music tracks
- **Proximity Chat** - Voice chat when users are nearby
- **Real-time Movement** - See other users move on the map
- **Music Discovery** - Find and join music parties

### 🔮 Planned Features
- **Playlist System** - Curated music experiences
- **Friend System** - Connect with regular listening partners
- **Recording System** - Save favorite musical moments
- **Mobile Apps** - Native iOS/Android applications
- **VR/AR Support** - Immersive reality experiences

## 🏗️ Architecture

### Frontend Stack
- **Next.js 14** - React framework with app router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Google Maps API** - Interactive mapping

### Real-time Stack
- **LiveKit** - WebRTC infrastructure
- **Web Audio API** - Spatial audio processing
- **WebRTC** - Peer-to-peer communication

### Key Components
- `SpatialAudioController` - 3D audio positioning system
- `MusicPublisher` - Music upload and broadcasting
- `GoogleMapGameView` - Main map interface
- Various utility functions for distance calculations

## 🎮 How to Use

### Basic Flow
1. **Landing** - Start at the beautiful landing page
2. **Setup** - Choose your music genre, avatar, and username
3. **Map** - Enter the interactive map world
4. **Explore** - Click to move around and discover other users
5. **Connect** - Get close to others for voice chat
6. **Share** - Upload music to create a party

### Demo Mode
If you don't have API keys configured, the app runs in demo mode:
- Basic map interface without Google Maps
- Simulated user interactions
- UI components fully functional
- Perfect for development and testing

## 🛠️ Development

### Project Structure
```
src/
  app/                 # Next.js app router pages
    (landing)/         # Landing page
    prejoin/          # Character & room selection
    map/              # Main game interface
    api/              # API routes
  components/          # Reusable React components
  types/              # TypeScript type definitions
  core/               # Core utilities and logic
  public/             # Static assets
```

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Technologies
- **Spatial Audio** - Web Audio API with PannerNode
- **Real-time Sync** - LiveKit for WebRTC management
- **Maps Integration** - Google Maps JavaScript API
- **State Management** - React hooks and context
- **Type Safety** - Full TypeScript coverage

## 🌟 Contributing

We welcome contributions! The codebase is well-structured and documented.

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Contribution
- **Audio Processing** - Enhance spatial audio algorithms
- **UI/UX** - Improve user interface components
- **Performance** - Optimize real-time processing
- **Features** - Add new social features
- **Documentation** - Improve guides and examples

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **LiveKit** - Excellent WebRTC infrastructure
- **Google Maps** - Reliable mapping platform
- **Next.js** - Powerful React framework
- **Open Source Community** - Inspiration and tools

---

**Created with ❤️ by Carpathian Salt**

*Transforming how people experience music together in the digital age.*
