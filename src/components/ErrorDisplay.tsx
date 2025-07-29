'use client';

import React from 'react';

interface ErrorDisplayProps {
    error: string | null;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
    if (!error) {
        return null;
    }

    return (
        <div className="absolute top-4 left-4 right-4 z-30 bg-red-500 text-white p-4 rounded-lg shadow-lg">
            <div className="font-bold mb-2">Error</div>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
    );
} 