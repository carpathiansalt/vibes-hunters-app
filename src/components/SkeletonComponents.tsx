'use client';

import React from 'react';

// Base skeleton component with pulse animation
const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-700 rounded ${className}`} />
);

// Map skeleton for initial loading
export const MapSkeleton: React.FC = () => (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-md mx-4">
            <div className="space-y-4">
                {/* Map placeholder */}
                <div className="relative">
                    <SkeletonBase className="h-64 w-full rounded-lg" />
                    {/* Loading indicator overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                            <p className="text-white text-sm">Loading map...</p>
                        </div>
                    </div>
                </div>
                
                {/* Info panel skeleton */}
                <div className="space-y-3">
                    <SkeletonBase className="h-4 w-3/4" />
                    <SkeletonBase className="h-4 w-1/2" />
                    <SkeletonBase className="h-4 w-2/3" />
                </div>
                
                {/* Controls skeleton */}
                <div className="flex justify-between items-center">
                    <SkeletonBase className="h-10 w-24" />
                    <SkeletonBase className="h-16 w-16 rounded-full" />
                    <SkeletonBase className="h-10 w-24" />
                </div>
            </div>
        </div>
    </div>
);

// Participant list skeleton
export const ParticipantListSkeleton: React.FC = () => (
    <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
                <SkeletonBase className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1">
                    <SkeletonBase className="h-3 w-24" />
                    <SkeletonBase className="h-2 w-16" />
                </div>
                <SkeletonBase className="w-8 h-4" />
            </div>
        ))}
    </div>
);

// Music controls skeleton
export const MusicControlsSkeleton: React.FC = () => (
    <div className="flex flex-col items-center space-y-2">
        <SkeletonBase className="w-16 h-16 rounded-full" />
        <SkeletonBase className="h-4 w-20" />
    </div>
);

// Genre selector skeleton
export const GenreSelectorSkeleton: React.FC = () => (
    <div className="flex items-center space-x-3">
        <SkeletonBase className="w-32 h-12 rounded-full" />
        <SkeletonBase className="w-12 h-12 rounded-xl" />
    </div>
);

// Info panel skeleton
export const InfoPanelSkeleton: React.FC = () => (
    <div className="bg-black/80 rounded-lg p-4 space-y-3">
        <SkeletonBase className="h-4 w-20" />
        <div className="space-y-2">
            <SkeletonBase className="h-3 w-full" />
            <SkeletonBase className="h-3 w-3/4" />
            <SkeletonBase className="h-3 w-1/2" />
        </div>
        <div className="pt-2 border-t border-gray-600">
            <SkeletonBase className="h-3 w-24 mb-2" />
            <div className="space-y-1">
                <SkeletonBase className="h-2 w-full" />
                <SkeletonBase className="h-2 w-3/4" />
                <SkeletonBase className="h-2 w-1/2" />
            </div>
        </div>
    </div>
);

// Prejoin page skeleton
export const PrejoinSkeleton: React.FC = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
            {/* Header skeleton */}
            <div className="text-center space-y-4">
                <SkeletonBase className="h-16 w-64 mx-auto rounded-lg" />
                <SkeletonBase className="h-6 w-80 mx-auto" />
                <SkeletonBase className="h-4 w-60 mx-auto" />
            </div>
            
            {/* Form skeleton */}
            <div className="space-y-4">
                <div>
                    <SkeletonBase className="h-4 w-20 mb-2" />
                    <SkeletonBase className="h-12 w-full rounded-lg" />
                </div>
                
                <div>
                    <SkeletonBase className="h-4 w-24 mb-2" />
                    <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <SkeletonBase key={i} className="w-12 h-12 rounded-full" />
                        ))}
                    </div>
                </div>
                
                <div>
                    <SkeletonBase className="h-4 w-20 mb-2" />
                    <SkeletonBase className="h-12 w-full rounded-lg" />
                </div>
            </div>
            
            {/* Button skeleton */}
            <SkeletonBase className="h-12 w-full rounded-lg" />
        </div>
    </div>
);

// Admin dashboard skeleton
export const AdminDashboardSkeleton: React.FC = () => (
    <div className="min-h-screen bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header skeleton */}
            <div className="flex justify-between items-center">
                <SkeletonBase className="h-8 w-48" />
                <SkeletonBase className="h-10 w-24" />
            </div>
            
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-2">
                        <SkeletonBase className="h-4 w-20" />
                        <SkeletonBase className="h-8 w-16" />
                    </div>
                ))}
            </div>
            
            {/* Map skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SkeletonBase className="h-96 w-full rounded-lg" />
                </div>
                <div className="space-y-4">
                    <SkeletonBase className="h-8 w-32" />
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonBase key={i} className="h-16 w-full rounded" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Component loading skeleton
export const ComponentSkeleton: React.FC<{ type?: 'small' | 'medium' | 'large' }> = ({ type = 'medium' }) => {
    const sizes = {
        small: 'w-6 h-6',
        medium: 'w-8 h-8',
        large: 'w-12 h-12'
    };
    
    return (
        <div className="flex items-center justify-center p-4">
            <div className={`animate-spin rounded-full border-b-2 border-purple-500 ${sizes[type]}`}></div>
        </div>
    );
};

// Progressive loading skeleton for participants
export const ProgressiveParticipantSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
            <div 
                key={i} 
                className="flex items-center space-x-3 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
            >
                <SkeletonBase className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1">
                    <SkeletonBase className="h-3 w-20" />
                    <SkeletonBase className="h-2 w-12" />
                </div>
                <SkeletonBase className="w-6 h-3" />
            </div>
        ))}
    </div>
);

// Music dialog skeleton
export const MusicDialogSkeleton: React.FC = () => (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center space-x-4">
            <SkeletonBase className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
                <SkeletonBase className="h-4 w-32" />
                <SkeletonBase className="h-3 w-48" />
            </div>
        </div>
        
        <div className="space-y-3">
            <SkeletonBase className="h-4 w-24" />
            <SkeletonBase className="h-12 w-full rounded" />
            <SkeletonBase className="h-4 w-32" />
            <SkeletonBase className="h-20 w-full rounded" />
        </div>
        
        <div className="flex justify-end space-x-3">
            <SkeletonBase className="h-10 w-20" />
            <SkeletonBase className="h-10 w-24" />
        </div>
    </div>
); 