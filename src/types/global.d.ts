// Type declarations for global window objects
declare global {
    interface Window {
        google?: {
            maps: GoogleMapsAPI;
        };
    }
}

interface GoogleMapsAPI {
    Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMap;
    Marker: new (options: MarkerOptions) => GoogleMarker;
    Size: new (width: number, height: number) => GoogleSize;
}

interface GoogleMapOptions {
    center: { lat: number; lng: number };
    zoom: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    styles?: Array<{
        featureType?: string;
        stylers: Array<{ visibility?: string }>;
    }>;
}

interface GoogleMap {
    addListener: (event: string, handler: (event?: GoogleMouseEvent) => void) => void;
    setCenter: (position: { lat: number; lng: number }) => void;
    setZoom: (zoom: number) => void;
}

interface MarkerOptions {
    position: { lat: number; lng: number };
    map: GoogleMap;
    icon?: {
        url: string;
        scaledSize: GoogleSize;
    };
    title?: string;
    zIndex?: number;
}

interface GoogleMarker {
    setPosition: (position: { lat: number; lng: number }) => void;
    setIcon: (icon: { url: string; scaledSize: GoogleSize }) => void;
    setMap: (map: GoogleMap | null) => void;
    addListener: (event: string, handler: () => void) => void;
}

interface GoogleSize {
    width: number;
    height: number;
}

interface GoogleMouseEvent {
    latLng: {
        lat(): number;
        lng(): number;
    };
}

export { };
