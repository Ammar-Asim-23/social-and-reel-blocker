"""Fail CI if the release APK regains unneeded sensitive permissions."""
import os
from pathlib import Path
import subprocess
import shutil
import sys
import xml.etree.ElementTree as ET

FORBIDDEN = {
    "SYSTEM_ALERT_WINDOW", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE",
    "READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO", "READ_MEDIA_AUDIO", "RECORD_AUDIO",
    "CAMERA", "REQUEST_INSTALL_PACKAGES", "QUERY_ALL_PACKAGES",
    "READ_SMS", "RECEIVE_SMS", "READ_CONTACTS", "ACCESS_FINE_LOCATION",
}


def validate_manifest(manifest):
    root = ET.fromstring(manifest)
    android = "{http://schemas.android.com/apk/res/android}"
    declared = {n.get(android + "name", "") for n in root if n.tag.startswith("uses-permission")}
    unexpected = declared & {"android.permission." + name for name in FORBIDDEN}
    if unexpected:
        raise ValueError("Unexpected release permissions: " + ", ".join(sorted(unexpected)))
    protection = [s for s in root.findall("application/service")
                  if s.get(android + "name", "").endswith(".ProtectionService")]
    if len(protection) != 1 or protection[0].get(android + "permission") != "android.permission.BIND_ACCESSIBILITY_SERVICE":
        raise ValueError("Missing or unprotected Accessibility service in release APK")
    return declared


if __name__ == "__main__":
    sdk = Path(os.environ.get("ANDROID_HOME") or os.environ["ANDROID_SDK_ROOT"])
    analyzer = shutil.which("apkanalyzer") or str(sdk / "cmdline-tools" / "latest" / "bin" / "apkanalyzer")
    manifest = subprocess.check_output([analyzer, "manifest", "print", sys.argv[1]], text=True)
    print("Release manifest verified. Declared permissions: " + ", ".join(sorted(validate_manifest(manifest))))
