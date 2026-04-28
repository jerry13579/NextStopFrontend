const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const ROUTE_PLAN_TIMEOUT_MS = 25000;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', abortFromCaller, { once: true });
    }
  }
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { signal: _signal, ...fetchInit } = init;
    return await fetch(url, { ...fetchInit, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export interface ApiBusRoute {
  id: string;
  route_number: string;
  route_name: string;
  current_stop: string;
  next_stop: string;
  eta: number;
  capacity: number | null;
  delay: number;
  distance: number;
  walk_time: number;
  destination_walk_time: number;
  wait_time_minutes?: number;
  ride_time_minutes?: number;
  total_trip_time_minutes?: number;
  ride_distance_meters?: number | null;
  stop_count?: number | null;
  seats_left: number | null;
  recommendation: string;
  vehicle_id?: number;
  trip_id?: number;
  direction_id?: number | null;
  route_id?: string | null;
  route_short_name?: string | null;
  shape_id?: string | null;
  trip_headsign?: string | null;
  departure_time?: string | null;
  geometry_source?: string | null;
  ride_instruction?: string | null;
  occupancy_percent?: number | null;
  boarding_before_alighting?: boolean | null;
  boarding_stop?: {
    stop_id: string;
    stop_name: string;
    lat: number;
    lng: number;
    stop_sequence?: number;
  } | null;
  alighting_stop?: {
    stop_id: string;
    stop_name: string;
    lat: number;
    lng: number;
    stop_sequence?: number;
  } | null;
  segment_stops?: Array<{
    stop_id: string;
    stop_name: string;
    lat: number;
    lng: number;
    stop_sequence?: number;
    is_boarding?: boolean;
    is_alighting?: boolean;
  }>;
  bus_position?: Coordinates | null;
  route_geometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  } | null;
  full_route_geometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  } | null;
  occupancy?: {
    source: string;
    vehicle_id: string;
    estimated_occupancy_status_color?: string | null;
    estimated_occupancy_status?: string | null;
    estimated_occupancy_percentage?: number | null;
    vehicle_capacity?: number | null;
    current_passenger_count?: number | null;
    reported_at?: string | null;
  } | null;
  walk_to_stop?: {
    duration_minutes: number;
    distance_km: number;
    source: string;
    steps?: Array<{
      instruction: string;
      distance_meters?: number;
      duration_minutes?: number;
      geometry?: {
        type: 'LineString';
        coordinates: [number, number][];
      } | null;
    }>;
    geometry?: {
      type: 'LineString';
      coordinates: [number, number][];
    } | null;
  };
  walk_from_stop?: {
    duration_minutes: number;
    distance_km: number;
    source: string;
    steps?: Array<{
      instruction: string;
      distance_meters?: number;
      duration_minutes?: number;
      geometry?: {
        type: 'LineString';
        coordinates: [number, number][];
      } | null;
    }>;
    geometry?: {
      type: 'LineString';
      coordinates: [number, number][];
    } | null;
  };
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LatLngCoordinate {
  lat: number;
  lng: number;
}

export interface RouteVehicle {
  vehicle_id: number | null;
  trip_id: number | null;
  lat: number;
  lng: number;
  heading?: number | null;
  reported_at?: string | null;
  arrival_minutes?: number | null;
  headsign?: string | null;
  occupancy_percent?: number | null;
}

export interface PlanTripResponse {
  source: 'live' | 'schedule' | 'unavailable';
  start: string;
  destination: string;
  recommendation: string;
  available_buses: ApiBusRoute[];
  direct_walk?: {
    duration_minutes: number;
    distance_km: number;
    source: string;
    steps?: Array<{
      instruction: string;
      distance_meters?: number;
      duration_minutes?: number;
      geometry?: {
        type: 'LineString';
        coordinates: [number, number][];
      } | null;
    }>;
    geometry?: {
      type: 'LineString';
      coordinates: [number, number][];
    } | null;
  };
  origin_stop?: {
    stop_id: string;
    name: string;
    lat: number;
    lng: number;
    city?: string | null;
  };
  map_data: {
    start_marker: Coordinates;
    destination_marker: Coordinates;
    origin_stop_marker?: Coordinates | null;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  location: string;
  start_time: string;
  end_time?: string | null;
  is_course?: boolean;
  course_code?: string | null;
}

export interface CalendarCommuteOption {
  type: 'walk' | 'bus';
  route_number?: string | null;
  route_name?: string | null;
  leave_by: string;
  depart_at?: string | null;
  arrive_at: string;
  total_trip_time_minutes: number;
  walk_time_minutes: number;
  ride_time_minutes: number;
  destination_walk_time_minutes: number;
  boarding_stop_name?: string | null;
  alighting_stop_name?: string | null;
}

export interface CalendarCommutePreview {
  event_id: string;
  origin_name?: string | null;
  destination: string;
  source: 'schedule' | 'unavailable';
  leave_by?: string | null;
  best_route_number?: string | null;
  options: CalendarCommuteOption[];
}

export interface CalendarImportResponse {
  source: string;
  events: CalendarEvent[];
  commute_previews?: CalendarCommutePreview[] | null;
}

export interface AuthResponse {
  token: string;
  email: string;
  name?: string | null;
}

export interface LocationSearchResult {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

export interface ReverseLocationResult {
  name: string;
  address?: string;
}

export interface LocalEat {
  id: string;
  name: string;
  type: 'cafe' | 'restaurant' | 'quick-bites' | 'dessert';
  emoji: string;
  rating: number | null;
  price_level: 1 | 2 | 3 | 4;
  distance_miles: number | null;
  walk_time_minutes: number | null;
  address: string;
  hours: string;
  description: string;
  is_open: boolean;
  is_favorite: boolean;
  cuisine_type: string;
  student_discount?: {
    percentage: number;
    details: string;
    valid_until?: string | null;
    is_new?: boolean;
  } | null;
}

export interface FetchLocalEatsOptions {
  category?: LocalEat['type'] | null;
  dealsOnly?: boolean;
  favoritesOnly?: boolean;
  location?: Coordinates | null;
  token?: string | null;
  signal?: AbortSignal;
}

export interface UserPreferences {
  smart_departure_alerts: boolean;
  capacity_alerts: boolean;
  delay_notifications: boolean;
  theme_id?: string | null;
}

export interface ApiTrip {
  id: string;
  date: string;
  class_code: string;
  class_name: string;
  scheduled_time: string;
  actual_arrival_time: string;
  was_on_time: boolean;
  mode: 'bus' | 'walk';
  bus_line?: string | null;
  distance_km: number;
  steps?: number | null;
  calories_burned?: number | null;
}

export interface CreateTripLogInput {
  idempotency_key: string;
  class_id: string;
  class_code: string;
  class_name: string;
  scheduled_time: string;
  actual_arrival_time: string;
  mode: 'bus' | 'walk';
  bus_line?: string | null;
  distance_km: number;
  steps?: number | null;
  calories_burned?: number | null;
}

export interface TripStatsSummary {
  period: 'today' | 'week' | 'semester';
  trip_count: number;
  on_time_count: number;
  on_time_rate: number;
  streak_days: number;
  distance_km: number;
  steps: number;
  calories_burned: number;
  co2_saved_grams: number;
  transit_minutes: number;
}

export interface ServiceAlertResult {
  summary: string;
  subject?: string | null;
  effective?: string | null;
  route?: string | null;
  routes?: string[];
  direction?: string | null;
  stop_name?: string | null;
}

function authHeaders(token?: string | null) {
  return token ? { 'X-Session-Token': token } : {};
}

export async function fetchPlanTrip(
  start: string,
  destination: string,
  userLocation?: Coordinates | null,
  destinationLocation?: Coordinates | null,
  signal?: AbortSignal,
  options?: { mode?: 'all' | 'bus'; includeWalk?: boolean }
): Promise<PlanTripResponse> {
  const params = new URLSearchParams({ start, destination });
  if (userLocation) {
    params.set('start_lat', userLocation.lat.toString());
    params.set('start_lng', userLocation.lng.toString());
  }
  if (destinationLocation) {
    params.set('destination_lat', destinationLocation.lat.toString());
    params.set('destination_lng', destinationLocation.lng.toString());
  }
  if (options?.mode) {
    params.set('mode', options.mode);
  }
  if (options?.includeWalk !== undefined) {
    params.set('include_walk', String(options.includeWalk));
  }
  const url = `${API_BASE_URL}/plan-trip?${params.toString()}`;
  const response = await fetchWithTimeout(url, { signal }, ROUTE_PLAN_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchLocalEats({
  category,
  dealsOnly,
  favoritesOnly,
  location,
  token,
  signal,
}: FetchLocalEatsOptions = {}): Promise<LocalEat[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (dealsOnly) params.set('deals_only', 'true');
  if (favoritesOnly) params.set('favorites_only', 'true');
  if (location) {
    params.set('lat', String(location.lat));
    params.set('lng', String(location.lng));
  }
  const query = params.toString();
  const response = await fetchWithTimeout(`${API_BASE_URL}/local-eats${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Local Eats request failed with status ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.eateries ?? [];
}

export async function setLocalEatFavorite(id: string, isFavorite: boolean, token?: string | null): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/local-eats/${encodeURIComponent(id)}/favorite`, {
    method: isFavorite ? 'PUT' : 'DELETE',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Local Eats favorite update failed with status ${response.status}`);
  }
}

export async function fetchUserPreferences(token: string): Promise<UserPreferences> {
  const response = await fetch(`${API_BASE_URL}/user/preferences`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Preferences request failed with status ${response.status}`);
  }
  return response.json();
}

export async function updateUserPreferences(token: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
  const response = await fetch(`${API_BASE_URL}/user/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) } as HeadersInit,
    body: JSON.stringify(preferences),
  });
  if (!response.ok) {
    throw new Error(`Preferences update failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchTrips(token: string, from?: Date, to?: Date): Promise<ApiTrip[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/trips${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Trips request failed with status ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.trips ?? [];
}

export async function createTripLog(token: string, trip: CreateTripLogInput): Promise<ApiTrip> {
  const response = await fetch(`${API_BASE_URL}/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) } as HeadersInit,
    body: JSON.stringify(trip),
  });
  if (!response.ok) {
    throw new Error(`Trip log failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchTripStats(token: string, period: TripStatsSummary['period']): Promise<TripStatsSummary> {
  const params = new URLSearchParams({ period });
  const response = await fetch(`${API_BASE_URL}/stats/summary?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Stats request failed with status ${response.status}`);
  }
  return response.json();
}

export async function exportUserData(token: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/user/export`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Data export failed with status ${response.status}`);
  }
  return response.blob();
}

export async function clearUserData(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/user/data`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Data deletion failed with status ${response.status}`);
  }
}

export async function importCalendar(
  file: File,
  token?: string | null,
  commuteOrigin?: { name?: string; lat: number; lng: number } | null
): Promise<CalendarImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (commuteOrigin) {
    formData.append('commute_origin', JSON.stringify(commuteOrigin));
  }

  const response = await fetch(`${API_BASE_URL}/calendar/import`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Calendar import failed with status ${response.status}`);
  }

  return response.json();
}

export async function saveManualCalendarEvents(
  events: CalendarEvent[],
  token: string | null,
  commuteOrigin?: { name?: string; lat: number; lng: number } | null
): Promise<CalendarImportResponse> {
  const response = await fetch(`${API_BASE_URL}/calendar/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) } as HeadersInit,
    body: JSON.stringify({ events, commute_origin: commuteOrigin ?? null }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save manual events: ${response.status}`);
  }
  return response.json();
}

export async function deleteCalendarEvents(externalIds: string[], token: string | null): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/calendar/events`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) } as HeadersInit,
    body: JSON.stringify({ external_ids: externalIds }),
  });
  if (!response.ok) throw new Error(`Failed to delete calendar events: ${response.status}`);
}

