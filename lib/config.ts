const DEV_HOST = '10.0.0.204';

export const SERVER_URL =
  (process.env.EXPO_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '') ||
  (__DEV__ ? `http://${DEV_HOST}:3000` : '');
