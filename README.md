
# NextStop MVP

Frontend MVP for NextStop. This bundle was extracted from the original Figma export and wired to the `nextstop-backend` FastAPI service.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` if you want to override the backend URL.

3. Start the frontend:

```bash
npm run dev
```

By default the app calls `http://127.0.0.1:8000/plan-trip` and will show backend-powered route recommendations when that service is running.
  
