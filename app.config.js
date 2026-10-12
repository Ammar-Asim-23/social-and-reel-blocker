module.exports = {
  expo: {
    name: 'Unscroll',
    slug: 'unscroll',
    extra: { eas: { projectId: '2d2fadc4-9aa8-4b7a-b25a-83d318648a23' } },
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'unscroll',
    icon: './assets/unscroll-icon.png',
    ios: { supportsTablet: true, bundleIdentifier: 'app.unscroll.focus' },
    android: {
      package: 'app.unscroll.focus',
      allowBackup: false,
      // Block permissions injected by templates/SDKs that this app does not use.
      blockedPermissions: [
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
        'android.permission.REQUEST_INSTALL_PACKAGES',
        'android.permission.QUERY_ALL_PACKAGES',
      ],
    },
    plugins: [
      './plugins/withUnscroll',
      [
        'expo-local-authentication',
        { faceIDPermission: 'Use Face ID to unlock Unscroll when app lock is enabled.' },
      ],
      'expo-secure-store',
    ],
    web: { name: 'Unscroll', description: 'Keep your apps. Take back your attention.' },
  },
};
