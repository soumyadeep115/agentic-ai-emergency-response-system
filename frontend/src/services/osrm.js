/**
 * OSRM Route Geometry Service
 * Uses the free public OSRM demo server (no API key required).
 * Returns real road-network coordinates for Leaflet polylines.
 *
 * OSRM API: http://router.project-osrm.org/route/v1/driving/{lng,lat};{lng,lat}
 * Note: OSRM returns [lng,lat]; Leaflet needs [lat,lng] — we convert here.
 */

const OSRM_BASE = 'http://router.project-osrm.org/route/v1/driving';
const OSRM_TIMEOUT_MS = 6000;

/**
 * Fetch a real road-network path between waypoints from OSRM.
 *
 * @param {Array<{lat: number, lng: number}>} waypoints
 * @returns {{ coordinates: [lat,lng][], distanceM: number, durationS: number, source: 'osrm'|'fallback' }}
 */
export async function getRouteGeometry(waypoints) {
  if (!waypoints || waypoints.length < 2) {
    return { coordinates: waypoints?.map(p => [p.lat, p.lng]) ?? [], source: 'fallback', distanceM: 0, durationS: 0 };
  }

  // OSRM coordinate string: "lng,lat;lng,lat;..."
  const coordStr = waypoints.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson&steps=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('OSRM: no route returned');

    const route = data.routes[0];
    // OSRM returns [lng, lat] — Leaflet requires [lat, lng]
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    return {
      coordinates,
      distanceM:  Math.round(route.distance),
      durationS:  Math.round(route.duration),
      source: 'osrm',
    };
  } catch (err) {
    clearTimeout(timer);
    console.warn('[OSRM] Falling back to straight line:', err.message);
    // Graceful fallback: straight line between waypoints
    return {
      coordinates: waypoints.map(p => [p.lat, p.lng]),
      distanceM: 0,
      durationS: 0,
      source: 'fallback',
    };
  }
}

/**
 * Build multiple OSRM route segments in parallel (one per route definition).
 * Each route is { id, label, color, waypoints:[{lat,lng}] }
 * Returns the same objects enriched with `.coordinates` for Leaflet.
 */
export async function buildRouteGeometries(routeDefs) {
  const results = await Promise.allSettled(
    routeDefs.map(async (def) => {
      const geo = await getRouteGeometry(def.waypoints);
      return { ...def, coordinates: geo.coordinates, source: geo.source, distanceM: geo.distanceM };
    })
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}
