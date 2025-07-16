'use client';

import React, { useState, useCallback } from 'react';
import { Room, LocalParticipant } from 'livekit-client';

interface MicrophoneButtonProps {
    room: Room | null;
    localParticipant: LocalParticipant | null;
}

interface PermissionDialogProps {
    isOpen: boolean;
    onAllow: () => void;
    onDeny: () => void;
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({ isOpen, onAllow, onDeny }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Microphone Access</h3>
                        <p className="text-sm text-gray-600">Allow Vibes Hunters to use your microphone</p>
                    </div>
                </div>

                <p className="text-gray-700 mb-6">
                    To chat with other hunters nearby, we need access to your microphone.
                    Your voice will only be heard by hunters within your proximity.
                </p>

                <div className="flex space-x-3">
                    <button
                        onClick={onDeny}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Not Now
                    </button>
                    <button
                        onClick={onAllow}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Allow
                    </button>
                </div>
            </div>
        </div>
    );
};

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ room, localParticipant }) => {
    const [isMicEnabled, setIsMicEnabled] = useState(false);
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

    const enableMicrophone = useCallback(async () => {
        if (!room || !localParticipant) return;

        try {
            setIsLoading(true);
            await localParticipant.setMicrophoneEnabled(true);
            setIsMicEnabled(true);
            console.log('Microphone enabled for spatial voice chat');
        } catch (error) {
            console.error('Failed to enable microphone:', error);

            // Check if it's a permission error
            if (error instanceof Error && error.name === 'NotAllowedError') {
                alert('Microphone permission was denied. Please enable it in your browser settings to use voice chat.');
            } else {
                alert('Failed to enable microphone. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [room, localParticipant]);

    const handleMicrophoneToggle = useCallback(async () => {
        if (!room || !localParticipant) return;

        // If microphone is currently enabled, disable it
        if (isMicEnabled) {
            try {
                setIsLoading(true);
                await localParticipant.setMicrophoneEnabled(false);
                setIsMicEnabled(false);
                console.log('Microphone disabled');
            } catch (error) {
                console.error('Failed to disable microphone:', error);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // If this is the first time requesting microphone, show permission dialog
        if (!hasRequestedPermission) {
            setShowPermissionDialog(true);
            return;
        }

        // Enable microphone directly if permission was already granted
        await enableMicrophone();
    }, [room, localParticipant, isMicEnabled, hasRequestedPermission, enableMicrophone]);

    const handlePermissionAllow = useCallback(async () => {
        setShowPermissionDialog(false);
        setHasRequestedPermission(true);
        await enableMicrophone();
    }, [enableMicrophone]);

    const handlePermissionDeny = useCallback(() => {
        setShowPermissionDialog(false);
        setHasRequestedPermission(true);
        console.log('Microphone permission denied by user');
    }, []);

    // Don't render if no room/participant
    if (!room || !localParticipant) {
        return null;
    }

    return (
        <>
            <button
                onClick={handleMicrophoneToggle}
                disabled={isLoading}
                className={`
          fixed top-4 right-4 w-14 h-14 rounded-full shadow-lg transition-all duration-200 z-40
          ${isMicEnabled
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200'
                    }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          flex items-center justify-center
        `}
                title={isMicEnabled ? 'Disable voice chat' : 'Enable voice chat'}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {isMicEnabled ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                        ) : (
                            <g>
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3Z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                                />
                                <line
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    x1="3"
                                    y1="3"
                                    x2="21"
                                    y2="21"
                                />
                            </g>
                        )}
                    </svg>
                )}
            </button>

            <PermissionDialog
                isOpen={showPermissionDialog}
                onAllow={handlePermissionAllow}
                onDeny={handlePermissionDeny}
            />
        </>
    );
};

export default MicrophoneButton;
