"""Build and verify the landscape store trailer against the actual console requirements."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from PIL import Image
import hashlib,json,subprocess
from build_fullscreen_trailer import TARGET,build_trailer

ROOT=Path(__file__).resolve().parent
ARCHIVE=ROOT.parent/'dragon-bubbles-taptap-store-materials-1.0.0-complete.zip'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def protected():
 repo=ROOT.parents[1]
 originals=json.loads((ROOT.parent/'validation/protected-xhs-files.json').read_text())
 assert all(sha(repo/name)==value for name,value in originals.items())
 release=json.loads((ROOT.parent/'release.json').read_text())
 assert sha(ROOT.parent/release['file'])==release['sha256']
 return release['sha256']
def build():
 game_sha=protected()
 trailer_report=build_trailer()
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,format_name:stream=codec_name,codec_type,width,height,r_frame_rate,sample_aspect_ratio,display_aspect_ratio,pix_fmt','-of','json',str(TARGET)],text=True))
 video=[s for s in probe['streams'] if s['codec_type']=='video'];assert len(video)==1
 stream=video[0]
 assert stream['codec_name']=='h264' and stream['width']==1920 and stream['height']==1080
 assert stream['display_aspect_ratio']=='16:9' and stream['sample_aspect_ratio']=='1:1'
 assert stream['r_frame_rate']=='30/1' and stream['pix_fmt']=='yuv420p'
 assert float(probe['format']['duration'])==30 and TARGET.stat().st_size<5*1024**3
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(TARGET),'-f','null','-'],check=True)
 protected()
 recording='gameplay-recording-60s-720x1280.mp4'
 recording_probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height','-of','json',str(ROOT/recording)],text=True))
 assert 15<=float(recording_probe['format']['duration'])<=1800
 assert any(s['codec_type']=='video' and s['codec_name']=='h264' for s in recording_probe['streams'])
 assert any(s['codec_type']=='audio' and s['codec_name']=='aac' for s in recording_probe['streams'])
 names=['icon-1024.png','banner-title-only-1920x1080.png','banner-title-only-1440x1440.png']+sorted(p.name for p in ROOT.glob('screenshot-*.png'))+[TARGET.name,recording,'上架填写说明.md']
 files={}
 for name in names:
  path=ROOT/name;entry={'bytes':path.stat().st_size,'sha256':sha(path)}
  if path.suffix=='.png':
   with Image.open(path) as image:entry['width'],entry['height']=image.size
  files[name]=entry
 assert (files['banner-title-only-1440x1440.png']['width'],files['banner-title-only-1440x1440.png']['height'])==(1440,1440)
 metadata={'date':'2026-11-25','game_version':'1.0.0','game_zip_unchanged_sha256':game_sha,'source_runtime':'dragon-bubbles-taptap/dist','requirements_source':'User TapTap material-library screenshots: promotional trailer landscape 16:9, at least 1280x720, MP4/MOV, <=5GB, >=15 seconds, H.264/HEVC; separate gameplay recording 15 seconds to 30 minutes','video':probe,'video_full_decode':'passed','gameplay_recording':recording_probe,'original_xhs_files_unchanged':True,'files':files}
 metadata['video_content_policy']=trailer_report
 metadata['square_banner_requirement']={'source':'User TapTap release screenshot, square promotion field','width':1440,'height':1440,'aspect_ratio':'1:1'}
 metadata['promotion_image_text_policy']={'source':'User-provided TapTap risk review screenshot','allowed_text':'阿噗的糖果弹弹冒险','removed':'English decorative title, slogan, gameplay descriptions, feature labels and stage counts'}
 (ROOT/'manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
 with ZipFile(ARCHIVE,'w',ZIP_DEFLATED) as archive:
  for name in names+['manifest.json']:archive.write(ROOT/name,'taptap-store-materials/'+name)
 with ZipFile(ARCHIVE) as archive:
  assert archive.testzip() is None and len(archive.infolist())==12
  assert [n for n in archive.namelist() if n.endswith('.mp4')]==['taptap-store-materials/'+TARGET.name,'taptap-store-materials/'+recording]
 print(f'PASS: {TARGET.name}, 1920x1080 16:9 H.264, 30 seconds, full decode, game packages unchanged.')
 print(f'{ARCHIVE.name}: {ARCHIVE.stat().st_size} bytes; SHA256 {sha(ARCHIVE)}')
if __name__=='__main__':build()
