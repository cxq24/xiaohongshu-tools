"""Real shipped ZIP: preview/purchase, frame animation, cosmetic combat parity and pixel type."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
from PIL import Image
import os
import json,shutil
VERSION=os.environ.get('CANDY_TEST_VERSION','0.10.0')
ROOT=Path(__file__).resolve().parents[1];S='candyGame.scene.getScene("Adventure")'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass

def f(page,body):return page.evaluate('()=>{const s='+S+';'+body+'}')
def save(page):return page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1"))')
with TemporaryDirectory() as folder:
 with ZipFile(ROOT/f'dragon-bubbles-{VERSION}.zip') as z:z.extractall(folder)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(folder)));Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as p:
  opts={'headless':True}
  if shutil.which('chromium'):opts.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  browser=p.chromium.launch(**opts);ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  # Isolated purchasing fixture, not a source of currency in the real game.
  ctx.add_init_script('if(!localStorage.getItem("apu-candy-v1"))localStorage.setItem("apu-candy-v1",JSON.stringify({version:5,economyVersion:1,candy:20000,worlds:[0,1,2,3,4,5,6,7,8,9]}));')
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"');assert page.evaluate('document.fonts.check(\'13px system-ui\')')
  f(page,'s.showWorkshop()');assert 'system-ui' in page.locator('#map-screen').evaluate('(e)=>getComputedStyle(e).fontFamily');assert page.locator('.price-tier-select option').count()==8;assert page.locator('.cosmetic-card').count()==3
  before=save(page);page.locator('.price-tier-select').select_option('7');page.get_by_role('button',name='试穿阿噗的星冕王袍',exact=True).click();assert save(page)==before;assert page.locator('.shop-showcase').get_attribute('data-preview')=='outfit-6'
  page.locator('.map-scroll').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(ROOT/'previews/pixel-outfits.png'),full_page=True)
  page.locator('.shop-showcase').get_by_role('button',name='购买并装备',exact=False).click();assert save(page)['candy']==before['candy']-1600;assert save(page)['equipped']['dragon']=='outfit-6';assert save(page)['fireRank']==0
  page.get_by_role('button',name='炮台外观',exact=True).click();page.locator('.price-tier-select').select_option('6');page.get_by_role('button',name='试穿星云发射器',exact=True).click();page.locator('.map-scroll').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(ROOT/'previews/pixel-cannons.png'),full_page=True)
  a=page.locator('.showcase-turret').evaluate('(e)=>getComputedStyle(e).backgroundPositionX');page.wait_for_timeout(300);b=page.locator('.showcase-turret').evaluate('(e)=>getComputedStyle(e).backgroundPositionX');assert a!=b
  page.locator('.shop-showcase').get_by_role('button',name='购买并装备',exact=False).click();assert save(page)['equipped']['turret']=='turret-cosmic'
  page.get_by_role('button',name='泡泡皮肤',exact=True).click();page.locator('.price-tier-select').select_option('7');page.get_by_role('button',name='试穿梦境城堡泡泡',exact=True).click();page.locator('.map-scroll').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(ROOT/'previews/pixel-bubbles.png'),full_page=True)
  page.locator('.shop-showcase').get_by_role('button',name='购买并装备',exact=False).click();assert save(page)['equipped']['bubble']=='bubble-world-9'
  assert save(page)['fireRank']==0
  f(page,'s.startLevel(0);s.beginLevel?s.beginLevel():(s.clearModal(),s.state="ready");');assert f(page,'return s.attackDamage')==100;assert f(page,'return s.hero.texture.key')=='outfit-6';assert f(page,'return s.turret.texture.key')=='turret-cosmic'
  f(page,'s.angle=-Math.PI/2;s.fire()');page.wait_for_function(S+'.balls.countActive()>0')
  data=f(page,'const b=s.balls.getChildren()[0];return {damage:b.getData("damage"),radius:b.body.radius,dx:b.body.center.x-b.x,dy:b.body.center.y-b.y,frame:b.frame.name};');assert data['damage']==100;assert data['radius']==4;assert abs(data['dx'])<.1 and abs(data['dy'])<.1,data
  page.wait_for_timeout(200);assert f(page,'return s.bubbleLook.frames')==4;assert f(page,'return s.bubbleLook.fx')
  page.screenshot(path=str(ROOT/'previews/pixel-cosmetics-combat.png'),full_page=True)
  # Large cosmetic projectiles keep the same multiplier and centred collision.
  f(page,'s.startLevel(0);s.beginLevel?s.beginLevel():(s.clearModal(),s.state="ready");;s.energy=100;s.toggleSkill();s.angle=-Math.PI/2;s.fire()');page.wait_for_function(S+'.balls.countActive()>0')
  data=f(page,'const b=s.balls.getChildren()[0];return {damage:b.getData("damage"),radius:b.body.radius,dx:b.body.center.x-b.x,dy:b.body.center.y-b.y};');assert data['damage']==400;assert abs(data['dx'])<.1 and abs(data['dy'])<.1,data
  # Every cosmetic sheet has the advertised dimensions and distinct silhouettes.
  catalog=page.evaluate('CandyProgress.SHOP');assert len([i for i in catalog if i['slot']=='dragon'])==25
  for slot in ['dragon','bubble','turret']:
   fingerprints=[]
   for item in [i for i in catalog if i['slot']==slot and i['price']>0]:
    path={'dragonBerry':'dragon-berry','dragonSky':'dragon-sky','bubbleStar':'bubble-star','bubbleRainbow':'bubble-rainbow'}.get(item['texture'],item['texture']);im=Image.open(Path(folder)/'assets'/(path+'.png'));fingerprints.append(im.crop((0,0,item['frameSize'],item['frameSize'])).tobytes())
   assert len(fingerprints)==24 and len(set(fingerprints))==24,slot
  for item in catalog:
   if item['slot']=='gear':continue
   path={'dragon':'dragon','dragonBerry':'dragon-berry','dragonSky':'dragon-sky','bubble':'bubble','bubbleStar':'bubble-star','bubbleRainbow':'bubble-rainbow'}.get(item['texture'],item['texture']);im=Image.open(Path(folder)/'assets'/(path+'.png'));assert im.size==(item['frameSize']*item['frames'],item['frameSize']);
   if item['price']>0:
    n=item['frameSize'];assert len({im.crop((i*n,0,(i+1)*n,n)).tobytes() for i in range(item['frames'])})>=2,item['id']
  for width in [320,390,430]:
   page.set_viewport_size({'width':width,'height':844});f(page,'s.showWorkshop("bubble")');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('.camp-tabs').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
  assert not errors,errors
  (ROOT/f'tools/cosmetic-results-{VERSION}.json').write_text(json.dumps({'version':VERSION,'real_zip':True,'readable_system_font':True,'preview_does_not_spend':True,'purchase_and_equip':True,'four_frame_animation':True,'cosmetics_no_damage_bonus':True,'collision_centred_and_equal_radius':True,'all_sheet_dimensions':True,'72_distinct_paid_designs':True,'eight_price_bands_three_each':True,'mobile_widths':[320,390,430],'errors':errors},indent=2)+'\n')
  browser.close()
 server.shutdown()
print('PASS: readable font, no-cost previews, purchases, visible frames, live equipment, unchanged damage/centred collision, sheet dimensions and narrow mobile tabs.')
