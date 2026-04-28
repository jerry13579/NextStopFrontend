import { Calendar, MapPin, Clock, X, Sparkles, Navigation2, RefreshCw, Radio, Home, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

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

interface HomeRouteMetrics {
  leaveInValue: string;
  leaveInDetail: string;
  leaveByValue: string;
  locationValue: string;
}

interface WelcomeSectionProps {
  currentTime: Date;
  nextClass: Class | null;
  schedule: Class[];
  trips: Trip[];
  showDailySummaryPopup: boolean;
  onCloseDailySummary: () => void;
  onNavigateToRoutes?: () => void;
  onNavigateToCalendarImport?: () => void;
  routeAlert?: string | null;
  starredContent?: ReactNode;
  homeRouteMetrics?: HomeRouteMetrics | null;
  homeRouteStatus?: 'loading' | 'live' | 'schedule' | null;
  homeRouteBestBus?: { routeNumber: string; capacity: number | null; delay: number } | null;
  homeAddress?: { name: string; lat: number; lng: number } | null;
  studySpot?: { name: string; lat: number; lng: number } | null;
  isNearHome?: boolean;
  isNearStudySpot?: boolean;
  onNavigateToHome?: () => void;
  onNavigateToStudySpot?: () => void;
  onNavigateToSettings?: () => void;
  todayTips: string[];
  homeRouteLoading?: boolean;
}

export function WelcomeSection({
  currentTime,
  nextClass,
  schedule,
  trips,
  showDailySummaryPopup,
  onCloseDailySummary,
  onNavigateToRoutes,
  onNavigateToCalendarImport,
  routeAlert,
  starredContent,
  homeRouteMetrics,
  homeRouteStatus,
  homeRouteBestBus,
  homeAddress,
  studySpot,
  isNearHome = false,
  isNearStudySpot = false,
  onNavigateToHome,
  onNavigateToStudySpot,
  onNavigateToSettings,
  todayTips,
  homeRouteLoading = false,
}: WelcomeSectionProps) {
  const dayOfWeek = currentTime.toLocaleString('default', { weekday: 'long' });
  const weekendGreetingMessage = (() => {
    if (dayOfWeek === 'Saturday') {
      return 'Weekend mode is on. Save a favorite spot or plan a relaxed trip across town.';
    }
    if (dayOfWeek === 'Sunday') {
      return 'Ease into the week. Check your saved places and get ready for Monday.';
    }
    return 'Ready to conquer your day on campus? 🚀';
  })();
  const hasImportedSchedule = schedule.length > 0;
  const hasClassesRemainingToday = Boolean(nextClass);
  const showImportCard = !hasImportedSchedule;
  const showHomeStudyShortcut = !homeAddress && !studySpot;
  const showWidgets = hasClassesRemainingToday;
  const streakCount = trips.filter((trip) => trip.wasOnTime).length;

  const todaysTrips = trips.filter((trip) => {
    const tripDate = new Date(trip.date);
    const now = new Date();
    return tripDate.toDateString() === now.toDateString();
  });

  const onTimeCount = todaysTrips.filter((t) => t.wasOnTime).length;
  const totalTrips = todaysTrips.length;

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const weekStart = getStartOfWeek(new Date());
  const weeklyTrips = trips.filter((trip) => {
    const tripDate = new Date(trip.date);
    return tripDate >= weekStart;
  });

  const weeklyOnTimeCount = weeklyTrips.filter((t) => t.wasOnTime).length;
  const weeklyTotalTrips = weeklyTrips.length;
  const weeklyOnTimeRate = weeklyTotalTrips > 0 ? Math.round((weeklyOnTimeCount / weeklyTotalTrips) * 100) : 0;

  const totalSteps = todaysTrips.reduce((sum, trip) => sum + (trip.steps || 0), 0);
  const totalDistance = todaysTrips.reduce((sum, trip) => sum + trip.distance, 0);
  const co2Saved = Math.round((totalDistance * 0.621371) * (404 - 105));

  const encouragement = (() => {
    if (totalTrips === 0) {
      return { message: 'Rest day, recharge! 🌙', emoji: '😌' };
    }
    if (onTimeCount === totalTrips) {
      return { message: 'Perfect day! You crushed it! 🎉', emoji: '🌟' };
    }
    if (onTimeCount / Math.max(totalTrips, 1) >= 0.8) {
      return { message: 'Great job staying on track today! 💪', emoji: '🎯' };
    }
    return { message: "Every journey starts somewhere. You've got this! 🚀", emoji: '💙' };
  })();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl p-6 text-white mb-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" />
            <span className="text-white/80 text-xs font-medium">Good morning</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Happy {dayOfWeek}!</h1>
          <p className="text-white/80 text-sm">
            {weekendGreetingMessage}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[var(--color-background)] to-[var(--color-accent)] rounded-2xl p-5 border border-[var(--color-border)] mb-4">
        <h3 className="font-semibold text-[var(--color-textPrimary)] mb-2.5 flex items-center gap-2 text-sm">
          <span>💡</span>
          Today&apos;s Tips
        </h3>
        <ul className="space-y-1.5 text-xs text-[var(--color-textSecondary)]">
          {todayTips.map((tip, index) => (
            <li key={`${tip}-${index}`} className="flex items-start gap-2">
              <span className="text-[var(--color-primary)] mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {hasClassesRemainingToday && nextClass && (
        <>
          <div className="rounded-2xl border-2 border-[var(--color-border)] bg-white shadow-sm mb-4 overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-textMuted)] mb-1">Up Next Today</p>
                <h2 className="text-xl font-bold text-[var(--color-textPrimary)]">{nextClass.code}</h2>
              </div>
              <button
                onClick={onNavigateToRoutes}
                className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-md hover:shadow-lg"
              >
                View Routes
              </button>
            </div>
            {showWidgets && (
              <div className="grid grid-cols-3 gap-px border-t border-[var(--color-border)] bg-[var(--color-border)]">
                <div className="bg-white p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center mb-2">
                      <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    <p className="text-sm font-bold text-[var(--color-textPrimary)] leading-tight line-clamp-2">{homeRouteMetrics?.locationValue ?? nextClass.location.split(',')[0]}</p>
                    <p className="text-xs text-[var(--color-textMuted)] mt-0.5">Location</p>
                    <p className="text-[11px] text-[var(--color-textSecondary)] mt-1 leading-tight">{nextClass.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="bg-white p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center mb-2">
                      <Navigation2 className="w-4 h-4 text-[var(--color-secondary)]" />
                    </div>
                    {homeRouteLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--color-textMuted)]" />
                    ) : (
                      <p className="text-lg font-bold text-[var(--color-textPrimary)]">{homeRouteMetrics?.leaveInValue ?? '—'}</p>
                    )}
                    <p className="text-xs text-[var(--color-textMuted)] mt-0.5">Commute</p>
                    <p className="text-[11px] text-[var(--color-textSecondary)] mt-1 leading-tight">{homeRouteLoading ? 'Loading…' : (homeRouteMetrics?.leaveInDetail ?? '—')}</p>
                  </div>
                </div>
                <div className="bg-white p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center mb-2">
                      <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    {homeRouteLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--color-textMuted)]" />
                    ) : (
                      <p className="text-lg font-bold text-[var(--color-textPrimary)]">{homeRouteMetrics?.leaveByValue ?? '—'}</p>
                    )}
                    <p className="text-xs text-[var(--color-textMuted)] mt-0.5">Leave home by</p>
                    <p className="text-[11px] text-[var(--color-textSecondary)] mt-1 leading-tight">{homeRouteLoading ? 'Loading…' : `${homeRouteMetrics?.leaveByValue ?? '—'} to catch the bus`}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {routeAlert && (
            <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm mb-4">
              <p className="text-sm font-medium text-[var(--color-danger)]">{routeAlert}</p>
            </div>
          )}
        </>
      )}

      {/* Quick Routes — shown when user is away from home and/or study spot */}
      {(homeAddress && !isNearHome || studySpot && !isNearStudySpot) && (
        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-textMuted)] mb-3">Quick Routes</p>
          <div className={`grid gap-3 ${homeAddress && !isNearHome && studySpot && !isNearStudySpot ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {homeAddress && !isNearHome && (
              <button
                onClick={onNavigateToHome}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-left hover:border-[var(--color-primary)] hover:bg-[var(--color-accent)] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]">
                  <Home className="h-4 w-4 text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-textPrimary)]">Home</p>
                  <p className="truncate text-xs text-[var(--color-textMuted)]">{homeAddress.name}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-textMuted)]" />
              </button>
            )}
            {studySpot && !isNearStudySpot && (
              <button
                onClick={onNavigateToStudySpot}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-left hover:border-[var(--color-secondary)] hover:bg-[var(--color-accent)] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]">
                  <BookOpen className="h-4 w-4 text-[var(--color-secondary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-textPrimary)]">Study Spot</p>
                  <p className="truncate text-xs text-[var(--color-textMuted)]">{studySpot.name}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-textMuted)]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Class Schedule */}
      {schedule.length > 0 && (() => {
        const now = currentTime;
        const todayStr = now.toDateString();

        // Collect the days we want to show: today + next 6 calendar days that have classes
        const dayMap = new Map<string, { label: string; classes: Class[] }>();
        for (const cls of schedule) {
          const d = cls.startTime;
          if (isNaN(d.getTime())) continue;
          const key = d.toDateString();
          if (!dayMap.has(key)) {
            const isToday = key === todayStr;
            const isTomorrow = key === new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString();
            const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            dayMap.set(key, { label, classes: [] });
          }
          dayMap.get(key)!.classes.push(cls);
        }

        // Sort days chronologically, cap at 7 days out
        const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
        const days = [...dayMap.entries()]
          .filter(([, { classes }]) => classes[0].startTime <= cutoff)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

        if (days.length === 0) return null;

        return (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm mb-4 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-textMuted)]">My Classes</p>
            </div>
            {days.map(([dayKey, { label, classes }], dayIdx) => {
              const isToday = dayKey === todayStr;
              const sorted = [...classes].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
              return (
                <div key={dayKey}>
                  {dayIdx > 0 && <div className="h-px bg-[var(--color-border)] mx-4" />}
                  <div className="px-4 py-2">
                    <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-textMuted)]'}`}>{label}</p>
                    <div className="space-y-1">
                      {sorted.map((cls) => {
                        const past = isToday && cls.endTime < now;
                        const active = isToday && cls.startTime <= now && cls.endTime >= now;
                        const timeStr = cls.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        return (
                          <div
                            key={cls.id}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${active ? 'bg-[var(--color-accent)] border border-[var(--color-primary)]/20' : 'bg-[var(--color-background)]'} ${past ? 'opacity-40' : ''}`}
                          >
                            <span className="text-base leading-none">{cls.emoji || '📚'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[var(--color-textPrimary)] truncate">{cls.code}</p>
                              {cls.location && (
                                <p className="text-xs text-[var(--color-textMuted)] truncate">{cls.location}</p>
                              )}
                            </div>
                            <p className={`text-xs font-medium shrink-0 ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-textSecondary)]'}`}>{timeStr}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="h-2" />
          </div>
        );
      })()}

      {!hasClassesRemainingToday && starredContent && <div className="mb-4">{starredContent}</div>}

      {showImportCard && (
        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm mb-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[var(--color-textPrimary)]">Import your class schedule</p>
            <button
              onClick={onNavigateToCalendarImport}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {showHomeStudyShortcut && (
        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-textPrimary)]">Set home & study spot</p>
              <p className="mt-0.5 text-xs text-[var(--color-textMuted)]">Unlock quick route shortcuts from your home screen</p>
            </div>
            <button
              onClick={onNavigateToSettings}
              className="shrink-0 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Set Up
            </button>
          </div>
        </div>
      )}

      {hasClassesRemainingToday && starredContent && <div className="mt-4">{starredContent}</div>}

      {showDailySummaryPopup && totalTrips > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCloseDailySummary} />

          <div className="relative bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{encouragement.emoji}</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Day Complete!</h3>
                  <p className="text-white/90 text-sm">Here&apos;s your daily summary</p>
                </div>
              </div>
              <button
                onClick={onCloseDailySummary}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/30">
              <p className="text-white font-semibold text-center">{encouragement.message}</p>
              <p className="text-white/80 text-sm text-center mt-1">
                {onTimeCount} of {totalTrips} classes on time
              </p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/30">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>🔥</span>
                  Growth Tracker
                </h4>
                <div className="text-right">
                  <p className="text-white font-bold text-2xl">{streakCount}</p>
                  <p className="text-white/70 text-xs">day streak</p>
                </div>
              </div>
              <p className="text-white/80 text-xs text-center mt-3">
                Keep up the momentum! You&apos;ve been on time {streakCount} times this semester 🚀
              </p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>📊</span>
                  This Week&apos;s Progress
                </h4>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">{weeklyOnTimeCount}/{weeklyTotalTrips}</p>
                  <p className="text-white/70 text-xs">on time</p>
                </div>
              </div>

              <div className="relative w-full h-3 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${weeklyOnTimeRate}%` }}
                />
              </div>
              <p className="text-white/80 text-xs text-center mt-2">
                {weeklyOnTimeRate}% on-time arrival rate this week
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                  <p className="text-xs text-[var(--color-primary)] font-medium">Steps Walked</p>
                </div>
                <p className="text-2xl font-bold text-[var(--color-primary)]">{totalSteps.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[var(--color-success)]" />
                  <p className="text-xs text-[var(--color-success)] font-medium">CO₂ Saved</p>
                </div>
                <p className="text-2xl font-bold text-[var(--color-success)]">{co2Saved}g</p>
              </div>
            </div>

            <button
              onClick={onCloseDailySummary}
              className="w-full bg-white text-[var(--color-primary)] font-semibold py-3 rounded-xl hover:bg-white/90 transition-colors"
            >
              Awesome! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Live data status pill — fixed bottom-right, only shown when there is a class today */}
      {nextClass && homeRouteStatus && (
        <div className="fixed bottom-4 right-4 z-50">
          {homeRouteStatus === 'loading' && (
            <div className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-textMuted)] shadow-md">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Updating live data…</span>
            </div>
          )}
          {homeRouteStatus === 'live' && (
            <div className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--color-successBorder)] px-3 py-1.5 text-xs shadow-md">
              <Radio className="h-3 w-3 text-[var(--color-success)]" />
              <span className="font-medium text-[var(--color-success)]">Live</span>
              {homeRouteBestBus && (
                <>
                  {homeRouteBestBus.delay !== 0 && (
                    <span className={homeRouteBestBus.delay > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}>
                      · {Math.abs(homeRouteBestBus.delay)} min {homeRouteBestBus.delay > 0 ? 'late' : 'early'}
                    </span>
                  )}
                  {homeRouteBestBus.delay === 0 && (
                    <span className="text-[var(--color-success)]">· On time</span>
                  )}
                  {homeRouteBestBus.capacity !== null && (
                    <span className={
                      homeRouteBestBus.capacity >= 85 ? 'text-[var(--color-danger)]' :
                      homeRouteBestBus.capacity >= 60 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'
                    }>
                      · {homeRouteBestBus.capacity}% full
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          {homeRouteStatus === 'schedule' && (
            <div className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-textMuted)] shadow-md">
              <div className="h-2 w-2 rounded-full bg-[var(--color-textMuted)]" />
              <span>Using schedule</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
