"""Package only runtime assets, with index.html at ZIP root."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parent
ALLOWED = {'.html','.css','.js','.json','.jpg','.jpeg','.png','.svg','.gif','.webp','.woff','.woff2'}
files = sorted(p for p in (ROOT/'build').rglob('*') if p.is_file())
if not (ROOT/'build/index.html').is_file():
    raise SystemExit('Missing entry point')
for path in files:
    if path.is_symlink() or not path.resolve().is_relative_to((ROOT/'build').resolve()):
        raise SystemExit('Linked runtime assets are not supported')
    if path.suffix.lower() not in ALLOWED:
        raise SystemExit(f'Unsupported runtime file: {path.name}')
output = ROOT/'one-stroke-0.1.0.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, path.relative_to(ROOT/'build').as_posix())
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert 'index.html' in archive.namelist()
    for path in files:
        assert archive.read(path.relative_to(ROOT/'build').as_posix()) == path.read_bytes()
print(output.name, output.stat().st_size, 'bytes; runtime entries:', ', '.join(p.name for p in files))
