"""Download pinned build prerequisites with upstream checksums. No global install."""
from pathlib import Path
import hashlib
import os
import subprocess
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

root = Path(os.environ.get('MORNING_ANDROID_TOOLS', '/workspace/.android-build-tools'))
root.mkdir(parents=True, exist_ok=True)
archives = [
    ('platform-35_r02.zip', '0bb560a90a7a2cbd0dd8348224d518b638fe7949'),
    ('build-tools_r35_linux.zip', '2cfaa0bbb2336e9ec18ed3ecea84fa2e2af607bc'),
]
with urllib.request.urlopen('https://dl.google.com/android/repository/repository2-1.xml') as response:
    repository = ET.fromstring(response.read())
for name, expected in archives:
    matches = [a for a in repository.findall('.//archive') if a.findtext('complete/url') == name]
    if matches:
        assert any(a.findtext('complete/checksum') == expected for a in matches), 'Upstream checksum changed'
    archive = root / name
    if not archive.exists():
        urllib.request.urlretrieve('https://dl.google.com/android/repository/' + name, archive)
    assert hashlib.sha1(archive.read_bytes()).hexdigest() == expected
    with zipfile.ZipFile(archive) as z:
        z.extractall(root)
        for item in z.infolist():
            mode = item.external_attr >> 16
            if mode & 0o111:
                os.chmod(root / item.filename, mode & 0o777)
url = 'https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.38.0/ecj-3.38.0.jar'
compiler = root / 'ecj.jar'
if not compiler.exists():
    urllib.request.urlretrieve(url, compiler)
with urllib.request.urlopen(url + '.sha1') as response:
    expected = response.read().decode().strip()
assert hashlib.sha1(compiler.read_bytes()).hexdigest() == expected
key = root / 'signing/debug.p12'
if not key.exists():
    key.parent.mkdir(exist_ok=True)
    subprocess.run(['keytool', '-genkeypair', '-keystore', str(key), '-storetype', 'PKCS12',
                    '-storepass', 'android', '-keypass', 'android', '-alias', 'androiddebugkey',
                    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
                    '-dname', 'CN=Little Morning Demo, O=Development, C=CN', '-noprompt'], check=True)
print('Verified build tools ready:', root)
