#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
TOOLS="${MORNING_ANDROID_TOOLS:-/workspace/.android-build-tools}"
BT="$TOOLS/android-15"
PLATFORM="$TOOLS/android-35/android.jar"
OUT="${MORNING_ANDROID_OUT:-/workspace/.android-build-tools/morning-output}"
mkdir -p "$OUT"
python3 - "$OUT" <<'PY'
from pathlib import Path
import shutil,sys
root=Path(sys.argv[1])
for name in ('compiled','generated','classes','dex'):
    folder=root/name
    if folder.is_symlink(): raise SystemExit('Generated output must not be a symlink')
    if folder.exists(): shutil.rmtree(folder)
    folder.mkdir()
PY
"$BT/aapt2" compile --dir res -o "$OUT/compiled/resources.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLATFORM" --manifest AndroidManifest.xml --java "$OUT/generated" --min-sdk-version 26 --target-sdk-version 35 "$OUT/compiled/resources.zip"
find src "$OUT/generated" -name '*.java' > "$OUT/sources.txt"
java -jar "$TOOLS/ecj.jar" -source 1.8 -target 1.8 -encoding UTF-8 -classpath "$PLATFORM" -d "$OUT/classes" @"$OUT/sources.txt"
find "$OUT/classes" -name '*.class' > "$OUT/classes.txt"
java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --release --min-api 26 --lib "$PLATFORM" --output "$OUT/dex" @"$OUT/classes.txt"
python3 - "$OUT" <<'PY'
import sys, zipfile
from pathlib import Path
out=Path(sys.argv[1])
with zipfile.ZipFile(out/'base.apk') as src, zipfile.ZipFile(out/'unsigned.apk','w',zipfile.ZIP_DEFLATED) as dst:
    for item in src.infolist(): dst.writestr(item,src.read(item.filename))
    dst.write(out/'dex/classes.dex','classes.dex')
PY
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
java -jar "$BT/lib/apksigner.jar" sign --ks "$TOOLS/signing/debug.p12" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$OUT/little-morning-0.2.1.apk" "$OUT/aligned.apk"
java -jar "$BT/lib/apksigner.jar" verify --verbose "$OUT/little-morning-0.2.1.apk"
"$BT/aapt2" dump badging "$OUT/little-morning-0.2.1.apk"
