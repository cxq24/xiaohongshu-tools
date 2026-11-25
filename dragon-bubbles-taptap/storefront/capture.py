"""Render store layouts and capture actual unmodified H5 gameplay separately from releases."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT.parent)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
def ready(page):page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state === "title" && window.CandyStore?.status().loaded',timeout=30000)
def scene(page,code):return page.evaluate('()=>{const s=candyGame.scene.getScene("Adventure");'+code+'}')
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  p=b.new_page()
  for mode,w,h,name in [('icon',1024,1024,'icon-1024.png'),('banner',1920,1080,'banner-title-only-1920x1080.png'),('square',1440,1440,'banner-title-only-1440x1440.png')]:
   p.set_viewport_size({'width':w,'height':h});p.goto(base+'/storefront/artwork.html?mode='+mode);p.evaluate('document.fonts.ready');p.wait_for_function('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)')
   if mode in ['banner','square']:assert p.locator('main').inner_text().replace('\n','').replace(' ','')=='阿噗的糖果弹弹冒险'
   p.screenshot(path=str(ROOT/name))
  p.close()
  c=b.new_context(viewport={'width':360,'height':640},device_scale_factor=2)
  p=c.new_page();p.goto(base+'/dist/');ready(p);p.wait_for_timeout(600);p.screenshot(path=str(ROOT/'screenshot-01-title.png'))
  scene(p,'s.showLevels()');p.wait_for_timeout(450);p.screenshot(path=str(ROOT/'screenshot-02-worlds.png'))
  scene(p,'s.showChapter(0)');p.wait_for_timeout(450);p.screenshot(path=str(ROOT/'screenshot-03-chapter.png'))
  scene(p,'s.startLevel(0);s.beginLevel();s.angle=-1.16;s.fire()');p.wait_for_timeout(1100);p.screenshot(path=str(ROOT/'screenshot-04-battle.png'))
  scene(p,'s.showWorkshop("dragon")');p.wait_for_timeout(450);p.screenshot(path=str(ROOT/'screenshot-05-outfits.png'));c.close()
  b.close()
finally:server.shutdown()
print('Rendered 3 store artworks and 5 screenshots. Use record_gameplay.py for the live gameplay source.')
