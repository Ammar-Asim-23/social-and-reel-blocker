import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("permissions", Path(__file__).with_name("check-apk-permissions.py"))
permissions = importlib.util.module_from_spec(spec)
spec.loader.exec_module(permissions)


class ReleasePermissionsTest(unittest.TestCase):
    def manifest(self, permission="INTERNET", service_permission="BIND_ACCESSIBILITY_SERVICE"):
        return f'''<manifest xmlns:android="http://schemas.android.com/apk/res/android">
          <uses-permission android:name="android.permission.{permission}"/>
          <application><service android:name="app.unscroll.nativebridge.ProtectionService"
          android:permission="android.permission.{service_permission}"/></application></manifest>'''

    def test_minimal_manifest_accepts_signature_protected_service(self):
        self.assertEqual(permissions.validate_manifest(self.manifest()), {"android.permission.INTERNET"})

    def test_transitive_sensitive_permissions_are_rejected(self):
        for name in permissions.FORBIDDEN:
            with self.subTest(permission=name), self.assertRaises(ValueError):
                permissions.validate_manifest(self.manifest(permission=name))

    def test_service_cannot_lose_signature_permission(self):
        with self.assertRaises(ValueError):
            permissions.validate_manifest(self.manifest(service_permission="INTERNET"))


if __name__ == "__main__":
    unittest.main()
