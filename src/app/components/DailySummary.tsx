import { Clock, TrendingUp, Footprints, Leaf } from 'lucide-react';
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
        <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] p-6 rounded-t-3xl text-white">
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
        <div className="p-6 bg-[var(--color-background)] border-b border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{encouragement.emoji}</div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-[var(--color-textPrimary)]">{encouragement.message}</p>
              <p className="text-sm text-[var(--color-textMuted)] mt-1">
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
              <div className="bg-[var(--color-successSurface)] rounded-2xl p-4 border border-[var(--color-successBorder)]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[var(--color-success)]" />
                  <p className="text-xs text-[var(--color-success)] font-medium">On-Time Rate</p>
                </div>
                <p className="text-3xl font-bold text-[var(--color-success)]">{onTimeRate}%</p>
              </div>

              {/* CO2 Saved */}
              <div className="bg-[var(--color-successSurface)] rounded-2xl p-4 border border-[var(--color-successBorder)]">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="w-4 h-4 text-[var(--color-success)]" />
                  <p className="text-xs text-[var(--color-success)] font-medium">CO₂ Saved</p>
                </div>
                <p className="text-3xl font-bold text-[var(--color-success)]">{co2Saved}g</p>
              </div>

              {/* Steps */}
              <div className="bg-[var(--color-infoSurface)] rounded-2xl p-4 border border-[var(--color-infoBorder)]">
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="w-4 h-4 text-[var(--color-info)]" />
                  <p className="text-xs text-[var(--color-info)] font-medium">Steps Walked</p>
                </div>
                <p className="text-3xl font-bold text-[var(--color-info)]">{totalSteps.toLocaleString()}</p>
              </div>

              {/* Calories */}
              <div className="bg-[var(--color-warningSurface)] rounded-2xl p-4 border border-[var(--color-warningBorder)]">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[var(--color-warning)]" />
                  <p className="text-xs text-[var(--color-warning)] font-medium">Calories Burned</p>
                </div>
                <p className="text-3xl font-bold text-[var(--color-warning)]">{totalCalories}</p>
              </div>
            </div>

            {/* Trip Details */}
            <div className="px-6 pb-6">
              <h3 className="text-sm font-semibold text-[var(--color-textPrimary)] mb-3">Today's Trips</h3>
              <div className="space-y-2">
                {todaysTrips.map((trip) => (
                  <div 
                    key={trip.id}
                    className={`p-3 rounded-xl border-2 ${
                      trip.wasOnTime 
                        ? 'bg-[var(--color-successSurface)] border-[var(--color-successBorder)]'
                        : 'bg-[var(--color-dangerSurface)] border-[var(--color-dangerBorder)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{trip.wasOnTime ? '✅' : '⏰'}</span>
                        <div>
                          <p className="font-medium text-[var(--color-textPrimary)]">{trip.classCode}</p>
                          <p className="text-xs text-[var(--color-textMuted)]">
                            {trip.mode === 'bus' ? `Bus ${trip.busLine}` : 'Walked'} • {trip.distance.toFixed(1)} km
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[var(--color-textPrimary)]">
                          {new Date(trip.actualArrivalTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className={`text-xs ${trip.wasOnTime ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
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
        <div className="p-6 bg-[var(--color-background)] border-t border-[var(--color-border)] rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Keep Going! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
