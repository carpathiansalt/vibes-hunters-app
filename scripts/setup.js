#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎵 Vibes Hunters Setup Script');
console.log('================================\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.local.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        console.log('📄 Creating .env.local from .env.local.example...');
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env.local created successfully!\n');
    } else {
        console.log('⚠️  .env.local.example not found. Creating basic .env.local...');
        const basicEnv = `# Vibes Hunters Environment Configuration

# LiveKit Configuration (Required for real-time audio)
# Get these from https://cloud.livekit.io
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://your-project-name.livekit.cloud

# Google Maps Configuration (Required for the map interface)
# Get this from https://console.cloud.google.com/
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here`;

        fs.writeFileSync(envPath, basicEnv);
        console.log('✅ Basic .env.local created!\n');
    }
} else {
    console.log('✅ .env.local already exists\n');

    // Check if the file has placeholder values
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasPlaceholders = envContent.includes('your_livekit_api_key_here') ||
        envContent.includes('your_google_maps_api_key_here');

    if (hasPlaceholders) {
        console.log('⚠️  Your .env.local file still contains placeholder values!');
        console.log('   Please update it with your actual API credentials.\n');
    } else {
        console.log('✅ .env.local appears to be configured\n');
    }
}

console.log('🚀 Next Steps:');
console.log('1. Edit .env.local with your actual API keys');
console.log('   📍 Google Maps API: https://console.cloud.google.com/apis/credentials');
console.log('   🎧 LiveKit credentials: https://cloud.livekit.io/');
console.log('2. Run: npm run dev');
console.log('3. Open: http://localhost:3000\n');

console.log('� Quick LiveKit Setup:');
console.log('   • Sign up at https://cloud.livekit.io');
console.log('   • Create a new project');
console.log('   • Copy API Key, Secret, and WebSocket URL');
console.log('   • Paste into .env.local\n');

console.log('📋 Quick Google Maps Setup:');
console.log('   • Go to https://console.cloud.google.com/');
console.log('   • Enable "Maps JavaScript API"');
console.log('   • Create API Key');
console.log('   • Paste into .env.local\n');

console.log('🎯 Happy hunting! 🎵');
console.log('For detailed instructions, see SETUP.md');
