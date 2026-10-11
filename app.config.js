module.exports = {
  expo: {
    name: 'Unscroll',
    slug: 'unscroll',
    extra: { eas: { projectId: '2d2fadc4-9aa8-4b7a-b25a-83d318648a23' } },
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    scheme: 'unscroll',
    icon: './assets/unscroll-icon.png',
    ios: { supportsTablet: true, bundleIdentifier: 'app.unscroll.focus' },
    android: { package: 'app.unscroll.focus', allowBackup: false },
    plugins: ['./plugins/withUnscroll'],
    web: { name: 'Unscroll', description: 'Keep your apps. Take back your attention.' },
  },
};
