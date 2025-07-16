export const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export interface YouTubeVideo {
    id: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    duration: string;
    url: string;
}

export interface YouTubeSearchResult {
    videos: YouTubeVideo[];
    nextPageToken?: string;
}

interface YouTubeSearchItem {
    id: {
        videoId: string;
    };
    snippet: {
        title: string;
        channelTitle: string;
        thumbnails: {
            medium: {
                url: string;
            };
        };
    };
}

interface YouTubeVideoItem {
    id: string;
    snippet: {
        title: string;
        channelTitle: string;
        thumbnails: {
            medium: {
                url: string;
            };
        };
    };
    contentDetails: {
        duration: string;
    };
}

interface YouTubeSearchResponse {
    items: YouTubeSearchItem[];
    nextPageToken?: string;
}

interface YouTubeVideoResponse {
    items: YouTubeVideoItem[];
}

export class YouTubeService {
    private static instance: YouTubeService;
    private apiKey: string;

    private constructor() {
        this.apiKey = YOUTUBE_API_KEY || '';
        if (!this.apiKey) {
            console.warn('YouTube API key not configured');
        }
    }

    public static getInstance(): YouTubeService {
        if (!YouTubeService.instance) {
            YouTubeService.instance = new YouTubeService();
        }
        return YouTubeService.instance;
    }

    async searchVideos(query: string, maxResults: number = 10): Promise<YouTubeSearchResult> {
        if (!this.apiKey) {
            throw new Error('YouTube API key not configured');
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?` +
                new URLSearchParams({
                    key: this.apiKey,
                    q: query,
                    part: 'snippet',
                    type: 'video',
                    maxResults: maxResults.toString(),
                    videoEmbeddable: 'true',
                    videoSyndicated: 'true'
                })
            );

            if (!response.ok) {
                throw new Error(`YouTube API error: ${response.status}`);
            }

            const data: YouTubeSearchResponse = await response.json();

            // Get video durations
            const videoIds = data.items.map((item: YouTubeSearchItem) => item.id.videoId).join(',');
            const detailsResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?` +
                new URLSearchParams({
                    key: this.apiKey,
                    id: videoIds,
                    part: 'contentDetails'
                })
            );

            const detailsData: YouTubeVideoResponse = await detailsResponse.json();
            const durationsMap = new Map(
                detailsData.items.map((item: YouTubeVideoItem) => [
                    item.id,
                    this.parseDuration(item.contentDetails.duration)
                ])
            );

            const videos: YouTubeVideo[] = data.items.map((item: YouTubeSearchItem) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channelTitle: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium.url,
                duration: durationsMap.get(item.id.videoId) || 'Unknown',
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`
            }));

            return {
                videos,
                nextPageToken: data.nextPageToken
            };
        } catch (error) {
            console.error('YouTube search error:', error);
            throw error;
        }
    }

    private parseDuration(duration: string): string {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return 'Unknown';

        const hours = parseInt(match[1]?.replace('H', '') || '0');
        const minutes = parseInt(match[2]?.replace('M', '') || '0');
        const seconds = parseInt(match[3]?.replace('S', '') || '0');

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
        if (!this.apiKey) {
            throw new Error('YouTube API key not configured');
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?` +
                new URLSearchParams({
                    key: this.apiKey,
                    id: videoId,
                    part: 'snippet,contentDetails'
                })
            );

            if (!response.ok) {
                throw new Error(`YouTube API error: ${response.status}`);
            }

            const data: YouTubeVideoResponse = await response.json();

            if (data.items.length === 0) {
                return null;
            }

            const item = data.items[0];
            return {
                id: item.id,
                title: item.snippet.title,
                channelTitle: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium.url,
                duration: this.parseDuration(item.contentDetails.duration),
                url: `https://www.youtube.com/watch?v=${item.id}`
            };
        } catch (error) {
            console.error('YouTube video details error:', error);
            return null;
        }
    }

    extractVideoId(url: string): string | null {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    isValidYouTubeUrl(url: string): boolean {
        return this.extractVideoId(url) !== null;
    }
}
