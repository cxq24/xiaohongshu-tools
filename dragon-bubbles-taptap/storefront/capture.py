"""Render store layouts and capture actual unmodified H5 gameplay separately from releases."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
import subprocess,time

ROOT=Path(__file__).resolve().parent
(ROOT/'source').mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT.parent)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
def ready(page):page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state === "title" && window.CandyStore?.status().loaded',timeout=30000)
def scene(page,code):return page.evaluate('()=>{const s=candyGame.scene.getScene("Adventure");'+code+'}')
try:
 with TemporaryDirectory() as temp, sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  p=b.new_page()
  for mode,w,h,name in [('icon',1024,1024,'icon-1024.png'),('banner',1920,1080,'banner-1920x1080.png')]:
   p.set_viewport_size({'width':w,'height':h});p.goto(base+'/storefront/artwork.html?mode='+mode);p.evaluate('document.fonts.ready');p.wait_for_function('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)');p.screenshot(path=str(ROOT/name))
  p.close()
  c=b.new_context(viewport={'width':360,'height':640},device_scale_factor=2)
  p=c.new_page();p.goto(base+'/dist/');ready(p);p.wait_for_timeout(600);p.screenshot(path=str(ROOT/'screenshot-01-title.png'))
  scene(p,'s.showLevels()');p.wait_for_timeout(450);p.screenshot(path=str(ROOT/'screenshot-02-worlds.png'))
  scene(p,'s.showChapter(0)');p.wait_for_timeout(450);p.screenshot(path=str(ROOT/'screenshot-03-chapter.png'))
  scene(p,'s.startLevel(0);s.beginLevel();s.angle=-1.16;s.fire()');p.wait_for_timeout(1100);p.screenshot(path=str(ROOT/'screenshot-04-battle.png'))
  scene(p,'s.showWorkshop("dragon")');p.wait_for_timeout(450);p.screenshot(path=str(ROOT/'screenshot-05-outfits.png'));c.close()
  c=b.new_context(viewport={'width':360,'height':640},device_scale_factor=2,record_video_dir=temp,record_video_size={'width':360,'height':640})
  p=c.new_page();p.goto(base+'/dist/');ready(p);p.wait_for_timeout(1800)
  scene(p,'s.showLevels()');p.wait_for_timeout(2500)
  scene(p,'s.showChapter(0)');p.wait_for_timeout(2500)
  scene(p,'s.startLevel(0)');p.wait_for_timeout(1800);scene(p,'s.beginLevel()')
  until=time.monotonic()+24;turn=0
  while time.monotonic()<until:
   state=scene(p,'return s.state')
   if state=='ready':
    scene(p,f's.angle={[-1.16,-1.9,-1.45][turn%3]};s.fire()');turn+=1
   p.wait_for_timeout(150)
  video=p.video;c.close();source=video.path()
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-t','30','-an','-vf','scale=720:1280:flags=neighbor,fps=30,format=yuv420p','-c:v','libx264','-preset','fast','-crf','22','-movflags','+faststart',str(ROOT/'source/gameplay-portrait.mp4')],check=True)
  b.close()
finally:server.shutdown()
print('Rendered 2 store artworks, 5 screenshots, and internal portrait source. Run build_materials.py for the landscape upload trailer.')
