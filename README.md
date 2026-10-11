# Manera Frontend

React Native and web app for Gold Store. The `dist` folder is the production web build.

## Run locally

```bash
npm install
npx expo start --web
```

Set `EXPO_PUBLIC_API_URL` in `.env` to the API, for example `http://localhost:4000`. Sign in with the JWT login from the backend.

## Rebuild the web app

```bash
npm run build:web
```

That writes a new `dist` folder. Host `dist` as a static site and point `EXPO_PUBLIC_API_URL` at the deployed API before building.
