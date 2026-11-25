"""Build a separate TapTap H5 upload ZIP from the immutable latest XHS release."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import hashlib,json,subprocess,shutil

ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parent
SOURCE=REPO/'dragon-bubbles/dragon-bubbles-1.0.2-xhs-secret-prompt.zip'
SOURCE_SHA='2683f5bc4230f44f8bf863dcd12b36db0bd7ac67a38fa010eca8b2dc873dcf62'
SOURCE_MANIFEST=REPO/'dragon-bubbles/releases/1.0.2-xhs-secret-prompt/manifest.json'
VERSION='1.0.0';OUTPUT=ROOT/f'dragon-bubbles-taptap-h5-{VERSION}.zip'
def sha(data):return hashlib.sha256(data).hexdigest()
def protected():
 names=subprocess.check_output(['git','ls-files','-z','--','dragon-bubbles','quantdash-promo'],cwd=REPO).decode().split('\0')
 return {name:sha((REPO/name).read_bytes()) for name in names if name}

def build():
 before=protected();assert sha(SOURCE.read_bytes())==SOURCE_SHA,'Latest source package changed'
 meta=json.loads(SOURCE_MANIFEST.read_text())
 with ZipFile(SOURCE) as archive:
  assert archive.testzip() is None
  entries={n:archive.read(n) for n in archive.namelist()}
 assert len(entries)==196 and set(entries)==set(meta['file_sha256'])
 for name,value in entries.items():assert sha(value)==meta['file_sha256'][name],name
 original={**entries}
 result=subprocess.run(['node',str(ROOT/'tools/transform.cjs')],input=json.dumps({'app':entries['app.js'].decode(),'adapter':(ROOT/'src/storage.js').read_text(),'expectedStorageHash':meta['unmodified_core_module_sha256']['storage']}),text=True,capture_output=True,check=True)
 converted=json.loads(result.stdout);entries['app.js']=converted['app'].encode()
 entries['platform.js']=(ROOT/'src/platform.js').read_bytes()
 html=entries['index.html'].decode();needle='<script defer src="video-config.js"></script>'
 assert html.count(needle)==1
 html=html.replace(needle,'<script defer src="platform.js"></script>'+needle)
 entries['index.html']=html.encode()
 assert [n for n in entries if n.endswith('.html')]==['index.html']
 assert not any(n.endswith(('.md','.map','.py','.cjs')) for n in entries)
 assert entries['video-config.js']==original['video-config.js']
 changed=sorted(n for n in original if original[n]!=entries[n]);assert changed==['app.js','index.html']
 assert len(entries)==197
 with TemporaryDirectory(prefix='taptap-build-',dir=ROOT) as folder:
  temp=Path(folder);runtime=temp/'runtime';runtime.mkdir()
  for name,data in entries.items():p=runtime/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
  subprocess.run(['node','--check',str(runtime/'app.js')],check=True)
  archive_path=temp/'release.zip'
  with ZipFile(archive_path,'w',ZIP_DEFLATED) as archive:
   for name,data in sorted(entries.items()):
    info=ZipInfo(name,(2026,11,25,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16;archive.writestr(info,data)
  with ZipFile(archive_path) as archive:assert archive.testzip() is None and all(archive.read(n)==data for n,data in entries.items())
  assert before==protected(),'Existing XHS files changed during build'
  # Only this isolated target is replaced; original files and old release ZIPs are never written.
  if (ROOT/'dist').exists():shutil.rmtree(ROOT/'dist')
  shutil.copytree(runtime,ROOT/'dist');shutil.copyfile(archive_path,OUTPUT)
 manifest={'target':'taptap-h5','version':VERSION,'source_package':SOURCE.relative_to(REPO).as_posix(),'source_sha256':SOURCE_SHA,'source_game_version':'1.0.2-xhs-secret-prompt','file':OUTPUT.name,'bytes':OUTPUT.stat().st_size,'sha256':sha(OUTPUT.read_bytes()),'files':len(entries),'entry':'index.html','orientation':'portrait','screen_orientation_value':1,'storage':{'backend':'HTML5 localStorage','game_key':'apu-taptap-h5-v1','audio_key':'apu-taptap-audio-v1','cloud_sync':False,'xhs_bridge_required':False},'changed_source_files':changed,'added_files':['platform.js'],'unchanged_source_files':len(original)-len(changed),'approved_promo_unchanged':True,'platform_upload_performed':False,'platform_review_performed':False,'file_sha256':{name:sha(data) for name,data in sorted(entries.items())}}
 (ROOT/'release.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'validation/protected-xhs-files.json').write_text(json.dumps(before,ensure_ascii=False,indent=2)+'\n')
 print(f'{OUTPUT.name}: {len(entries)} files, {OUTPUT.stat().st_size} bytes; existing XHS files unchanged.')
 return manifest
if __name__=='__main__':build()
