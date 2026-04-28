# Backend Changes Needed for UI Feature Cleanup

This frontend pass removes placeholder-only behavior and expects the backend to become the source of truth for Local Eats, trip history, summaries, streaks, route planning options, and user preferences.

## Local Eats

- Add `GET /local-eats`.
- Supported query params:
  - `category`: `cafe`, `restaurant`, `quick-bites`, or `dessert`.
  - `deals_only`: boolean.
  - `favorites_only`: boolean.
  - `lat` and `lng`: optional current location for distance and walk-time sorting.
- Return either an array or `{ "eateries": [...] }`.
- Each eatery should include:
  - `id`, `name`, `type`, `emoji`, `rating`, `price_level`, `distance_miles`, `walk_time_minutes`.
  - `address`, `hours`, `description`, `is_open`, `is_favorite`, `cuisine_type`.
  - Optional `student_discount` with `percentage`, `details`, `valid_until`, and `is_new`.
- Add `PUT /local-eats/{id}/favorite` and `DELETE /local-eats/{id}/favorite`.
- Store eateries/deals in SQLite with stable IDs, location metadata, categories, discount metadata, and a `last_verified_at` timestamp.

## Trip Logs, Summaries, and Streaks

- Add `POST /trips` for idempotent trip completion logging.
- Request body should include:
  - `idempotency_key`, `class_id`, `class_code`, `class_name`, `scheduled_time`, `actual_arrival_time`.
  - `mode`: `bus` or `walk`.
  - Optional `bus_line`.
  - `distance_km`, optional `steps`, optional `calories_burned`.
- Return the stored trip as:
  - `id`, `date`, `class_code`, `class_name`, `scheduled_time`, `actual_arrival_time`.
  - `was_on_time`, `mode`, `bus_line`, `distance_km`, `steps`, `calories_burned`.
- Add `GET /trips?from=&to=` for recent trip history.
- Add `GET /stats/summary?period=today|week|semester`.
- Summary response should include `trip_count`, `on_time_count`, `on_time_rate`, `streak_days`, `distance_km`, `steps`, `calories_burned`, `co2_saved_grams`, and `transit_minutes`.
- Streaks should be computed server-side from completed class commute days, not from placeholder or generated client data.

## Routing

- Extend `GET /plan-trip` to accept bus-only planning:
  - `mode=bus` or `include_walk=false`.
- Preserve the current default behavior for the full Routes tab.
- Return stable option IDs and enough route metadata for frontend vehicle-polling de-duplication:
  - `route_id` or `route_short_name`.
  - `direction_id`.
  - `boarding_stop.stop_id`.
- Continue returning `direct_walk` for full route planning. The home widget may request bus-only options and should not need to render walk-only routes.

## User Preferences and Account Utilities

- Add `GET /user/preferences`.
- Add `PATCH /user/preferences`.
- Preferences should include:
  - `smart_departure_alerts`.
  - `capacity_alerts`.
  - `delay_notifications`.
  - Optional `theme_id`.
- Add `GET /user/export` returning a downloadable JSON blob of user preferences, saved places, calendar data, trips, favorites, and notification settings.
- Add `DELETE /user/data` to clear user-owned app data while preserving the account/session unless the backend explicitly supports full account deletion.
- Add password reset endpoints only if email delivery is configured:
  - `POST /auth/password-reset/request`.
  - `POST /auth/password-reset/confirm`.

## Acceptance Criteria

- Frontend Local Eats renders real backend data, empty states, and backend errors without dummy fallback.
- Favorites persist across refresh and login sessions.
- Recent Trips, Daily Summary, Semester Wrapped, streaks, steps, calories, CO2, and transit minutes all come from backend trip logs or backend summaries.
- Home route planning can request and display bus options only.
- Vehicle polling can be keyed by stable route/direction/boarding-stop metadata.
- Notification toggles, theme choice, export, and clear-data actions have backend support.
