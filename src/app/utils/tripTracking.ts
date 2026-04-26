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

type StoredTrip = Omit<Trip, 'date' | 'scheduledTime' | 'actualArrivalTime'> & {
  date: string;
  scheduledTime: string;
  actualArrivalTime: string;
};

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
export function calculateStreak(): number {
  const trips = loadTrips();
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
