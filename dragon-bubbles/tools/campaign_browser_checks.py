"""0.3.0 integration: real input, hierarchical maps, items, audio recovery, promo video.
The promotional clip is a generated local TEST FIXTURE and never ships in the ZIP.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import subprocess,json,shutil
ROOT=Path(__file__).resolve().parents[1];SCENE='candyGame.scene.getScene("Adventure")'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass

def tap(page,x,y):
 page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');b=page.locator('canvas').bounding_box();page.mouse.click(b['x']+x/360*b['width'],b['y']+y/640*b['height'])
def s(page,body):return page.evaluate('()=>{const s='+SCENE+';'+body+'}')
def fresh(page,i=0):page.evaluate('(i)=>{const s='+SCENE+';s.startLevel(i);s.clearModal();s.state="ready"}',i)
def save(page):return page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1"))')
with TemporaryDirectory() as folder:
 folder=Path(folder)
 with ZipFile(ROOT/'dragon-bubbles-0.3.0.zip') as z:
  assert z.testzip() is None;assert [n for n in z.namelist() if n.lower().endswith(('.html','.htm'))]==['index.html'];assert not any(n.lower().endswith(('.mp4','.md','.py','.txt')) for n in z.namelist());z.extractall(folder)
 subprocess.run(['ffmpeg','-loglevel','error','-f','lavfi','-i','color=c=teal:s=176x96:r=15','-t','31','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(folder/'fixture.mp4')],check=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(folder)));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
 with sync_playwright() as p:
  options={'headless':True}
  if shutil.which('chromium'):options.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  browser=p.chromium.launch(**options);context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  context.add_init_script('''window.NativeAudioContext=window.AudioContext;window.AudioContext=class extends NativeAudioContext{constructor(o){super(o);window.fixtureAudio=this;}};''')
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  s(page,'s.showLevels()');assert page.locator('.world-island').count()==10
  page.get_by_role('button',name='泡泡海湾，未解锁',exact=True).click();assert '免费开启' in page.locator('.map-popup').inner_text();page.get_by_role('button',name='继续按顺序冒险').click()
  page.screenshot(path=str(ROOT/'previews/worlds.png'),full_page=True)
  page.get_by_role('button',name='糖果森林，已开放',exact=True).click();assert page.locator('.level-node').count()==30;assert page.locator('.level-node:not([disabled])').count()==1
  page.screenshot(path=str(ROOT/'previews/chapter.png'),full_page=True)
  page.get_by_role('button',name='第1关 糖果林入口',exact=True).click();tap(page,180,391);assert s(page,'return s.state')=='ready'
  page.wait_for_function('CandyAudio.status.running')
  # Real Web Audio suspension, then normal screen interaction recovers without volume keys.
  await_state=page.evaluate('async()=>{await fixtureAudio.suspend();return fixtureAudio.state}');assert await_state=='suspended'
  tap(page,136,177);page.wait_for_function('CandyAudio.status.running && '+SCENE+'.hitCount>0')
  page.wait_for_function(SCENE+'.state==="ready"',timeout=15000)
  assert page.evaluate('CandyAudio.status.recoveryAttempts')>=2
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # Explicit fixtures exercise inventory conservation and rewind state through real methods.
  fixture=save(page);fixture['inventory']={i:2 for i in ['balls','aim','guard','rewind','nova','hammer']};fixture['candy']=10000
  page.evaluate('(p)=>localStorage.setItem("apu-candy-v1",JSON.stringify(p))',fixture);page.reload();page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  fresh(page,70)
  s(page,'s.showInventory(s.world.id)');page.wait_for_selector('.inventory-row');page.locator('#help').click();page.locator('#close-help').click();page.wait_for_timeout(50);assert s(page,'return s.uiPaused'),'Closing help must not resume combat behind the warehouse';page.screenshot(path=str(ROOT/'previews/inventory.png'),full_page=True)
  page.locator('.inventory-row').filter(has=page.get_by_role('heading',name='额外泡泡 ×2')).get_by_role('button',name='使用').click();page.wait_for_function('!'+SCENE+'.inventoryOpen')
  assert save(page)['inventory']['balls']==1
  assert not s(page,'return s.useItem("balls").ok');assert save(page)['inventory']['balls']==1
  s(page,'s.angle=-Math.PI/2;s.fire()');page.wait_for_timeout(800)
  assert s(page,'return s.balls.countActive()+s.pending')==s(page,'return s.level.balls+3')
  page.wait_for_function(SCENE+'.state==="ready"',timeout=16000)
  before=save(page)['inventory']['rewind'];assert s(page,'return s.useItem("rewind").ok');assert s(page,'return s.shotsFired')==0;assert save(page)['inventory']['rewind']==before-1
  assert not s(page,'return s.useItem("rewind").ok')
  assert s(page,'return s.useItem("guard").ok');wave=s(page,'return s.wave');s(page,'s.state="shooting";s.endVolley()');assert s(page,'return s.wave')==wave
  count=s(page,'return s.obstacles.filter(o=>o.active).length');assert s(page,'return s.useItem("hammer").ok');assert s(page,'return s.obstacles.filter(o=>o.active).length')==count-1
  # Paid unlock is adjacent, charges once, and starts that world's first stage.
  s(page,'s.showLevels()');page.get_by_role('button',name='泡泡海湾，未解锁',exact=True).click();cash=save(page)['candy'];cost=page.evaluate('CANDY_WORLDS[1].cost');page.get_by_role('button',name=f'花 {cost} 星糖提前开启').click()
  assert save(page)['candy']==cash-cost;assert 1 in save(page)['worlds'];page.get_by_role('button',name='泡泡海湾，已开放',exact=True).click();assert page.locator('.level-node:not([disabled])').count()==1
  # No video configured means no completion and no hidden unlock.
  assert not page.evaluate('CandyAds.available');assert not page.evaluate('async()=> (await CandyAds.request("h-0-0")).completed')
  assert save(page)['hiddenUnlocked']==[]
  for world in [1,2,4,6,7,9]:
   fresh(page,world*30+10);page.screenshot(path=str(ROOT/f'previews/world-{world}-combat.png'),full_page=True)
  # Separately configured test video: skipping/seeking must not grant access.
  promo=browser.new_context(viewport={'width':390,'height':844});promo.add_init_script('''if(!localStorage.getItem('apu-candy-v1'))localStorage.setItem('apu-candy-v1',JSON.stringify({unlocked:5,current:4,economyVersion:1,stars:{0:3,1:3,2:3,3:3,4:3},claimed:{0:true,1:true,2:true,3:true,4:true}}));''')
  promo.route('**/video-config.js',lambda route:route.fulfill(status=200,content_type='application/javascript',body=f'window.CANDY_PROMO={{src:{json.dumps(url+"fixture.mp4")},minimumSeconds:30}};'))
  video_page=promo.new_page();video_page.on('pageerror',lambda e:errors.append(str(e)));video_page.goto(url);video_page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  s(video_page,'s.showChapter(0)');video_page.locator('.secret-node').first.click();video_page.get_by_role('button',name='观看宣传视频并开启').click();video_page.wait_for_function('document.getElementById("promo-video").readyState>=2')
  video_page.evaluate('document.getElementById("promo-video").currentTime=28');video_page.wait_for_timeout(400);assert video_page.locator('#promo-video').evaluate('(v)=>v.currentTime')<3
  video_page.locator('#skip-promo').click();video_page.wait_for_timeout(100);assert save(video_page)['hiddenUnlocked']==[]
  video_page.get_by_role('button',name='观看宣传视频并开启').click();video_page.wait_for_function('candyGame.scene.getScene("Adventure").isHidden && candyGame.scene.getScene("Adventure").state==="intro"',timeout=45000)
  assert 'h-0-0' in save(video_page)['hiddenUnlocked']
  # Unlocked hidden challenges remain replayable, and first-clear rare rewards are one-time.
  s(video_page,'s.clearModal();s.state="ready";s.win()');assert save(video_page)['inventory']['rewind']==1
  s(video_page,'s.win()');assert save(video_page)['inventory']['rewind']==1
  assert not errors,errors
  (ROOT/'tools/campaign-browser-results.json').write_text(json.dumps({'version':'0.3.0','audio_suspend_resume':True,'maps_10x30':True,'inventory_rewind':True,'adjacent_purchase':True,'video_missing_closed':True,'video_skip_no_unlock':True,'video_real_31_seconds':True,'one_time_hidden_loot':True,'errors':errors},indent=2)+'\n')
  browser.close()
 server.shutdown()
print('PASS: two-layer maps, audio suspension/recovery, inventory conservation/rewind, world purchase, and real test-video completion/skip/seek gates.')
