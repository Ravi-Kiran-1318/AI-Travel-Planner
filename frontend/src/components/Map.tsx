import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';

// Custom icons using SVGs to avoid default Leaflet icon path issues in Next.js
const createCustomIcon = (color: string, label: string) => {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; justify-content: center; align-items: center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="36" height="36" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span style="position: absolute; font-size: 11px; top: 6px; left: 50%; transform: translateX(-50%);">${label}</span>
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const TRANSPORT_EMOJIS = {
  Flight: '✈️',
  Train: '🚆',
  Driving: '🚗',
  Bus: '🚌'
};

interface MapComponentProps {
  source: string;
  destination: string;
  transportMode: string;
  sourceCoords?: number[];
  destinationCoords?: number[];
}

// Internal component to fit bounds when markers change
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [points, map]);
  return null;
}

// Client side geocoder using OSM Nominatim
async function geocodeClient(query: string): Promise<[number, number] | null> {
  if (!query) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: {
        'User-Agent': 'AITravelPlannerFrontend/1.0'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (error) {
    console.error(`Client geocoding error for ${query}:`, error);
  }
  return null;
}

export default function MapComponent({ 
  source, 
  destination, 
  transportMode,
  sourceCoords: propSourceCoords,
  destinationCoords: propDestCoords
}: MapComponentProps) {
  const [sourceCoords, setSourceCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If coordinates are already saved, load them instantly
    if (propDestCoords && propDestCoords.length === 2) {
      setDestCoords([propDestCoords[0], propDestCoords[1]]);
      if (propSourceCoords && propSourceCoords.length === 2) {
        setSourceCoords([propSourceCoords[0], propSourceCoords[1]]);
      } else {
        setSourceCoords(null);
      }
      setLoading(false);
      return;
    }

    let active = true;
    const fetchCoords = async () => {
      if (!destination) {
        setSourceCoords(null);
        setDestCoords(null);
        return;
      }

      setLoading(true);
      try {
        const dCoord = await geocodeClient(destination);
        if (!active) return;
        setDestCoords(dCoord);

        if (source) {
          // Wait briefly to avoid spamming Nominatim API rate limit
          await new Promise((resolve) => setTimeout(resolve, 800));
          const sCoord = await geocodeClient(source);
          if (!active) return;
          setSourceCoords(sCoord);
        } else {
          setSourceCoords(null);
        }
      } catch (err) {
        console.error("Geocoding failed inside MapComponent:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCoords();
    return () => {
      active = false;
    };
  }, [source, destination, propSourceCoords, propDestCoords]);

  // Fetch real road route from OSRM for land modes
  const isFlight = transportMode === 'Flight';
  useEffect(() => {
    if (!sourceCoords || !destCoords) {
      setRouteCoords(null);
      return;
    }

    if (isFlight) {
      setRouteCoords([sourceCoords, destCoords]);
      return;
    }

    const fetchOSRMRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${sourceCoords[1]},${sourceCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`
        );
        if (!response.ok) throw new Error("OSRM failed");
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
          setRouteCoords(coordinates);
        } else {
          setRouteCoords([sourceCoords, destCoords]);
        }
      } catch (err) {
        console.warn("OSRM routing failed, falling back to straight-line:", err);
        setRouteCoords([sourceCoords, destCoords]);
      }
    };

    fetchOSRMRoute();
  }, [sourceCoords, destCoords, isFlight]);

  const markers: [number, number][] = [];
  if (sourceCoords) markers.push(sourceCoords);
  if (destCoords) markers.push(destCoords);

  // Fallback to center on destination or world if loading/empty
  const defaultCenter: [number, number] = destCoords || [20, 0];
  const defaultZoom = destCoords ? 10 : 2;

  const transportEmoji = TRANSPORT_EMOJIS[transportMode as keyof typeof TRANSPORT_EMOJIS] || '✈️';
  const sourceIcon = createCustomIcon('#10b981', transportEmoji);
  const destIcon = createCustomIcon('#ef4444', '🏁');

  return (
    <div className="relative w-full h-80 rounded-2xl overflow-hidden shadow-2xl border border-white/10 no-print my-6 bg-slate-900 z-0">
      <style dangerouslySetInnerHTML={{
        __html: `
          .leaflet-container {
            background: #cbd5e1;
          }
        `
      }} />
      
      {loading && (
        <div className="absolute inset-0 z-[1000] bg-slate-950/60 backdrop-blur-sm flex flex-col justify-center items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          <span className="text-sm font-semibold text-slate-300">Geocoding route coordinates...</span>
        </div>
      )}

      {destCoords ? (
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {sourceCoords && (
            <Marker position={sourceCoords} icon={sourceIcon}>
              <Popup>
                <div className="text-xs font-semibold text-slate-900">
                  <p className="font-bold">Source:</p>
                  <p>{source}</p>
                </div>
              </Popup>
            </Marker>
          )}

          <Marker position={destCoords} icon={destIcon}>
            <Popup>
              <div className="text-xs font-semibold text-slate-900">
                <p className="font-bold">Destination:</p>
                <p>{destination}</p>
              </div>
            </Popup>
          </Marker>

          {routeCoords && (
            <Polyline
              positions={routeCoords}
              color={isFlight ? '#10b981' : '#3b82f6'}
              weight={isFlight ? 3 : 5}
              opacity={0.8}
              dashArray={isFlight ? '6, 8' : undefined}
            />
          )}

          <FitBounds points={markers} />
        </MapContainer>
      ) : (
        <div className="w-full h-full flex flex-col justify-center items-center text-slate-400 bg-slate-900/50">
          <svg className="w-12 h-12 mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-sm">Enter destination to preview route map</span>
        </div>
      )}
    </div>
  );
}
