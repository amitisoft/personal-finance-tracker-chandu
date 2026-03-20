# PFT Frontend (`pft-frontend`)

React (TypeScript) UI for the Personal Finance Tracker.

## Prerequisites
- Node.js 20+

## Configure (local dev)
Optional: create `pft-frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8080
```

## Run
From `pft-frontend`:
- `npm install`
- `npm run dev`

Open:
- `http://localhost:5173`

## Notes
- If `VITE_API_BASE_URL` is not set, the app uses `window.location.origin`.
- Money is displayed as INR by default (`?`).
- When the access token expires, the UI logs out and redirects to `/login`.

## Specification
The consolidated project specification is at `../SPEC.md`.
