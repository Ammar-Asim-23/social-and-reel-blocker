import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('build ignore rules keep native module source but exclude generated projects', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'unscroll-ignore-'));
  try {
    execFileSync('git', ['init', '--quiet', fixture]);
    copyFileSync('.gitignore', join(fixture, '.gitignore'));
    const ignored = (file: string) => {
      const result = spawnSync(
        'git',
        ['-c', 'core.excludesFile=', 'check-ignore', '--no-index', file],
        { cwd: fixture },
      );
      assert.ok(result.status === 0 || result.status === 1, result.stderr.toString());
      return result.status === 0;
    };
    assert.equal(ignored('android/app/build.gradle'), true);
    assert.equal(ignored('ios/Unscroll/AppDelegate.swift'), true);
    for (const file of [
      'modules/unscroll/android/build.gradle',
      'modules/unscroll/android/src/main/AndroidManifest.xml',
      'modules/unscroll/android/src/main/java/app/unscroll/nativebridge/UnscrollModule.kt',
      'modules/unscroll/ios/Unscroll.podspec',
      'modules/unscroll/ios/UnscrollModule.swift',
      'modules/unscroll/extension/UnscrollMonitor.swift',
    ])
      assert.equal(ignored(file), false, `${file} must be uploaded`);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
