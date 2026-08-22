import type { CapacitorConfig } from '@capacitor/cli';

// This app is server-rendered (SSR, dynamic routes, cookies for i18n) —
// there is no static export to bundle into the APK. Instead the native
// shell just loads the real deployed site in a WebView (Capacitor's
// "remote URL" mode); `webDir` below is required by the CLI but unused
// since server.url takes over. Native plugins (background geolocation
// etc.) are still available via the Capacitor JS bridge injected into
// that page, same as if it were bundled locally.
//
// CAPACITOR_SERVER_URL must point at the real deployed HTTPS URL before
// building a release APK — localhost only works for a device on the same
// LAN as this dev machine, reachable at its LAN IP, not "localhost".
// Defaults to the live Vercel URL; switch to https://relod.in once the
// custom domain's DNS has finished propagating (see build workflow).
const SERVER_URL = process.env.CAPACITOR_SERVER_URL || 'https://relod-frontend.vercel.app/login';

const config: CapacitorConfig = {
  appId: 'com.relod.app',
  appName: 'Relod',
  webDir: 'public',
  server: {
    url: SERVER_URL,
    cleartext: SERVER_URL.startsWith('http://'),
  },
  android: {
    // Required by @capacitor-community/background-geolocation — without
    // this, Android silently stops delivering location updates ~5 minutes
    // after the app is backgrounded, defeating the whole point of it.
    // See https://github.com/capacitor-community/background-geolocation/issues/89
    useLegacyBridge: true,
  },
};

export default config;
