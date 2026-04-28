export interface Trip {
  id: string;
  date: Date;
  classCode: string;
  className: string;
  scheduledTime: Date;
  actualArrivalTime: Date;
  wasOnTime: boolean; // Berkeley time: 10 min grace period
  mode: 'bus' | 'walk';
  busLine?: string;
  distance: number; // km
  steps?: number;
  caloriesBurned?: number;
}

const STORAGE_KEY = 'campus_transit_trips';
const CACHE_WRITTEN_AT_KEY = 'campus_transit_trips_cached_at';

type StoredTrip = Omit<Trip, 'date' | 'scheduledTime' | 'actualArrivalTime'> & {
  date: string;
  scheduledTime: string;
  actualArrivalTime: string;
};

export interface RemoteTrip {
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

const LEGACY_GENERATED_CLASS_CODES = new Set(['CS 61B', 'MATH 1B', 'PSYCH 1']);

function isLegacyGeneratedTrip(trip: StoredTrip | Trip): boolean {
  return (
    trip.id.startsWith('mock_') ||
    LEGACY_GENERATED_CLASS_CODES.has(trip.classCode) ||
    ['Data Structures', 'Calculus II', 'Intro to Psychology'].includes(trip.className)
  );
}

// Load trips from localStorage
export function loadTrips(): Trip[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const trips = JSON.parse(stored) as StoredTrip[];
    if (!Array.isArray(trips)) return [];
    const realTrips = trips.filter((trip) => !isLegacyGeneratedTrip(trip));
    if (realTrips.length !== trips.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(realTrips));
    }

    return realTrips
      .map((trip) => ({
        ...trip,
        date: new Date(trip.date),
        scheduledTime: new Date(trip.scheduledTime),
        actualArrivalTime: new Date(trip.actualArrivalTime)
      }))
      .filter((trip) =>
        !Number.isNaN(trip.date.getTime()) &&
        !Number.isNaN(trip.scheduledTime.getTime()) &&
        !Number.isNaN(trip.actualArrivalTime.getTime())
      );
  } catch {
    return [];
  }
}

export function cacheTrips(trips: Trip[]) {
  const storedTrips: StoredTrip[] = trips.map((trip) => ({
    ...trip,
    date: trip.date.toISOString(),
    scheduledTime: trip.scheduledTime.toISOString(),
    actualArrivalTime: trip.actualArrivalTime.toISOString(),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedTrips));
  localStorage.setItem(CACHE_WRITTEN_AT_KEY, new Date().toISOString());
}

export function remoteTripToTrip(trip: RemoteTrip): Trip | null {
  const parsed: Trip = {
    id: trip.id,
    date: new Date(trip.date),
    classCode: trip.class_code,
    className: trip.class_name,
    scheduledTime: new Date(trip.scheduled_time),
    actualArrivalTime: new Date(trip.actual_arrival_time),
    wasOnTime: trip.was_on_time,
    mode: trip.mode,
    busLine: trip.bus_line || undefined,
    distance: trip.distance_km,
    steps: trip.steps ?? undefined,
    caloriesBurned: trip.calories_burned ?? undefined,
  };

  if (
    Number.isNaN(parsed.date.getTime()) ||
    Number.isNaN(parsed.scheduledTime.getTime()) ||
    Number.isNaN(parsed.actualArrivalTime.getTime())
  ) {
    return null;
  }

  return parsed;
}

export function upsertTrip(trips: Trip[], trip: Trip): Trip[] {
  const existingIndex = trips.findIndex((item) => item.id === trip.id);
  if (existingIndex < 0) {
    return [...trips, trip].sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  return trips.map((item, index) => index === existingIndex ? trip : item);
}

// Get trips for a specific date range
function getTripsInRange(startDate: Date, endDate: Date): Trip[] {
  const trips = loadTrips();
  return trips.filter(trip => {
    const tripDate = new Date(trip.date);
    return tripDate >= startDate && tripDate <= endDate;
  });
}

// Get today's trips
export function getTodaysTrips(): Trip[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getTripsInRange(today, tomorrow);
}

// Calculate current streak
export function calculateStreak(trips = loadTrips()): number {
  if (trips.length === 0) return 0;

  // Sort by date descending
  const sortedTrips = [...trips].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Group trips by day
  const tripsByDay = new Map<string, Trip[]>();
  sortedTrips.forEach(trip => {
    const dateKey = new Date(trip.date).toDateString();
    if (!tripsByDay.has(dateKey)) {
      tripsByDay.set(dateKey, []);
    }
    tripsByDay.get(dateKey)!.push(trip);
  });

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  while (true) {
    const dateKey = currentDate.toDateString();
    const dayTrips = tripsByDay.get(dateKey);

    if (!dayTrips || dayTrips.length === 0) {
      // No trips this day, but check if it's today (might not have classes yet)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (currentDate.getTime() === today.getTime()) {
        // Continue checking yesterday
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }
      break;
    }

    // Check if all trips this day were on time
    const allOnTime = dayTrips.every(trip => trip.wasOnTime);
    if (allOnTime && dayTrips.length > 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
