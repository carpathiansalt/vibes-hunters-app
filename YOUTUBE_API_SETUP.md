# YouTube API Setup Guide

## If You Already Have Google Maps API Key

**Great news!** You can use the same API key for both Google Maps and YouTube.

### Quick Setup (Recommended):
1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your existing project (the one with Google Maps API)

2. **Enable YouTube Data API v3**
   - Go to: https://console.cloud.google.com/apis/library/youtube.googleapis.com
   - Click "Enable"

3. **Update Your API Key Restrictions**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click on your existing API key
   - Under "API restrictions", add "YouTube Data API v3" to the allowed APIs
   - Your key should now allow both:
     - Maps JavaScript API ✅
     - YouTube Data API v3 ✅

4. **Use the Same Key in Environment**
   ```bash
   # Same key for both services
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_existing_key
   NEXT_PUBLIC_YOUTUBE_API_KEY=your_existing_key
   ```

## If You Don't Have Google Maps API Yet

Follow the standard setup process:

1. **Create Google Cloud Project**
   - Visit: https://console.cloud.google.com/
   - Create new project or select existing one
   - Enable billing (free tier is sufficient)

2. **Enable Required APIs**
   - Maps JavaScript API: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
   - YouTube Data API v3: https://console.cloud.google.com/apis/library/youtube.googleapis.com

3. **Create API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "API Key"
   - Restrict to both APIs mentioned above

4. **Add to Environment Variables**
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
   NEXT_PUBLIC_YOUTUBE_API_KEY=your_api_key
   ```

## API Quotas

- **Free tier**: 10,000 units per day
- **Search operation**: 100 units per request
- **Video details**: 1 unit per request
- This should be sufficient for most use cases

## Features Enabled

With the YouTube API integration, users can:

1. **Search YouTube videos** - Find music by searching
2. **Play from YouTube URLs** - Paste any YouTube link
3. **Get video metadata** - Title, channel, duration, thumbnail
4. **Audio capture** - Capture audio from YouTube and other sources

## Alternative: Tab Audio Capture

If you prefer not to use the YouTube API, users can still:
- Use the "Tab Audio" feature to capture audio from any tab
- Play music from Spotify Web Player, Apple Music, YouTube, etc.
- This works without any API keys but requires manual tab switching

## Security Note

The YouTube API key is safe to expose in client-side code as it's designed for public use. However, you should still:
- Restrict the API key to only YouTube Data API v3
- Consider domain restrictions for production
- Monitor usage to prevent abuse
