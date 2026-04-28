import { Trophy, TrendingUp, Leaf, Footprints, MapPin, Award, Calendar, Users, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Trip {
  id: string;
  date: Date;
  classCode: string;
  className: string;
  scheduledTime: Date;
  actualArrivalTime: Date;
  wasOnTime: boolean;
  mode: 'bus' | 'walk';
  busLine?: string;
  distance: number;
  steps?: number;
  caloriesBurned?: number;
}

interface SemesterWrappedProps {
  trips: Trip[];
  semesterStart: Date;
  semesterEnd: Date;
  onClose: () => void;
}

export function SemesterWrapped({ trips, semesterStart, semesterEnd, onClose }: SemesterWrappedProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  // Calculate stats
  const totalTrips = trips.length;
  const onTimeTrips = trips.filter(t => t.wasOnTime).length;
  const onTimeRate = totalTrips > 0 ? Math.round((onTimeTrips / totalTrips) * 100) : 0;

  const busTrips = trips.filter(t => t.mode === 'bus');
  const walkTrips = trips.filter(t => t.mode === 'walk');

  const totalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalSteps = trips.reduce((sum, trip) => sum + (trip.steps || 0), 0);
  const totalCalories = trips.reduce((sum, trip) => sum + (trip.caloriesBurned || 0), 0);

  // CO2 saved vs driving (car: 404g/mile, transit: 105g/mile)
  const co2SavedGrams = Math.round((totalDistance * 0.621371) * (404 - 105));
  const co2SavedKg = (co2SavedGrams / 1000).toFixed(1);

  // Most used bus line
  const busLineCount: Record<string, number> = {};
  busTrips.forEach(trip => {
    if (trip.busLine) {
      busLineCount[trip.busLine] = (busLineCount[trip.busLine] || 0) + 1;
    }
  });
  const mostUsedBusLine = Object.entries(busLineCount).sort((a, b) => b[1] - a[1])[0];

  // Best streak
  let currentStreak = 0;
  let bestStreak = 0;
  const sortedTrips = [...trips].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  sortedTrips.forEach(trip => {
    if (trip.wasOnTime) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  const slides = [
    {
      title: "Your Semester Wrapped 🎓",
      content: (
        <div className="text-center py-8">
          <div className="text-6xl mb-6">🎉</div>
          <h3 className="text-2xl font-bold text-[var(--color-textPrimary)] mb-3">
            What a Journey!
          </h3>
          <p className="text-[var(--color-textMuted)]">
            Let's celebrate your commute achievements this semester
          </p>
          <div className="mt-8 p-4 bg-[var(--color-background)] rounded-2xl">
            <p className="text-sm text-[var(--color-textMuted)] mb-1">Semester Period</p>
            <p className="font-semibold text-[var(--color-textPrimary)]">
              {semesterStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {semesterEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Total Trips 🚌",
      content: (
        <div className="text-center py-8">
          <div className="text-8xl font-bold bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent mb-4">
            {totalTrips}
          </div>
          <h3 className="text-xl font-bold text-[var(--color-textPrimary)] mb-3">
            Trips to Class
          </h3>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-[var(--color-infoSurface)] rounded-xl p-3 border border-[var(--color-infoBorder)]">
              <p className="text-2xl font-bold text-[var(--color-info)]">🚌 {busTrips.length}</p>
              <p className="text-xs text-[var(--color-info)] mt-1">Bus Rides</p>
            </div>
            <div className="bg-[var(--color-successSurface)] rounded-xl p-3 border border-[var(--color-successBorder)]">
              <p className="text-2xl font-bold text-[var(--color-success)]">🚶 {walkTrips.length}</p>
              <p className="text-xs text-[var(--color-success)] mt-1">Walks</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "On-Time Performance ⏰",
      content: (
        <div className="text-center py-8">
          <div className="text-8xl font-bold text-[var(--color-success)] mb-4">
            {onTimeRate}%
          </div>
          <h3 className="text-xl font-bold text-[var(--color-textPrimary)] mb-3">
            Made it on time
          </h3>
          <p className="text-[var(--color-textMuted)] mb-6">
            {onTimeTrips} out of {totalTrips} trips
          </p>
          {bestStreak > 0 && (
            <div className="bg-[var(--color-warningSurface)] rounded-xl p-4 border-2 border-[var(--color-warningBorder)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-[var(--color-warning)]" />
                <p className="text-sm font-semibold text-[var(--color-warning)]">Best Streak</p>
              </div>
              <p className="text-3xl font-bold text-[var(--color-warning)]">{bestStreak} days 🔥</p>
            </div>
          )}
        </div>
      )
    },
    {
      title: "Environmental Impact 🌍",
      content: (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-xl font-bold text-[var(--color-textPrimary)] mb-6">
            You saved the planet!
          </h3>
          <div className="bg-[var(--color-successSurface)] rounded-2xl p-6 border-2 border-[var(--color-successBorder)] mb-4">
            <Leaf className="w-8 h-8 text-[var(--color-success)] mx-auto mb-3" />
            <p className="text-5xl font-bold text-[var(--color-success)] mb-2">{co2SavedKg} kg</p>
            <p className="text-sm text-[var(--color-success)] font-medium">CO₂ emissions avoided</p>
            <p className="text-xs text-[var(--color-success)] mt-2">vs. driving alone</p>
          </div>
          <p className="text-sm text-[var(--color-textMuted)]">
            That's equivalent to planting {Math.round(parseFloat(co2SavedKg) / 21)} trees! 🌳
          </p>
        </div>
      )
    },
    {
      title: "Fitness Stats 💪",
      content: (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏃‍♂️</div>
          <h3 className="text-xl font-bold text-[var(--color-textPrimary)] mb-6">
            You stayed active!
          </h3>
          <div className="space-y-3">
            <div className="bg-[var(--color-infoSurface)] rounded-xl p-4 border border-[var(--color-infoBorder)]">
              <Footprints className="w-6 h-6 text-[var(--color-info)] mx-auto mb-2" />
              <p className="text-4xl font-bold text-[var(--color-info)]">{totalSteps.toLocaleString()}</p>
              <p className="text-sm text-[var(--color-info)] mt-1">Total Steps</p>
            </div>
            <div className="bg-[var(--color-warningSurface)] rounded-xl p-4 border border-[var(--color-warningBorder)]">
              <TrendingUp className="w-6 h-6 text-[var(--color-warning)] mx-auto mb-2" />
              <p className="text-4xl font-bold text-[var(--color-warning)]">{totalCalories.toLocaleString()}</p>
              <p className="text-sm text-[var(--color-warning)] mt-1">Calories Burned</p>
            </div>
            <div className="bg-[var(--color-accent)] rounded-xl p-4 border border-[var(--color-border)]">
              <MapPin className="w-6 h-6 text-[var(--color-primary)] mx-auto mb-2" />
              <p className="text-4xl font-bold text-[var(--color-primary)]">{totalDistance.toFixed(1)} km</p>
              <p className="text-sm text-[var(--color-primary)] mt-1">Distance Traveled</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Favorite Bus Line 🚌",
      content: (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-bold text-[var(--color-textPrimary)] mb-3">
            Honorable Mention
          </h3>
          {mostUsedBusLine ? (
            <>
              <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-2xl p-8 mb-4 text-white">
                <p className="text-sm opacity-90 mb-2">Most Common Bus Line</p>
                <p className="text-7xl font-bold mb-3">{mostUsedBusLine[0]}</p>
                <p className="text-lg">{mostUsedBusLine[1]} rides this semester</p>
              </div>
              <p className="text-sm text-[var(--color-textMuted)]">
                This bus got you to class more than any other! 🙌
              </p>
            </>
          ) : (
            <div className="bg-[var(--color-background)] rounded-2xl p-8">
              <p className="text-[var(--color-textMuted)]">You walked everywhere! 🚶‍♀️</p>
            </div>
          )}
        </div>
      )
    },
    {
      title: "Keep It Up! 🌟",
      content: (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-2xl font-bold text-[var(--color-textPrimary)] mb-3">
            You're Amazing!
          </h3>
          <p className="text-[var(--color-textMuted)] mb-6">
            Every trip you took helped reduce traffic, save the environment, and keep you healthy.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--color-accent)] rounded-xl p-3 border border-[var(--color-border)]">
              <Award className="w-6 h-6 text-[var(--color-primary)] mx-auto mb-2" />
              <p className="text-xs text-[var(--color-primary)] font-medium">Eco Warrior</p>
            </div>
            <div className="bg-[var(--color-infoSurface)] rounded-xl p-3 border border-[var(--color-infoBorder)]">
              <Calendar className="w-6 h-6 text-[var(--color-info)] mx-auto mb-2" />
              <p className="text-xs text-[var(--color-info)] font-medium">Punctual Pro</p>
            </div>
            <div className="bg-[var(--color-successSurface)] rounded-xl p-3 border border-[var(--color-successBorder)]">
              <Sparkles className="w-6 h-6 text-[var(--color-success)] mx-auto mb-2" />
              <p className="text-xs text-[var(--color-success)] font-medium">Campus Explorer</p>
            </div>
            <div className="bg-[var(--color-warningSurface)] rounded-xl p-3 border border-[var(--color-warningBorder)]">
              <Users className="w-6 h-6 text-[var(--color-warning)] mx-auto mb-2" />
              <p className="text-xs text-[var(--color-warning)] font-medium">Transit Champion</p>
            </div>
          </div>
          <p className="text-sm text-[var(--color-textMuted)] mt-6">
            Ready for next semester? 🚀
          </p>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-md transition-all duration-500 ${
          show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 pt-6 px-6">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] w-8'
                  : 'bg-[var(--color-border)] w-1.5'
              }`}
            />
          ))}
        </div>

        {/* Slide Content */}
        <div className="p-6 min-h-[500px]">
          <div className="transition-opacity duration-300">
            {slides[currentSlide].content}
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 bg-[var(--color-background)] border-t border-[var(--color-border)] rounded-b-3xl">
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <button
                onClick={prevSlide}
                className="flex-1 bg-white border-2 border-[var(--color-border)] text-[var(--color-textSecondary)] font-semibold py-3 rounded-xl hover:bg-[var(--color-background)] transition-colors"
              >
                Back
              </button>
            )}
            {currentSlide < slides.length - 1 ? (
              <button
                onClick={nextSlide}
                className="flex-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Done 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
