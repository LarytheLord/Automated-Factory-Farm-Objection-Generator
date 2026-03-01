# Open Permit Contract Test Suite

This suite validates the currently implemented API contracts for Open Permit.

## Run

```bash
cd test
npm run test
npm run test:phase2
npm run test:phase3
npm run test:phase4
npm run test:phase5
npm run test:phase6
npm run test:phase7
npm run test:phase8
npm run test:phase9
npm run test:phase10
npm run test:phase11
npm run test:phase12
npm run test:phase13
npm run test:all:local
```

`test:all:local` runs module/route-surface checks without needing a running server.

For full contract flow (`npm run test`), start the app first:

```bash
npm start
cd test
API_BASE_URL=http://localhost:3000 npm run test
```

## Coverage

- `GET /api/health`
- `GET /api/permits`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/generate-letter`
- `GET /api/usage`
- `POST /api/objections`
- `GET /api/objections`
- JSON persistence check (`backend/data/objections.json`)
