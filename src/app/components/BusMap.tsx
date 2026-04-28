import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL, ApiBusRoute, Coordinates, RouteVehicle } from '../utils/api';

type NavigationStepType = 'walk_to_boarding' | 'wait_for_bus' | 'ride_bus' | 'exit_bus' | 'walk_to_destination' | 'arrived';
const MAP_FIT_DELAY_MS = 30_000;

interface BusMapProps {
  userPosition: Coordinates;
  destinationPosition?: Coordinates;
  destinationLabel?: string;
  stopPosition?: Coordinates;
  selectedBus?: ApiBusRoute | null;
  directWalkRoute?: ApiBusRoute['walk_to_stop'] | null;
  walkingDirectionsActive?: boolean;
  routeVehicles?: RouteVehicle[];
  onMapNavigateRequest?: (destination: Coordinates, label?: string) => void;
  navigationState?: {
    active: boolean;
    currentStep: NavigationStepType;
  };
}

declare global {
  interface Window {
    google?: typeof google;
    __nextstopGoogleMapsPromise?: Promise<void>;
    __nextstopGoogleMapsLoaded?: () => void;
    gm_authFailure?: () => void;
  }
}

async function loadGoogleMaps() {
  if (window.google?.maps) return;
  if (!window.__nextstopGoogleMapsPromise) {
    window.__nextstopGoogleMapsPromise = fetch(`${API_BASE_URL}/config/maps`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Google Maps config failed with status ${response.status}`);
        }
        return response.json();
      })
      .then(({ googleMapsApiKey }) => {
        if (!googleMapsApiKey) {
          throw new Error('Google Maps API key missing');
        }
        return new Promise<void>((resolve, reject) => {
          let settled = false;
          const settle = (callback: () => void) => {
            if (settled) return;
            settled = true;
            window.__nextstopGoogleMapsLoaded = undefined;
            window.gm_authFailure = undefined;
            callback();
          };
          const existingScript = document.getElementById('nextstop-google-maps-js');
          if (existingScript) {
            existingScript.remove();
          }
          window.__nextstopGoogleMapsLoaded = () => {
            settle(() => {
              if (window.google?.maps) {
                resolve();
              } else {
                reject(new Error('Google Maps loaded without maps namespace'));
              }
            });
          };
          window.gm_authFailure = () => {
            settle(() => reject(new Error('Google Maps authentication failed')));
          };
          const script = document.createElement('script');
          script.id = 'nextstop-google-maps-js';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=geometry,places&callback=__nextstopGoogleMapsLoaded`;
          script.async = true;
          script.defer = true;
          script.onerror = () => {
            script.remove();
            settle(() => reject(new Error('Google Maps failed to load')));
          };
          document.head.appendChild(script);
        });
      })
      .catch((error) => {
        window.__nextstopGoogleMapsPromise = undefined;
        throw error;
      });
  }
  return window.__nextstopGoogleMapsPromise;
}

function toLatLng(point: Coordinates) {
  return { lat: point.lat, lng: point.lng };
}

function normalizeCoordinatePair(first: number, second: number): { lat: number; lng: number } | null {
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  // Prefer canonical [lng, lat] GeoJSON ordering when possible.
  if (Math.abs(first) <= 180 && Math.abs(second) <= 90) {
    return { lat: second, lng: first };
  }
  // Fallback for occasional [lat, lng] payloads.
  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return { lat: first, lng: second };
  }
  return null;
}

function lineToPath(line?: { coordinates: [number, number][] } | null) {
  if (!line?.coordinates?.length) return [];
  return line.coordinates
    .map(([first, second]) => normalizeCoordinatePair(first, second))
    .filter((point): point is { lat: number; lng: number } => Boolean(point));
}

function nearestPathIndex(path: Array<{ lat: number; lng: number }>, point?: { lat: number; lng: number } | null) {
  if (!point || path.length === 0) return -1;
  let index = -1;
  let best = Number.POSITIVE_INFINITY;
  path.forEach((candidate, i) => {
    const dLat = candidate.lat - point.lat;
    const dLng = candidate.lng - point.lng;
    const distance = dLat * dLat + dLng * dLng;
    if (distance < best) {
      best = distance;
      index = i;
    }
  });
  return index;
}

