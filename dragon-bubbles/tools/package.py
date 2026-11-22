"""Reproducible runtime ZIP; documents and developer tools stay outside the upload."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'build'
ALLOWED={'.html','.css','.js','.json','.jpg','.jpeg','.png','.gif','.svg','.webp','.woff','.woff2'}
meta=json.loads((ROOT/'tools/vendor-provenance.json').read_text())
assert hashlib.sha256((BUILD/'vendor/phaser-3.90.0.min.js').read_bytes()).hexdigest()==meta['vendored_sha256'],'Vendored engine checksum mismatch'
assert (BUILD/'index.html').is_file()
assert (BUILD/'vendor/LICENSE.html').is_file()
files=sorted(p for p in BUILD.rglob('*') if p.is_file())
for path in files:
    if path.is_symlink() or not path.resolve().is_relative_to(BUILD.resolve()):raise SystemExit(f'Unexpected link: {path}')
    if path.suffix.lower() not in ALLOWED:raise SystemExit(f'Unsupported runtime type: {path.name}')
output=ROOT/'dragon-bubbles-0.1.0.zip'
with ZipFile(output,'w',ZIP_DEFLATED) as archive:
    for path in files:
        info=ZipInfo(path.relative_to(BUILD).as_posix(),(2026,11,22,0,0,0))
        info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
        archive.writestr(info,path.read_bytes())
with ZipFile(output) as archive:
    assert archive.testzip() is None
    for path in files:assert archive.read(path.relative_to(BUILD).as_posix())==path.read_bytes()
print(f'{output.name}: {len(files)} runtime files, {output.stat().st_size} bytes; checksum, file types, root entry and ZIP contents verified.')
