import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';

// Custom icons using SVGs to avoid default Leaflet icon path issues in Next.js
// Renders a high-quality map pin with a floating badge at the top right
const createCustomIcon = (color: string, badgeEmoji: string) => {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; justify-content: center; align-items: center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="36" height="36" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <div style="position: absolute; top: -4px; right: -4px; width: 18px; height: 18px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1.5px solid ${color}; z-index: 999;">
          ${badgeEmoji}
        </div>
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

// Helper to format travel duration in seconds to a human-readable string
function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (mins === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
}

// Great-circle distance calculator to estimate flight distance
function getHaversineDistance(coords1: { lat: number; lon: number }, coords2: { lat: number; lon: number }) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLon = (coords2.lon - coords1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Dijkstra Priority Queue helper
class PriorityQueue<T> {
  private values: { val: T; priority: number }[] = [];
  enqueue(val: T, priority: number) {
    this.values.push({ val, priority });
    this.sort();
  }
  dequeue(): T | undefined {
    return this.values.shift()?.val;
  }
  isEmpty() {
    return this.values.length === 0;
  }
  private sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}

// Client-side Dijkstra pathfinder that generates a synthetic routing graph as a fallback
function calculateDijkstraFallbackRoute(source: [number, number], dest: [number, number]): [number, number][] {
  const [lat1, lon1] = source;
  const [lat2, lon2] = dest;

  const steps = 6;
  const nodes: { id: string; lat: number; lon: number }[] = [];
  const nodeMap: { [id: string]: { id: string; lat: number; lon: number } } = {};
  
  // Generate a grid of nodes between source and destination
  for (let i = 0; i <= steps; i++) {
    const tLat = lat1 + (lat2 - lat1) * (i / steps);
    for (let j = 0; j <= steps; j++) {
      const tLon = lon1 + (lon2 - lon1) * (j / steps);
      
      // Add slight random offset to simulate actual street curvature (avoiding start/end nodes)
      const isStart = i === 0 && j === 0;
      const isEnd = i === steps && j === steps;
      const offsetLat = isStart || isEnd ? 0 : (Math.random() - 0.5) * ((lat2 - lat1) / steps) * 0.4;
      const offsetLon = isStart || isEnd ? 0 : (Math.random() - 0.5) * ((lon2 - lon1) / steps) * 0.4;
      
      const id = `${i}_${j}`;
      const node = { id, lat: tLat + offsetLat, lon: tLon + offsetLon };
      nodes.push(node);
      nodeMap[id] = node;
    }
  }

  // Create weighted edges between adjacent grid cells
  const adj: { [id: string]: { node: string; weight: number }[] } = {};
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const uId = `${i}_${j}`;
      adj[uId] = [];
      
      // Connect to right and down adjacent nodes
      const neighbors = [
        { ni: i + 1, nj: j },
        { ni: i, nj: j + 1 },
        { ni: i - 1, nj: j },
        { ni: i, nj: j - 1 }
      ];

      for (const { ni, nj } of neighbors) {
        if (ni >= 0 && ni <= steps && nj >= 0 && nj <= steps) {
          const vId = `${ni}_${nj}`;
          const uNode = nodeMap[uId];
          const vNode = nodeMap[vId];
          if (uNode && vNode) {
            // Distance weight plus a random traffic factor (to create unique turns)
            const baseDist = Math.sqrt(Math.pow(uNode.lat - vNode.lat, 2) + Math.pow(uNode.lon - vNode.lon, 2));
            const trafficFactor = 1.0 + Math.random() * 1.5; 
            adj[uId].push({ node: vId, weight: baseDist * trafficFactor });
          }
        }
      }
    }
  }

  // Run Dijkstra's algorithm
  const startId = "0_0";
  const endId = `${steps}_${steps}`;
  
  const distances: { [id: string]: number } = {};
  const prev: { [id: string]: string | null } = {};
  const pq = new PriorityQueue<string>();

  for (const node of nodes) {
    distances[node.id] = Infinity;
    prev[node.id] = null;
  }
  
  distances[startId] = 0;
  pq.enqueue(startId, 0);

  while (!pq.isEmpty()) {
    const u = pq.dequeue();
    if (!u) break;
    if (u === endId) break;

    const neighbors = adj[u] || [];
    for (const edge of neighbors) {
      const alt = distances[u] + edge.weight;
      if (alt < distances[edge.node]) {
        distances[edge.node] = alt;
        prev[edge.node] = u;
        pq.enqueue(edge.node, alt);
      }
    }
  }

  // Reconstruct path
  const path: [number, number][] = [];
  let curr: string | null = endId;
  while (curr !== null) {
    const node = nodeMap[curr];
    if (node) {
      path.unshift([node.lat, node.lon]);
    }
    curr = prev[curr];
  }

  // If path finding failed, return straight line
  if (path.length < 2) {
    return [source, dest];
  }
  return path;
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
  const [routeStats, setRouteStats] = useState<{ distance: string; duration: string } | null>(null);
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
      setRouteStats(null);
      return;
    }

    if (isFlight) {
      setRouteCoords([sourceCoords, destCoords]);
      const dist = getHaversineDistance(
        { lat: sourceCoords[0], lon: sourceCoords[1] },
        { lat: destCoords[0], lon: destCoords[1] }
      );
      const distStr = dist.toFixed(1) + ' km';
      // Flight duration: cruise speed ~800 km/h, plus 45 mins buffer
      const durationSeconds = (dist / 800) * 3600 + 2700;
      setRouteStats({
        distance: distStr,
        duration: formatDuration(durationSeconds)
      });
      return;
    }

    let active = true;
    const fetchOSRMRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${sourceCoords[1]},${sourceCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`
        );
        if (!response.ok) throw new Error("OSRM failed");
        const data = await response.json();
        if (!active) return;

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const routeData = data.routes[0];
          const coordinates = routeData.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
          setRouteCoords(coordinates);
          
          const distKm = (routeData.distance / 1000).toFixed(1) + ' km';
          const durationStr = formatDuration(routeData.duration);
          setRouteStats({ distance: distKm, duration: durationStr });
        } else {
          setRouteCoords(calculateDijkstraFallbackRoute(sourceCoords, destCoords));
          const dist = getHaversineDistance(
            { lat: sourceCoords[0], lon: sourceCoords[1] },
            { lat: destCoords[0], lon: destCoords[1] }
          );
          const estSpeed = transportMode === 'Train' ? 80 : 60;
          const durationSeconds = (dist / estSpeed) * 3600;
          setRouteStats({
            distance: dist.toFixed(1) + ' km',
            duration: formatDuration(durationSeconds)
          });
        }
      } catch (err) {
        console.warn("OSRM routing failed, falling back to Dijkstra routing graph:", err);
        if (!active) return;
        setRouteCoords(calculateDijkstraFallbackRoute(sourceCoords, destCoords));
        const dist = getHaversineDistance(
          { lat: sourceCoords[0], lon: sourceCoords[1] },
          { lat: destCoords[0], lon: destCoords[1] }
        );
        const estSpeed = transportMode === 'Train' ? 80 : 60;
        const durationSeconds = (dist / estSpeed) * 3600;
        setRouteStats({
          distance: dist.toFixed(1) + ' km',
          duration: formatDuration(durationSeconds)
        });
      }
    };

    fetchOSRMRoute();
    return () => {
      active = false;
    };
  }, [sourceCoords, destCoords, isFlight, transportMode]);

  const markers: [number, number][] = [];
  if (sourceCoords) markers.push(sourceCoords);
  if (destCoords) markers.push(destCoords);

  // Fallback to center on destination or world if loading/empty
  const defaultCenter: [number, number] = destCoords || [20, 0];
  const defaultZoom = destCoords ? 10 : 2;

  const transportEmoji = TRANSPORT_EMOJIS[transportMode as keyof typeof TRANSPORT_EMOJIS] || '✈️';
  // Blue source pin with transport emoji badge
  const sourceIcon = createCustomIcon('#2563eb', transportEmoji);
  // Red destination pin with checkered flag badge
  const destIcon = createCustomIcon('#ef4444', '🏁');

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/40 shadow-xl w-full my-4 no-print">
      {/* Map Container View */}
      <div className="relative w-full h-80 z-0">
        <style dangerouslySetInnerHTML={{
          __html: `
            .leaflet-container {
              background: #0f172a;
            }
          `
        }} />
        
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex flex-col justify-center items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
                color="#ff5e00"
                weight={3}
                opacity={0.8}
              />
            )}

            <FitBounds points={markers} />
          </MapContainer>
        ) : (
          <div className="w-full h-full flex flex-col justify-center items-center text-slate-400 bg-slate-900/20">
            <svg className="w-12 h-12 mb-3 text-slate-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-sm font-medium text-slate-500">Enter destination to preview route map</span>
          </div>
        )}
      </div>

      {/* Stats Footer Bar */}
      {!loading && routeStats && destCoords && (
        <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-blue-400 bg-blue-950/50 border border-blue-800/30 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">
              Distance
            </span>
            <span className="font-semibold text-slate-200 text-sm">
              {routeStats.distance}
            </span>
          </div>
          
          <div className="hidden sm:block w-px h-6 bg-slate-800"></div>
          
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-orange-400 bg-orange-950/50 border border-orange-800/30 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">
              Est. Travel Time
            </span>
            <span className="font-semibold text-slate-200 text-sm">
              {routeStats.duration}
            </span>
          </div>
          
          <div className="hidden sm:block w-px h-6 bg-slate-800"></div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-indigo-400 bg-indigo-950/50 border border-indigo-800/30 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">
              Transport Mode
            </span>
            <span className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
              <span>{transportEmoji}</span>
              <span>{transportMode}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

