"""Validate the 200-file deployment ceiling and profile compilation and unchanged runtime assets of the real upload ZIPs."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
import importlib.util, hashlib, json, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('candy_package', ROOT/'tools/package.py')
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)
results = {}
for playtest in [False, True]:
    archive_path = compiler.package(playtest)
    expected, source_count, script_count = compiler.compile_runtime(playtest)
    with ZipFile(archive_path) as archive:
        actual = {name: archive.read(name) for name in archive.namelist()}
        assert actual == expected
        assert len(actual) == 199 <= 200
        assert not any(info.is_dir() for info in archive.infolist())
        assert compiler.SCRIPT.findall(actual['index.html'].decode()) == ['video-config.js', 'app.js']
        css = (ROOT/'build/style.css').read_text()
        assert '<style>\n'+css+'\n</style>' in actual['index.html'].decode()
        for source in (ROOT/'build').rglob('*'):
            if not source.is_file():
                continue
            name = source.relative_to(ROOT/'build').as_posix()
            if source.suffix == '.js' and name != 'video-config.js':
                assert name not in actual, name
                if name == 'vendor/phaser-3.90.0.min.js':
                    assert source.read_bytes() in actual['app.js']
            elif name not in ['index.html', 'style.css']:
                assert actual[name] == source.read_bytes(), name
        assert sum(name.endswith('.png') for name in actual) == 195
        with TemporaryDirectory() as temp:
            script = Path(temp)/'app.js'
            script.write_bytes(actual['app.js'])
            subprocess.run(['node', '--check', str(script)], check=True)
    if not playtest:
        for marker in ['测试版','测试火力','补满测试道具','apu-candy-playtest-v1','testFireRank','testStockVersion']:
            assert marker.encode() not in actual['app.js']
    else:
        assert '测试火力'.encode() in actual['app.js']
    results['test' if playtest else 'normal'] = {'files':len(actual),'source_files':source_count,'bundled_scripts':script_count,'pngs':195,'sha256':hashlib.sha256(archive_path.read_bytes()).hexdigest()}
with ZipFile(ROOT/f'dragon-bubbles-{compiler.VERSION}.zip') as normal, ZipFile(ROOT/f'dragon-bubbles-{compiler.VERSION}-test.zip') as test:
    assert normal.namelist() == test.namelist()
    assert [n for n in normal.namelist() if normal.read(n) != test.read(n)] == ['app.js']

# Actual source-tree fixture: 200 is accepted; adding one more image is rejected
# before touching the last valid archive. No platform upload is needed to catch it.
with TemporaryDirectory() as temp:
    fixture = Path(temp)
    shutil.copytree(ROOT/'build',fixture/'build')
    for name in ['tools/package.py','tools/vendor-provenance.json','tools/font-provenance.json','PHASER-LICENSE.txt','FONT-LICENSE.txt']:
        target = fixture/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/name,target)
    shutil.copytree(ROOT/'tools/bundler',fixture/'tools/bundler')
    image = (ROOT/'build/assets/star.png').read_bytes()
    for n in range(1):
        (fixture/f'build/assets/future-{n}.png').write_bytes(image)
    command = [sys.executable,str(fixture/'tools/package.py')]
    subprocess.run(command,check=True,capture_output=True,text=True)
    archive = fixture/f'dragon-bubbles-{compiler.VERSION}.zip'
    with ZipFile(archive) as package:
        assert len(package.namelist()) == 200
    before = archive.read_bytes()
    (fixture/'build/assets/future-2.png').write_bytes(image)
    refused = subprocess.run(command,capture_output=True,text=True)
    assert refused.returncode != 0 and '201 exceeds platform limit 200' in refused.stderr
    assert archive.read_bytes() == before
results.update(version=compiler.VERSION,all_images_and_font_unchanged=True,all_project_scripts_compiled=True,production_test_code_removed=True,vendored_engine_unchanged=True,normal_test_difference='app.js',boundary_200_accepted=True,overflow_201_refused=True,previous_archive_preserved_on_error=True)
(ROOT/f'tools/package-results-{compiler.VERSION}.json').write_text(json.dumps(results,indent=2)+'\n')
print('PASS: 214→199 upload files, all assets/styles/engine retained; production test code removed, both bundles parse, 200 accepted, 201 rejected without changing the previous archive.')
