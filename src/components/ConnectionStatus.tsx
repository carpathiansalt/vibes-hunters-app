'use client';

import React, { useState, useEffect } from 'react';
import { Room, RoomEvent } from 'livekit-client';

interface ConnectionStatusProps {
    status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
    latency?: number;
    participants?: number;
    className?: string;
}

export function ConnectionStatus({ 
    status, 
    latency, 
    participants, 
    className = '' 
}: ConnectionStatusProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show status indicator after a brief delay
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return {
                    color: 'bg-green-500/20 text-green-400 border-green-500/30',
                    icon: '🟢',
                    pulse: 'animate-pulse',
                    text: 'Connected'
                };
            case 'connecting':
                return {
                    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                    icon: '🟡',
                    pulse: 'animate-pulse',
                    text: 'Connecting...'
                };
            case 'reconnecting':
                return {
                    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                    icon: '🟠',
                    pulse: 'animate-pulse',
                    text: 'Reconnecting...'
                };
            case 'disconnected':
                return {
                    color: 'bg-red-500/20 text-red-400 border-red-500/30',
                    icon: '🔴',
                    pulse: '',
                    text: 'Disconnected'
                };
            default:
                return {
                    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                    icon: '⚪',
                    pulse: '',
                    text: 'Unknown'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className={`fixed top-4 right-4 z-40 transform transition-all duration-300 ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } ${className}`}>
            <div className={`flex items-center space-x-3 px-4 py-2 rounded-full border backdrop-blur-sm shadow-lg ${config.color}`}>
                <div className={`text-sm ${config.pulse}`}>
                    {config.icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-medium capitalize">
                        {config.text}
                    </span>
                    {latency && status === 'connected' && (
                        <span className="text-xs opacity-75">
                            {latency}ms
                        </span>
                    )}
                </div>
                {participants !== undefined && status === 'connected' && (
                    <div className="flex items-center space-x-1 text-xs opacity-75">
                        <span>👥</span>
                        <span>{participants}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Real-time connection monitor hook
export function useConnectionMonitor(room: Room | null) {
    const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'reconnecting'>('disconnected');
    const [latency, setLatency] = useState<number | undefined>();
    const [participants, setParticipants] = useState<number>(0);

    useEffect(() => {
        if (!room) {
            setStatus('disconnected');
            setLatency(undefined);
            setParticipants(0);
            return;
        }

        const updateStatus = () => {
            switch (room.state) {
                case 'connected':
                    setStatus('connected');
                    setParticipants(room.remoteParticipants.size + 1); // +1 for local participant
                    break;
                case 'connecting':
                    setStatus('connecting');
                    break;
                case 'disconnected':
                    setStatus('disconnected');
                    setParticipants(0);
                    break;
                case 'reconnecting':
                    setStatus('reconnecting');
                    break;
                default:
                    setStatus('disconnected');
            }
        };

        // Initial status
        updateStatus();

        // Listen for state changes
        const handleStateChange = () => updateStatus();
        const handleParticipantConnected = () => setParticipants(room.remoteParticipants.size + 1);
        const handleParticipantDisconnected = () => setParticipants(room.remoteParticipants.size + 1);

        room.on(RoomEvent.Connected, handleStateChange);
        room.on(RoomEvent.Disconnected, handleStateChange);
        room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

        // Measure latency periodically when connected
        let latencyInterval: NodeJS.Timeout;
        if (room.state === 'connected') {
            latencyInterval = setInterval(async () => {
                try {
                    const start = Date.now();
                    // Send a ping to measure latency
                    await room.localParticipant.setMetadata('ping');
                    const end = Date.now();
                    setLatency(end - start);
                } catch (error) {
                    console.warn('Failed to measure latency:', error);
                }
            }, 5000); // Measure every 5 seconds
        }

        return () => {
            room.off(RoomEvent.Connected, handleStateChange);
            room.off(RoomEvent.Disconnected, handleStateChange);
            room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
            room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
            if (latencyInterval) clearInterval(latencyInterval);
        };
    }, [room]);

    return { status, latency, participants };
}

// Network quality indicator
export function NetworkQualityIndicator({ quality }: { quality: number }) {
    const getQualityColor = (quality: number) => {
        if (quality >= 4) return 'text-green-400';
        if (quality >= 3) return 'text-yellow-400';
        if (quality >= 2) return 'text-orange-400';
        return 'text-red-400';
    };

    const getQualityBars = (quality: number) => {
        const bars = [];
        for (let i = 1; i <= 5; i++) {
            bars.push(
                <div
                    key={i}
                    className={`w-1 h-${i} rounded-full ${
                        i <= quality ? getQualityColor(quality) : 'bg-gray-600'
                    }`}
                />
            );
        }
        return bars;
    };

    return (
        <div className="flex items-end space-x-1 h-5">
            {getQualityBars(quality)}
        </div>
    );
}

// Connection health monitor
export function ConnectionHealthMonitor({ room }: { room: Room | null }) {
    const [health, setHealth] = useState<'excellent' | 'good' | 'poor' | 'critical'>('good');
    const [issues, setIssues] = useState<string[]>([]);

    useEffect(() => {
        if (!room) return;

        const checkHealth = () => {
            const newIssues: string[] = [];
            let healthScore = 100;

            // Check connection state
            if (room.state !== 'connected') {
                newIssues.push('Connection not established');
                healthScore -= 50;
            }

            // Check for high latency (simplified)
            // Note: Detailed stats require more complex implementation
            // For now, we'll use basic connection state

            // Check participant count
            if (room.remoteParticipants.size > 50) {
                newIssues.push('High participant count');
                healthScore -= 10;
            }

            // Determine health level
            let newHealth: 'excellent' | 'good' | 'poor' | 'critical';
            if (healthScore >= 90) newHealth = 'excellent';
            else if (healthScore >= 70) newHealth = 'good';
            else if (healthScore >= 50) newHealth = 'poor';
            else newHealth = 'critical';

            setHealth(newHealth);
            setIssues(newIssues);
        };

        // Initial health check
        checkHealth();

        // Periodic health checks
        const interval = setInterval(checkHealth, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, [room]);

    if (health === 'excellent' && issues.length === 0) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-40 p-3 rounded-lg backdrop-blur-sm shadow-lg ${
            health === 'excellent' ? 'bg-green-500/20 text-green-400' :
            health === 'good' ? 'bg-yellow-500/20 text-yellow-400' :
            health === 'poor' ? 'bg-orange-500/20 text-orange-400' :
            'bg-red-500/20 text-red-400'
        }`}>
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                    {health === 'excellent' ? '🟢' :
                     health === 'good' ? '🟡' :
                     health === 'poor' ? '🟠' : '🔴'}
                </span>
                <span className="text-xs capitalize">{health} Connection</span>
            </div>
            {issues.length > 0 && (
                <div className="mt-1 text-xs opacity-75">
                    {issues[0]}
                </div>
            )}
        </div>
    );
} 