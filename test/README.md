# AFFOG Contract Test Suite

This suite validates the currently implemented API contracts for AFFOG.

## Prerequisites

- Start the application first (`npm start` from repo root)
- API reachable at `http://localhost:3000` (or set `API_BASE_URL`)

## Run

```bash
cd test
npm run test
```

## Coverage

- `GET /api/health`
- `GET /api/permits`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/generate-letter`
- `POST /api/objections`
- `GET /api/objections`
- JSON persistence check (`backend/data/objections.json`)
- `POST /api/send-email`
