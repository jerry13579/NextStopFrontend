import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, MapPin, Bus, X, Check } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  code: string;
  location: string;
  startTime: Date;
  buildingCode: string;
}

interface BusRoute {
  id: string;
  routeNumber: string;
  eta: number;
  destinationWalkTime: number;
}

interface SmartNotificationsProps {
  nextClass: Class | null;
  buses: BusRoute[];
  currentTime: Date;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
  showToggleControl?: boolean;
}

interface Notification {
  id: string;
  type: 'leave-now' | 'bus-arriving' | 'running-late';
  title: string;
  message: string;
  timestamp: Date;
  busNumber?: string;
  minutesToLeave?: number;
}

export function SmartNotifications({
  nextClass,
  buses,
  currentTime,
  enabled,
  onToggle,
  className,
  showToggleControl = true
}: SmartNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !nextClass || buses.length === 0) {
      return;
    }

    const checkNotifications = () => {
      const newNotifications: Notification[] = [];
      const minutesUntilClass = Math.floor((nextClass.startTime.getTime() - currentTime.getTime()) / 60000);

      // Find the best bus option
      const bestBus = buses.reduce((best, bus) => {
        const totalTime = bus.eta + bus.destinationWalkTime;
        const bestTotalTime = best.eta + best.destinationWalkTime;
        return totalTime < bestTotalTime ? bus : best;
      });

      const totalTravelTime = bestBus.eta + bestBus.destinationWalkTime;
      const bufferTime = 5; // Extra buffer minutes
      const walkToStopTime = 3; // Time to walk to bus stop
      const idealLeaveTime = totalTravelTime + bufferTime + walkToStopTime;

      const minutesToLeave = minutesUntilClass - idealLeaveTime;

      // Notification: Time to leave NOW (10 min before ideal departure)
      if (minutesToLeave <= 10 && minutesToLeave > 5) {
        const notifId = `leave-soon-${nextClass.id}-${Math.floor(minutesToLeave)}`;
        if (!dismissedIds.has(notifId)) {
          newNotifications.push({
            id: notifId,
            type: 'leave-now',
            title: `🎯 Get ready to leave in ${minutesToLeave} min`,
            message: `Head to the bus stop soon to catch the ${bestBus.routeNumber} to ${nextClass.buildingCode}`,
            timestamp: new Date(),
            busNumber: bestBus.routeNumber,
            minutesToLeave
          });
        }
      }

      // Notification: LEAVE NOW (5 min window)
      if (minutesToLeave <= 5 && minutesToLeave > 0) {
        const notifId = `leave-now-${nextClass.id}`;
        if (!dismissedIds.has(notifId)) {
          newNotifications.push({
            id: notifId,
            type: 'leave-now',
            title: `🚨 Leave NOW for ${nextClass.code}`,
            message: `Walk to the bus stop now to catch the ${bestBus.routeNumber}. Arrives in ${bestBus.eta} min.`,
            timestamp: new Date(),
            busNumber: bestBus.routeNumber,
            minutesToLeave: 0
          });
        }
      }

      // Notification: Bus arriving soon (2 min before bus ETA)
      if (bestBus.eta <= 2 && bestBus.eta > 0) {
        const notifId = `bus-arriving-${nextClass.id}-${bestBus.routeNumber}`;
        if (!dismissedIds.has(notifId)) {
          newNotifications.push({
            id: notifId,
            type: 'bus-arriving',
            title: `🚌 Bus ${bestBus.routeNumber} arriving in ${bestBus.eta} min`,
            message: `Be ready at the bus stop. Total travel time: ${totalTravelTime} min to ${nextClass.buildingCode}`,
            timestamp: new Date(),
            busNumber: bestBus.routeNumber
          });
        }
      }

      // Notification: Running late warning
      if (minutesToLeave < 0 && minutesUntilClass > 0) {
        const notifId = `late-warning-${nextClass.id}`;
        if (!dismissedIds.has(notifId)) {
          newNotifications.push({
            id: notifId,
            type: 'running-late',
            title: `⚠️ You might be late to ${nextClass.code}`,
            message: `Consider walking directly (faster) or inform your professor. Class starts in ${minutesUntilClass} min.`,
            timestamp: new Date()
          });
        }
      }

      setNotifications(newNotifications);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [enabled, nextClass, buses, currentTime, dismissedIds]);

  const dismissNotification = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'leave-now':
        return 'from-orange-500 to-red-500';
      case 'bus-arriving':
        return 'from-blue-500 to-indigo-500';
      case 'running-late':
        return 'from-red-600 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Notifications List */}
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`bg-gradient-to-r ${getNotificationColor(notification.type)} text-white rounded-2xl p-4 shadow-lg animate-in slide-in-from-top duration-300`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {notification.type === 'leave-now' && <Clock className="w-5 h-5" />}
                {notification.type === 'bus-arriving' && <Bus className="w-5 h-5" />}
                {notification.type === 'running-late' && <MapPin className="w-5 h-5" />}
                <h3 className="font-bold">{notification.title}</h3>
              </div>
              <p className="text-sm text-white/90">{notification.message}</p>
              {notification.busNumber && (
                <div className="mt-2 inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg text-xs">
                  <Bus className="w-3 h-3" />
                  <span>Bus {notification.busNumber}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}

      {/* Enable/Disable Notifications Toggle */}
      {showToggleControl && notifications.length === 0 && nextClass && (
        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                enabled ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {enabled ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-[var(--color-textPrimary)]">
                  Smart Alerts {enabled ? 'Active' : 'Paused'}
                </p>
                <p className="text-xs text-[var(--color-textMuted)]">
                  {enabled
                    ? `We'll notify you when to leave for ${nextClass.code}`
                    : 'Turn on to get departure alerts'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onToggle(!enabled)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {enabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
