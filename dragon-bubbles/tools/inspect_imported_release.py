"""Read-only checks for the exact user-supplied runtime; does not rebuild it."""
from pathlib import Path
from zipfile import ZipFile
from tempfile import TemporaryDirectory
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
from PIL import Image
import json,hashlib,subprocess,re,base64

R=Path(__file__).resolve().parents[1];D=R/'releases/1.0.2-xhs-secret-prompt';U=D/'runtime';G='apu-candy-v1';S='candyGame.scene.getScene("Adventure")'
manifest=json.loads((D/'manifest.json').read_text());archive=R/'dragon-bubbles-1.0.2-xhs-secret-prompt.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest()==manifest['archive_sha256']
with ZipFile(archive) as z:
 assert z.testzip() is None and len(z.namelist())==196
 assert set(z.namelist())==set(manifest['file_sha256'])
 for name,sha in manifest['file_sha256'].items():
  raw=(U/name).read_bytes();assert raw==z.read(name);assert hashlib.sha256(raw).hexdigest()==sha
 assert [n for n in z.namelist() if n.endswith('.html')]==['index.html']
for p in (U/'assets/promo/frames').glob('*.webp'):
 with Image.open(p) as im:assert im.size==(720,1280);im.verify()
for p in [U/'app.js',U/'video-config.js',*(U/'assets/promo/audio').glob('*.js')]:subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
profile=json.loads(subprocess.check_output(['node','-e',"const P=require('./build/progress.js');const p=P.normalize();for(let i=0;i<5;i++)P.win(p,i,1,{grade:'C',score:45});console.log(JSON.stringify(p))"],cwd=R,text=True))
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def end_headers(self):
  self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'");super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(U)));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/';errors=[];requests=[];result={}
