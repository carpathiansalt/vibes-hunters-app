'use client';

import React from 'react';

interface EarshotRadiusProps {
    show: boolean;
    radius: number; // radius in meters
    onToggle: () => void;
}

export const EarshotRadius: React.FC<EarshotRadiusProps> = ({ show, radius, onToggle }) => {
    return (
        <div className="bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
            <div className="text-sm space-y-2">
                <div className="font-bold text-blue-400 flex items-center justify-between">
                    <span>🎤 Voice Chat Range</span>
                    <button
                        onClick={onToggle}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${show
                                ? 'bg-blue-600 hover:bg-blue-500'
                                : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                    >
                        {show ? 'Hide' : 'Show'} Range
                    </button>
                </div>

                <div className="text-xs text-gray-300">
                    <div>• Voice chat activates within {radius}m</div>
                    <div>• Volume increases as you get closer</div>
                    <div>• Enable microphone to chat with nearby hunters</div>
                </div>

                {show && (
                    <div className="text-xs text-blue-300 bg-blue-900/30 p-2 rounded">
                        💡 The blue circle shows your voice chat range.
                        Other hunters can hear you when they&apos;re inside this area.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EarshotRadius;
