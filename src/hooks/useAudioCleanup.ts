import { useRef, useCallback, useEffect } from 'react';
import type { LocalAudioTrack } from 'livekit-client';

interface AudioResource {
    element?: HTMLAudioElement;
    track?: LocalAudioTrack;
    mediaStream?: MediaStream;
    objectUrl?: string;
}

/**
 * Custom hook to manage audio resource cleanup and prevent memory leaks
 * This hook ensures proper cleanup of audio elements, tracks, and media streams
 */
export function useAudioCleanup() {
    const audioResourcesRef = useRef<Map<string, AudioResource>>(new Map());
    const isCleaningUpRef = useRef(false);

    /**
     * Register an audio resource for cleanup tracking
     */
    const registerAudioResource = useCallback((
        id: string,
        resource: AudioResource
    ) => {
        console.log('📝 Registering audio resource:', id, resource);
        audioResourcesRef.current.set(id, resource);
    }, []);

    /**
     * Clean up a specific audio resource
     */
    const cleanupResource = useCallback((id: string) => {
        const resource = audioResourcesRef.current.get(id);
        if (!resource) return;

        console.log('🧹 Cleaning up audio resource:', id);

        try {
            // Stop and cleanup audio element
            if (resource.element) {
                resource.element.pause();
                resource.element.src = '';
                resource.element.load(); // Reset the element
                resource.element.remove(); // Remove from DOM if added
            }

            // Stop and cleanup LiveKit track
            if (resource.track) {
                resource.track.stop();
            }

            // Stop media stream tracks
            if (resource.mediaStream) {
                resource.mediaStream.getTracks().forEach(track => {
                    track.stop();
                });
            }

            // Revoke object URL to free memory
            if (resource.objectUrl) {
                URL.revokeObjectURL(resource.objectUrl);
            }

            audioResourcesRef.current.delete(id);
            console.log('✅ Audio resource cleaned up successfully:', id);
        } catch (error) {
            console.error('❌ Error cleaning up audio resource:', id, error);
        }
    }, []);

    /**
     * Clean up all registered audio resources
     */
    const cleanupAllResources = useCallback(() => {
        if (isCleaningUpRef.current) return;
        isCleaningUpRef.current = true;

        console.log('🧹 Cleaning up all audio resources...');

        const resourceIds = Array.from(audioResourcesRef.current.keys());
        resourceIds.forEach(id => cleanupResource(id));

        isCleaningUpRef.current = false;
        console.log('✅ All audio resources cleaned up');
    }, [cleanupResource]);

    /**
     * Update an existing audio resource
     */
    const updateAudioResource = useCallback((
        id: string,
        updates: Partial<AudioResource>
    ) => {
        const existing = audioResourcesRef.current.get(id);
        if (existing) {
            audioResourcesRef.current.set(id, { ...existing, ...updates });
        }
    }, []);

    /**
     * Check if a resource is registered
     */
    const hasResource = useCallback((id: string) => {
        return audioResourcesRef.current.has(id);
    }, []);

    /**
     * Get resource count for debugging
     */
    const getResourceCount = useCallback(() => {
        return audioResourcesRef.current.size;
    }, []);

    // Cleanup all resources when component unmounts
    useEffect(() => {
        return () => {
            cleanupAllResources();
        };
    }, [cleanupAllResources]);

    // Cleanup resources when page is about to unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            cleanupAllResources();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [cleanupAllResources]);

    return {
        registerAudioResource,
        cleanupResource,
        cleanupAllResources,
        updateAudioResource,
        hasResource,
        getResourceCount
    };
}

/**
 * Utility function to create a safely managed audio element
 */
export function createManagedAudioElement(
    src: string,
    options: {
        volume?: number;
        loop?: boolean;
        autoplay?: boolean;
    } = {}
): HTMLAudioElement {
    const audio = new Audio();

    // Set properties
    audio.src = src;
    audio.volume = options.volume ?? 1.0;
    audio.loop = options.loop ?? false;
    audio.autoplay = options.autoplay ?? false;

    // Add error handling
    audio.onerror = (error) => {
        console.error('Audio element error:', error);
    };

    // Add preload for better performance
    audio.preload = 'auto';

    return audio;
}

/**
 * Utility function to safely create object URLs
 */
export function createSafeObjectURL(
    file: File | Blob
): { url: string; cleanup: () => void } {
    const url = URL.createObjectURL(file);

    return {
        url,
        cleanup: () => {
            URL.revokeObjectURL(url);
        }
    };
}

export default useAudioCleanup;
