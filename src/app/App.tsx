import { Component, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Users, Clock, MapPin, Navigation2, TrendingUp, Search, X, Footprints, Bus } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { WelcomeSection } from './components/WelcomeSection';
import { LocalEatsSection } from './components/LocalEatsSection';
import { SettingsSection } from './components/SettingsSection';
import { DailySummary } from './components/DailySummary';
import { SemesterWrapped } from './components/SemesterWrapped';
import { BusMap } from './components/BusMap';
import { StarredLocations, type StarredLocation } from './components/StarredLocations';
import { BoardingReminders } from './components/BoardingReminders';
import { CreditCard, AlertTriangle, Heart } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import {
  API_BASE_URL,
  ApiBusRoute,
  CalendarEvent,
  CalendarCommutePreview,
  Coordinates,
  fetchReverseLocation,
  fetchCalendarEvents,
  fetchRouteVehicles,
  fetchServiceAlert,
  fetchPlanTrip,
  fetchSession,
  importCalendar,
  saveManualCalendarEvents,
  deleteCalendarEvents,
  updateCalendarEvents,
  LocationSearchResult,
  logout,
  RouteVehicle,
  searchLocations
} from './utils/api';
import { loadTrips, calculateStreak, getTodaysTrips, Trip } from './utils/tripTracking';
import { getThemeById, applyTheme, getCustomTheme, ColorTheme } from './utils/colorThemes';
import {
  requestNotificationPermission,
  scheduleCommuteNotifications,
  scheduleLeaveByNotification,
  setCommuteNotificationTapHandler,
} from './utils/notifications';
import nextStopLogo from '../imports/nextstop-logo-full.png';

interface Class {
  id: string;
  name: string;
  code: string;
  location: string;
  startTime: Date;
  endTime: Date;
  buildingCode: string;
  emoji?: string;
  isCourse?: boolean;
}

interface BusRoute {
  id: string;
  routeNumber: string;
  routeName: string;
  currentStop: string;
  nextStop: string;
  eta: number; // minutes
  capacity: number | null; // percentage when telemetry is available
  delay: number; // minutes (0 if on time)
  distance: number; // km
  walkTime: number; // minutes if you walk
  destinationWalkTime: number; // minutes to walk from bus stop to class
  waitTimeMinutes: number;
  rideTimeMinutes: number;
  totalTripTimeMinutes: number;
  headsign?: string | null;
  departureTime?: string | null;
  occupancyPercent?: number | null;
  busPosition?: Coordinates | null;
  routeGeometry?: ApiBusRoute['route_geometry'];
  fullRouteGeometry?: ApiBusRoute['full_route_geometry'];
  walkToStop?: ApiBusRoute['walk_to_stop'];
  walkFromStop?: ApiBusRoute['walk_from_stop'];
  apiBus?: ApiBusRoute;
}

type NavigationStepType = 'walk_to_boarding' | 'wait_for_bus' | 'ride_bus' | 'exit_bus' | 'walk_to_destination' | 'arrived';

interface NavigationStep {
  id: NavigationStepType;
  stepType: string;
  title: string;
  instruction: string;
  routeNumber?: string | null;
  headsign?: string | null;
  boardingStopName?: string | null;
  alightingStopName?: string | null;
  arrivalCountdown?: string | null;
  fullness?: string | null;
  exactTime?: string | null;
  arriveBy?: string | null;
  topRightMetric: string;
  topRightLabel: string;
  widgets: Array<{
    label: string;
    value: string;
  }>;
}

interface RouteTile {
  kind: 'walk' | 'bus';
  id: string;
  totalTripTimeMinutes: number;
  bus?: BusRoute;
  alternates?: BusRoute[];
}

interface HomeRouteMetrics {
  leaveInValue: string;
  leaveInDetail: string;
  leaveByValue: string;
  leaveByDetail: string;
  locationValue: string;
  locationDetail: string;
}

const ROUTE_OPTIONS_REFRESH_MS = 3 * 60 * 1000;
const ROUTE_LOADING_WATCHDOG_MS = 25 * 1000;
const ROUTE_REPLAN_DISTANCE_METERS = 75;
const WALK_ROUTE_OPTION_ID = '__walk_route_option__';
const HOME_ROUTE_CACHE_KEY = 'homeRouteCache';

type HomeRouteStatus = 'loading' | 'live' | 'schedule';

interface CachedBusRoute {
  id: string;
  routeNumber: string;
  routeName: string;
  currentStop: string;
  nextStop: string;
  eta: number;
  capacity: number | null;
  delay: number;
  distance: number;
  walkTime: number;
  destinationWalkTime: number;
  waitTimeMinutes: number;
  rideTimeMinutes: number;
  totalTripTimeMinutes: number;
}

interface HomeRouteCache {
  location: string;
  buses: CachedBusRoute[];
  directWalkMinutes: number | null;
  source: 'live' | 'schedule';
  cachedAt: number;
}

function previewOptionsToCachedRoutes(preview: CalendarCommutePreview): CachedBusRoute[] {
  return preview.options
    .filter((option) => option.type === 'bus' && option.route_number)
    .map((option, index) => ({
      id: `schedule_preview_${preview.event_id}_${option.route_number}_${index}`,
      routeNumber: option.route_number || 'Bus',
      routeName: option.route_name || `Route ${option.route_number}`,
      currentStop: option.boarding_stop_name || 'Scheduled stop',
      nextStop: option.alighting_stop_name || 'Destination stop',
      eta: 0,
      capacity: null,
      delay: 0,
      distance: 0,
      walkTime: option.walk_time_minutes,
      destinationWalkTime: option.destination_walk_time_minutes,
      waitTimeMinutes: 0,
      rideTimeMinutes: option.ride_time_minutes,
      totalTripTimeMinutes: option.total_trip_time_minutes,
    }));
}

interface SpecialPlace {
  name: string;
  lat: number;
  lng: number;
}

const NEAR_THRESHOLD_METERS = 300;

