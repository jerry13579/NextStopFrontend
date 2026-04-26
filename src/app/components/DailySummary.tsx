import { Clock, TrendingUp, Footprints, Leaf, Award, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  distance: number; // km
  steps?: number;
  caloriesBurned?: number;
}

interface DailySummaryProps {
  trips: Trip[];
  onClose: () => void;
}

export function DailySummary({ trips, onClose }: DailySummaryProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setShow(true), 100);
  }, []);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const todaysTrips = trips.filter(trip => {
    const tripDate = new Date(trip.date);
    const now = new Date();
    return tripDate.toDateString() === now.toDateString();
  });

  const onTimeCount = todaysTrips.filter(t => t.wasOnTime).length;
  const totalTrips = todaysTrips.length;
  const onTimeRate = totalTrips > 0 ? Math.round((onTimeCount / totalTrips) * 100) : 0;

  const totalSteps = todaysTrips.reduce((sum, trip) => sum + (trip.steps || 0), 0);
  const totalCalories = todaysTrips.reduce((sum, trip) => sum + (trip.caloriesBurned || 0), 0);
  const totalDistance = todaysTrips.reduce((sum, trip) => sum + trip.distance, 0);

  // Calculate CO2 saved (vs driving alone)
  // Average car emits 404g CO2 per mile, transit is ~105g per mile
  const co2Saved = Math.round((totalDistance * 0.621371) * (404 - 105)); // grams

  // Calculate arrival confidence (percentage of trips where arrived >5 min early)
  const earlyTrips = todaysTrips.filter(trip => {
    if (!trip.wasOnTime) return false;
    const minutesEarly = Math.abs(Math.round((new Date(trip.actualArrivalTime).getTime() - new Date(trip.scheduledTime).getTime()) / 60000));
    return minutesEarly >= 5;
  }).length;
  const arrivalConfidence = totalTrips > 0 ? Math.round((earlyTrips / totalTrips) * 100) : 0;

  // Calculate average "leave in" time (minutes before class when they should leave)
  // This is based on their historical performance
  const avgLeaveInTime = todaysTrips.length > 0 
    ? Math.round(todaysTrips.reduce((sum, trip) => {
        // Calculate how early they left (scheduled time - actual arrival + travel time estimate)
        const minutesEarly = Math.round((new Date(trip.scheduledTime).getTime() - new Date(trip.actualArrivalTime).getTime()) / 60000);
        // Assume travel time was around 15-20 min average
        const estimatedTravelTime = trip.mode === 'bus' ? 20 : 15;
        return sum + (minutesEarly + estimatedTravelTime);
      }, 0) / todaysTrips.length)
    : 15;

  const getEncouragingMessage = () => {
    if (totalTrips === 0) {
      return {
        message: "Rest day, recharge! 🌙",
        emoji: "😌"
      };
    }

    if (onTimeRate === 100) {
      return {
        message: "Perfect day! You crushed it! 🎉",
        emoji: "🌟"
      };
    }

    if (onTimeRate >= 80) {
      return {
        message: "Great job staying on track today! 💪",
        emoji: "🎯"
      };
    }

    if (onTimeRate >= 50) {
      return {
        message: "Good effort! Tomorrow you'll do even better! 🌱",
        emoji: "💚"
      };
    }

    return {
      message: "Every journey starts somewhere. You've got this! 🚀",
      emoji: "💙"
    };
  };

  const encouragement = getEncouragingMessage();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg transition-all duration-500 ${
          show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
        style={{ maxHeight: '90vh', overflow: 'auto' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#d4a5a5] to-[#b8c5d6] p-6 rounded-t-3xl text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Daily Summary</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <p className="text-white/90 text-sm">{today}</p>
        </div>

        {/* Encouragement */}
        <div className="p-6 bg-[#faf8f6] border-b border-[#e3ddd5]">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{encouragement.emoji}</div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-[#4a4a4a]">{encouragement.message}</p>
              <p className="text-sm text-[#8b8680] mt-1">
                {totalTrips === 0 
                  ? "No classes tracked today" 
                  : `${onTimeCount} of ${totalTrips} classes on time`}
              </p>
            </div>
          </div>
        </div>

        {totalTrips > 0 && (
          <>
            {/* Stats Grid */}
            <div className="p-6 grid grid-cols-2 gap-4">
              {/* On-Time Rate */}
              <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-700 font-medium">On-Time Rate</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{onTimeRate}%</p>
              </div>

              {/* CO2 Saved */}
              <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-700 font-medium">CO₂ Saved</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{co2Saved}g</p>
              </div>

              {/* Steps */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-blue-700 font-medium">Steps Walked</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{totalSteps.toLocaleString()}</p>
              </div>

              {/* Calories */}
              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <p className="text-xs text-orange-700 font-medium">Calories Burned</p>
                </div>
                <p className="text-3xl font-bold text-orange-700">{totalCalories}</p>
              </div>
            </div>

            {/* Trip Details */}
            <div className="px-6 pb-6">
              <h3 className="text-sm font-semibold text-[#4a4a4a] mb-3">Today's Trips</h3>
              <div className="space-y-2">
                {todaysTrips.map((trip) => (
                  <div 
                    key={trip.id}
                    className={`p-3 rounded-xl border-2 ${
                      trip.wasOnTime 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{trip.wasOnTime ? '✅' : '⏰'}</span>
                        <div>
                          <p className="font-medium text-[#4a4a4a]">{trip.classCode}</p>
                          <p className="text-xs text-[#8b8680]">
                            {trip.mode === 'bus' ? `Bus ${trip.busLine}` : 'Walked'} • {trip.distance.toFixed(1)} km
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#4a4a4a]">
                          {new Date(trip.actualArrivalTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className={`text-xs ${trip.wasOnTime ? 'text-green-700' : 'text-red-700'}`}>
                          {trip.wasOnTime 
                            ? `${Math.abs(Math.round((new Date(trip.actualArrivalTime).getTime() - new Date(trip.scheduledTime).getTime()) / 60000))} min early`
                            : `${Math.abs(Math.round((new Date(trip.actualArrivalTime).getTime() - new Date(trip.scheduledTime).getTime()) / 60000))} min late`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-6 bg-[#faf8f6] border-t border-[#e3ddd5] rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#d4a5a5] to-[#b8c5d6] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Keep Going! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}