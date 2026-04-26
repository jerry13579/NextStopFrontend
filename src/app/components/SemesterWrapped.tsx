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
          <h3 className="text-2xl font-bold text-[#4a4a4a] mb-3">
            What a Journey!
          </h3>
          <p className="text-[#8b8680]">
            Let's celebrate your commute achievements this semester
          </p>
          <div className="mt-8 p-4 bg-[#faf8f6] rounded-2xl">
            <p className="text-sm text-[#8b8680] mb-1">Semester Period</p>
            <p className="font-semibold text-[#4a4a4a]">
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
          <div className="text-8xl font-bold bg-gradient-to-br from-[#d4a5a5] to-[#b8c5d6] bg-clip-text text-transparent mb-4">
            {totalTrips}
          </div>
          <h3 className="text-xl font-bold text-[#4a4a4a] mb-3">
            Trips to Class
          </h3>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-2xl font-bold text-blue-600">🚌 {busTrips.length}</p>
              <p className="text-xs text-blue-700 mt-1">Bus Rides</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-200">
              <p className="text-2xl font-bold text-green-600">🚶 {walkTrips.length}</p>
              <p className="text-xs text-green-700 mt-1">Walks</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "On-Time Performance ⏰",
      content: (
        <div className="text-center py-8">
          <div className="text-8xl font-bold bg-gradient-to-br from-green-500 to-green-700 bg-clip-text text-transparent mb-4">
            {onTimeRate}%
          </div>
          <h3 className="text-xl font-bold text-[#4a4a4a] mb-3">
            Made it on time
          </h3>
          <p className="text-[#8b8680] mb-6">
            {onTimeTrips} out of {totalTrips} trips
          </p>
          {bestStreak > 0 && (
            <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <p className="text-sm font-semibold text-yellow-700">Best Streak</p>
              </div>
              <p className="text-3xl font-bold text-yellow-700">{bestStreak} days 🔥</p>
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
          <h3 className="text-xl font-bold text-[#4a4a4a] mb-6">
            You saved the planet!
          </h3>
          <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200 mb-4">
            <Leaf className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <p className="text-5xl font-bold text-green-600 mb-2">{co2SavedKg} kg</p>
            <p className="text-sm text-green-700 font-medium">CO₂ emissions avoided</p>
            <p className="text-xs text-green-600 mt-2">vs. driving alone</p>
          </div>
          <p className="text-sm text-[#8b8680]">
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
          <h3 className="text-xl font-bold text-[#4a4a4a] mb-6">
            You stayed active!
          </h3>
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <Footprints className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-4xl font-bold text-blue-600">{totalSteps.toLocaleString()}</p>
              <p className="text-sm text-blue-700 mt-1">Total Steps</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-4xl font-bold text-orange-600">{totalCalories.toLocaleString()}</p>
              <p className="text-sm text-orange-700 mt-1">Calories Burned</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <MapPin className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-4xl font-bold text-purple-600">{totalDistance.toFixed(1)} km</p>
              <p className="text-sm text-purple-700 mt-1">Distance Traveled</p>
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
          <h3 className="text-xl font-bold text-[#4a4a4a] mb-3">
            Honorable Mention
          </h3>
          {mostUsedBusLine ? (
            <>
              <div className="bg-gradient-to-br from-[#d4a5a5] to-[#b8c5d6] rounded-2xl p-8 mb-4 text-white">
                <p className="text-sm opacity-90 mb-2">Most Common Bus Line</p>
                <p className="text-7xl font-bold mb-3">{mostUsedBusLine[0]}</p>
                <p className="text-lg">{mostUsedBusLine[1]} rides this semester</p>
              </div>
              <p className="text-sm text-[#8b8680]">
                This bus got you to class more than any other! 🙌
              </p>
            </>
          ) : (
            <div className="bg-[#faf8f6] rounded-2xl p-8">
              <p className="text-[#8b8680]">You walked everywhere! 🚶‍♀️</p>
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
          <h3 className="text-2xl font-bold text-[#4a4a4a] mb-3">
            You're Amazing!
          </h3>
          <p className="text-[#8b8680] mb-6">
            Every trip you took helped reduce traffic, save the environment, and keep you healthy.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-pink-50 rounded-xl p-3 border border-pink-200">
              <Award className="w-6 h-6 text-pink-600 mx-auto mb-2" />
              <p className="text-xs text-pink-700 font-medium">Eco Warrior</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-blue-700 font-medium">Punctual Pro</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-200">
              <Sparkles className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-green-700 font-medium">Campus Explorer</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
              <Users className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-xs text-yellow-700 font-medium">Transit Champion</p>
            </div>
          </div>
          <p className="text-sm text-[#8b8680] mt-6">
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
                  ? 'bg-gradient-to-r from-[#d4a5a5] to-[#b8c5d6] w-8' 
                  : 'bg-[#e3ddd5] w-1.5'
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
        <div className="p-6 bg-[#faf8f6] border-t border-[#e3ddd5] rounded-b-3xl">
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <button
                onClick={prevSlide}
                className="flex-1 bg-white border-2 border-[#e3ddd5] text-[#6a6a6a] font-semibold py-3 rounded-xl hover:bg-[#faf8f6] transition-colors"
              >
                Back
              </button>
            )}
            {currentSlide < slides.length - 1 ? (
              <button
                onClick={nextSlide}
                className="flex-1 bg-gradient-to-r from-[#d4a5a5] to-[#b8c5d6] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-[#d4a5a5] to-[#b8c5d6] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
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
