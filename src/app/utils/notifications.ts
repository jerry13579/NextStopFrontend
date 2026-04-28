import { LocalNotifications } from '@capacitor/local-notifications';
import type { CalendarCommutePreview } from './api';

// Stable ID so we always cancel/replace the same slot — no accumulation.
const LIVE_ROUTE_NOTIFICATION_ID = 88001;

let _lastFireAt: number | null = null;

export async function scheduleLeaveByNotification(
  leaveBy: Date,
  classCode: string,
  destination: string,
  routeNumber: string,
): Promise<void> {
  try {
    const fireAt = new Date(leaveBy.getTime() - 5 * 60 * 1000);
    const now = Date.now();

    // Don't touch the notification if it's due to fire within the next 2 minutes —
    // cancelling it now would mean it never fires.
    if (fireAt.getTime() - now < 2 * 60 * 1000) return;

    // Skip rescheduling if the fire time hasn't shifted by more than 30 seconds.
    if (_lastFireAt !== null && Math.abs(fireAt.getTime() - _lastFireAt) < 30_000) return;

    // Cancel any previously scheduled live-route notification.
    await LocalNotifications.cancel({ notifications: [{ id: LIVE_ROUTE_NOTIFICATION_ID }] });

    if (fireAt.getTime() <= now) return;

    await LocalNotifications.schedule({
      notifications: [{
        id: LIVE_ROUTE_NOTIFICATION_ID,
        title: `Leave in 5 min for ${classCode}`,
        body: `Take Route ${routeNumber} · Leave by ${leaveBy.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
        schedule: { at: fireAt, allowWhileIdle: true },
        extra: { type: 'live-route', destination, classCode },
      }],
    });

    _lastFireAt = fireAt.getTime();
  } catch {
    // no-op in browser / when permissions denied
  }
}

type TapHandler = (destination: string) => void;

let _tapHandler: TapHandler | null = null;
let _listenerRegistered = false;

async function ensureTapListener() {
  if (_listenerRegistered) return;
  _listenerRegistered = true;
  await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const dest = event.notification.extra?.destination as string | undefined;
    if (dest) _tapHandler?.(dest);
  });
}

export function setCommuteNotificationTapHandler(handler: TapHandler) {
  _tapHandler = handler;
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleCommuteNotifications(
  previews: CalendarCommutePreview[],
  classes: Array<{ id: string; code: string }>,
): Promise<void> {
  try {
    await ensureTapListener();

    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications
      .filter((n) => n.extra?.type === 'commute')
      .map((n) => ({ id: n.id }));
    if (toCancel.length) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }

    const now = new Date();
    let id = Math.floor(Date.now() / 1000) & 0x7fffffff;
    const notifications = [];

    for (const preview of previews) {
      const best = preview.options.find((o) => o.type === 'bus' && o.leave_by);
      if (!best?.leave_by) continue;
      const leaveAt = new Date(best.leave_by);
      if (leaveAt <= now) continue;

      const cls = classes.find(
        (c) => c.id === preview.event_id || c.id === `calendar_${preview.event_id}`,
      );
      const classCode = cls?.code ?? 'Class';
      const route = best.route_number ?? 'bus';
      const stop = best.boarding_stop_name ?? 'the stop';

      notifications.push({
        id: id++,
        title: `Time to leave for ${classCode}`,
        body: `Walk to ${stop} · Route ${route}`,
        schedule: { at: leaveAt, allowWhileIdle: true },
        extra: { type: 'commute', destination: preview.destination, classCode },
      });
    }

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch {
    // Gracefully no-op in browser / when permissions denied
  }
}
