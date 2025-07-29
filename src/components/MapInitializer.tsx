'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Vector2 } from '@/types';

interface MapInitializerProps {
    onMapReady: (map: google.maps.Map) => void;
    onMarkerClick: (position: Vector2) => void;
    initialPosition: Vector2;
    children?: React.ReactNode;
}

export function MapInitializer({ 
    onMapReady, 
    onMarkerClick, 
    initialPosition,
    children 
}: MapInitializerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

    const initializeMap = useCallback(async () => {
        if (!mapContainerRef.current) return;

        try {
            const loader = new Loader({
                apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                version: 'weekly',
                libraries: ['places']
            });

            const google = await loader.load();
            
            const map = new google.maps.Map(mapContainerRef.current, {
                center: { lat: initialPosition.x, lng: initialPosition.y },
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    },
                    {
                        featureType: 'transit',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });

            mapRef.current = map;
            onMapReady(map);

        } catch (error) {
            console.error('Failed to initialize Google Maps:', error);
        }
    }, [initialPosition, onMapReady]);

    useEffect(() => {
        initializeMap();
    }, [initializeMap]);

    const addMarker = useCallback((id: string, position: Vector2, options: google.maps.MarkerOptions = {}) => {
        if (!mapRef.current) return;

        const marker = new google.maps.Marker({
            position: { lat: position.x, lng: position.y },
            map: mapRef.current,
            ...options
        });

        marker.addListener('click', () => {
            onMarkerClick(position);
        });

        markersRef.current.set(id, marker);
    }, [onMarkerClick]);

    const updateMarker = useCallback((id: string, position: Vector2) => {
        const marker = markersRef.current.get(id);
        if (marker) {
            marker.setPosition({ lat: position.x, lng: position.y });
        }
    }, []);

    const removeMarker = useCallback((id: string) => {
        const marker = markersRef.current.get(id);
        if (marker) {
            marker.setMap(null);
            markersRef.current.delete(id);
        }
    }, []);

    const centerMap = useCallback((position?: Vector2) => {
        if (!mapRef.current) return;
        
        const targetPosition = position || initialPosition;
        mapRef.current.panTo({ lat: targetPosition.x, lng: targetPosition.y });
    }, [initialPosition]);

    // Expose methods via ref
    const ref = React.useRef();
    React.useImperativeHandle(ref, () => ({
        addMarker,
        updateMarker,
        removeMarker,
        centerMap,
        getMap: () => mapRef.current
    }));

    return (
        <div ref={mapContainerRef} className="w-full h-full">
            {children}
        </div>
    );
}