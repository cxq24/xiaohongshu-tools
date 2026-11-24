"""Build and run Android UI/service checks on an already booted disposable emulator."""
from pathlib import Path
import os, subprocess, zipfile

root=Path(os.environ.get('MORNING_ANDROID_TOOLS','/workspace/.android-build-tools'))
app=Path(__file__).resolve().parents[1]
out=root/'minimal-home-instrumentation'
out.mkdir(exist_ok=True)
bt=root/'android-15'
platform=root/'android-35/android.jar'
adb=root/'platform-tools/adb'
serial=os.environ.get('MORNING_TEST_EMULATOR','emulator-5554')
if not serial.startswith('emulator-'):
    raise SystemExit('This destructive preference-reset test is for disposable emulators only')

def run(args, **kwargs):
    return subprocess.run([str(a) for a in args],check=True,**kwargs)

boot=subprocess.check_output([str(adb),'-s',serial,'shell','getprop','sys.boot_completed'],text=True).strip()
if boot!='1': raise SystemExit('Emulator must finish boot before this test')
manifest='''<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.littlemorning.alarm.tests"><uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35"/><application android:label="Morning UI test"/><instrumentation android:name="com.littlemorning.alarm.MinimalHomeInstrumentation" android:targetPackage="com.littlemorning.alarm" android:label="Redesign"/></manifest>'''
(out/'AndroidManifest.xml').write_text(manifest)
for folder in ('classes','dex'):
    import shutil
    path=out/folder
    if path.exists(): shutil.rmtree(path)
    path.mkdir()
run([bt/'aapt2','link','-o',out/'base.apk','-I',platform,'--manifest',out/'AndroidManifest.xml'])
run(['java','-jar',root/'ecj.jar','-source','1.8','-target','1.8','-encoding','UTF-8','-classpath',str(platform)+':'+str(root/'morning-output/classes'),'-d',out/'classes',app/'tests/MinimalHomeInstrumentation.java'])
run(['java','-cp',bt/'lib/d8.jar','com.android.tools.r8.D8','--min-api','26','--lib',platform,'--classpath',root/'morning-output/classes','--output',out/'dex']+list((out/'classes').rglob('*.class')))
with zipfile.ZipFile(out/'base.apk') as source, zipfile.ZipFile(out/'unsigned.apk','w',zipfile.ZIP_DEFLATED) as dest:
    for entry in source.infolist():dest.writestr(entry,source.read(entry.filename))
    dest.write(out/'dex/classes.dex','classes.dex')
run([bt/'zipalign','-f','-p','4',out/'unsigned.apk',out/'aligned.apk'])
run(['java','-jar',bt/'lib/apksigner.jar','sign','--ks',root/'signing/debug.p12','--ks-pass','pass:android','--key-pass','pass:android','--out',out/'tests.apk',out/'aligned.apk'])
run([adb,'-s',serial,'install','--no-incremental','-r',out/'tests.apk'])
seed=subprocess.run([str(adb),'-s',serial,'shell','am','instrument','-r','-w','-e','mode','seed','com.littlemorning.alarm.tests/com.littlemorning.alarm.MinimalHomeInstrumentation'],text=True,capture_output=True,timeout=80)
print(seed.stdout)
if seed.returncode!=0 or 'PASS:' not in seed.stdout:raise SystemExit('Could not seed upgrade preferences')
run([adb,'-s',serial,'install','--no-incremental','-r',root/'morning-output/little-morning-0.2.1.apk'])
for args in (
    ['settings','put','system','font_scale','1.0'],
    ['pm','grant','com.littlemorning.alarm','android.permission.POST_NOTIFICATIONS'],
    ['pm','revoke','com.littlemorning.alarm','android.permission.READ_CALENDAR'],
    ['appops','set','com.littlemorning.alarm','SCHEDULE_EXACT_ALARM','allow'],
    ['appops','set','com.littlemorning.alarm','USE_FULL_SCREEN_INTENT','allow'],
):run([adb,'-s',serial,'shell',*args])
result=subprocess.run([str(adb),'-s',serial,'shell','am','instrument','-r','-w','com.littlemorning.alarm.tests/com.littlemorning.alarm.MinimalHomeInstrumentation'],text=True,capture_output=True,timeout=480)
text=result.stdout+result.stderr
(root/'minimal-home-tests.log').write_text(text)
print(text)
if result.returncode!=0 or 'PASS:' not in text or 'FAIL:' in text:raise SystemExit(1)
destination=Path('/workspace/shared/morning-alarm-demo/0.2.1-previews/native')
destination.mkdir(parents=True,exist_ok=True)
run([adb,'-s',serial,'pull','/sdcard/Android/data/com.littlemorning.alarm/files/minimal-home-previews/.',destination])