export async function updateCalendarEvents(
  updates: Array<{ external_ids: string[]; title?: string; location?: string; start_time?: string; end_time?: string }>,
  token: string | null
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/calendar/events`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) } as HeadersInit,
    body: JSON.stringify({ updates }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update calendar events: ${response.status}`);
  }
}

export async function fetchCalendarEvents(token: string): Promise<CalendarImportResponse> {
  const response = await fetch(`${API_BASE_URL}/calendar/events`, {
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error(`Calendar load failed with status ${response.status}`);
  }
  return response.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }
  return response.json();
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  if (!response.ok) {
    throw new Error(`Registration failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchSession(token: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/session`, {
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error(`Session failed with status ${response.status}`);
  }
  return response.json();
}

export async function logout(token: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error(`Logout failed with status ${response.status}`);
  }
  return response.json();
}

export async function refreshToken(token: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  if (!response.ok) {
    throw new Error(`Token refresh failed with status ${response.status}`);
  }
  return response.json();
}

export async function searchLocations(q: string, userLocation?: Coordinates | null): Promise<LocationSearchResult[]> {
  const params = new URLSearchParams({ q });
  if (userLocation) {
    params.set('lat', userLocation.lat.toString());
    params.set('lng', userLocation.lng.toString());
  }
  const response = await fetchWithTimeout(`${API_BASE_URL}/locations/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`);
  }
  const data = await response.json();
  return data.results;
}

