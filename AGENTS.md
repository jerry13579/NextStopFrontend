# Agent rules — NextStop Frontend

## Rules

- Do not use placeholder or dummy values anywhere unless explicitly instructed
- Do not add or remove features without permission
- Do not deviate from the existing UI style unless instructed
- Do not run git commands
- Do not read `.env` files directly
- All changes must be compatible with Capacitor iOS — avoid browser-only APIs without a Capacitor equivalent

## Architecture

Single-page React app. All state lives in `App.tsx`. There are no routes — the app is one component tree with a tab bar (`Navigation.tsx`) switching between `welcome`, `routes`, `local-eats`, and `settings` views.

**State that matters:**
- `schedule: Class[]` — all class occurrences from semester start to end, sorted by startTime
- `allBuses: BusRoute[]` — raw response from the last `/plan-trip` call, set by the route planning `useEffect`
- `visibleBuses` — `allBuses` filtered by `busReducesWalking` and direction check (alighting closer to destination than boarding)
- `selectedBusId` — the active bus card; drives navigation steps, map geometry, vehicle polling
- `routeVehicles: RouteVehicle[]` — live vehicle positions for the selected bus's route/direction
- `homeScreenBuses` — buses for the home screen widget, fetched independently from the routes tab via a separate `fetchPlanTrip` loop keyed on `nextClassToday`
- `deviceLocation` / `routePlanningLocation` — GPS position; `routePlanningLocation` only updates when the user moves >75 m to avoid constant replanning

**Key effects:**
- Route planning effect — triggers on `[destinationPosition, routeDestination, routePlanRequestNonce, routePlanningLocation]`, fetches `/plan-trip`, refreshes every 3 minutes
- Home route effect — triggers on `[nextClassToday?.id, nextClassToday?.location, routePlanningLocation]`, runs its own fetch loop for the home screen widget
- Vehicle polling effect — triggers on `[visibleBuses]`, polls `/route/vehicles` for each unique bus in the current result set

## Adding new Capacitor plugins

1. `npm install @capacitor/<plugin>`
2. `npx cap sync ios`
3. The Swift package is updated automatically in `ios/App/CapApp-SPM/Package.swift`

Always import Capacitor plugins with a try/catch or optional chaining — they throw in browser mode.

## Notifications

Handled in `src/app/utils/notifications.ts`.

- `scheduleLeaveByNotification` — schedules a single local notification (ID `88001`) 5 minutes before the computed leave_by time. Skips rescheduling if the fire time is within 2 minutes or hasn't shifted by more than 30 seconds since the last schedule.
- `scheduleCommuteNotifications` — schedules notifications for calendar commute preview options (type `"commute"`, IDs based on timestamp).
- Tap handler is registered once via `setCommuteNotificationTapHandler`; tapping a notification opens the app to the routes view for that class's destination.

## Styling

Tailwind CSS v4. Design tokens are CSS variables on `:root`:
- `--color-primary`, `--color-secondary` — brand colors (change with theme)
- `--color-background`, `--color-accent`, `--color-border` — surface colors
- `--color-textPrimary`, `--color-textSecondary`, `--color-textMuted` — text hierarchy

Always use these variables rather than hardcoded colors so themes work. Theme switching is handled in `src/app/utils/colorThemes.ts` which writes the variables to the root element.

## Bus card and navigation

The bus card UI is rendered inline in `App.tsx` (not in a separate component) inside the `sortedRouteTiles.map(...)` block around line 2500. The navigation step cards are rendered in the `navigationSteps.map(...)` block below that.

The AI Analysis bubble state is `expandedAnalysisBusIds: Set<string>` — add a bus ID to expand, remove to collapse.

The Boarding Reminders bubble state is `boardingRemindersExpanded: boolean`. The expanded card renders above the navigation carousel (`navigationCarouselRef`) when `activeNavigationStepId === 'wait_for_bus'`.

## API calls

All backend calls go through `src/app/utils/api.ts`. Add new endpoints there as typed async functions. The base URL is `VITE_API_BASE_URL` (env var) defaulting to `http://127.0.0.1:8000`.

## Build

```bash
npm run build          # outputs to dist/
npx cap sync ios       # copies dist/ into Xcode project
```

Open `ios/App/App.xcworkspace` in Xcode to run on device or simulator.
