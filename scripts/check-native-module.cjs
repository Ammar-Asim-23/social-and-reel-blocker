const { existsSync } = require('node:fs');
const { join, dirname } = require('node:path');
const { execFileSync } = require('node:child_process');

const root = join(__dirname, '..');
const required = [
  'modules/unscroll/expo-module.config.json',
  'modules/unscroll/android/build.gradle',
  'modules/unscroll/android/src/main/AndroidManifest.xml',
  'modules/unscroll/android/src/main/java/app/unscroll/nativebridge/UnscrollModule.kt',
  'modules/unscroll/android/src/main/java/app/unscroll/nativebridge/ProtectionService.kt',
  'modules/unscroll/android/src/main/res/xml/unscroll_accessibility.xml',
  'modules/unscroll/ios/Unscroll.podspec',
  'modules/unscroll/ios/UnscrollModule.swift',
  'modules/unscroll/ios/ProtectionShared.swift',
  'modules/unscroll/extension/UnscrollMonitor.swift',
];
for (const file of required) {
  if (!existsSync(join(root, file))) {
    throw new Error(
      `Native source is missing from this build: ${file}. Check the build archive and ignore rules; use /android/ and /ios/, never android/ and ios/.`,
    );
  }
}
const platform = process.env.EAS_BUILD_PLATFORM === 'ios' ? 'apple' : 'android';
const cli = join(dirname(require.resolve('expo/package.json')), 'bin', 'autolinking');
const result = JSON.parse(
  execFileSync(process.execPath, [cli, 'resolve', '--platform', platform, '--json'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
  }),
);
const moduleInfo = result.modules.find((m) => m.packageName === 'unscroll-native');
if (
  !moduleInfo ||
  (platform === 'android' &&
    !moduleInfo.projects?.some((p) =>
      p.modules?.some((m) => m.classifier === 'app.unscroll.nativebridge.UnscrollModule'),
    ))
) {
  throw new Error(
    `Unscroll native module was not resolved for ${platform}. Refusing to build an app without protection. Check expo.autolinking.nativeModulesDir.`,
  );
}
console.log(
  `Verified Unscroll native sources and ${platform} autolinking. Native compilation is still required.`,
);
