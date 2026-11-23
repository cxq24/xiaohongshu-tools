"""Compile a reproducible, single-entry upload ZIP within the platform's 200-file limit.
Authoring sources stay split in build/. Only the deployment representation is bundled.
"""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json, hashlib, argparse, re

VERSION = '0.9.0'
MAX_FILES = 200
ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build'
ALLOWED = {'.html', '.css', '.js', '.json', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.woff', '.woff2'}
SCRIPT = re.compile(r'<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>', re.I)
STYLESHEET = re.compile(r'<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>', re.I)


def compile_runtime(playtest=False):
    files = sorted(p for p in BUILD.rglob('*') if p.is_file())
    entries = {}
    for path in files:
        if path.is_symlink() or not path.resolve().is_relative_to(BUILD.resolve()):
            raise ValueError(f'Unexpected link: {path}')
        if path.suffix.lower() not in ALLOWED:
            raise ValueError(f'Unsupported runtime type: {path.name}')
        entries[path.relative_to(BUILD).as_posix()] = path.read_bytes()
    if [n for n in entries if Path(n).suffix.lower() in {'.html', '.htm'}] != ['index.html']:
        raise ValueError('Only root index.html is allowed')
    html = entries['index.html'].decode('utf-8')
    engine = 'vendor/phaser-3.90.0.min.js'
    meta = json.loads((ROOT / 'tools/vendor-provenance.json').read_text())
    if hashlib.sha256(entries[engine]).hexdigest() != meta['vendored_sha256']:
        raise ValueError('Vendored engine checksum mismatch')
    notices = [(ROOT / 'PHASER-LICENSE.txt').read_text().strip(), (ROOT / 'FONT-LICENSE.txt').read_text().strip()]
    if any(notice not in html for notice in notices):
        raise ValueError('Complete engine and font licenses must stay in index.html')
    font = json.loads((ROOT / 'tools/font-provenance.json').read_text())
    if hashlib.sha256(entries['assets/' + font['file']]).hexdigest() != font['sha256']:
        raise ValueError('Font checksum mismatch')

    scripts = SCRIPT.findall(html)
    if len(scripts) != len(set(scripts)) or any(name not in entries for name in scripts):
        raise ValueError('Missing or duplicate entry script')
    if not {'video-config.js', 'release-config.js', engine}.issubset(scripts):
        raise ValueError('Missing required configuration or engine script')
    # The plain settings file remains editable, and runs before promo initialization.
    bundled = [name for name in scripts if name != 'video-config.js']
    pieces = []
    for name in bundled:
        source = entries.pop(name)
        if name == 'release-config.js' and playtest:
            source = f"window.CandyRelease=Object.freeze({{version:'{VERSION}',playtest:true}});\n".encode()
        # Explicit separators preserve independent script boundaries and all source notices.
        pieces.append(b';\n/* Bundled source: ' + name.encode() + b' */\n' + source + b'\n;\n')
    if 'app.js' in entries:
        raise ValueError('app.js is reserved for the deployment bundle')
    entries['app.js'] = b''.join(pieces)
    inserted = False

    def replace_script(match):
        nonlocal inserted
        if inserted:
            return ''
        inserted = True
        return '<script defer src="video-config.js"></script><script defer src="app.js"></script>'

    html = SCRIPT.sub(replace_script, html)

    def inline_style(match):
        name = match.group(1)
        if name not in entries:
            raise ValueError(f'Missing stylesheet: {name}')
        css = entries.pop(name).decode('utf-8')
        if '</style' in css.lower():
            raise ValueError('Stylesheet contains a closing style tag')
        # Both the original CSS and the HTML are at the root, so asset URLs are unchanged.
        return '<style>\n' + css + '\n</style>'

    html = STYLESHEET.sub(inline_style, html)
    entries['index.html'] = html.encode('utf-8')
    if len(entries) > MAX_FILES:
        raise ValueError(f'Runtime file count {len(entries)} exceeds platform limit {MAX_FILES}; no ZIP written')
    if any(notice not in html for notice in notices):
        raise ValueError('Bundling removed license notices')
    return entries, len(files), len(bundled)


def package(playtest=False):
    entries, source_count, bundled_count = compile_runtime(playtest)
    output = ROOT / f'dragon-bubbles-{VERSION}{"-test" if playtest else ""}.zip'
    with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
        for name, data in sorted(entries.items()):
            info = ZipInfo(name, (2026, 11, 22, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    with ZipFile(output) as archive:
        assert archive.testzip() is None
        assert len(archive.infolist()) <= MAX_FILES
        assert not any(i.is_dir() for i in archive.infolist())
        assert [n for n in archive.namelist() if Path(n).suffix.lower() in {'.html', '.htm'}] == ['index.html']
        assert all(archive.read(n) == data for n, data in entries.items())
    print(f'{output.name}: {source_count} sources → {len(entries)}/{MAX_FILES} upload files; '
          f'{bundled_count} scripts bundled, CSS inlined; {output.stat().st_size} bytes. '
          'File count, types, licenses, checksums and ZIP contents verified.')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', action='store_true')
    args = parser.parse_args()
    try:
        package(args.test)
    except ValueError as error:
        raise SystemExit(str(error))
