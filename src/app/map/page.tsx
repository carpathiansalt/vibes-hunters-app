
import { Suspense } from 'react';
import MapPageContent from './MapPageContent';

export default function MapPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-white">Loading map...</div>}>
            <MapPageContent />
        </Suspense>
    );
}