def wait(page,expression,**options):return page.wait_for_function('()=>('+expression+')',**options)
def f(page,body):return page.evaluate('()=>{const s='+S+';'+body+'}')
def ready(page):wait(page,'window.candyGame?.scene.getScene("Adventure")?.state==="title"')
def saved(page):return page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1"))')
def progress(page):return int(page.locator('#promo-canvas').get_attribute('data-watched-ms'))
def playing(page):wait(page,'document.querySelector("#promo-canvas").dataset.state==="playing"',timeout=15000)
def watch(page):page.get_by_role('button',name='观看视频并开启',exact=True).click();playing(page)
def leave(page):page.locator('#skip-promo').click();page.get_by_role('button',name='先离开，回到游戏',exact=True).click();wait(page,'document.querySelector("#promo-dialog").hidden')
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  ctx=b.new_context(viewport={'width':390,'height':844});page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.goto(url);ready(page)
  fresh=saved(page);assert fresh['candy']==0 and fresh['fireRank']==0 and fresh['worlds']==[0];assert not page.evaluate('CandyRelease.playtest');assert page.evaluate('CandyAds.available');assert not [u for u in requests if '/assets/promo/' in u];result['fresh_profile_and_lazy_media']=True
  # Explicitly seed a model-valid pre-cleared profile; this is a UI fixture, not an actual five-level playthrough.
  page.evaluate('(p)=>localStorage.setItem("apu-candy-v1",JSON.stringify(p))',profile);page.reload();ready(page)
  f(page,'s.startLevel(4);s.beginLevel();s.win()');assert page.locator('.secret-unlock-prompt').count()==1;assert page.locator('.secret-unlock-prompt').get_attribute('data-secret')=='h-0-0';assert page.get_by_role('button',name='继续下一关',exact=True).is_visible();page.screenshot(path=str(D/'secret-prompt.png'),full_page=True);page.get_by_role('button',name='进入秘境',exact=True).click();assert f(page,'return s.state')=='secret';assert saved(page)['hiddenUnlocked']==[];result['milestone_reward_prompt_and_entry']=True
  watch(page);assert page.evaluate('CandyAudio.status.paused');assert page.locator('#promo-canvas').get_attribute('data-frame') is not None;assert not page.locator('#promo-sound').is_disabled();old=page.locator('#promo-sound').get_attribute('aria-pressed');page.locator('#promo-sound').click();assert page.locator('#promo-sound').get_attribute('aria-pressed')!=old
  page.locator('#promo-canvas').click();before=progress(page);page.wait_for_timeout(900);assert progress(page)==before;result['tap_pause_no_time_credit']=True
  for width,height in [(320,568),(390,844),(430,932)]:
   page.set_viewport_size({'width':width,'height':height});box=page.locator('.promo-card').bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1 and box['y']>=0 and box['y']+box['height']<=height+1
  page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(D/'promo-paused.png'),full_page=True)
  page.locator('#skip-promo').click();assert page.locator('#promo-exit-confirm').is_visible();before=progress(page);page.wait_for_timeout(400);assert progress(page)==before;page.get_by_role('button',name='继续观看',exact=True).click();playing(page);leave(page);assert saved(page)['hiddenUnlocked']==[];assert not page.evaluate('CandyAudio.status.paused');result['confirmed_exit_no_unlock_and_audio_restored']=True;result['mobile_sizes']=[320,390,430]
  # First-atlas error then retry: missing pictures cannot advance the counter.
  failed={'count':0}
  def abort_once(route):
   if failed['count']==0:failed['count']+=1;route.abort()
   else:route.continue_()
  ctx.route('**/atlas-000.webp',abort_once);page.get_by_role('button',name='观看视频并开启',exact=True).click();wait(page,'document.querySelector("#promo-canvas").dataset.state==="error"');assert progress(page)==0;assert saved(page)['hiddenUnlocked']==[];page.get_by_role('button',name='重试加载',exact=True).click();playing(page);leave(page);ctx.unroute('**/atlas-000.webp');result['initial_frame_failure_blocks_time_and_retries']=True
  # Full actual foreground playback; no accelerated test clock or forged completion.
  watch(page);page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))');wait(page,'document.querySelector("#promo-canvas").dataset.state==="paused"');before=progress(page);page.wait_for_timeout(800);assert progress(page)==before;page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');page.get_by_role('button',name='继续播放',exact=True).click();playing(page)
  wait(page,'document.querySelector("#promo-canvas").dataset.state==="completed"',timeout=45000);assert progress(page)==30000;assert page.locator('#promo-canvas').get_attribute('data-frame')=='299';wait(page,S+'.isHidden && '+S+'.state==="intro"');assert saved(page)['hiddenUnlocked']==['h-0-0'];result['real_30s_foreground_completion_unlocks_only_target']=True;result['background_time_not_counted']=True
  page.reload();ready(page);assert saved(page)['hiddenUnlocked']==['h-0-0'];f(page,'s.showSecret(CANDY_HIDDEN[0])');assert page.get_by_role('button',name='进入隐藏关',exact=True).is_visible();result['unlock_persists_and_reentry_without_rewatch']=True
  assert not errors,errors;assert not [u for u in requests if not (u.startswith(url) or u.startswith('data:'))];result['no_external_asset_requests_under_strict_csp']=True;result['errors']=errors;b.close()
finally:server.shutdown()
(D/'inspection.json').write_text(json.dumps({'date':'2026-11-25','archive_sha256':manifest['archive_sha256'],'runtime_unchanged':True,'zip_files':196,'canvas_video':{'frames':300,'fps':10,'duration_seconds':30},'checks':result,'limits':['Desktop Chromium only; no new iPhone/XHS-device certification','Reward prompt verified with explicit UI fixture, not a fresh five-level playthrough','No changes to imported gameplay or media implementation']},ensure_ascii=False,indent=2)+'\n')
print('PASS: exact imported package, core/asset integrity, real 30s Canvas playback, pause/background, confirmed exit, loading retry, hidden unlock and persistence.')
