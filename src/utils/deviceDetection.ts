/**
 * Device detection and optimization utilities for Vibes Hunters
 * Provides mobile-specific optimizations and feature detection
 */

interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
    browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
    hasAudioCapture: boolean;
    hasDisplayCapture: boolean;
    supportsWebRTC: boolean;
    connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
    deviceMemory?: number;
    hardwareConcurrency?: number;
}

/**
 * Get comprehensive device information
 */
export function getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    return {
        isMobile,
        isTablet,
        isDesktop,
        platform: getPlatform(),
        browser: getBrowser(),
        hasAudioCapture: hasAudioCaptureSupport(),
        hasDisplayCapture: hasDisplayCaptureSupport(),
        supportsWebRTC: hasWebRTCSupport(),
        connectionType: getConnectionType(),
        deviceMemory: getDeviceMemory(),
        hardwareConcurrency: navigator.hardwareConcurrency
    };
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
}

/**
 * Check if device is desktop
 */
export function isDesktop(): boolean {
    return !isMobile() && !isTablet();
}

/**
 * Get platform information
 */
function getPlatform(): DeviceInfo['platform'] {
    const userAgent = navigator.userAgent;

    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
    if (/Android/i.test(userAgent)) return 'android';
    if (/Windows/i.test(userAgent)) return 'windows';
    if (/Mac/i.test(userAgent)) return 'macos';
    if (/Linux/i.test(userAgent)) return 'linux';

    return 'unknown';
}

/**
 * Get browser information
 */
function getBrowser(): DeviceInfo['browser'] {
    const userAgent = navigator.userAgent;

    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) return 'chrome';
    if (/Firefox/i.test(userAgent)) return 'firefox';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'safari';
    if (/Edge/i.test(userAgent)) return 'edge';

    return 'unknown';
}

/**
 * Check audio capture support
 */
function hasAudioCaptureSupport(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check display capture support
 */
function hasDisplayCaptureSupport(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

/**
 * Check WebRTC support
 */
function hasWebRTCSupport(): boolean {
    // Extended window interface for legacy WebRTC support
    const extendedWindow = window as Window & {
        webkitRTCPeerConnection?: typeof RTCPeerConnection;
        mozRTCPeerConnection?: typeof RTCPeerConnection;
    };

    return !!(window.RTCPeerConnection ||
        extendedWindow.webkitRTCPeerConnection ||
        extendedWindow.mozRTCPeerConnection);
}

/**
 * Get connection type
 */
function getConnectionType(): DeviceInfo['connectionType'] {
    const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;

    if (connection?.effectiveType) {
        if (connection.effectiveType.includes('wifi')) return 'wifi';
        if (connection.effectiveType.includes('cellular')) return 'cellular';
        if (connection.effectiveType.includes('ethernet')) return 'ethernet';
    }

    return 'unknown';
}

/**
 * Get device memory
 */
function getDeviceMemory(): number | undefined {
    return (navigator as unknown as { deviceMemory?: number }).deviceMemory;
}

/**
 * Get optimized configuration for current device
 */
export function getOptimizedConfig() {
    const device = getDeviceInfo();

    return {
        // Map configuration
        map: {
            zoom: device.isMobile ? 16 : 18,
            maxZoom: device.isMobile ? 18 : 20,
            gestureHandling: device.isMobile ? 'greedy' : 'cooperative',
            disableDoubleClickZoom: device.isMobile,
            zoomControl: !device.isMobile,
            mapTypeControl: !device.isMobile,
            fullscreenControl: !device.isMobile,
            streetViewControl: false // Always disabled for performance
        },

        // Audio configuration
        audio: {
            sampleRate: device.isMobile ? 22050 : 44100,
            channelCount: device.isMobile ? 1 : 2,
            echoCancellation: device.isMobile,
            noiseSuppression: device.isMobile,
            autoGainControl: device.isMobile,
            enableTabCapture: device.hasDisplayCapture && !device.isMobile
        },

        // Performance configuration
        performance: {
            updateInterval: device.isMobile ? 1000 : 500,
            maxParticipants: device.isMobile ? 20 : 50,
            enableSpatialAudio: device.deviceMemory ? device.deviceMemory >= 2 : !device.isMobile,
            enableVideoThumbnails: false, // Disabled for performance
            enableAnimations: !device.isMobile || (device.deviceMemory && device.deviceMemory >= 4)
        },

        // UI configuration
        ui: {
            showAdvancedControls: !device.isMobile,
            enableTooltips: !device.isMobile,
            compactMode: device.isMobile,
            touchOptimized: device.isMobile,
            showFPS: false // Only for development
        }
    };
}

/**
 * Check if device has sufficient performance for feature
 */
export function hasPerformanceForFeature(feature: 'spatial-audio' | 'video' | 'high-quality-audio'): boolean {
    const device = getDeviceInfo();

    switch (feature) {
        case 'spatial-audio':
            return device.deviceMemory ? device.deviceMemory >= 2 : !device.isMobile;
        case 'video':
            return device.deviceMemory ? device.deviceMemory >= 4 : device.isDesktop;
        case 'high-quality-audio':
            return device.deviceMemory ? device.deviceMemory >= 1 : true;
        default:
            return true;
    }
}

/**
 * Get recommended quality settings based on device
 */
export function getRecommendedQuality(): {
    audio: 'low' | 'medium' | 'high';
    video: 'low' | 'medium' | 'high';
    spatial: boolean;
} {
    const device = getDeviceInfo();

    if (device.isMobile) {
        return {
            audio: device.deviceMemory && device.deviceMemory >= 4 ? 'medium' : 'low',
            video: 'low',
            spatial: device.deviceMemory ? device.deviceMemory >= 2 : false
        };
    }

    return {
        audio: 'high',
        video: 'medium',
        spatial: true
    };
}

/**
 * Check if device supports feature
 */
export function supportsFeature(feature: 'webrtc' | 'audio-capture' | 'display-capture' | 'spatial-audio'): boolean {
    const device = getDeviceInfo();

    switch (feature) {
        case 'webrtc':
            return device.supportsWebRTC;
        case 'audio-capture':
            return device.hasAudioCapture;
        case 'display-capture':
            return device.hasDisplayCapture;
        case 'spatial-audio':
            return hasPerformanceForFeature('spatial-audio');
        default:
            return false;
    }
}

/**
 * Get mobile-specific warnings
 */
export function getMobileWarnings(): string[] {
    const device = getDeviceInfo();
    const warnings: string[] = [];

    if (device.isMobile) {
        if (!device.hasDisplayCapture) {
            warnings.push('Tab audio capture is not supported on mobile devices');
        }

        if (device.connectionType === 'cellular') {
            warnings.push('Consider using WiFi for better audio quality');
        }

        if (device.deviceMemory && device.deviceMemory < 2) {
            warnings.push('Limited device memory may affect performance');
        }
    }

    return warnings;
}

/**
 * Log device information for debugging
 */
export function logDeviceInfo(): void {
    const device = getDeviceInfo();
    console.log('🔍 Device Information:', {
        ...device,
        optimizedConfig: getOptimizedConfig(),
        recommendedQuality: getRecommendedQuality(),
        warnings: getMobileWarnings()
    });
}

const deviceDetection = {
    getDeviceInfo,
    isMobile,
    isTablet,
    isDesktop,
    getOptimizedConfig,
    hasPerformanceForFeature,
    getRecommendedQuality,
    supportsFeature,
    getMobileWarnings,
    logDeviceInfo
};

export default deviceDetection;
