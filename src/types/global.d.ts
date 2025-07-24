// Type declarations for global window objects
declare global {
    interface Window {
        google?: {
            maps: GoogleMapsAPI;
        };
    }
}


interface GoogleMapsAPI {
    Map: typeof google.maps.Map;
    Marker: typeof google.maps.Marker;
    Size: typeof google.maps.Size;
    InfoWindow: typeof google.maps.InfoWindow;
    LatLngBounds: typeof google.maps.LatLngBounds;
    event: typeof google.maps.event;
}

// No need to redeclare MapOptions, MarkerOptions, etc. Use google.maps.* types directly

// For legacy code, you may add type aliases if needed:
// type GoogleMap = google.maps.Map;
// type GoogleMarker = google.maps.Marker;
// type GoogleSize = google.maps.Size;
// type GoogleInfoWindow = google.maps.InfoWindow;
// type GoogleLatLngBounds = google.maps.LatLngBounds;

// If you want to extend or override, you can do so here

// No-op export to ensure this file is a module

export { };
