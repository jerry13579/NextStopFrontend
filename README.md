# NextStop — Frontend

iOS app built with React, TypeScript, Vite, and Capacitor. Helps students at UC Berkeley get to class on time using live AC Transit data.

## Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 + TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS v4 |
| Native wrapper | Capacitor 8 (iOS) |
| Map | Google Maps JS API (loaded at runtime from backend) |
| Notifications | `@capacitor/local-notifications` |
| Icons | lucide-react |

## Features

- **Live route planning** — enter a destination or tap a class to get ranked bus options with walk times, ETAs, and crowd levels
- **In-app turn-by-turn navigation** — step-by-step cards: walk to stop → wait → ride → walk to destination
- **Class schedule** — import `.ics` or add classes manually; schedule commute previews are computed for each upcoming class
- **Home screen widgets** — next class card with live leave-by time, route number, and commute duration; refreshes every 3 minutes
- **Departure notifications** — local notification fires 5 minutes before you need to leave; tapping it opens the app directly to the route for that class
- **Crowd metrics** — live occupancy percentage with AI-generated description; the source bus is highlighted on the map
- **Color themes** — multiple built-in themes plus a custom theme creator
- **Starred locations & quick routes** — save home and study spot for one-tap routing

## Local development

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL if your backend isn't on localhost:8000
npm run dev
```

The app runs in a browser at `http://localhost:5173`. Most features work in the browser; native notifications and GPS require the iOS build.

## iOS build

### 1. Prerequisites

**Xcode** — install from the Mac App Store. Xcode 15 or later is required (Capacitor 8 targets iOS 15+).

After installing Xcode, install the Command Line Tools:

```bash
xcode-select --install
```

Accept the Xcode license (required before any builds):

```bash
sudo xcodebuild -license accept
```

**Apple Developer account** — required to run on a physical device. A free account works for personal testing. Sign in via Xcode → Settings → Accounts.

**Node.js 18+** — the frontend build toolchain requires it. Install from [nodejs.org](https://nodejs.org) or via `brew install node`.

No CocoaPods required. Capacitor 8 uses Swift Package Manager exclusively.

---

### 2. Install npm dependencies

```bash
npm install
```

---

### 3. Build the web bundle

```bash
npm run build
```

This outputs the compiled app into `dist/`.

---

### 4. Sync to Xcode

```bash
npx cap sync ios
```

This copies `dist/` into the Xcode project and updates the Swift Package Manager dependencies in `ios/App/CapApp-SPM/Package.swift`. Run this every time you:
- Change any source files and rebuild
- Install or remove a Capacitor plugin (`npm install @capacitor/...`)

---

### 5. Open in Xcode

```bash
npx cap open ios
```

Or manually open `ios/App/App.xcworkspace` in Xcode. **Always open the `.xcworkspace` file, not `.xcodeproj`.**

---

### 6. Configure signing

In Xcode, select the `App` target → **Signing & Capabilities**:

- Check **Automatically manage signing**
- Set **Team** to your Apple Developer account
- The **Bundle Identifier** is `com.jerrycheng.nextstop` — change it to something unique if needed

---

### 7. Set the backend URL

The app reads `VITE_API_BASE_URL` at build time. Make sure `.env` points to the deployed Azure backend before running `npm run build`:

```bash
VITE_API_BASE_URL=https://<your-backend>.azurewebsites.net
```

For local testing against a local backend, use `http://127.0.0.1:8000` — but the iOS simulator can reach localhost directly, while a physical device cannot.

---

### 8. Run on simulator or device

- **Simulator** — select any iPhone simulator from the device picker in Xcode's toolbar and press ▶
- **Physical device** — plug in the iPhone, select it from the device picker, and press ▶. The first run may take a minute while the app is signed and installed.

---

### Re-deploying after code changes

```bash
npm run build && npx cap sync ios
# then press ▶ in Xcode, or use Product → Run (⌘R)
```

When adding new Capacitor plugins, always run `npx cap sync ios` after `npm install` so the Swift Package Manager dependency is updated in `ios/App/CapApp-SPM/Package.swift`.

## Environment

`.env` (copy from `.env.example`):

```
VITE_API_BASE_URL=https://<your-azure-backend>.azurewebsites.net
```

In production this points to the Azure App Service. During local development it points to `http://127.0.0.1:8000`.

## Project structure

```
src/app/
  App.tsx                  — root component, all state and routing logic
  components/
    WelcomeSection.tsx     — home screen with next class card and schedule
    BusMap.tsx             — Google Maps with route geometry and bus markers
    SettingsSection.tsx    — class schedule management, themes, notifications
    Navigation.tsx         — bottom tab bar
    BoardingReminders.tsx  — modal with boarding tips (also used inline in nav)
    SmartNotifications.tsx — in-app departure alert banners
    ...
  utils/
    api.ts                 — all fetch calls to the backend, typed interfaces
    notifications.ts       — Capacitor local notification scheduling
    tripTracking.ts        — localStorage trip history and streak calculation
    colorThemes.ts         — theme definitions and CSS variable application
```

## Notes

- The Google Maps JS API key is **not** bundled in the app. It is fetched at runtime from `GET /config/maps` on the backend, which reads it from an environment variable.
- The backend URL is the only secret that needs to be in the frontend build. Everything else is served from the backend.
- Notifications require the user to grant permission on first launch. The permission prompt is triggered on app mount.