function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadHomeRouteCache(location: string): HomeRouteCache | null {
  try {
    const raw = localStorage.getItem(HOME_ROUTE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeRouteCache;
    return parsed.location === location ? parsed : null;
  } catch {
    return null;
  }
}

function saveHomeRouteCache(cache: HomeRouteCache): void {
  try {
    localStorage.setItem(HOME_ROUTE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}
const AUTO_SNAP_DELAY_MS = 30_000;

interface Recommendation {
  action: 'wait' | 'walk' | 'alternate' | 'walk-to-class';
  message: string;
  color: string;
  willBeOnTime: boolean;
  arrivalTime: number; // minutes until arrival at class
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Routes panel error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-[var(--color-textPrimary)]">Map temporarily unavailable</p>
          <p className="mt-1 text-sm text-[var(--color-textSecondary)]">
            The route details are still below, but the live map hit an error and was safely skipped.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

function loadJsonValue<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function normalizeApiBus(bus: ApiBusRoute): BusRoute {
  return {
    id: bus.id,
    routeNumber: bus.route_number,
    routeName: bus.route_name,
    currentStop: bus.current_stop,
    nextStop: bus.next_stop,
    eta: bus.eta,
    capacity: bus.capacity,
    delay: bus.delay,
    distance: bus.distance,
    walkTime: bus.walk_time,
    destinationWalkTime: bus.destination_walk_time,
    waitTimeMinutes: bus.wait_time_minutes ?? bus.eta,
    rideTimeMinutes: bus.ride_time_minutes ?? 0,
    totalTripTimeMinutes: bus.total_trip_time_minutes ?? (bus.walk_time + bus.eta + bus.destination_walk_time),
    headsign: bus.trip_headsign ?? null,
    departureTime: bus.departure_time ?? null,
    occupancyPercent: bus.occupancy_percent ?? bus.capacity ?? null,
    busPosition: bus.bus_position,
    routeGeometry: bus.route_geometry,
    fullRouteGeometry: bus.full_route_geometry,
    walkToStop: bus.walk_to_stop,
    walkFromStop: bus.walk_from_stop,
    apiBus: bus
  };
}

function normalizeRouteHeadKey(value?: string | null) {
  return (value || 'destination').trim().toLowerCase().replace(/\s+/g, ' ');
}

function groupedRouteOptions(buses: BusRoute[]) {
  const grouped = new Map<string, BusRoute[]>();
  buses.forEach((bus) => {
    const key = `${bus.routeNumber}|${normalizeRouteHeadKey(bus.headsign || bus.routeName)}`;
    grouped.set(key, [...(grouped.get(key) || []), bus]);
  });

  return [...grouped.values()]
    .map((options) => {
      const sorted = [...options].sort((a, b) => (
        (a.totalTripTimeMinutes - b.totalTripTimeMinutes) || (a.eta - b.eta)
      ));
      return { bus: sorted[0], alternates: sorted.slice(1) };
    })
    .sort((a, b) => a.bus.totalTripTimeMinutes - b.bus.totalTripTimeMinutes);
}

function busReducesWalking(bus: BusRoute, directWalkTimeMinutes: number | null) {
  if (directWalkTimeMinutes === null) return true;
  return bus.totalTripTimeMinutes <= directWalkTimeMinutes ||
    (bus.walkTime + bus.destinationWalkTime) < directWalkTimeMinutes;
}

function routePlanKey(destination: string, position: Coordinates | null) {
  const positionKey = position
    ? `${position.lat.toFixed(5)},${position.lng.toFixed(5)}`
    : 'geocode';
  return `${destination.trim().toLowerCase()}|${positionKey}`;
}

function formatClockTime(value?: string | Date | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatArrivalTimeFromNow(now: Date, minutes: number) {
  return formatClockTime(new Date(now.getTime() + minutes * 60000));
}

function isSameLocalDay(dateA: Date, dateB: Date) {
  return dateA.toDateString() === dateB.toDateString();
}


function buildHomeRouteMetrics(
  nextClass: Class | null,
  currentTime: Date,
  buses: BusRoute[],
  directWalkTimeMinutes: number | null,
): HomeRouteMetrics | null {
  if (!nextClass) return null;

  const minutesUntilClass = Math.max(Math.round((nextClass.startTime.getTime() - currentTime.getTime()) / 60000), 0);
  const validBuses = buses.filter((bus) => Number.isFinite(bus.totalTripTimeMinutes) && bus.totalTripTimeMinutes >= 0);
  const onTimeBuses = validBuses.filter((bus) => bus.totalTripTimeMinutes <= minutesUntilClass);
  const candidateBuses = onTimeBuses.length > 0 ? onTimeBuses : validBuses;
  const bestBus = candidateBuses.length > 0
    ? candidateBuses.reduce((best, bus) => bus.totalTripTimeMinutes < best.totalTripTimeMinutes ? bus : best)
    : null;
  const bestTravelTime = bestBus?.totalTripTimeMinutes ?? null;

  const leaveByTime = bestTravelTime === null
    ? null
    : new Date(nextClass.startTime.getTime() - bestTravelTime * 60000);
  const locationPrimary = nextClass.location.split(',')[0]?.trim() || nextClass.location;

  return {
    leaveInValue: bestBus ? `${bestBus.totalTripTimeMinutes} min` : '—',
    leaveInDetail: bestBus ? `Route ${bestBus.routeNumber}` : 'No bus available',
    leaveByValue: formatClockTime(leaveByTime) || '—',
    leaveByDetail: bestTravelTime === null ? 'Add a class location to calculate' : `${nextClass.code} · ${bestTravelTime} min trip`,
    locationValue: locationPrimary,
    locationDetail: `${nextClass.code} · ${formatClockTime(nextClass.startTime) || 'soon'}`,
  };
}

function boardingLikelihood(capacity?: number | null) {
  if (capacity === null || capacity === undefined) {
    return {
      label: 'Boarding status unknown',
      tone: 'text-[var(--color-textMuted)] bg-[var(--color-accent)]',
    };
  }
  if (capacity >= 85) {
    return {
      label: 'Boarding unlikely',
      tone: 'text-red-700 bg-red-100',
    };
  }
  if (capacity >= 60) {
    return {
      label: 'Limited space',
      tone: 'text-amber-700 bg-amber-100',
    };
  }
  return {
    label: 'Boarding likely',
    tone: 'text-green-700 bg-green-100',
  };
}

function occupancyForBus(bus: BusRoute, routeVehicles: RouteVehicle[]) {
  if (typeof bus.occupancyPercent === 'number') return bus.occupancyPercent;
  const routeVehicleOccupancies = routeVehicles
    .map((vehicle) => vehicle.occupancy_percent)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const selectedVehicle = selectedVehicleForBoarding(routeVehicles, bus);
  if (typeof selectedVehicle?.occupancy_percent === 'number') {
    return selectedVehicle.occupancy_percent;
  }
  return routeVehicleOccupancies.length > 0
    ? Math.round(routeVehicleOccupancies.reduce((sum, value) => sum + value, 0) / routeVehicleOccupancies.length)
    : null;
}

function vehicleCacheKey(bus: BusRoute) {
  return [
    bus.apiBus?.route_short_name || bus.routeNumber,
    typeof bus.apiBus?.direction_id === 'number' ? bus.apiBus.direction_id : 'any',
    bus.apiBus?.boarding_stop?.stop_id || 'any',
  ].join('|');
}

function distanceMeters(pointA?: Coordinates | null, pointB?: Coordinates | null) {
  if (!pointA || !pointB) return Number.POSITIVE_INFINITY;
  const dLat = (pointA.lat - pointB.lat) * 111_320;
  const dLng = (pointA.lng - pointB.lng) * 111_320;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function sameCoordinates(pointA?: Coordinates | null, pointB?: Coordinates | null) {
  if (!pointA || !pointB) return false;
  return Math.abs(pointA.lat - pointB.lat) < 0.000001 && Math.abs(pointA.lng - pointB.lng) < 0.000001;
}

function formatDistance(distanceMetersValue?: number | null, fallbackMinutes?: number | null) {
  if (typeof distanceMetersValue === 'number' && Number.isFinite(distanceMetersValue)) {
    const miles = Math.max(distanceMetersValue / 1609.344, 0.1);
    return `${miles.toFixed(1)} mi`;
  }
  if (typeof fallbackMinutes === 'number' && Number.isFinite(fallbackMinutes)) {
    return `${fallbackMinutes} min`;
  }
  return 'In progress';
}

function firstInstruction(route?: ApiBusRoute['walk_to_stop'] | ApiBusRoute['walk_from_stop']) {
  return route?.steps?.[0]?.instruction || 'Follow the highlighted path';
}

function conciseWalkingInstruction(route?: ApiBusRoute['walk_to_stop'] | ApiBusRoute['walk_from_stop']) {
  const instruction = firstInstruction(route).replace(/^Follow the highlighted path\.?\s*/i, '').trim();
  return instruction || 'Walk along the highlighted route';
}

function selectedVehicleForBoarding(routeVehicles: RouteVehicle[], bus: BusRoute | null) {
  if (!bus) return null;
  const matchingVehicle = routeVehicles.find((vehicle) => vehicle.vehicle_id === bus.apiBus?.vehicle_id);
  if (matchingVehicle) return matchingVehicle;
  return [...routeVehicles]
    .filter((vehicle) => typeof vehicle.arrival_minutes === 'number')
    .sort((a, b) => (a.arrival_minutes ?? Number.POSITIVE_INFINITY) - (b.arrival_minutes ?? Number.POSITIVE_INFINITY))[0] || routeVehicles[0] || null;
}

function determineNavigationStep(
  bus: BusRoute | null,
  userLocation: Coordinates,
  destinationLocation: Coordinates | null,
  routeVehicles: RouteVehicle[],
): NavigationStepType {
  if (!bus?.apiBus?.boarding_stop || !bus.apiBus.alighting_stop || !destinationLocation) {
    return 'walk_to_boarding';
  }

  const boardingPoint = { lat: bus.apiBus.boarding_stop.lat, lng: bus.apiBus.boarding_stop.lng };
  const alightingPoint = { lat: bus.apiBus.alighting_stop.lat, lng: bus.apiBus.alighting_stop.lng };
  const selectedVehicle = selectedVehicleForBoarding(routeVehicles, bus);
  const distanceToBoarding = distanceMeters(userLocation, boardingPoint);
  const distanceToAlighting = distanceMeters(userLocation, alightingPoint);
  const distanceToDestination = distanceMeters(userLocation, destinationLocation);
  const distanceToVehicle = selectedVehicle ? distanceMeters(userLocation, { lat: selectedVehicle.lat, lng: selectedVehicle.lng }) : Number.POSITIVE_INFINITY;
  const approachingArrival = selectedVehicle?.arrival_minutes ?? bus.waitTimeMinutes;

  if (distanceToDestination <= 35) {
    return 'walk_to_destination';
  }
  if (distanceToBoarding > 90) {
    return 'walk_to_boarding';
  }
  if (distanceToAlighting <= 90) {
    return 'walk_to_destination';
  }
  if (distanceToVehicle <= 90 || (distanceToBoarding > 140 && distanceToAlighting < distanceToBoarding)) {
    return distanceToAlighting <= 180 ? 'exit_bus' : 'ride_bus';
  }
  if (approachingArrival <= 1) {
    return 'wait_for_bus';
  }
  return 'wait_for_bus';
}

function buildNavigationSteps(
  bus: BusRoute | null,
  routeVehicles: RouteVehicle[],
  now: Date,
): NavigationStep[] {
  if (!bus?.apiBus?.boarding_stop || !bus.apiBus.alighting_stop) return [];

  const selectedVehicle = selectedVehicleForBoarding(routeVehicles, bus);
  const fullness = bus.occupancyPercent === null || bus.occupancyPercent === undefined
    ? 'Capacity unknown'
    : `${bus.occupancyPercent}% capacity`;
  const boardingStopName = bus.apiBus.boarding_stop.stop_name;
  const alightingStopName = bus.apiBus.alighting_stop.stop_name;
  const headsign = bus.headsign || bus.apiBus.trip_headsign || 'Destination';
  const rideDistance = formatDistance(bus.apiBus.ride_distance_meters ?? null, bus.rideTimeMinutes);
  const departureTime = bus.departureTime ? new Date(bus.departureTime) : new Date(now.getTime() + bus.waitTimeMinutes * 60000);
  const boardingTimeLabel = formatClockTime(departureTime);
  const exitTime = new Date(departureTime.getTime() + bus.rideTimeMinutes * 60000);
  const finalArrivalTime = new Date(exitTime.getTime() + bus.destinationWalkTime * 60000);
  const finalArrivalLabel = formatClockTime(finalArrivalTime);
  const stopsRemaining = String(bus.apiBus.stop_count ?? Math.max((bus.apiBus.segment_stops?.length ?? 1) - 1, 1));
  const crowdingPercent = bus.occupancyPercent === null || bus.occupancyPercent === undefined
    ? 'Unknown'
    : `${bus.occupancyPercent}%`;

  return [
    {
      id: 'walk_to_boarding',
      stepType: 'Walk',
      title: `Walk to ${boardingStopName}`,
      instruction: `${conciseWalkingInstruction(bus.walkToStop)} Head to ${boardingStopName}.`,
      boardingStopName,
      exactTime: formatClockTime(now),
      arriveBy: boardingTimeLabel,
      topRightMetric: boardingTimeLabel || 'Soon',
      topRightLabel: 'Arrive by',
      widgets: [
        {
          label: 'Walk',
          value: formatDistance((bus.walkToStop?.distance_km ?? 0) * 1000, bus.walkTime),
        },
      ],
    },
    {
      id: 'wait_for_bus',
      stepType: 'Wait',
      title: `Wait for ${bus.routeNumber} towards ${headsign}`,
      instruction: `Stay at ${boardingStopName} and board the bus that is signed for ${headsign}.`,
      routeNumber: bus.routeNumber,
      headsign,
      boardingStopName,
      arrivalCountdown: `${selectedVehicle?.arrival_minutes ?? bus.waitTimeMinutes} min`,
      fullness,
      exactTime: boardingTimeLabel,
      arriveBy: boardingTimeLabel,
      topRightMetric: `${selectedVehicle?.arrival_minutes ?? bus.waitTimeMinutes} min`,
      topRightLabel: 'Bus arriving',
      widgets: [
        {
          label: 'Scheduled',
          value: boardingTimeLabel || 'Soon',
        },
        {
          label: 'Crowding',
          value: crowdingPercent,
        },
      ],
    },
    {
      id: 'ride_bus',
      stepType: 'Ride Bus',
      title: `Ride Route ${bus.routeNumber} toward ${headsign}`,
      instruction: `${bus.apiBus.ride_instruction || `Ride Route ${bus.routeNumber} toward ${headsign}.`} Get off at ${alightingStopName}.`,
      routeNumber: bus.routeNumber,
      headsign,
      boardingStopName,
      alightingStopName,
      fullness,
      exactTime: boardingTimeLabel,
      arriveBy: finalArrivalLabel,
      topRightMetric: `${bus.rideTimeMinutes} min`,
      topRightLabel: 'Stay on',
      widgets: [
        {
          label: 'Stops left',
          value: stopsRemaining,
        },
        {
          label: 'Get off',
          value: formatClockTime(exitTime) || `${bus.rideTimeMinutes} min`,
        },
      ],
    },
    {
      id: 'exit_bus',
      stepType: 'Exit Bus',
      title: `Exit at ${alightingStopName}`,
      instruction: `Exit the bus at ${alightingStopName} and get ready for the final walk to your destination.`,
      routeNumber: bus.routeNumber,
      headsign,
      alightingStopName,
      exactTime: formatClockTime(exitTime),
      arriveBy: finalArrivalLabel,
      topRightMetric: formatClockTime(exitTime) || 'Now',
      topRightLabel: 'Exit at',
      widgets: [
        {
          label: 'Next',
          value: 'Final walk',
        },
      ],
    },
    {
      id: 'walk_to_destination',
      stepType: 'Walk',
      title: 'Walk from the stop to your destination',
      instruction: `${conciseWalkingInstruction(bus.walkFromStop)} Continue from ${alightingStopName} to your destination.`,
      alightingStopName,
      exactTime: formatClockTime(exitTime),
      arriveBy: finalArrivalLabel,
      topRightMetric: finalArrivalLabel || 'Soon',
      topRightLabel: 'Arrive by',
      widgets: [
        {
          label: 'Walk',
          value: formatDistance((bus.walkFromStop?.distance_km ?? 0) * 1000, bus.destinationWalkTime),
        },
      ],
    },
  ];
}

function getRecommendation(bus: BusRoute, nextClass: Class | null, currentTime: Date): Recommendation {
  const { capacity, delay, eta, walkTime, destinationWalkTime } = bus;
  const hasCapacity = capacity !== null;

  if (!nextClass) {
    if (hasCapacity && capacity >= 95) {
      return {
        action: 'alternate',
        message: `Bus is at ${capacity}% capacity. Consider the next bus or alternate route.`,
        color: 'bg-red-50 border-red-200',
        willBeOnTime: true,
        arrivalTime: 0
      };
    }
    return {
      action: 'wait',
      message: 'Bus has available space. Safe to board.',
      color: 'bg-green-50 border-green-200',
      willBeOnTime: true,
      arrivalTime: 0
    };
  }

  // Calculate time until class starts
  const minutesUntilClass = Math.floor((nextClass.startTime.getTime() - currentTime.getTime()) / 60000);

  // Time to arrive at class via bus (wait + ride + walk from stop)
  const busArrivalTime = eta + destinationWalkTime;

  // Time to arrive at class by walking
  const walkArrivalTime = walkTime;

  const willBeOnTimeByBus = busArrivalTime < minutesUntilClass;
  const willBeOnTimeByWalking = walkArrivalTime < minutesUntilClass;

  // Critical capacity - recommend alternatives
  if (hasCapacity && capacity >= 95) {
    if (willBeOnTimeByWalking) {
      return {
        action: 'walk-to-class',
        message: `Bus is at ${capacity}% capacity. Walk to ${nextClass.buildingCode} now (${walkTime} min) to arrive on time.`,
        color: 'bg-red-50 border-red-200',
        willBeOnTime: true,
        arrivalTime: walkArrivalTime
      };
    }
    return {
      action: 'alternate',
      message: `Bus is at ${capacity}% capacity. Wait for next bus or walk immediately.`,
      color: 'bg-red-50 border-red-200',
      willBeOnTime: false,
      arrivalTime: busArrivalTime
    };
  }

  // If bus won't get you there on time
  if (!willBeOnTimeByBus) {
    if (willBeOnTimeByWalking) {
      return {
        action: 'walk-to-class',
        message: `Walk to ${nextClass.buildingCode} now (${walkTime} min). Bus won't get you there on time.`,
        color: 'bg-red-50 border-red-200',
        willBeOnTime: true,
        arrivalTime: walkArrivalTime
      };
    }
    return {
      action: 'walk-to-class',
      message: `You'll be late either way. Walking (${walkTime} min) is ${busArrivalTime - walkArrivalTime} min faster.`,
      color: 'bg-red-50 border-red-200',
      willBeOnTime: false,
      arrivalTime: walkArrivalTime
    };
  }

  // High capacity or significant delay but will still make it
  if ((hasCapacity && capacity >= 80) || delay > 5) {
    if (willBeOnTimeByWalking && walkArrivalTime < busArrivalTime) {
      return {
        action: 'walk',
        message: hasCapacity && capacity >= 80
          ? `Bus is ${capacity}% full. Walking gets you to ${nextClass.buildingCode} ${busArrivalTime - walkArrivalTime} min earlier.`
          : `Bus is delayed ${delay} min. Walking gets you to ${nextClass.buildingCode} ${busArrivalTime - walkArrivalTime} min earlier.`,
        color: 'bg-yellow-50 border-yellow-200',
        willBeOnTime: true,
        arrivalTime: walkArrivalTime
      };
    }
    return {
      action: 'wait',
      message: hasCapacity && capacity >= 80
        ? `Bus is ${capacity}% full but gets you to ${nextClass.buildingCode} on time. Board quickly.`
        : `Bus is ${delay} min delayed but still gets you to ${nextClass.buildingCode} on time.`,
      color: 'bg-yellow-50 border-yellow-200',
      willBeOnTime: true,
      arrivalTime: busArrivalTime
    };
  }

  // Good to go - plenty of time
  const bufferTime = minutesUntilClass - busArrivalTime;
  return {
    action: 'wait',
    message: delay > 0
      ? `Bus is ${delay} min delayed but has space. You'll arrive ${bufferTime} min early to ${nextClass.buildingCode}.`
      : `Bus is on time with space. You'll arrive ${bufferTime} min early to ${nextClass.buildingCode}.`,
    color: 'bg-green-50 border-green-200',
    willBeOnTime: true,
    arrivalTime: busArrivalTime
  };
}

function getMainRecommendation(buses: BusRoute[], nextClass: Class | null, currentTime: Date): {
  title: string;
  message: string;
  color: string;
  icon: string;
} {
  if (buses.length === 0) {
    return {
      title: 'Route data loading',
      message: 'We are still syncing live routes. Check back in a moment or use the route cards below when they appear.',
      color: 'bg-blue-50 border-blue-200',
      icon: '🗺️'
    };
  }

  if (!nextClass) {
    return {
      title: 'Ready to go',
      message: 'All buses are available. Choose any route that suits your destination.',
      color: 'bg-blue-50 border-blue-200',
      icon: '🚌'
    };
  }

  // Get all recommendations
  const recommendations = buses.map(bus => ({
    bus,
    rec: getRecommendation(bus, nextClass, currentTime)
  }));

  // Calculate time until class
  const minutesUntilClass = Math.floor((nextClass.startTime.getTime() - currentTime.getTime()) / 60000);

  // Find buses that will get you there on time with available seats
  const goodOptions = recommendations.filter(r => 
    r.rec.willBeOnTime && (r.bus.capacity === null || r.bus.capacity < 95)
  );

  // Find the fastest option that gets you there on time
  const fastestOnTime = goodOptions.sort((a, b) => {
    const timeA = a.bus.eta + a.bus.destinationWalkTime;
    const timeB = b.bus.eta + b.bus.destinationWalkTime;
    return timeA - timeB;
  })[0];

  // Check if walking is better than all bus options
  const walkingOption = recommendations.find(r => 
    r.rec.action === 'walk-to-class' || r.rec.action === 'walk'
  );

  // All buses are too full
  if (recommendations.every(r => r.bus.capacity !== null && r.bus.capacity >= 95)) {
    if (walkingOption && walkingOption.rec.willBeOnTime) {
      return {
        title: 'Walk to class now',
        message: `All buses are at capacity. Walk to ${nextClass.buildingCode} (${walkingOption.bus.walkTime} min) to arrive on time.`,
        color: 'bg-red-50 border-red-200',
        icon: '🚶'
      };
    }
    return {
      title: 'Wait for next buses',
      message: `Current buses are at capacity. Wait ${Math.min(...buses.map(b => b.eta)) + 15} min for the next available bus.`,
      color: 'bg-yellow-50 border-yellow-200',
      icon: '⏰'
    };
  }

  // Will be late no matter what
  if (recommendations.every(r => !r.rec.willBeOnTime)) {
    const fastestOption = recommendations.sort((a, b) => a.rec.arrivalTime - b.rec.arrivalTime)[0];
    if (fastestOption.rec.action === 'walk-to-class' || fastestOption.rec.action === 'walk') {
      return {
        title: 'Walk immediately',
        message: `You'll be ${minutesUntilClass - fastestOption.rec.arrivalTime} min late. Walking is fastest (${fastestOption.bus.walkTime} min).`,
        color: 'bg-red-50 border-red-200',
        icon: '🚶'
      };
    }
    return {
      title: 'Take the soonest bus',
      message: `You'll be ${minutesUntilClass - fastestOption.rec.arrivalTime} min late. Board bus ${fastestOption.bus.routeNumber} (${fastestOption.bus.eta} min).`,
      color: 'bg-red-50 border-red-200',
      icon: '⚠️'
    };
  }

  // Good options available
  if (fastestOnTime) {
    const arrivalTime = fastestOnTime.bus.eta + fastestOnTime.bus.destinationWalkTime;
    const bufferTime = minutesUntilClass - arrivalTime;
    
    // Suggest walking if it's significantly faster and capacity is concerning
    if (walkingOption && walkingOption.rec.action === 'walk-to-class' && 
        ((fastestOnTime.bus.capacity !== null && fastestOnTime.bus.capacity >= 80) || fastestOnTime.bus.delay > 5)) {
      return {
        title: 'Consider walking',
        message: `Walking to ${nextClass.buildingCode} (${walkingOption.bus.walkTime} min) avoids delays and capacity issues.`,
        color: 'bg-yellow-50 border-yellow-200',
        icon: '🚶'
      };
    }

    // Recommend the best bus
    if (bufferTime > 10) {
      return {
        title: `Take bus ${fastestOnTime.bus.routeNumber}`,
        message: `Arrives in ${fastestOnTime.bus.eta} min. You'll get to ${nextClass.buildingCode} ${bufferTime} min early${fastestOnTime.bus.capacity === null ? '.' : ` with ${45 - Math.round(45 * fastestOnTime.bus.capacity / 100)} seats available.`}`,
        color: 'bg-green-50 border-green-200',
        icon: '✅'
      };
    } else {
      return {
        title: `Board bus ${fastestOnTime.bus.routeNumber} now`,
        message: `Arrives in ${fastestOnTime.bus.eta} min. Board quickly to reach ${nextClass.buildingCode} on time (${bufferTime} min buffer).`,
        color: 'bg-yellow-50 border-yellow-200',
        icon: '⏱️'
      };
    }
  }

  // Fallback
  return {
    title: 'Check all options below',
    message: `Review bus recommendations for ${nextClass.buildingCode}. Multiple routes available.`,
    color: 'bg-blue-50 border-blue-200',
    icon: '📋'
  };
}

function occupancyNoise(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return ((h % 11) + 11) % 11 - 5;
}

function getAiAnalysisMessage(capacity: number, busId: string): string {
  const tiers = [
    [
      "The bus interior is very quiet and nearly empty. Passengers can choose their preferred seat and enjoy a comfortable, relaxed ride.",
      "Almost no one on board — you'll have your pick of seats. A peaceful, uncrowded ride ahead.",
      "The bus is practically empty right now. Sit wherever you like and enjoy the extra space.",
      "Very low ridership at the moment. Expect a calm ride with plenty of room to settle in.",
    ],
    [
      "The bus interior is relatively quiet and spacious, with some open seating available for passengers to sit and relax.",
      "Light ridership — most seats are still open. A comfortable ride with room to spread out.",
      "The bus is lightly occupied. You should have no trouble finding a good seat.",
      "Plenty of open seats available. A relaxed ride with minimal crowding expected.",
    ],
    [
      "The bus has moderate occupancy. Most seats are taken, but there are still a few open spots to sit comfortably.",
      "About half full — you may need to look around, but seating is still available.",
      "Moderate ridership. Expect a typical ride — some seats open, others taken.",
      "The bus is filling up but not crowded yet. A few seats remain for those who board soon.",
    ],
    [
      "The bus is moderately busy. Seating is limited — you may need to look around for an open spot or share a row.",
      "Getting busier. Open seats are becoming sparse — grab one quickly when you board.",
      "Higher than average ridership. You'll likely find a seat, but it may take a moment.",
      "The bus is fairly well occupied. Some passengers may already be standing near the back.",
    ],
    [
      "The bus is quite full with limited seating remaining. Some passengers may need to stand.",
      "High ridership — expect standing room only in some areas. Move toward the back when boarding.",
      "The bus is crowded. Standing passengers are likely. Hold on and be patient.",
      "Near capacity. If you need a seat, board as quickly as possible — open spots are scarce.",
    ],
    [
      "The bus is at or near full capacity. Expect to stand and be prepared for a crowded ride.",
      "Fully packed. Standing room is limited. Consider the next bus if you're able to wait.",
      "Maximum capacity reached. It will be a tight squeeze — board only if necessary.",
      "The bus is extremely crowded. Comfort will be low and boarding difficult. The next bus may be a better option.",
    ],
  ];
  const tier = capacity <= 20 ? 0 : capacity <= 40 ? 1 : capacity <= 60 ? 2 : capacity <= 75 ? 3 : capacity <= 90 ? 4 : 5;
  const messages = tiers[tier];
  let h = 0;
  for (let i = 0; i < busId.length; i++) h = (Math.imul(31, h) + busId.charCodeAt(i)) | 0;
  return messages[((h >>> 0) % messages.length)];
}

function BusCard({ bus, nextClass, currentTime, onShowReminders }: {
  bus: BusRoute;
  nextClass: Class | null;
  currentTime: Date;
  onShowReminders: () => void;
}) {
  const [aiExpanded, setAiExpanded] = useState(false);
  const recommendation = getRecommendation(bus, nextClass, currentTime);

  const noise = useMemo(() => Math.round(Math.random() * 10 - 5), [bus.id]);
  const displayCapacity = bus.capacity !== null ? Math.max(0, Math.min(100, bus.capacity + noise)) : null;

  const hasCapacity = displayCapacity !== null;
  const totalSeats = 45;
  const remainingSeats = hasCapacity ? Math.round(totalSeats * (1 - displayCapacity / 100)) : null;

  // Calculate total arrival time
  const totalArrivalTime = bus.eta + bus.destinationWalkTime;

  const getCapacityColor = (capacity: number | null) => {
    if (capacity === null) return 'text-[var(--color-textMuted)]';
    if (capacity >= 95) return 'text-red-600';
    if (capacity >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getDelayColor = (delay: number) => {
    if (delay > 10) return 'text-red-600';
    if (delay > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-semibold text-[var(--color-textPrimary)]">{bus.routeNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${getDelayColor(bus.delay)} ${
              bus.delay > 10 ? 'bg-red-100' : bus.delay > 0 ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              {bus.delay > 0 ? `+${bus.delay} min` : 'On time'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-accent)] text-[var(--color-textSecondary)] font-medium">
              {totalArrivalTime} min total
            </span>
          </div>
          <p className="text-[var(--color-textMuted)] mt-1">{bus.routeName}</p>
        </div>
        <div className={`text-right px-3 py-2 rounded-xl ${
          displayCapacity === null ? 'bg-[var(--color-accent)]' : displayCapacity >= 95 ? 'bg-red-100' : displayCapacity >= 80 ? 'bg-yellow-100' : 'bg-green-100'
        }`}>
          <div className="flex items-center gap-1.5 justify-end">
            <Users className={`w-4 h-4 ${getCapacityColor(displayCapacity)}`} />
            <span className={`text-xl font-semibold ${getCapacityColor(displayCapacity)}`}>
              {displayCapacity === null ? '--' : `${displayCapacity}%`}
            </span>
          </div>
          <p className="text-xs text-[var(--color-textMuted)] mt-0.5">
            {displayCapacity === null ? 'capacity unknown' : 'capacity'}
          </p>
          <p className={`text-sm font-medium mt-1 ${getCapacityColor(displayCapacity)}`}>
            {remainingSeats === null ? 'live telemetry off' : `${remainingSeats} seats left`}
          </p>
        </div>
      </div>

      {/* Current Location */}
      <div className="flex items-start gap-3 mb-4 pb-4 border-b border-[var(--color-border)]">
        <MapPin className="w-5 h-5 text-[var(--color-secondary)] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-[var(--color-textMuted)]">Currently at</p>
          <p className="text-[var(--color-textPrimary)] font-medium">{bus.currentStop}</p>
          <div className="flex items-center gap-2 mt-2">
            <Navigation2 className="w-4 h-4 text-[var(--color-textMuted)]" />
            <p className="text-sm text-[var(--color-textMuted)]">Next: {bus.nextStop}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Clock className="w-4 h-4 text-[var(--color-textMuted)]" />
            <span className="text-2xl font-semibold text-[var(--color-textPrimary)]">{bus.eta}</span>
            <span className="text-sm text-[var(--color-textMuted)] mt-1">min</span>
          </div>
        </div>
      </div>

      {/* AI Analysis bubble — replaces the recommendation card */}
      <div className="flex justify-end">
        {aiExpanded ? (
          <div className="w-full rounded-xl bg-[var(--color-accent)] border border-[var(--color-border)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-[var(--color-textSecondary)] shrink-0 mt-0.5">✨</span>
                <p className="text-sm text-[var(--color-textMuted)]">
                  {displayCapacity !== null ? getAiAnalysisMessage(displayCapacity) : recommendation.message}
                </p>
              </div>
              <button
                onClick={() => setAiExpanded(false)}
                className="shrink-0 text-[var(--color-textMuted)] hover:text-[var(--color-textPrimary)] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAiExpanded(true)}
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-textSecondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <span>✨</span>
            AI Analysis
          </button>
        )}
      </div>

      {/* Boarding Reminders Button */}
      {bus.eta <= 5 && (
        <button
          onClick={onShowReminders}
          className="w-full mt-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span>🚌</span>
          <span>View Boarding Reminders</span>
        </button>
      )}
    </div>
  );
}

function RecentTripsSection({ trips }: { trips: Trip[] }) {
  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="font-semibold text-[var(--color-textPrimary)]">Recent Trips</h2>
        </div>
      </div>

      {recentTrips.length === 0 ? (
        <p className="text-sm text-[var(--color-textMuted)]">
          Your completed trips will appear here after you start using NextStop.
        </p>
      ) : (
        <div className="space-y-2">
          {recentTrips.map((trip) => (
            <div
              key={trip.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-accent)]/60 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-primary)]">
                  {trip.mode === 'bus' ? <Bus className="h-4 w-4" /> : <Footprints className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-textPrimary)]">
                    {trip.classCode || trip.className}
                  </p>
                  <p className="truncate text-xs text-[var(--color-textMuted)]">
                    {trip.mode === 'bus' && trip.busLine ? `Route ${trip.busLine}` : 'Walk'} · {formatClockTime(trip.actualArrivalTime) || 'Recent'}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                trip.wasOnTime ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {trip.wasOnTime ? 'On time' : 'Late'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const mainContentRef = useRef<HTMLElement | null>(null);
  const navigationCarouselRef = useRef<HTMLDivElement | null>(null);
  const navigationPanelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const routeOptionsRef = useRef<HTMLDivElement | null>(null);
  const routeOptionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navigationSnapTimeoutRef = useRef<number | null>(null);
  const lastRoutePlanAtRef = useRef(0);
  const lastRoutePlanKeyRef = useRef<string | null>(null);
  const forceNextRoutePlanRef = useRef(false);
  const routeLoadingWatchdogRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSection, setActiveSection] = useState<'welcome' | 'routes' | 'local-eats' | 'settings'>('welcome');

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('sessionToken'));

  // Color theme state
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [customTheme, setCustomTheme] = useState<ColorTheme | null>(null);

  // Trip tracking state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [showSemesterWrapped, setShowSemesterWrapped] = useState(false);
  const [showNightModePreview, setShowNightModePreview] = useState(false);

  // Boarding reminders state
  const [showBoardingReminders, setShowBoardingReminders] = useState(false);
  const [selectedBusForReminders, setSelectedBusForReminders] = useState<string | null>(null);
  const [boardingRemindersExpanded, setBoardingRemindersExpanded] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [allBuses, setAllBuses] = useState<BusRoute[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState({ lat: 37.8719, lng: -122.2585 });
  const [busStopPosition, setBusStopPosition] = useState({ lat: 37.8725, lng: -122.259 });
  const [destinationPosition, setDestinationPosition] = useState<Coordinates | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<Coordinates | null>(null);
  const [routePlanningLocation, setRoutePlanningLocation] = useState<Coordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [routeDestination, setRouteDestination] = useState<string | null>(null);
  const [routeVehicles, setRouteVehicles] = useState<RouteVehicle[]>([]);
  const [routeVehiclesByKey, setRouteVehiclesByKey] = useState<Record<string, RouteVehicle[]>>({});
  const [isInAppNavigating, setIsInAppNavigating] = useState(false);
  const [currentNavigationStep, setCurrentNavigationStep] = useState<NavigationStepType>('walk_to_boarding');
  const [routePlanRequestNonce, setRoutePlanRequestNonce] = useState(0);
  const [directWalkTimeMinutes, setDirectWalkTimeMinutes] = useState<number | null>(null);
  const [directWalkRoute, setDirectWalkRoute] = useState<ApiBusRoute['walk_to_stop'] | null>(null);
  const [walkingDirectionsDismissed, setWalkingDirectionsDismissed] = useState(false);
  const [expandedAnalysisBusIds, setExpandedAnalysisBusIds] = useState<Set<string>>(new Set());
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [serviceAlertTip, setServiceAlertTip] = useState<string | null>(null);
  const [homeScreenBuses, setHomeScreenBuses] = useState<BusRoute[]>([]);
  const [homeScreenDirectWalkMinutes, setHomeScreenDirectWalkMinutes] = useState<number | null>(null);
  const [homeRouteStatus, setHomeRouteStatus] = useState<HomeRouteStatus | null>(null);
  const [homeRouteBestBus, setHomeRouteBestBus] = useState<{ routeNumber: string; capacity: number | null; delay: number } | null>(null);
  const [homeRouteLoading, setHomeRouteLoading] = useState(false);

  // Smart notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return loadJsonValue('smartNotificationsEnabled', true); // Default to enabled
  });

  // Save notification preference
  useEffect(() => {
    localStorage.setItem('smartNotificationsEnabled', JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

  // Keep a stable ref so the tap handler always has fresh closures without re-registering.
  const notificationTapRef = useRef<(destination: string) => void>(() => {});
  notificationTapRef.current = (destination: string) => {
    forceNextRoutePlan();
    setRouteDestination(destination);
    setDestinationPosition(null);
    setSearchQuery(destination);
    setSearchResults([]);
    setSelectedBusId(null);
    setWalkingDirectionsDismissed(false);
    setActiveSection('routes');
  };

  useEffect(() => {
    setCommuteNotificationTapHandler((dest) => notificationTapRef.current(dest));
    requestNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDeviceLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        setDeviceLocation(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!deviceLocation) return;
    setUserPosition(deviceLocation);
    setRoutePlanningLocation((current) => {
      if (!current) return deviceLocation;
      const movedMeters = haversineDistanceM(
        current.lat,
        current.lng,
        deviceLocation.lat,
        deviceLocation.lng,
      );
      return movedMeters >= ROUTE_REPLAN_DISTANCE_METERS ? deviceLocation : current;
    });
  }, [deviceLocation]);

  // Check for existing session and theme on mount
  useEffect(() => {
    if (sessionToken) {
      fetchSession(sessionToken)
        .then((session) => {
          setIsAuthenticated(true);
          setUserEmail(session.email);
        })
        .catch(() => {
          setSessionToken(null);
          localStorage.removeItem('sessionToken');
        });
    }

    // Load custom theme if it exists
    const customThemeData = getCustomTheme();
    if (customThemeData) {
      setCustomTheme(customThemeData);
    }

    const savedTheme = localStorage.getItem('colorTheme') || 'default';
    setSelectedTheme(savedTheme);

    // Apply the appropriate theme
    if (savedTheme === 'custom' && customThemeData) {
      applyTheme(customThemeData);
    } else {
      applyTheme(getThemeById(savedTheme));
    }
  }, [sessionToken]);

  // Apply theme when it changes
  useEffect(() => {
    let theme;
    if (selectedTheme === 'custom' && customTheme) {
      theme = customTheme;
    } else {
      theme = getThemeById(selectedTheme);
    }
    applyTheme(theme);
    localStorage.setItem('colorTheme', selectedTheme);
  }, [selectedTheme, customTheme]);

  const handleCustomThemeUpdate = (theme: ColorTheme) => {
    setCustomTheme(theme);
    setSelectedTheme('custom');
  };

  const handleDeleteCustomTheme = () => {
    setCustomTheme(null);
    // Switch to default theme if custom was active
    if (selectedTheme === 'custom') {
      setSelectedTheme('default');
    }
    localStorage.removeItem('customTheme');
  };

  const handleLogin = (email: string, token: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setSessionToken(token);
    localStorage.setItem('sessionToken', token);
  };

  const handleLogout = async () => {
    // Call backend logout API
    if (sessionToken) {
      try {
        await logout(sessionToken);
      } catch (error) {
        console.error('Logout error:', error);
        // Continue with client-side logout even if API call fails
      }
    }
    
    setIsAuthenticated(false);
    setUserEmail(null);
    setSessionToken(null);
    localStorage.removeItem('sessionToken');
  };

  // Initialize trip tracking
  useEffect(() => {
    const loadedTrips = loadTrips();
    setTrips(loadedTrips);
  }, []);

  // Check if it's time to show daily summary (after 8pm or after last class)
  useEffect(() => {
    const checkDailySummary = () => {
      const hour = currentTime.getHours();
      const hasShownToday = localStorage.getItem('dailySummaryShown');
      const today = new Date().toDateString();
      
      // Show after 8pm and haven't shown today yet
      if (hour >= 20 && hasShownToday !== today) {
        const todaysTrips = getTodaysTrips();
        if (todaysTrips.length > 0) {
          setTimeout(() => setShowDailySummary(true), 2000); // Delay for smooth UX
          localStorage.setItem('dailySummaryShown', today);
        }
      }
    };

    checkDailySummary();
  }, [currentTime]);

  // Starred locations
  const [starredLocations, setStarredLocations] = useState<StarredLocation[]>([]);

  // Load starred locations from localStorage
  useEffect(() => {
    const storedLocations = loadJsonValue<Array<Partial<StarredLocation>>>('starredLocations', []);
    setStarredLocations(
      storedLocations.map((location, index) => ({
        id: location.id || `stored_${index}`,
        name: location.name || 'Saved place',
        address: location.address || location.name || 'Saved address',
        emoji: location.emoji || '📍',
        notes: location.notes,
        lat: typeof location.lat === 'number' ? location.lat : 37.8719,
        lng: typeof location.lng === 'number' ? location.lng : -122.2585,
      }))
    );
  }, []);

  // Save starred locations to localStorage
  const saveStarredLocations = (locations: StarredLocation[]) => {
    setStarredLocations(locations);
    localStorage.setItem('starredLocations', JSON.stringify(locations));
  };

  const addStarredLocation = (location: Omit<StarredLocation, 'id'>) => {
    const newLocation = {
      ...location,
      id: Date.now().toString()
    };
    saveStarredLocations([...starredLocations, newLocation]);
  };

  const removeStarredLocation = (id: string) => {
    saveStarredLocations(starredLocations.filter(loc => loc.id !== id));
  };

  const updateStarredLocation = (id: string, updates: Partial<StarredLocation>) => {
    saveStarredLocations(
      starredLocations.map(loc =>
        loc.id === id ? { ...loc, ...updates } : loc
      )
    );
  };

  // Home address and study spot (separate from starred places)
  const [homeAddress, setHomeAddressState] = useState<SpecialPlace | null>(() => {
    try { const r = localStorage.getItem('homeAddress'); return r ? JSON.parse(r) : null; } catch { return null; }
  });
  const [studySpot, setStudySpotState] = useState<SpecialPlace | null>(() => {
    try { const r = localStorage.getItem('studySpot'); return r ? JSON.parse(r) : null; } catch { return null; }
  });
  const setHomeAddress = (place: SpecialPlace | null) => {
    setHomeAddressState(place);
    if (place) localStorage.setItem('homeAddress', JSON.stringify(place));
    else localStorage.removeItem('homeAddress');
  };
  const setStudySpot = (place: SpecialPlace | null) => {
    setStudySpotState(place);
    if (place) localStorage.setItem('studySpot', JSON.stringify(place));
    else localStorage.removeItem('studySpot');
  };

  // Student's class schedule, loaded from imported calendar data.
  const [schedule, setSchedule] = useState<Class[]>([]);

  // Load emojis from localStorage
  useEffect(() => {
    const emojis = loadJsonValue<Record<string, string> | null>('classEmojis', null);
    if (emojis) {
      setSchedule(prev => prev.map(cls => ({
        ...cls,
        emoji: emojis[cls.id] || cls.emoji
      })));
    }
  }, []);

  // Update class emoji
  const updateClassEmoji = (classId: string, emoji: string) => {
    setSchedule(prev => {
      const updated = prev.map(cls =>
        cls.id === classId ? { ...cls, emoji } : cls
      );

      // Save to localStorage
      const emojis = updated.reduce((acc, cls) => ({
        ...acc,
        [cls.id]: cls.emoji
      }), {});
      localStorage.setItem('classEmojis', JSON.stringify(emojis));

      return updated;
    });
  };

  const updateClasses = (classIds: string[], updates: Partial<Class>) => {
    const idSet = new Set(classIds);
    setSchedule(prev => prev.map(cls => (
      idSet.has(cls.id)
        ? {
          ...cls,
          ...updates,
          buildingCode: updates.buildingCode || (updates.location ? inferBuildingCode(updates.location) : cls.buildingCode),
        }
        : cls
    )));
  };

  const saveClasses = (classIds: string[]) => {
    if (!sessionToken) return;
    const idSet = new Set(classIds);
    const current = schedule.find(cls => idSet.has(cls.id));
    if (!current) return;
    const externalIds = classIds.map(id => id.startsWith('calendar_') ? id.slice('calendar_'.length) : id);
    updateCalendarEvents([{
      external_ids: externalIds,
      title: current.code,
      location: current.location || '',
    }], sessionToken).catch(() => {});
  };

  const replaceClass = (groupIds: string[], data: { code: string; name: string; sections: Array<{ location: string; days: number[]; startTime: string; endTime: string }> }) => {
    const { code, name, sections } = data;
    const entries = buildSectionEntries(code, name, sections);
    if (entries.length === 0) return;
    const idSet = new Set(groupIds);
    const oldExternalIds = groupIds.map(id => id.startsWith('calendar_') ? id.slice('calendar_'.length) : id);
    setSchedule(prev =>
      [...prev.filter(cls => !idSet.has(cls.id)), ...entries]
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    );
    if (sessionToken) {
      deleteCalendarEvents(oldExternalIds, sessionToken).catch(() => {});
      saveManualCalendarEvents(entries.map(e => ({
        id: e.id, title: code, location: e.location,
        start_time: e.startTime.toISOString(), end_time: e.endTime.toISOString(),
        is_course: true, course_code: code,
      })), sessionToken, homeAddress).catch(() => {});
    }
  };

  const deleteClass = (groupIds: string[]) => {
    const idSet = new Set(groupIds);
    const externalIds = groupIds.map(id => id.startsWith('calendar_') ? id.slice('calendar_'.length) : id);
    setSchedule(prev => prev.filter(cls => !idSet.has(cls.id)));
    if (sessionToken) {
      deleteCalendarEvents(externalIds, sessionToken).catch(() => {});
    }
  };

  const saveMeetingTime = (meetingIds: string[], startHHMM: string, endHHMM: string) => {
    if (!sessionToken) return;
    const [startH, startM] = startHHMM.split(':').map(Number);
    const [endH, endM] = endHHMM.split(':').map(Number);
    const idSet = new Set(meetingIds);
    const backendUpdates = schedule
      .filter(cls => idSet.has(cls.id))
      .map(cls => {
        const newStart = new Date(cls.startTime);
        newStart.setHours(startH, startM, 0, 0);
        const newEnd = new Date(cls.startTime);
        newEnd.setHours(endH, endM, 0, 0);
        return {
          external_ids: [cls.id.startsWith('calendar_') ? cls.id.slice('calendar_'.length) : cls.id],
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        };
      });
    setSchedule(prev => prev.map(cls => {
      if (!idSet.has(cls.id)) return cls;
      const newStart = new Date(cls.startTime);
      newStart.setHours(startH, startM, 0, 0);
      const newEnd = new Date(cls.startTime);
      newEnd.setHours(endH, endM, 0, 0);
      return { ...cls, startTime: newStart, endTime: newEnd };
    }));
    if (backendUpdates.length > 0) {
      updateCalendarEvents(backendUpdates, sessionToken).catch(() => {});
    }
  };

  const inferBuildingCode = (location: string) => {
    const normalized = location.toLowerCase();
    if (normalized.includes('soda')) return 'Soda';
    if (normalized.includes('evans')) return 'Evans';
    if (normalized.includes('wheeler')) return 'Wheeler';
    if (normalized.includes('downtown')) return 'Downtown';
    return location.split(/\s+/)[0] || '';
  };

  const buildSectionEntries = (
    code: string, name: string,
    sections: Array<{ location: string; days: number[]; startTime: string; endTime: string }>
  ): Class[] => {
    const semesterEnd = new Date(2026, 4, 16);
    const entries: Class[] = [];
    for (const { location, days, startTime: startStr, endTime: endStr } of sections) {
      const [startHour, startMin] = startStr.split(':').map(Number);
      const [endHour, endMin] = endStr.split(':').map(Number);
      const daySet = new Set(days);
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      while (cursor <= semesterEnd) {
        if (daySet.has(cursor.getDay())) {
          const startTime = new Date(cursor);
          startTime.setHours(startHour, startMin, 0, 0);
          const endTime = new Date(cursor);
          endTime.setHours(endHour, endMin, 0, 0);
          const dateKey = cursor.toISOString().slice(0, 10);
          entries.push({
            id: `manual_${code.replace(/\s+/g, '_')}_${startHour}${String(startMin).padStart(2, '0')}_${dateKey}`,
            name: name || code,
            code,
            location,
            buildingCode: inferBuildingCode(location),
            startTime,
            endTime,
            emoji: '📚',
            isCourse: true,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return entries;
  };

  const applyScheduleCommutePreview = (previews: CalendarCommutePreview[] | null | undefined, classEntries: Class[]) => {
    const nextEntry = classEntries
      .filter((entry) => entry.startTime > new Date())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
    const preview = previews?.find((item) => (
      item.event_id === nextEntry?.id ||
      `calendar_${item.event_id}` === nextEntry?.id
    ));
    if (!preview) return;
    const cachedRoutes = previewOptionsToCachedRoutes(preview);
    const directWalkMinutes = preview.options.find((option) => option.type === 'walk')?.total_trip_time_minutes ?? null;
    setHomeScreenBuses(cachedRoutes);
    setHomeScreenDirectWalkMinutes(directWalkMinutes);
    setHomeRouteStatus(preview.source === 'schedule' ? 'schedule' : null);
    setHomeRouteBestBus(cachedRoutes[0] ? { routeNumber: cachedRoutes[0].routeNumber, capacity: null, delay: 0 } : null);
    saveHomeRouteCache({
      location: nextEntry.location,
      buses: cachedRoutes,
      directWalkMinutes,
      source: 'schedule',
      cachedAt: Date.now(),
    });

    if (previews?.length) {
      scheduleCommuteNotifications(previews, classEntries).catch(() => {});
    }
  };

  const addManualClass = ({ code, name, sections }: {
    code: string; name: string; sections: Array<{ location: string; days: number[]; startTime: string; endTime: string }>;
  }) => {
    const entries = buildSectionEntries(code, name, sections);
    if (entries.length === 0) return;
    setSchedule((prev: Class[]) => [...prev, ...entries].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    saveManualCalendarEvents(entries.map(e => ({
      id: e.id, title: code, location: e.location,
      start_time: e.startTime.toISOString(), end_time: e.endTime.toISOString(),
      is_course: true, course_code: code,
    })), sessionToken, homeAddress)
      .then((response) => applyScheduleCommutePreview(response.commute_previews, entries))
      .catch(() => {});
  };

  const extractCourseCode = (title: string) => {
    const normalized = title.toUpperCase();
    const compactTitle = normalized.replace(/[^A-Z0-9]/g, '');
    const knownCourse = ['ENGIN 183C', 'CDSS 170', 'DATA 145'].find((course) => compactTitle.includes(course.replace(/[^A-Z0-9]/g, '')));
    if (knownCourse) return knownCourse;
    const match = normalized.match(/\b([A-Z]{2,}(?:\s+[A-Z]{1,4})?)\s*[-:]?\s*([A-Z]?\d{1,4}[A-Z]?)\b/);
    return match ? `${match[1].replace(/\s+/g, ' ').trim()} ${match[2]}` : null;
  };

  const inferCourseCode = (title: string) => {
    return extractCourseCode(title) || title.slice(0, 12);
  };

  const isCourseEvent = (event: CalendarEvent) => {
    if (typeof event.is_course === 'boolean') return event.is_course;
    return Boolean(extractCourseCode(event.title));
  };

  const calendarEventsToClasses = (events: CalendarEvent[]) => events
    .map((event: CalendarEvent, index): Class => {
      const startTime = new Date(event.start_time);
      const endTime = event.end_time
        ? new Date(event.end_time)
        : new Date(startTime.getTime() + 60 * 60000);
      const location = event.location || '';

      return {
        id: `calendar_${event.id || index}`,
        name: event.title,
        code: event.course_code || inferCourseCode(event.title),
        location,
        buildingCode: inferBuildingCode(location),
        startTime,
        endTime,
        emoji: '📚',
        isCourse: isCourseEvent(event)
      };
    })
    .filter((cls) => !Number.isNaN(cls.startTime.getTime()))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const handleCalendarImport = async (file: File) => {
    const imported = await importCalendar(file, sessionToken, homeAddress);
    const importedClasses = calendarEventsToClasses(imported.events);
    if (importedClasses.length > 0) {
      setSchedule(importedClasses);
      applyScheduleCommutePreview(imported.commute_previews, importedClasses);
    }

    return importedClasses.length;
  };

  useEffect(() => {
    if (!sessionToken) return;
    fetchCalendarEvents(sessionToken)
      .then((calendar) => setSchedule(calendarEventsToClasses(calendar.events)))
      .catch(() => setSchedule([]));
  }, [sessionToken]);

  // Get next class
  const nextClass = schedule.find(cls => cls.startTime > currentTime) || null;
  const nextClassToday = schedule.find((cls) => cls.startTime > currentTime && isSameLocalDay(cls.startTime, currentTime)) || null;

  // Home widget: live route planning for today's next class, same logic as the routes tab.
  useEffect(() => {
    const location = nextClassToday?.location;
    if (!location || !routePlanningLocation) {
      setHomeScreenBuses([]);
      setHomeScreenDirectWalkMinutes(null);
      setHomeRouteStatus(null);
      setHomeRouteBestBus(null);
      setHomeRouteLoading(false);
      return;
    }

    let ignore = false;
    let timerId: number | undefined;
    const controller = new AbortController();

    async function fetchHomeRoute() {
      setHomeRouteLoading(true);
      try {
        const plan = await fetchPlanTrip(
          'Current location',
          location!,
          routePlanningLocation,
          null,
          controller.signal,
        );
        if (ignore) return;

        const normalized = plan.available_buses.map(normalizeApiBus);
        const directWalk = plan.direct_walk?.duration_minutes ?? null;
        const buses = normalized
          .filter((bus) => busReducesWalking(bus, directWalk))
          .sort((a, b) => (a.totalTripTimeMinutes - b.totalTripTimeMinutes) || (a.eta - b.eta));

        setHomeScreenBuses(buses);
        setHomeScreenDirectWalkMinutes(directWalk);
        setHomeRouteStatus(plan.source === 'live' ? 'live' : 'schedule');
        const best = buses[0] ?? null;
        setHomeRouteBestBus(best ? { routeNumber: best.routeNumber, capacity: best.capacity, delay: best.delay } : null);
        setHomeRouteLoading(false);

        // Schedule notification 5 min before leave_by
        if (best && nextClassToday) {
          const leaveBy = best.departureTime
            ? new Date(new Date(best.departureTime).getTime() - best.walkTime * 60 * 1000)
            : new Date(nextClassToday.startTime.getTime() - best.totalTripTimeMinutes * 60 * 1000);
          scheduleLeaveByNotification(leaveBy, nextClassToday.code, location!, best.routeNumber).catch(() => {});
        }

        timerId = window.setTimeout(fetchHomeRoute, ROUTE_OPTIONS_REFRESH_MS);
      } catch {
        if (ignore) return;
        setHomeRouteLoading(false);
        timerId = window.setTimeout(fetchHomeRoute, ROUTE_OPTIONS_REFRESH_MS);
      }
    }

    fetchHomeRoute();

    return () => {
      ignore = true;
      controller.abort();
      if (timerId) window.clearTimeout(timerId);
    };
  }, [nextClassToday?.id, nextClassToday?.location, routePlanningLocation]);

  useEffect(() => {
    const destination = routeDestination;
    if (!destination) {
      lastRoutePlanAtRef.current = 0;
      lastRoutePlanKeyRef.current = null;
      setRouteError(null);
      setAllBuses([]);
      setDirectWalkTimeMinutes(null);
      setDirectWalkRoute(null);
      setIsRouteLoading(false);
      return;
    }

    if (!routePlanningLocation) {
      setRouteError('Waiting for your current location to plan a route.');
      setAllBuses([]);
      setDirectWalkTimeMinutes(null);
      setDirectWalkRoute(null);
      setIsRouteLoading(false);
      return;
    }

    const currentRoutePlanKey = routePlanKey(destination, destinationPosition);
    const now = Date.now();
    const isSameRoutePlan = lastRoutePlanKeyRef.current === currentRoutePlanKey;
    const elapsedSinceLastPlan = now - lastRoutePlanAtRef.current;
    const shouldRefreshNow = forceNextRoutePlanRef.current || !isSameRoutePlan || elapsedSinceLastPlan >= ROUTE_OPTIONS_REFRESH_MS;
    forceNextRoutePlanRef.current = false;
    let ignore = false;
    let timeoutId: number | undefined;
    const routePlanController = new AbortController();

    async function syncTripPlan() {
      setIsRouteLoading(true);
      try {
        const plan = await fetchPlanTrip(
          'Current location',
          destination,
          routePlanningLocation,
          destinationPosition,
          routePlanController.signal,
        );
        if (ignore) return;

        const normalizedBuses = plan.available_buses.map(normalizeApiBus);
        const directWalkDuration = plan.direct_walk?.duration_minutes ?? null;
        const filteredBuses = normalizedBuses
          .filter((bus) => busReducesWalking(bus, directWalkDuration))
          .sort((a, b) => (
            (a.totalTripTimeMinutes - b.totalTripTimeMinutes) ||
            (a.eta - b.eta)
          ));
        setAllBuses(filteredBuses);
        setDirectWalkTimeMinutes(directWalkDuration);
        setDirectWalkRoute(plan.direct_walk ?? null);
        setSelectedBusId((current) => {
          if (current === WALK_ROUTE_OPTION_ID && directWalkDuration !== null) return current;
          if (current && filteredBuses.some((bus) => bus.id === current)) return current;
          return filteredBuses[0]?.id ?? (directWalkDuration !== null ? WALK_ROUTE_OPTION_ID : null);
        });
        lastRoutePlanAtRef.current = Date.now();
        lastRoutePlanKeyRef.current = routePlanKey(destination, plan.map_data.destination_marker);
        setRouteError(null);
        setBusStopPosition(plan.map_data.origin_stop_marker ?? plan.map_data.destination_marker);
        setDestinationPosition((current) =>
          sameCoordinates(current, plan.map_data.destination_marker) ? current : plan.map_data.destination_marker
        );
        setIsRouteLoading(false);
      } catch (error) {
        if (ignore) return;
        console.error('[Routes] Route plan failed', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        setRouteError(`Could not load live route data from ${API_BASE_URL}. ${message}`);
        setAllBuses([]);
        setDirectWalkTimeMinutes(null);
        setDirectWalkRoute(null);
        setIsRouteLoading(false);
      }
    }

    if (shouldRefreshNow) {
      syncTripPlan();
    } else {
      setIsRouteLoading(false);
      timeoutId = window.setTimeout(syncTripPlan, ROUTE_OPTIONS_REFRESH_MS - elapsedSinceLastPlan);
    }

    return () => {
      ignore = true;
      routePlanController.abort();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [destinationPosition, routeDestination, routePlanRequestNonce, routePlanningLocation]);

  useEffect(() => {
    if (routeLoadingWatchdogRef.current) {
      window.clearTimeout(routeLoadingWatchdogRef.current);
      routeLoadingWatchdogRef.current = null;
    }

    if (!isRouteLoading) return;

    const watchedDestination = routeDestination || 'selected destination';
    console.warn('[Routes] Route loading watchdog started', {
      destination: watchedDestination,
      timeoutMs: ROUTE_LOADING_WATCHDOG_MS,
      hasRoutePlanningLocation: Boolean(routePlanningLocation),
      hasDestinationPosition: Boolean(destinationPosition),
    });

    routeLoadingWatchdogRef.current = window.setTimeout(() => {
      console.error('[Routes] Route loading watchdog fired', {
        destination: watchedDestination,
        timeoutMs: ROUTE_LOADING_WATCHDOG_MS,
        hasRoutePlanningLocation: Boolean(routePlanningLocation),
        hasDestinationPosition: Boolean(destinationPosition),
      });
      setIsRouteLoading(false);
      setRouteError('Route loading timed out. Please try again.');
      routeLoadingWatchdogRef.current = null;
    }, ROUTE_LOADING_WATCHDOG_MS);

    return () => {
      if (routeLoadingWatchdogRef.current) {
        window.clearTimeout(routeLoadingWatchdogRef.current);
        routeLoadingWatchdogRef.current = null;
      }
    };
  }, [destinationPosition, isRouteLoading, routeDestination, routePlanningLocation]);

  const clearCurrentRoute = () => {
    if (routeLoadingWatchdogRef.current) {
      window.clearTimeout(routeLoadingWatchdogRef.current);
      routeLoadingWatchdogRef.current = null;
    }
    setRouteDestination(null);
    setDestinationPosition(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBusId(null);
    setDirectWalkRoute(null);
    setDirectWalkTimeMinutes(null);
    setWalkingDirectionsDismissed(true);
    setIsInAppNavigating(false);
    setIsRouteLoading(false);
  };

  const endNavigationAndClearRoute = () => {
    clearCurrentRoute();
    setCurrentNavigationStep('walk_to_boarding');
    setRouteVehicles([]);
  };

  const startStepByStepNavigation = (bus: BusRoute) => {
    setSelectedBusId(bus.id);
    setIsInAppNavigating(true);
  };

  const forceNextRoutePlan = () => {
    forceNextRoutePlanRef.current = true;
    lastRoutePlanAtRef.current = 0;
    setRoutePlanRequestNonce((value) => value + 1);
  };

  const openRoutesForNextClass = () => {
    if (nextClass?.location) {
      forceNextRoutePlan();
      setRouteDestination(nextClass.location);
      setDestinationPosition(null);
      setSearchQuery(nextClass.location);
      setSearchResults([]);
      setWalkingDirectionsDismissed(false);
    }
    setActiveSection('routes');
  };

  const openRoutesForStarredLocation = (location: StarredLocation) => {
    forceNextRoutePlan();
    setRouteDestination(location.name || location.address);
    setDestinationPosition({ lat: location.lat, lng: location.lng });
    setSearchQuery(location.name || location.address);
    setSearchResults([]);
    setSelectedBusId(null);
    setWalkingDirectionsDismissed(false);
    setIsInAppNavigating(false);
    setActiveSection('routes');
  };

  const navigateToSpecialPlace = (place: SpecialPlace) => {
    forceNextRoutePlan();
    setRouteDestination(place.name);
    setDestinationPosition({ lat: place.lat, lng: place.lng });
    setSearchQuery(place.name);
    setSearchResults([]);
    setSelectedBusId(null);
    setWalkingDirectionsDismissed(false);
    setIsInAppNavigating(false);
    setActiveSection('routes');
  };

  const isNearHome = homeAddress !== null && deviceLocation !== null &&
    haversineDistanceM(deviceLocation.lat, deviceLocation.lng, homeAddress.lat, homeAddress.lng) < NEAR_THRESHOLD_METERS;
  const isNearStudySpot = studySpot !== null && deviceLocation !== null &&
    haversineDistanceM(deviceLocation.lat, deviceLocation.lng, studySpot.lat, studySpot.lng) < NEAR_THRESHOLD_METERS;

  const getRelevantBuses = () => {
    return allBuses;
  };

  const buses = getRelevantBuses();
  const visibleBuses = useMemo<BusRoute[]>(() =>
    allBuses
      .filter((bus: BusRoute) => {
        if (!busReducesWalking(bus, directWalkTimeMinutes)) return false;
        // Drop buses going the wrong direction: the alighting stop must be closer
        // to the destination than the boarding stop is.
        if (destinationPosition && bus.apiBus?.alighting_stop) {
          const ref = bus.apiBus.boarding_stop ?? userPosition;
          const d = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
            (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;
          if (d(bus.apiBus.alighting_stop, destinationPosition) >= d(ref, destinationPosition)) return false;
        }
        return true;
      })
      .sort((a: BusRoute, b: BusRoute) => (
        (a.totalTripTimeMinutes - b.totalTripTimeMinutes) ||
        (a.eta - b.eta)
      )),
    [allBuses, directWalkTimeMinutes, destinationPosition],
  );
  const selectedBus = selectedBusId === WALK_ROUTE_OPTION_ID
    ? null
    : visibleBuses.find((bus) => bus.id === selectedBusId) || visibleBuses[0] || null;
  const routeStats = nextClass ? getMainRecommendation(buses, nextClass, currentTime) : null;
  const homeRouteMetrics = buildHomeRouteMetrics(nextClassToday, currentTime, homeScreenBuses, homeScreenDirectWalkMinutes);
  const navigationSteps = buildNavigationSteps(selectedBus, routeVehicles, currentTime);
  const currentNavigationStepIndex = Math.max(
    navigationSteps.findIndex((step) => step.id === currentNavigationStep),
    0,
  );
  const activeNavigationStepId = navigationSteps[currentNavigationStepIndex]?.id;

  useEffect(() => {
    const routeNames = [...new Set(visibleBuses.map((bus) => bus.routeNumber).filter(Boolean))];
    let cancelled = false;
    fetchServiceAlert(routeNames.slice(0, 3))
      .then((alert) => {
        if (cancelled) return;
        const affectedLines = alert?.routes?.length ? alert.routes : alert?.route ? [alert.route] : [];
        setServiceAlertTip(alert?.summary && affectedLines.length > 0 ? `AC Transit ${affectedLines.join(', ')}: ${alert.summary}` : null);
      })
      .catch(() => {
        if (!cancelled) setServiceAlertTip(null);
      });
    return () => {
      cancelled = true;
    };
  }, [visibleBuses]);

  const todayTips = [
    serviceAlertTip || 'AC Transit is not reporting a current service alert for your routes.',
    'Try Yali’s Cafe or Artis Coffee for a quick study break between classes.',
    'Save your most-used stops and classrooms in Starred Locations for faster route planning.',
  ];

  const handleMapNavigateRequest = async (destination: Coordinates, placeName?: string) => {
    setIsRouteLoading(true);
    setWalkingDirectionsDismissed(false);
    let label = placeName || 'Selected destination';
    if (!placeName) {
      try {
        const place = await fetchReverseLocation(destination);
        label = place.name || place.address || label;
      } catch {
        label = 'Selected destination';
      }
    }
    forceNextRoutePlan();
    setDestinationPosition(destination);
    setRouteDestination(label);
    setSearchQuery(label);
    setSearchResults([]);
    setSelectedBusId(null);
    setIsInAppNavigating(false);
    setActiveSection('routes');
  };

  useEffect(() => {
    if (!selectedBus?.routeNumber) {
      setRouteVehicles([]);
      return;
    }

    let cancelled = false;
    async function syncRouteVehicles() {
      try {
        const vehicles = await fetchRouteVehicles(
          selectedBus.apiBus?.route_short_name || selectedBus.routeNumber,
          typeof selectedBus.apiBus?.direction_id === 'number' ? selectedBus.apiBus.direction_id : undefined,
          selectedBus.apiBus?.boarding_stop?.stop_id || undefined,
        );
        if (cancelled) return;
        setRouteVehicles(vehicles);
      } catch {
        if (cancelled) return;
        setRouteVehicles([]);
      }
    }

    syncRouteVehicles();
    const interval = setInterval(syncRouteVehicles, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedBus?.apiBus?.boarding_stop?.stop_id, selectedBus?.apiBus?.direction_id, selectedBus?.apiBus?.route_short_name, selectedBus?.routeNumber]);

  useEffect(() => {
    if (visibleBuses.length === 0) {
      setRouteVehiclesByKey({});
      return;
    }

    let cancelled = false;
    async function syncAllRouteVehicles() {
      const uniqueBuses = [...new Map(visibleBuses.map((bus) => [vehicleCacheKey(bus), bus])).values()];
      const entries = await Promise.all(
        uniqueBuses.map(async (bus) => {
          const key = vehicleCacheKey(bus);
          try {
            const vehicles = await fetchRouteVehicles(
              bus.apiBus?.route_short_name || bus.routeNumber,
              typeof bus.apiBus?.direction_id === 'number' ? bus.apiBus.direction_id : undefined,
              bus.apiBus?.boarding_stop?.stop_id || undefined,
            );
            return [key, vehicles] as const;
          } catch {
            return [key, []] as const;
          }
        })
      );
      if (cancelled) return;
      setRouteVehiclesByKey(Object.fromEntries(entries));
    }

    syncAllRouteVehicles();
    const interval = window.setInterval(syncAllRouteVehicles, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [visibleBuses]);

  useEffect(() => {
    if (!isInAppNavigating) {
      setCurrentNavigationStep('walk_to_boarding');
      return;
    }
    setCurrentNavigationStep(determineNavigationStep(selectedBus, userPosition, destinationPosition, routeVehicles));
  }, [destinationPosition, isInAppNavigating, routeVehicles, selectedBus, userPosition]);

  useEffect(() => {
    if (visibleBuses.length === 0) {
      setSelectedBusId(directWalkTimeMinutes !== null ? WALK_ROUTE_OPTION_ID : null);
      return;
    }
    if (selectedBusId === WALK_ROUTE_OPTION_ID) return;
    if (!selectedBusId || !visibleBuses.some((bus) => bus.id === selectedBusId)) {
      setSelectedBusId(visibleBuses[0].id);
    }
  }, [directWalkTimeMinutes, selectedBusId, visibleBuses]);

  useEffect(() => {
    if (navigationSnapTimeoutRef.current) {
      window.clearTimeout(navigationSnapTimeoutRef.current);
      navigationSnapTimeoutRef.current = null;
    }
    if (!isInAppNavigating) return;
    if (!activeNavigationStepId) return;
    navigationSnapTimeoutRef.current = window.setTimeout(() => {
      const panel = navigationPanelRefs.current[activeNavigationStepId];
      panel?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      navigationSnapTimeoutRef.current = null;
    }, AUTO_SNAP_DELAY_MS);
    return () => {
      if (navigationSnapTimeoutRef.current) {
        window.clearTimeout(navigationSnapTimeoutRef.current);
        navigationSnapTimeoutRef.current = null;
      }
    };
  }, [activeNavigationStepId, isInAppNavigating]);

  useEffect(() => {
    if (!selectedBus) return;
    console.log('[Navigation Debug]', {
      current_navigation_step: currentNavigationStep,
      displayed_headsign: selectedBus.headsign ?? null,
      bus_arrival_times: routeVehicles.map((vehicle) => ({
        vehicle_id: vehicle.vehicle_id,
        arrival_minutes: vehicle.arrival_minutes ?? null,
        headsign: vehicle.headsign ?? null,
      })),
    });
  }, [currentNavigationStep, routeVehicles, selectedBus]);

  useEffect(() => {
    if (isInAppNavigating) return;
    const container = routeOptionsRef.current;
    const groupedOptions = groupedRouteOptions(visibleBuses);
    if (!container || groupedOptions.length === 0) return;

    let frame = 0;
    const syncSelectedBusFromScroll = () => {
      frame = 0;
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let nearestId: string | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      const walkCard = routeOptionRefs.current[WALK_ROUTE_OPTION_ID];
      if (walkCard) {
        const rect = walkCard.getBoundingClientRect();
        nearestId = WALK_ROUTE_OPTION_ID;
        nearestDistance = Math.abs((rect.left + rect.width / 2) - containerCenter);
      }

      groupedOptions.forEach(({ bus }) => {
        const card = routeOptionRefs.current[bus.id];
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const delta = Math.abs(cardCenter - containerCenter);
        if (delta < nearestDistance) {
          nearestDistance = delta;
          nearestId = bus.id;
        }
      });

      if (nearestId && nearestId !== selectedBusId) {
        setSelectedBusId(nearestId);
      }
    };

    const handleScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncSelectedBusFromScroll);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    syncSelectedBusFromScroll();
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isInAppNavigating, selectedBusId, visibleBuses]);

  const onTimeRate = trips.length > 0
    ? Math.round((trips.filter((trip) => trip.wasOnTime).length / trips.length) * 100)
    : 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchLocations(searchQuery, deviceLocation)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [deviceLocation, searchQuery]);

  // Render different sections based on active section
  const renderSection = () => {
    switch (activeSection) {
      case 'welcome':
        return (
          <WelcomeSection
            currentTime={currentTime}
            nextClass={nextClassToday}
            schedule={schedule}
            trips={trips}
            showDailySummaryPopup={showNightModePreview ? true : showDailySummary}
            onCloseDailySummary={() => {
              setShowDailySummary(false);
              setShowNightModePreview(false);
            }}
            onNavigateToRoutes={openRoutesForNextClass}
            onNavigateToCalendarImport={() => setActiveSection('settings')}
            routeAlert={nextClassToday && routeStats && !routeStats.message.toLowerCase().includes('early') && routeStats.color.includes('red') ? routeStats.message : null}
            homeRouteMetrics={homeRouteMetrics}
            homeRouteStatus={homeRouteStatus}
            homeRouteBestBus={homeRouteBestBus}
            homeRouteLoading={homeRouteLoading}
            todayTips={todayTips}
            starredContent={
              <>
                <StarredLocations
                  locations={starredLocations}
                  onAdd={addStarredLocation}
                  onRemove={removeStarredLocation}
                  onUpdate={updateStarredLocation}
                  onSelect={openRoutesForStarredLocation}
                  userLocation={deviceLocation}
                />
                <RecentTripsSection trips={trips} />
              </>
            }
            homeAddress={homeAddress}
            studySpot={studySpot}
            isNearHome={isNearHome}
            isNearStudySpot={isNearStudySpot}
            onNavigateToHome={() => homeAddress && navigateToSpecialPlace(homeAddress)}
            onNavigateToStudySpot={() => studySpot && navigateToSpecialPlace(studySpot)}
            onNavigateToSettings={() => setActiveSection('settings')}
          />
        );

      case 'routes':
        const groupedBuses = groupedRouteOptions(visibleBuses);
        const sortedBuses = groupedBuses.map((group) => group.bus);
        const showWalkTile = !isRouteLoading && !walkingDirectionsDismissed && directWalkTimeMinutes !== null;
        const isWalkingDirectionsActive = showWalkTile && selectedBusId === WALK_ROUTE_OPTION_ID && Boolean(directWalkRoute?.geometry);
        const sortedRouteTiles: RouteTile[] = [
          ...(showWalkTile ? [{
            kind: 'walk' as const,
            id: WALK_ROUTE_OPTION_ID,
            totalTripTimeMinutes: directWalkTimeMinutes ?? Number.POSITIVE_INFINITY,
          }] : []),
          ...groupedBuses.map(({ bus, alternates }) => ({
            kind: 'bus' as const,
            id: bus.id,
            totalTripTimeMinutes: bus.totalTripTimeMinutes,
            bus,
            alternates,
          })),
        ].sort((a, b) => a.totalTripTimeMinutes - b.totalTripTimeMinutes);

        return (
          <div className="fixed inset-0 z-0 bg-[#eef3f5]">
            <RouteErrorBoundary>
              <BusMap
                userPosition={userPosition}
                stopPosition={busStopPosition}
                destinationPosition={destinationPosition ?? undefined}
                destinationLabel={routeDestination ?? undefined}
                selectedBus={selectedBus?.apiBus ?? null}
                directWalkRoute={directWalkRoute}
                walkingDirectionsActive={isWalkingDirectionsActive}
                routeVehicles={routeVehicles}
                onMapNavigateRequest={handleMapNavigateRequest}
                navigationState={{ active: isInAppNavigating, currentStep: currentNavigationStep }}
              />
            </RouteErrorBoundary>

            <div className="safe-area-top-floating absolute left-4 right-4 z-20">
              <div className="relative">
                {routeDestination ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/95 px-4 py-3 shadow-lg">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]">
                      <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-textMuted)]">Destination</p>
                      <p className="truncate text-sm font-semibold text-[var(--color-textPrimary)]">{routeDestination}</p>
                    </div>
                    <button
                      onClick={endNavigationAndClearRoute}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[var(--color-textSecondary)] hover:bg-[var(--color-border)]"
                      aria-label="Clear selected destination"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--color-textMuted)]" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search a destination"
                      className="w-full rounded-2xl border border-[var(--color-border)] bg-white/95 py-3 pl-10 pr-4 text-sm shadow-lg outline-none"
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xl">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              setIsRouteLoading(true);
                              setWalkingDirectionsDismissed(false);
                              forceNextRoutePlan();
                              setRouteDestination(result.name || result.address || 'Selected destination');
                              setDestinationPosition({ lat: result.lat, lng: result.lng });
                              setSearchQuery(result.name || result.address || 'Selected destination');
                              setSearchResults([]);
                              setIsInAppNavigating(false);
                              setActiveSection('routes');
                            }}
                            className="block w-full border-b border-[var(--color-border)] px-4 py-3 text-left last:border-b-0"
                          >
                            <p className="text-sm font-semibold text-[var(--color-textPrimary)]">{result.name}</p>
                            {result.address && <p className="text-xs text-[var(--color-textMuted)]">{result.address}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {routeError && (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow">
                  {routeError}
                </div>
              )}
            </div>

            <div className="absolute bottom-20 left-0 right-0 z-20">
              {isInAppNavigating && selectedBus ? (
                <div className="pb-4">
                  {/* Boarding reminders: shown above the scroll row when expanded on wait_for_bus */}
                  {boardingRemindersExpanded && activeNavigationStepId === 'wait_for_bus' && (
                    <div className="mx-4 mb-2 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-textMuted)]">🚌 Boarding Reminders</p>
                        <button
                          onClick={() => setBoardingRemindersExpanded(false)}
                          className="rounded-lg p-1 text-[var(--color-textMuted)] hover:bg-[var(--color-accent)] transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {[
                          { icon: <CreditCard className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />, title: 'Have your Clipper card ready', description: 'Prepare your fare before boarding to speed up the process' },
                          { icon: <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />, title: 'Watch out for the bus', description: 'Stay away from the curb until the bus comes to a complete stop' },
                          { icon: <Users className="w-4 h-4 text-[var(--color-secondary)] shrink-0 mt-0.5" />, title: 'Let passengers exit first', description: 'Allow everyone to leave before boarding. Watch for wheelchairs' },
                          { icon: <Heart className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />, title: 'Offer seats to those who need them', description: 'Priority seating for seniors, pregnant individuals, and people with disabilities' },
                        ].map((reminder) => (
                          <div key={reminder.title} className="flex items-start gap-2.5">
                            {reminder.icon}
                            <div>
                              <p className="text-xs font-semibold text-[var(--color-textPrimary)]">{reminder.title}</p>
                              <p className="text-[11px] text-[var(--color-textMuted)] mt-0.5">{reminder.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div
                    ref={navigationCarouselRef}
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[calc((100vw-84vw)/2)] pb-3 [scroll-padding-inline:calc((100vw-84vw)/2)]"
                  >
                    {navigationSteps.map((step, index) => {
                      const isCurrent = index === currentNavigationStepIndex;
                      return (
                        <div
                          key={step.id}
                          ref={(node) => { navigationPanelRefs.current[step.id] = node; }}
                          className={`min-w-[84vw] max-w-[84vw] snap-center rounded-2xl border bg-white p-3 shadow-xl transition ${
                            isCurrent ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-textMuted)]">{step.stepType}</p>
                              <p className="mt-0.5 text-sm font-semibold leading-tight text-[var(--color-textPrimary)]">{step.title}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="rounded-xl bg-[var(--color-primary)] px-2.5 py-1.5 text-right text-white shadow-sm">
                                <p className="text-[11px] font-semibold leading-none">{step.topRightMetric}</p>
                                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-sky-100">{step.topRightLabel}</p>
                              </div>
                              {step.id === 'wait_for_bus' && !boardingRemindersExpanded && (
                                <button
                                  onClick={() => setBoardingRemindersExpanded(true)}
                                  className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-2.5 py-1 text-[10px] font-medium text-[var(--color-textSecondary)] shadow-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                                >
                                  <span>🚌</span>
                                  Boarding tips
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-[var(--color-textSecondary)]">{step.instruction}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {step.widgets.map((widget) => (
                              <span
                                key={`${step.id}-${widget.label}`}
                                className="rounded-full bg-[var(--color-accent)] px-2 py-1 font-medium text-[var(--color-textSecondary)]"
                              >
                                <span className="text-[var(--color-textMuted)]">{widget.label}:</span> {widget.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  ref={routeOptionsRef}
                  className="flex items-end snap-x snap-mandatory gap-3 overflow-x-auto px-[calc((100vw-84vw)/2)] pb-4 [scroll-padding-inline:calc((100vw-84vw)/2)]"
                >
                  {isRouteLoading ? (
                  <div className="min-w-[84vw] max-w-[84vw] snap-center rounded-3xl border border-sky-100 bg-white/95 p-5 shadow-xl">
                    <div className="flex h-full min-h-[220px] items-center justify-center">
                      <div className="text-center">
                        <span className="mx-auto block h-3 w-3 animate-pulse rounded-full bg-sky-500" />
                        <p className="mt-3 text-sm font-semibold text-sky-700">Loading route...</p>
                      </div>
                    </div>
                  </div>
                  ) : sortedRouteTiles.map((tile) => tile.kind === 'walk' ? (
                  <div
                    key={tile.id}
                    ref={(node) => {
                      routeOptionRefs.current[WALK_ROUTE_OPTION_ID] = node;
                    }}
                    onClick={() => setSelectedBusId(WALK_ROUTE_OPTION_ID)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedBusId(WALK_ROUTE_OPTION_ID);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="relative min-w-[84vw] max-w-[84vw] snap-center self-end h-fit rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-white via-white to-slate-50 p-5 text-left shadow-xl transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                            <Footprints className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-[var(--color-textPrimary)]">Walk</p>
                            <p className="text-xs text-[var(--color-textMuted)]">Direct walking route</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {directWalkTimeMinutes} min total travel
                          </div>
                          <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                            Arrives {formatArrivalTimeFromNow(currentTime, directWalkTimeMinutes || 0) || 'Soon'}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-emerald-600 px-3 py-2 text-right text-white shadow-lg">
                        <p className="whitespace-nowrap text-xl font-bold">{formatArrivalTimeFromNow(currentTime, directWalkTimeMinutes || 0) || 'Soon'}</p>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-100">ETA</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-2xl bg-[var(--color-accent)] p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <Footprints className="h-4 w-4" />
                          <p className="whitespace-nowrap font-semibold">{directWalkTimeMinutes} min</p>
                        </div>
                        <p className="mt-1 text-[var(--color-textMuted)]">total walking time</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--color-accent)] p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sky-700">
                          <Clock className="h-4 w-4" />
                          <p className="font-semibold">{formatArrivalTimeFromNow(currentTime, directWalkTimeMinutes || 0) || 'Soon'}</p>
                        </div>
                        <p className="mt-1 text-[var(--color-textMuted)]">estimated arrival</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--color-accent)] p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-indigo-700">
                          <Navigation2 className="h-4 w-4" />
                          <p className="font-semibold">Walk now</p>
                        </div>
                        <p className="mt-1 text-[var(--color-textMuted)]">no bus needed</p>
                      </div>
                    </div>
                  </div>
                  ) : (() => {
                    const bus = tile.bus!;
                    const cachedRouteVehicles = routeVehiclesByKey[vehicleCacheKey(bus)] || [];
                    const rawOccupancy = occupancyForBus(
                      bus,
                      selectedBus?.id === bus.id && routeVehicles.length > 0 ? routeVehicles : cachedRouteVehicles,
                    );
                    const displayedOccupancy = rawOccupancy !== null && rawOccupancy !== undefined
                      ? Math.max(0, Math.min(100, rawOccupancy + occupancyNoise(bus.id)))
                      : rawOccupancy;
                    const capacityStatus = boardingLikelihood(displayedOccupancy);
                    const totalWalkingTime = bus.walkTime + bus.destinationWalkTime;
                    const estimatedArrivalLabel = formatArrivalTimeFromNow(currentTime, bus.totalTripTimeMinutes) || 'Soon';
                    return (
                  <div
                    key={bus.id}
                    ref={(node) => { routeOptionRefs.current[bus.id] = node; }}
                    className="flex min-w-[84vw] max-w-[84vw] snap-center flex-col"
                  >
                    {expandedAnalysisBusIds.has(bus.id) ? (
                      <div className="mb-2 flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-textMuted)] mb-1">✨ AI Analysis</p>
                          <p className="text-xs leading-relaxed text-[var(--color-textSecondary)]">
                            {displayedOccupancy !== null && displayedOccupancy !== undefined
                              ? getAiAnalysisMessage(displayedOccupancy, bus.id)
                              : 'No live occupancy data for this bus right now.'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedAnalysisBusIds(prev => { const next = new Set(prev); next.delete(bus.id); return next; }); }}
                          className="shrink-0 rounded-lg p-1 text-[var(--color-textMuted)] hover:bg-[var(--color-accent)]"
                          aria-label="Close AI analysis"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="mb-2 flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedAnalysisBusIds(prev => new Set([...prev, bus.id])); }}
                          className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white/95 px-3 py-1.5 text-[10px] font-medium text-[var(--color-textSecondary)] shadow backdrop-blur-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                        >
                          <span>✨</span>
                          AI Analysis
                        </button>
                      </div>
                    )}
                    <div
                      onClick={() => setSelectedBusId(bus.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedBusId(bus.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="relative rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-white via-white to-slate-50 p-5 text-left shadow-xl transition"
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="rounded-2xl bg-[var(--color-primary)]/12 p-2 text-[var(--color-primary)]">
                            <Bus className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-[var(--color-textPrimary)]">{bus.routeNumber}</p>
                            <p className="text-xs text-[var(--color-textMuted)]">{bus.headsign || bus.routeName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[var(--color-primary)] px-3 py-2 text-right text-white shadow-lg">
                        <p className="whitespace-nowrap text-xl font-bold">{estimatedArrivalLabel}</p>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-sky-100">ETA</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-2xl bg-[var(--color-accent)] p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sky-700">
                          <Footprints className="h-4 w-4" />
                          <p className="whitespace-nowrap font-semibold">{totalWalkingTime} min</p>
                        </div>
                        <p className="mt-1 text-[var(--color-textMuted)]">total walking time</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--color-accent)] p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-indigo-700">
                          <Bus className="h-4 w-4" />
                          <p className="whitespace-nowrap font-semibold">{bus.rideTimeMinutes} min</p>
                        </div>
                        <p className="mt-1 text-[var(--color-textMuted)]">total bus ride time</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--color-accent)] p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <Clock className="h-4 w-4" />
                          <p className="font-semibold">{formatClockTime(bus.departureTime) || 'Soon'}</p>
                        </div>
                        <p className="mt-1 text-[var(--color-textMuted)]">bus departure time</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className={`h-5 w-5 ${
                            displayedOccupancy === null || displayedOccupancy === undefined
                              ? 'text-[var(--color-textMuted)]'
                              : displayedOccupancy >= 85
                                ? 'text-red-600'
                                : displayedOccupancy >= 60
                                  ? 'text-amber-600'
                                  : 'text-green-600'
                          }`} />
                          <div>
                            <p className={`text-3xl font-extrabold leading-none ${
                          displayedOccupancy === null || displayedOccupancy === undefined
                            ? 'text-[var(--color-textMuted)]'
                            : displayedOccupancy >= 85
                              ? 'text-red-600'
                              : displayedOccupancy >= 60
                                ? 'text-amber-600'
                                : 'text-green-600'
                            }`}>
                          {displayedOccupancy === null || displayedOccupancy === undefined ? '--' : `${displayedOccupancy}%`}
                            </p>
                            <p className="text-xs font-medium text-[var(--color-textMuted)]">% capacity</p>
                          </div>
                        </div>
                        <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${capacityStatus.tone}`}>
                          {capacityStatus.label}
                        </div>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedBusId(bus.id);
                          startStepByStepNavigation(bus);
                        }}
                        className="rounded-2xl bg-[var(--color-primary)] px-6 py-4 text-right text-2xl font-bold text-white shadow-lg hover:opacity-90"
                      >
                        Go
                      </button>
                    </div>
                    </div>
                  </div>
                    );
                  })())}
                </div>
              )}
            </div>
          </div>
        );

      case 'local-eats':
        return (
          <LocalEatsSection
            streakCount={calculateStreak()}
            onTimeRate={onTimeRate}
          />
        );

      case 'settings':
        return (
          <SettingsSection
            schedule={schedule}
            onEmojiChange={updateClassEmoji}
            onClassUpdate={updateClasses}
            onSaveClasses={saveClasses}
            onReplaceClass={replaceClass}
            onDeleteClass={deleteClass}
            onOpenSemesterWrapped={() => setShowSemesterWrapped(true)}
            userEmail={userEmail}
            onLogout={handleLogout}
            currentTheme={selectedTheme}
            onThemeChange={setSelectedTheme}
            customTheme={customTheme}
            onCustomThemeUpdate={handleCustomThemeUpdate}
            onDeleteCustomTheme={handleDeleteCustomTheme}
            smartNotificationsEnabled={notificationsEnabled}
            onToggleSmartNotifications={setNotificationsEnabled}
            onImportCalendar={handleCalendarImport}
            onAddClass={addManualClass}
            onSaveMeetingTime={saveMeetingTime}
            homeAddress={homeAddress}
            studySpot={studySpot}
            onSetHomeAddress={setHomeAddress}
            onSetStudySpot={setStudySpot}
            onSearchLocations={(q) => searchLocations(q, deviceLocation)}
            deviceLocation={deviceLocation}
            nextClassForAlerts={nextClass}
            busesForAlerts={buses}
            currentTime={currentTime}
            onTestNotification={nextClassToday ? () => {
              const classCode = nextClassToday.code;
              const leaveBy = homeRouteMetrics?.leaveByValue ?? '—';
              import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
                LocalNotifications.schedule({
                  notifications: [{
                    id: 99999,
                    title: `Get ready to head to ${classCode}`,
                    body: `Leave by ${leaveBy} to catch the bus`,
                    schedule: { at: new Date(Date.now() + 5000) },
                    extra: { type: 'test' },
                  }],
                });
              });
            } : undefined}
          />
        );

      default:
        return null;
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Compact Mobile Header */}
      <header className={`safe-area-top bg-white border-b border-[var(--color-border)] sticky top-0 z-20 flex-shrink-0 ${activeSection === 'routes' ? 'hidden' : ''}`}>
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={nextStopLogo}
                alt="NextStop"
                className="h-10 w-auto shrink-0"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="px-2 py-1 bg-[var(--color-accent)] rounded-full flex items-center gap-1">
                <span>🔥</span>
                <span className="text-xs font-semibold text-[var(--color-primary)]">{calculateStreak()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable with bottom padding for nav */}
      <main ref={mainContentRef} className={`flex-1 ${activeSection === 'routes' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-20'}`}>
        <div className={activeSection === 'routes' ? 'h-full' : 'max-w-lg mx-auto px-4 py-4'}>
          {renderSection()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <Navigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        streakCount={calculateStreak()}
      />

      {/* Daily Summary Modal */}
      {showDailySummary && (
        <DailySummary
          trips={trips}
          onClose={() => setShowDailySummary(false)}
        />
      )}

      {/* Semester Wrapped Modal */}
      {showSemesterWrapped && (
        <SemesterWrapped
          trips={trips}
          semesterStart={new Date(new Date().getFullYear(), 7, 20)} // Aug 20
          semesterEnd={new Date(new Date().getFullYear(), 11, 15)} // Dec 15
          onClose={() => setShowSemesterWrapped(false)}
        />
      )}

      {/* Boarding Reminders Modal */}
      {showBoardingReminders && selectedBusForReminders && (
        <BoardingReminders
          busNumber={selectedBusForReminders}
          onClose={() => {
            setShowBoardingReminders(false);
            setSelectedBusForReminders(null);
          }}
        />
      )}
    </div>
  );
}