export async function fetchReverseLocation(destination: Coordinates): Promise<ReverseLocationResult> {
  const params = new URLSearchParams({
    lat: destination.lat.toString(),
    lng: destination.lng.toString(),
  });
  const response = await fetchWithTimeout(`${API_BASE_URL}/locations/reverse?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Reverse location lookup failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchServiceAlert(routes?: string[]): Promise<ServiceAlertResult | null> {
  const params = new URLSearchParams();
  if (routes && routes.length > 0) {
    params.set('routes', routes.join(','));
  }
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/service-alert${query ? `?${query}` : ''}`);
  if (!response.ok) {
    throw new Error(`Service alert request failed with status ${response.status}`);
  }
  const data = await response.json();
  return data.alert ?? null;
}

export async function fetchGtfsShape(routeId: string, directionId?: number): Promise<LatLngCoordinate[]> {
  const params = new URLSearchParams({ route_id: routeId });
  if (directionId !== undefined) {
    params.set('direction_id', String(directionId));
  }
  const response = await fetch(`${API_BASE_URL}/gtfs/shape?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`GTFS shape request failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchRouteVehicles(routeId: string, directionId?: number, boardingStopId?: string): Promise<RouteVehicle[]> {
  const params = new URLSearchParams({ route_id: routeId });
  if (directionId !== undefined) {
    params.set('direction_id', String(directionId));
  }
  if (boardingStopId) {
    params.set('boarding_stop_id', boardingStopId);
  }
  const response = await fetch(`${API_BASE_URL}/route/vehicles?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Route vehicles request failed with status ${response.status}`);
  }
  return response.json();
}

export { API_BASE_URL };