function relevantRouteSegment(
  path: Array<{ lat: number; lng: number }>,
  fromPoint?: { lat: number; lng: number } | null,
  toPoint?: { lat: number; lng: number } | null
) {
  if (path.length < 2) return path;
  if (!fromPoint || !toPoint) return path;
  const fromIndex = nearestPathIndex(path, fromPoint);
  const toIndex = nearestPathIndex(path, toPoint);
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= toIndex) return [];
  const segment = path.slice(fromIndex, toIndex + 1);
  return segment.length > 1 ? segment : [];
}

function createBusIcon(highlighted = false) {
  const ring = highlighted ? '<circle cx="20" cy="20" r="19" fill="none" stroke="#facc15" stroke-width="2.5"/>' : '';
  const fill = highlighted ? '#1e40af' : '#1d4ed8';
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">${ring}<circle cx="20" cy="20" r="17" fill="${fill}"/><rect x="9" y="10" width="22" height="16" rx="4" fill="#ffffff"/><rect x="12" y="13" width="16" height="7" rx="2" fill="#93c5fd"/><circle cx="15" cy="27" r="2.2" fill="#111827"/><circle cx="25" cy="27" r="2.2" fill="#111827"/></svg>`
  );
  const size = highlighted ? 40 : 32;
  const anchor = highlighted ? 20 : 16;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new window.google!.maps.Size(size, size),
    anchor: new window.google!.maps.Point(anchor, anchor),
  };
}

