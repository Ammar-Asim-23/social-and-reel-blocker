const {
  withEntitlementsPlist,
  withInfoPlist,
  withPodfileProperties,
  withXcodeProject,
  withAndroidManifest,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const TARGET = 'UnscrollMonitor';
const xml = (value) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c],
  );
const plist = (body) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>${body}</dict></plist>`;

function withUnscroll(config) {
  const bundle = config.ios?.bundleIdentifier || 'app.unscroll.focus';
  const group = `group.${bundle}`;
  config = withAndroidManifest(config, (c) => {
    c.modResults.manifest.application[0].$['android:allowBackup'] = 'false';
    return c;
  });
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.family-controls'] = true;
    c.modResults['com.apple.security.application-groups'] = [
      ...new Set([...(c.modResults['com.apple.security.application-groups'] || []), group]),
    ];
    return c;
  });
  config = withInfoPlist(config, (c) => {
    c.modResults.UnscrollAppGroup = group;
    return c;
  });
  config = withPodfileProperties(config, (c) => {
    c.modResults['ios.deploymentTarget'] = '17.4';
    return c;
  });
  // EAS must know the extension's identity before credentials are generated.
  const experimental = config.extra?.eas?.build?.experimental || {};
  const extensions = (experimental.ios?.appExtensions || []).filter((e) => e.targetName !== TARGET);
  extensions.push({
    targetName: TARGET,
    bundleIdentifier: `${bundle}.monitor`,
    entitlements: {
      'com.apple.developer.family-controls': true,
      'com.apple.security.application-groups': [group],
    },
  });
  config.extra = {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      build: {
        ...config.extra?.eas?.build,
        experimental: { ...experimental, ios: { ...experimental.ios, appExtensions: extensions } },
      },
    },
  };
  return withXcodeProject(config, (c) => {
    const project = c.modResults;
    const dest = path.join(c.modRequest.platformProjectRoot, TARGET);
    const src = path.join(c.modRequest.projectRoot, 'modules', 'unscroll');
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(
      path.join(src, 'extension', 'UnscrollMonitor.swift'),
      path.join(dest, 'UnscrollMonitor.swift'),
    );
    fs.copyFileSync(
      path.join(src, 'ios', 'ProtectionShared.swift'),
      path.join(dest, 'ProtectionShared.swift'),
    );
    fs.copyFileSync(
      path.join(src, 'ios', 'PrivacyInfo.xcprivacy'),
      path.join(dest, 'PrivacyInfo.xcprivacy'),
    );
    fs.writeFileSync(
      path.join(dest, `${TARGET}.entitlements`),
      plist(
        `<key>com.apple.developer.family-controls</key><true/><key>com.apple.security.application-groups</key><array><string>${xml(group)}</string></array>`,
      ),
    );
    fs.writeFileSync(
      path.join(dest, 'Info.plist'),
      plist(
        `<key>CFBundleDisplayName</key><string>Unscroll protection</string><key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string><key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string><key>CFBundleName</key><string>$(PRODUCT_NAME)</string><key>CFBundlePackageType</key><string>XPC!</string><key>CFBundleShortVersionString</key><string>$(MARKETING_VERSION)</string><key>CFBundleVersion</key><string>$(CURRENT_PROJECT_VERSION)</string><key>UnscrollAppGroup</key><string>${xml(group)}</string><key>NSExtension</key><dict><key>NSExtensionPointIdentifier</key><string>com.apple.deviceactivity.monitor-extension</string><key>NSExtensionPrincipalClass</key><string>$(PRODUCT_MODULE_NAME).UnscrollMonitor</string></dict>`,
      ),
    );
    const targets = project.pbxNativeTargetSection();
    let targetId = Object.keys(targets).find(
      (id) => targets[id]?.name?.replace(/"/g, '') === TARGET,
    );
    if (!targetId) {
      // xcode's addTarget requires these sections when adding the first extension.
      for (const section of ['PBXTargetDependency', 'PBXContainerItemProxy'])
        project.hash.project.objects[section] ||= {};
      const target = project.addTarget(TARGET, 'app_extension', TARGET, `${bundle}.monitor`);
      targetId = target.uuid;
      project.addBuildPhase(
        [`${TARGET}/UnscrollMonitor.swift`, `${TARGET}/ProtectionShared.swift`],
        'PBXSourcesBuildPhase',
        'Sources',
        targetId,
      );
      project.addBuildPhase(
        [`${TARGET}/PrivacyInfo.xcprivacy`],
        'PBXResourcesBuildPhase',
        'Resources',
        targetId,
      );
      project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetId);
      const groupNode = project.addPbxGroup(
        [
          `${TARGET}/UnscrollMonitor.swift`,
          `${TARGET}/ProtectionShared.swift`,
          `${TARGET}/Info.plist`,
          `${TARGET}/${TARGET}.entitlements`,
          `${TARGET}/PrivacyInfo.xcprivacy`,
        ],
        TARGET,
      );
      project.addToPbxGroup(groupNode.uuid, project.getFirstProject().firstProject.mainGroup);
    }
    const nativeTarget = project.pbxNativeTargetSection()[targetId];
    const list = project.pbxXCConfigurationList()[nativeTarget.buildConfigurationList];
    const builds = project.pbxXCBuildConfigurationSection();
    const mainTarget = project.getFirstTarget().firstTarget;
    const mainList = project.pbxXCConfigurationList()[mainTarget.buildConfigurationList];
    for (const ref of mainList.buildConfigurations)
      builds[ref.value].buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.4';
    const mainSettings = builds[mainList.buildConfigurations[0].value].buildSettings;
    for (const ref of list.buildConfigurations)
      Object.assign(builds[ref.value].buildSettings, {
        INFOPLIST_FILE: `"${TARGET}/Info.plist"`,
        CODE_SIGN_ENTITLEMENTS: `"${TARGET}/${TARGET}.entitlements"`,
        PRODUCT_BUNDLE_IDENTIFIER: `"${bundle}.monitor"`,
        IPHONEOS_DEPLOYMENT_TARGET: '17.4',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '"1,2"',
        APPLICATION_EXTENSION_API_ONLY: 'YES',
        CODE_SIGN_STYLE: 'Automatic',
        GENERATE_INFOPLIST_FILE: 'NO',
        CURRENT_PROJECT_VERSION: mainSettings.CURRENT_PROJECT_VERSION || '1',
        MARKETING_VERSION: mainSettings.MARKETING_VERSION || c.version || '1.0.0',
        ...(mainSettings.DEVELOPMENT_TEAM
          ? { DEVELOPMENT_TEAM: mainSettings.DEVELOPMENT_TEAM }
          : {}),
      });
    return c;
  });
}
module.exports = withUnscroll;
