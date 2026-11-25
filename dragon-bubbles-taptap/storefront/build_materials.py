"""Build and verify the landscape store trailer against the actual console requirements."""
from pathlib import Path
from tempfile import TemporaryDirectory
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from zipfile import ZipFile,ZIP_DEFLATED
from playwright.sync_api import sync_playwright
from PIL import Image
import hashlib,json,subprocess

ROOT=Path(__file__).resolve().parent
TARGET=ROOT/'gameplay-30s-1920x1080.mp4'
ARCHIVE=ROOT.parent/'dragon-bubbles-taptap-store-materials-1.0.0-complete.zip'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def protected():
 repo=ROOT.parents[1]
 originals=json.loads((ROOT.parent/'validation/protected-xhs-files.json').read_text())
 assert all(sha(repo/name)==value for name,value in originals.items())
 release=json.loads((ROOT.parent/'release.json').read_text())
 assert sha(ROOT.parent/release['file'])==release['sha256']
 return release['sha256']
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def build():
 game_sha=protected()
 with TemporaryDirectory() as temp:
  background=Path(temp)/'layout.png'
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT.parent)))
  Thread(target=server.serve_forever,daemon=True).start()
  try:
   with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    p=browser.new_page(viewport={'width':1920,'height':1080})
    p.goto(f'http://127.0.0.1:{server.server_port}/storefront/promo-layout.html')
    p.evaluate('document.fonts.ready')
    p.wait_for_function('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)')
    p.screenshot(path=str(background));browser.close()
  finally:server.shutdown()
  # Omit the 1.5-second startup; hold the last gameplay frame for 1.5 seconds.
  # The 9:16 recording stays 9:16 inside a 16:9 promotional layout.
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','30','-i',str(background),'-ss','1.5','-i',str(ROOT/'source/gameplay-portrait.mp4'),'-filter_complex','[1:v]scale=576:1024:flags=neighbor,setsar=1,tpad=stop_mode=clone:stop_duration=2[play];[0:v][play]overlay=1280:28:shortest=1,fps=30,format=yuv420p,setsar=1[out]','-map','[out]','-t','30','-an','-c:v','libx264','-profile:v','high','-level:v','4.0','-preset','fast','-crf','20','-movflags','+faststart',str(TARGET)],check=True)
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
 names=['icon-1024.png','banner-1920x1080.png']+sorted(p.name for p in ROOT.glob('screenshot-*.png'))+[TARGET.name,recording,'上架填写说明.md']
 files={}
 for name in names:
  path=ROOT/name;entry={'bytes':path.stat().st_size,'sha256':sha(path)}
  if path.suffix=='.png':
   with Image.open(path) as image:entry['width'],entry['height']=image.size
  files[name]=entry
 metadata={'date':'2026-11-25','game_version':'1.0.0','game_zip_unchanged_sha256':game_sha,'source_runtime':'dragon-bubbles-taptap/dist','requirements_source':'User TapTap material-library screenshots: promotional trailer landscape 16:9, at least 1280x720, MP4/MOV, <=5GB, >=15 seconds, H.264/HEVC; separate gameplay recording 15 seconds to 30 minutes','video':probe,'video_full_decode':'passed','gameplay_recording':recording_probe,'original_xhs_files_unchanged':True,'files':files}
 (ROOT/'manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
 with ZipFile(ARCHIVE,'w',ZIP_DEFLATED) as archive:
  for name in names+['manifest.json']:archive.write(ROOT/name,'taptap-store-materials/'+name)
 with ZipFile(ARCHIVE) as archive:
  assert archive.testzip() is None and len(archive.infolist())==11
  assert [n for n in archive.namelist() if n.endswith('.mp4')]==['taptap-store-materials/'+TARGET.name,'taptap-store-materials/'+recording]
 print(f'PASS: {TARGET.name}, 1920x1080 16:9 H.264, 30 seconds, full decode, game packages unchanged.')
 print(f'{ARCHIVE.name}: {ARCHIVE.stat().st_size} bytes; SHA256 {sha(ARCHIVE)}')
if __name__=='__main__':build()