function distanceMeters(pointA?: { lat: number; lng: number } | null, pointB?: { lat: number; lng: number } | null) {
  if (!pointA || !pointB) return Number.POSITIVE_INFINITY;
  const dLat = (pointA.lat - pointB.lat) * 111_320;
  const dLng = (pointA.lng - pointB.lng) * 111_320;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function selectPrimaryVehicle(routeVehicles: RouteVehicle[], selectedBus?: ApiBusRoute | null) {
  const exactVehicle = routeVehicles.find((vehicle) => vehicle.vehicle_id === selectedBus?.vehicle_id);
  if (exactVehicle) return exactVehicle;
  return [...routeVehicles]
    .sort((a, b) => (a.arrival_minutes ?? Number.POSITIVE_INFINITY) - (b.arrival_minutes ?? Number.POSITIVE_INFINITY))[0] || null;
}

export function BusMap({
  userPosition,
  destinationPosition,
  destinationLabel,
  stopPosition,
  selectedBus,
  directWalkRoute,
  walkingDirectionsActive = false,
  routeVehicles = [],
  onMapNavigateRequest,
  navigationState,
}: BusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const onMapNavigateRequestRef = useRef<typeof onMapNavigateRequest>(onMapNavigateRequest);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const hasCenteredUserRef = useRef(false);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const stopMarkersRef = useRef<google.maps.Marker[]>([]);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const busMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeVehicleMarkersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const walkToStopPolylineRef = useRef<google.maps.Polyline | null>(null);
  const fullRoutePolylineRef = useRef<google.maps.Polyline | null>(null);
  const busRoutePolylineRef = useRef<google.maps.Polyline | null>(null);
  const walkFromStopPolylineRef = useRef<google.maps.Polyline | null>(null);
  const directWalkPolylineRef = useRef<google.maps.Polyline | null>(null);
  const fitBoundsTimeoutRef = useRef<number | null>(null);
  const lastFitBoundsKeyRef = useRef<string | null>(null);
  const wasNavigationActiveRef = useRef(false);
  const loadRetryTimeoutRef = useRef<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadRetry, setLoadRetry] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setLoadError(false);
    loadGoogleMaps()
      .then(() => {
        if (!containerRef.current || mapRef.current || !window.google?.maps) return;
        setLoadError(false);
        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center: toLatLng(userPosition),
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: true,
          styles: [
            { featureType: 'poi.school', stylers: [{ visibility: 'on' }] },
            { featureType: 'transit', stylers: [{ visibility: 'on' }] }
          ]
        });
        mapClickListenerRef.current = mapRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          if (event.placeId && window.google?.maps.places && mapRef.current) {
            event.stop?.();
            const clickedPosition = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            };
            const placesService = new window.google.maps.places.PlacesService(mapRef.current);
            placesService.getDetails(
              {
                placeId: event.placeId,
                fields: ['name', 'formatted_address', 'geometry'],
              },
              (place, status) => {
                const placeLocation = place?.geometry?.location;
                onMapNavigateRequestRef.current?.(
                  placeLocation
                    ? { lat: placeLocation.lat(), lng: placeLocation.lng() }
                    : clickedPosition,
                  place?.name || place?.formatted_address || undefined
                );
              }
            );
            return;
          }
          onMapNavigateRequestRef.current?.({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        });
      })
      .catch((error) => {
        console.error('Google Maps load error:', error);
        setLoadError(true);
        if (loadRetryTimeoutRef.current) {
          window.clearTimeout(loadRetryTimeoutRef.current);
        }
        loadRetryTimeoutRef.current = window.setTimeout(() => {
          loadRetryTimeoutRef.current = null;
          setLoadRetry((value) => value + 1);
        }, 5000);
      });
    return () => {
      if (loadRetryTimeoutRef.current) {
        window.clearTimeout(loadRetryTimeoutRef.current);
        loadRetryTimeoutRef.current = null;
      }
    };
  }, [loadRetry, userPosition]);

  useEffect(() => {
    onMapNavigateRequestRef.current = onMapNavigateRequest;
  }, [onMapNavigateRequest]);

  useEffect(() => () => {
    if (fitBoundsTimeoutRef.current) {
      window.clearTimeout(fitBoundsTimeoutRef.current);
      fitBoundsTimeoutRef.current = null;
    }
    if (loadRetryTimeoutRef.current) {
      window.clearTimeout(loadRetryTimeoutRef.current);
      loadRetryTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
        mapClickListenerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = new window.google.maps.Marker({
        map,
        position: toLatLng(userPosition),
        title: 'Your location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeOpacity: 1,
          strokeWeight: 3,
          scale: 8,
        },
        zIndex: 3000,
      });
    } else {
      userMarkerRef.current.setPosition(toLatLng(userPosition));
    }

    if (!hasCenteredUserRef.current) {
      map.setCenter(toLatLng(userPosition));
      hasCenteredUserRef.current = true;
    }
  }, [userPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    if (destinationPosition) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new window.google.maps.Marker({
          map,
          position: toLatLng(destinationPosition),
          title: destinationLabel || 'Destination',
          icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          zIndex: 1300,
        });
      } else {
        destinationMarkerRef.current.setPosition(toLatLng(destinationPosition));
        destinationMarkerRef.current.setTitle(destinationLabel || 'Destination');
        destinationMarkerRef.current.setMap(map);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
    }

    const selectedVehicle = selectPrimaryVehicle(routeVehicles, selectedBus);
    if (selectedBus?.bus_position && routeVehicles.length === 0) {
      if (!busMarkerRef.current) {
        busMarkerRef.current = new window.google.maps.Marker({
          map,
          position: toLatLng(selectedBus.bus_position),
          title: `${selectedBus.route_number} to ${selectedBus.trip_headsign || 'Destination'}`,
          icon: createBusIcon(true),
          zIndex: 1300,
        });
      } else {
        busMarkerRef.current.setPosition(toLatLng(selectedBus.bus_position));
        busMarkerRef.current.setTitle(`${selectedBus.route_number} to ${selectedBus.trip_headsign || 'Destination'}`);
        busMarkerRef.current.setMap(map);
      }
    } else if (busMarkerRef.current) {
      busMarkerRef.current.setMap(null);
    }

    routeVehicleMarkersRef.current.forEach((marker) => marker.setMap(null));
    routeVehicleMarkersRef.current = [];
    routeVehicles.forEach((vehicle) => {
      const isCrowdMetricsBus = vehicle.vehicle_id === selectedBus?.vehicle_id ||
        (selectedVehicle != null && vehicle.vehicle_id === selectedVehicle.vehicle_id);
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: vehicle.lat, lng: vehicle.lng },
        title: `${selectedBus?.route_short_name || selectedBus?.route_number || 'Bus'} to ${vehicle.headsign || 'Destination'}`,
        icon: createBusIcon(isCrowdMetricsBus),
        zIndex: isCrowdMetricsBus ? 1300 : 1200,
      });
      marker.addListener('click', () => {
        const lines = [
          `<strong>${selectedBus?.route_short_name || selectedBus?.route_number || 'Bus'}</strong> to ${vehicle.headsign || 'Destination'}`,
          typeof vehicle.arrival_minutes === 'number' ? `${vehicle.arrival_minutes} min to boarding stop` : 'Arrival time unavailable',
          typeof vehicle.occupancy_percent === 'number' ? `${vehicle.occupancy_percent}% full` : 'Fullness unavailable',
        ];
        infoWindowRef.current?.setContent(`<div style="font-size:12px;line-height:1.4">${lines.join('<br/>')}</div>`);
        infoWindowRef.current?.open({ anchor: marker, map });
      });
      routeVehicleMarkersRef.current.push(marker);
    });

    const walkToStopPath = lineToPath(selectedBus?.walk_to_stop?.geometry);
    const directWalkPath = walkingDirectionsActive ? lineToPath(directWalkRoute?.geometry) : [];
    const fullRoutePath = lineToPath(selectedBus?.full_route_geometry ?? selectedBus?.route_geometry);
    const rawBusRoutePath = lineToPath(selectedBus?.route_geometry);
    const walkFromStopPath = lineToPath(selectedBus?.walk_from_stop?.geometry);
    const boardingPoint =
      selectedBus?.boarding_stop
        ? { lat: selectedBus.boarding_stop.lat, lng: selectedBus.boarding_stop.lng }
        : stopPosition ?? (walkToStopPath.length > 0 ? walkToStopPath[walkToStopPath.length - 1] : null);
    const alightingPoint =
      selectedBus?.alighting_stop
        ? { lat: selectedBus.alighting_stop.lat, lng: selectedBus.alighting_stop.lng }
        : (walkFromStopPath.length > 0 ? walkFromStopPath[0] : null) ?? destinationPosition ?? null;
    let busRoutePath = rawBusRoutePath.length > 1
      ? rawBusRoutePath
      : relevantRouteSegment(fullRoutePath, boardingPoint, alightingPoint);
    if (navigationState?.active && navigationState.currentStep === 'ride_bus' && selectedVehicle && alightingPoint) {
      busRoutePath = relevantRouteSegment(busRoutePath, { lat: selectedVehicle.lat, lng: selectedVehicle.lng }, alightingPoint);
    }

    stopMarkersRef.current.forEach((marker) => marker.setMap(null));
    stopMarkersRef.current = [];
    const segmentStops = (selectedBus?.segment_stops || [])
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
    const fallbackStopDots = [
      boardingPoint
        ? { ...boardingPoint, stop_name: selectedBus?.boarding_stop?.stop_name || 'Boarding stop', is_boarding: true, is_alighting: false }
        : null,
      alightingPoint
        ? { ...alightingPoint, stop_name: selectedBus?.alighting_stop?.stop_name || 'Alighting stop', is_boarding: false, is_alighting: true }
        : null,
    ].filter((point): point is { lat: number; lng: number; stop_name: string; is_boarding: boolean; is_alighting: boolean } => Boolean(point));
    const stopsToRender = selectedBus && segmentStops.length > 0
      ? segmentStops.map((stop) => ({
        lat: stop.lat,
        lng: stop.lng,
        stop_name: stop.stop_name,
        is_boarding: Boolean(stop.is_boarding),
        is_alighting: Boolean(stop.is_alighting),
      }))
      : selectedBus ? fallbackStopDots : [];

    stopsToRender.forEach((stop) => {
      const prominent = stop.is_boarding || stop.is_alighting;
      stopMarkersRef.current.push(
        new window.google.maps.Marker({
          map,
          position: { lat: stop.lat, lng: stop.lng },
          title: stop.stop_name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: prominent ? '#dc2626' : '#ffffff',
            fillOpacity: 1,
            strokeColor: prominent ? '#ffffff' : '#1f2937',
            strokeOpacity: 1,
            strokeWeight: prominent ? 3 : 2,
            scale: prominent ? 7 : 4,
          },
          zIndex: prominent ? 1600 : 1100,
        })
      );
    });

    if (walkToStopPath.length > 1) {
      if (!walkToStopPolylineRef.current) {
        walkToStopPolylineRef.current = new window.google.maps.Polyline({
          map,
          path: walkToStopPath,
          strokeColor: '#0ea5e9',
          strokeOpacity: 0.95,
          strokeWeight: 4,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3, strokeColor: '#0ea5e9' }, offset: '0', repeat: '12px' }],
          zIndex: 100,
        });
      } else {
        walkToStopPolylineRef.current.setPath(walkToStopPath);
        walkToStopPolylineRef.current.setMap(map);
      }
    } else if (walkToStopPolylineRef.current) {
      walkToStopPolylineRef.current.setMap(null);
    }

    if (directWalkPath.length > 1) {
      if (!directWalkPolylineRef.current) {
        directWalkPolylineRef.current = new window.google.maps.Polyline({
          map,
          path: directWalkPath,
          strokeColor: '#0ea5e9',
          strokeOpacity: 0.95,
          strokeWeight: 5,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3, strokeColor: '#0ea5e9' }, offset: '0', repeat: '12px' }],
          zIndex: 210,
        });
      } else {
        directWalkPolylineRef.current.setPath(directWalkPath);
        directWalkPolylineRef.current.setMap(map);
      }
    } else if (directWalkPolylineRef.current) {
      directWalkPolylineRef.current.setMap(null);
    }

    if (fullRoutePath.length > 1) {
      if (!fullRoutePolylineRef.current) {
        fullRoutePolylineRef.current = new window.google.maps.Polyline({
          map,
          path: fullRoutePath,
          strokeColor: '#94a3b8',
          strokeOpacity: 0.65,
          strokeWeight: 5,
          zIndex: 150,
        });
      } else {
        fullRoutePolylineRef.current.setPath(fullRoutePath);
        fullRoutePolylineRef.current.setMap(map);
      }
    } else if (fullRoutePolylineRef.current) {
      fullRoutePolylineRef.current.setMap(null);
    }

    if (busRoutePath.length > 1) {
      if (!busRoutePolylineRef.current) {
        busRoutePolylineRef.current = new window.google.maps.Polyline({
          map,
          path: busRoutePath,
          strokeColor: '#2563eb',
          strokeOpacity: 0.95,
          strokeWeight: 6,
          zIndex: 200,
        });
      } else {
        busRoutePolylineRef.current.setPath(busRoutePath);
        busRoutePolylineRef.current.setMap(map);
      }
    } else if (busRoutePolylineRef.current) {
      busRoutePolylineRef.current.setMap(null);
    }

    if (walkFromStopPath.length > 1) {
      if (!walkFromStopPolylineRef.current) {
        walkFromStopPolylineRef.current = new window.google.maps.Polyline({
          map,
          path: walkFromStopPath,
          strokeColor: '#0ea5e9',
          strokeOpacity: 0.95,
          strokeWeight: 4,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3, strokeColor: '#0ea5e9' }, offset: '0', repeat: '12px' }],
          zIndex: 100,
        });
      } else {
        walkFromStopPolylineRef.current.setPath(walkFromStopPath);
        walkFromStopPolylineRef.current.setMap(map);
      }
    } else if (walkFromStopPolylineRef.current) {
      walkFromStopPolylineRef.current.setMap(null);
    }

    const bounds = new window.google.maps.LatLngBounds();
    const boundsTarget: string[] = [];
    const addPoints = (points: Array<{ lat: number; lng: number }>, label: string) => {
      if (points.length === 0) return;
      boundsTarget.push(label);
      points.forEach((point) => bounds.extend(point));
    };

    if (navigationState?.active) {
      addPoints([toLatLng(userPosition)], 'current_location');
      if (navigationState.currentStep === 'walk_to_boarding') {
        if (boardingPoint) addPoints([boardingPoint], 'boarding_stop');
        addPoints(walkToStopPath, 'walk_to_boarding');
      } else if (navigationState.currentStep === 'wait_for_bus') {
        if (boardingPoint) addPoints([boardingPoint], 'boarding_stop');
        if (selectedVehicle) addPoints([{ lat: selectedVehicle.lat, lng: selectedVehicle.lng }], 'approaching_bus');
      } else if (navigationState.currentStep === 'ride_bus') {
        if (selectedVehicle) addPoints([{ lat: selectedVehicle.lat, lng: selectedVehicle.lng }], 'current_bus');
        if (alightingPoint) addPoints([alightingPoint], 'alighting_stop');
        addPoints(busRoutePath, 'remaining_bus_segment');
      } else if (navigationState.currentStep === 'exit_bus' || navigationState.currentStep === 'walk_to_destination' || navigationState.currentStep === 'arrived') {
        if (alightingPoint) addPoints([alightingPoint], 'alighting_stop');
        if (destinationPosition) addPoints([toLatLng(destinationPosition)], 'destination');
        addPoints(walkFromStopPath, 'walk_to_destination');
      }
    } else {
      addPoints([toLatLng(userPosition)], 'current_location');
      if (destinationPosition) addPoints([toLatLng(destinationPosition)], 'destination');
      addPoints(directWalkPath, 'direct_walk');
      if (boardingPoint) addPoints([boardingPoint], 'boarding_stop');
      if (alightingPoint) addPoints([alightingPoint], 'alighting_stop');
      addPoints(walkToStopPath, 'walk_to_boarding');
      addPoints(busRoutePath, 'bus_segment');
      addPoints(walkFromStopPath, 'walk_to_destination');
    }

    const navigationActive = Boolean(navigationState?.active);
    const navigationJustEnded = wasNavigationActiveRef.current && !navigationActive;
    wasNavigationActiveRef.current = navigationActive;
    const boundsKey = [
      navigationActive ? 'navigation' : 'overview',
      navigationState?.currentStep ?? 'none',
      selectedBus?.id ?? selectedBus?.trip_id ?? selectedBus?.route_number ?? 'walk',
      destinationPosition ? `${destinationPosition.lat.toFixed(5)},${destinationPosition.lng.toFixed(5)}` : 'none',
      walkingDirectionsActive ? 'walking' : 'route',
    ].join('|');

    if (navigationJustEnded) {
      if (fitBoundsTimeoutRef.current) {
        window.clearTimeout(fitBoundsTimeoutRef.current);
        fitBoundsTimeoutRef.current = null;
      }
      lastFitBoundsKeyRef.current = boundsKey;
    } else if (
      !bounds.isEmpty() &&
      lastFitBoundsKeyRef.current !== boundsKey &&
      (navigationActive || destinationPosition || selectedBus || walkingDirectionsActive)
    ) {
      if (fitBoundsTimeoutRef.current) {
        window.clearTimeout(fitBoundsTimeoutRef.current);
      }
      const fitBounds = bounds;
      const fitPadding = { top: 80, right: 40, bottom: navigationActive ? 240 : 340, left: 40 };
      fitBoundsTimeoutRef.current = window.setTimeout(() => {
        map.fitBounds(fitBounds, fitPadding);
        fitBoundsTimeoutRef.current = null;
      }, MAP_FIT_DELAY_MS);
      lastFitBoundsKeyRef.current = boundsKey;
    }

    if (selectedBus) {
      console.log('[Transit Debug]', {
        route_id: selectedBus.route_id ?? null,
        route_short_name: selectedBus.route_short_name ?? selectedBus.route_number ?? null,
        direction_id: selectedBus.direction_id ?? null,
        trip_id: selectedBus.trip_id ?? null,
        shape_id: selectedBus.shape_id ?? null,
        boarding_stop: selectedBus.boarding_stop
          ? { id: selectedBus.boarding_stop.stop_id, name: selectedBus.boarding_stop.stop_name }
          : null,
        alighting_stop: selectedBus.alighting_stop
          ? { id: selectedBus.alighting_stop.stop_id, name: selectedBus.alighting_stop.stop_name }
          : null,
        boarding_before_alighting: selectedBus.boarding_before_alighting ?? null,
        shape_points_drawn: busRoutePath.length,
        stop_markers_drawn: stopsToRender.length,
        active_buses_drawn: routeVehicleMarkersRef.current.length,
        bus_arrival_times: routeVehicles.map((vehicle) => ({ vehicle_id: vehicle.vehicle_id, arrival_minutes: vehicle.arrival_minutes ?? null })),
        displayed_headsigns: routeVehicles.map((vehicle) => vehicle.headsign ?? null),
        current_navigation_step: navigationState?.currentStep ?? 'overview',
        map_bounds_target: boundsTarget,
      });
    }
  }, [destinationPosition, directWalkRoute, navigationState, routeVehicles, selectedBus, stopPosition, userPosition, walkingDirectionsActive]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f0f5f8] p-6 text-center">
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-sm font-medium text-[#4a4a4a]">Google Maps unavailable</p>
          <p className="mt-1 text-xs text-[#8b8680]">Retrying Google Maps...</p>
        </div>
      </div>
      )}
    </>
  );
}
