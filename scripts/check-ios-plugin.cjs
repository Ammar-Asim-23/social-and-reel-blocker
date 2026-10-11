const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const xcode = require(
  require.resolve('xcode', { paths: [require.resolve('expo/config-plugins')] }),
);
const withUnscroll = require('../plugins/withUnscroll');
async function main() {
  const root = path.resolve(__dirname, '..');
  const template = process.argv[2];
  if (!template) throw new Error('Pass the path to an Expo bare-template project.pbxproj');
  const project = xcode.project(path.resolve(template));
  project.parseSync();
  const out = path.join(root, 'verification', 'ios-plugin');
  fs.mkdirSync(out, { recursive: true });
  const config = withUnscroll({
    name: 'Unscroll',
    slug: 'unscroll',
    version: '1.0.0',
    ios: { bundleIdentifier: 'app.unscroll.focus' },
  });
  const request = {
    projectRoot: root,
    platformProjectRoot: out,
    platform: 'ios',
    modName: 'xcodeproj',
  };
  for (let i = 0; i < 2; i++)
    await config.mods.ios.xcodeproj({ ...config, modResults: project, modRequest: request });
  const targets = Object.values(project.pbxNativeTargetSection()).filter(
    (t) => t.name?.replace(/"/g, '') === 'UnscrollMonitor',
  );
  assert.equal(targets.length, 1, 'Prebuild must not duplicate the extension');
  const target = targets[0];
  const list = project.pbxXCConfigurationList()[target.buildConfigurationList];
  for (const ref of list.buildConfigurations) {
    const settings = project.pbxXCBuildConfigurationSection()[ref.value].buildSettings;
    assert.equal(settings.IPHONEOS_DEPLOYMENT_TARGET, '17.4');
    assert.match(settings.CODE_SIGN_ENTITLEMENTS, /UnscrollMonitor.entitlements/);
    assert.equal(settings.PRODUCT_BUNDLE_IDENTIFIER, '"app.unscroll.focus.monitor"');
  }
  assert.equal(target.buildPhases.length, 3);
  const sourcePhase = target.buildPhases.find((p) => p.comment === 'Sources');
  assert.equal(
    project.hash.project.objects.PBXSourcesBuildPhase[sourcePhase.value].files.length,
    2,
  );
  const main = project.getFirstTarget().firstTarget;
  assert.equal(main.dependencies.length, 1);
  assert.ok(fs.existsSync(path.join(out, 'UnscrollMonitor', 'ProtectionShared.swift')));
  const ent = await config.mods.ios.entitlements({
    ...config,
    modResults: {},
    modRequest: request,
  });
  assert.equal(ent.modResults['com.apple.developer.family-controls'], true);
  assert.deepEqual(ent.modResults['com.apple.security.application-groups'], [
    'group.app.unscroll.focus',
  ]);
  const generated = path.join(out, 'project.pbxproj');
  fs.writeFileSync(generated, project.writeSync());
  xcode.project(generated).parseSync();
  console.log(
    'iOS plugin passed: sources, embedding, entitlements, deployment target, idempotence, and project round-trip.',
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
