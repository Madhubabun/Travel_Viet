import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tideandtrail.app',
  appName: 'Tide & Trail',
  webDir: 'dist',
  android: {
    backgroundColor: '#FFF7EE',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: '#FFF7EE',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    SystemBars: {
      // Edge-to-edge: the web layer pads itself with --safe-area-inset-* / env(safe-area-inset-*)
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'LIGHT',
    },
  },
};

export default config;
