"""Exercise the actual standalone ZIP; original XHS release is protected by SHA."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import json,hashlib,subprocess
from build import validate_upload_archive

R=Path(__file__).resolve().parents[1];REPO=R.parent;G='apu-taptap-h5-v1';A='apu-taptap-audio-v1';S='candyGame.scene.getScene("Adventure")';manifest=json.loads((R/'release.json').read_text());result={}
report=R/'validation/results.json'
if report.exists():report.unlink()
for name,sha in json.loads((R/'validation/protected-xhs-files.json').read_text()).items():assert hashlib.sha256((REPO/name).read_bytes()).hexdigest()==sha,name
archive=R/manifest['file'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==manifest['sha256']
profile=json.loads(subprocess.check_output(['node','-e',"const P=require('./dragon-bubbles/build/progress.js');const p=P.normalize();for(let i=0;i<5;i++)P.win(p,i,1,{grade:'C',score:45});p.candy=1000;console.log(JSON.stringify(p));"],cwd=REPO,text=True))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'self';script-src 'self';style-src 'self' 'unsafe-inline';img-src 'self' data: blob:;font-src 'self';media-src 'self';connect-src 'self';object-src 'none'");super().end_headers()
def f(p,body):return p.evaluate('()=>{const s='+S+';'+body+'}')
def wait(p,expr,**kw):return p.wait_for_function('()=>('+expr+')',**kw)
def ready(p):
 wait(p,'window.candyGame?.scene.getScene("Adventure")?.state==="title"')
 missing=p.evaluate('()=>["dragon","jelly","berry","star","forest","cover","w0-boss"].filter(k=>!candyGame.textures.exists(k))')
 assert not missing,('Game textures failed to load',missing)

def save(p):return p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',G)
def watching(p):wait(p,'document.querySelector("#promo-canvas").dataset.state==="playing"',timeout=15000)
with TemporaryDirectory() as temp:
 root=Path(temp);parent=root/'nested';parent.mkdir();runtime=parent/manifest['archive_root']
 with ZipFile(archive) as z:
  folder,files=validate_upload_archive(z)
  assert folder==manifest['archive_root'] and z.testzip() is None and len(files)==197 and len(z.infolist())==198
  for name,expected in manifest['file_sha256'].items():assert hashlib.sha256(z.read(folder+'/'+name)).hexdigest()==expected
  z.extractall(parent);result['single_root_directory_upload_contract']=True
 source=REPO/'dragon-bubbles/releases/1.0.2-xhs-secret-prompt/runtime/app.js';modules=json.loads(subprocess.check_output(['node',str(R/'tools/verify_modules.cjs'),str(source),str(runtime/'app.js')],text=True));result.update(modules)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=temp));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/';url=base+'nested/'+manifest['archive_root']+'/';errors=[];requests=[]
 try:
  with sync_playwright() as p:
   b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
   def context(seed=None,host=True,corrupt=False):
    c=b.new_context(viewport={'width':390,'height':844});script='if(!localStorage.getItem("apu-candy-v1"))localStorage.setItem("apu-candy-v1",JSON.stringify({candy:888,fireRank:99}));if(!localStorage.getItem("apu-audio-v2"))localStorage.setItem("apu-audio-v2",JSON.stringify({enabled:false}));Object.defineProperty(window,"xhs",{get(){throw Error("XHS bridge must not be read")}});'
    if seed is not None:script+='if(localStorage.getItem('+json.dumps(G)+')===null)localStorage.setItem('+json.dumps(G)+','+json.dumps('{broken' if corrupt else json.dumps(seed))+');'
    if host:script+='window.__tapHide=null;window.__tapShow=null;window.tap={onHide(fn){window.__tapHide=fn},onShow(fn){window.__tapShow=fn}};'
    c.add_init_script(script);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.goto(url);return c,page
   ctx,page=context(host=False);ready(page);assert page.evaluate('CandyRelease.platform')=='taptap-h5';assert save(page)['candy']==0 and save(page)['fireRank']==0 and save(page)['worlds']==[0];assert page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1")).candy')==888;assert not any('/assets/promo/' in u for u in requests);result['cold_boot_without_platform_sdk_and_lazy_media']=True;result['essential_game_textures_loaded']=True;ctx.close()
   ctx,page=context(profile);ready(page);assert page.evaluate('typeof __tapHide')=='function' and page.evaluate('typeof __tapShow')=='function';assert save(page)['candy']==1000
   f(page,'s.showWorkshop("dragon")');page.locator('.cosmetic-card .map-action').first.click();assert save(page)['candy']==960;page.reload();ready(page);assert save(page)['candy']==960 and len(save(page)['owned'])==5;assert page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1")).candy')==888
   page.locator('#sound').click();page.locator('#volume-music').fill('37');page.locator('#close-audio').click();assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).music',A)==.37;page.reload();ready(page);assert page.evaluate('CandyAudio.settings.music')==.37;result['isolated_currency_inventory_and_audio_persist']=True
   f(page,'s.startLevel(0);s.beginLevel()');assert f(page,'return s.attackDamage')==100;page.evaluate('__tapHide()');assert f(page,'return s.uiPaused') and page.evaluate('CandyAudio.status.paused');page.evaluate('__tapShow()');assert not f(page,'return s.uiPaused');assert page.evaluate('candyGame.hasFocus&&candyGame.loop.inFocus')
   page.locator('#menu-toggle').click();assert f(page,'return s.uiPaused');page.evaluate('__tapHide();__tapShow()');assert f(page,'return s.uiPaused');page.get_by_role('button',name='继续冒险',exact=True).click();assert not f(page,'return s.uiPaused');result['optional_host_lifecycle_preserves_user_menu_pause']=True;result['host_lifecycle_restores_engine_focus']=True
   for w,h in [(320,568),(390,844),(430,932)]:page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.set_viewport_size({'width':390,'height':844});f(page,'s.showTitle()');page.screenshot(path=str(R/'validation/title.png'),full_page=True);ctx.close()
   # A genuine browser write failure must keep the original physical snapshot and retry.
   qc,qp=context(profile,host=False);ready(qp);qp.evaluate('window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="apu-taptap-h5-v1")throw new DOMException("quota","QuotaExceededError");return originalSetItem.call(this,k,v)};void 0');f(qp,'s.showWorkshop("dragon")');qp.locator('.cosmetic-card .map-action').first.click();assert save(qp)['candy']==1000;assert qp.evaluate('CandyStore.status().issue.phase')=='write';qp.evaluate('Storage.prototype.setItem=originalSetItem;void 0');qp.locator('#save-retry').click();assert save(qp)['candy']==960 and qp.locator('#save-status').is_hidden();qc.close();result['quota_failure_preserves_data_and_retry']=True
   cc,cp=context(profile,host=False,corrupt=True);wait(cp,'CandyStore.status().issue?.phase==="read"');assert not cp.evaluate('!!window.candyGame');assert cp.evaluate('(k)=>localStorage.getItem(k)',G)=='{broken';cp.locator('#save-play').click();ready(cp);assert cp.evaluate('CandyStore.status().mode')=='preview';assert cp.evaluate('(k)=>localStorage.getItem(k)',G)=='{broken';cc.close();result['corrupt_save_protection_and_readonly_preview']=True
   # Actual 30 second promotion, with host lifecycle pause/resume in the middle.
   vc,v=context(profile);ready(v);f(v,'s.startLevel(4);s.beginLevel();s.win()');assert v.locator('.secret-unlock-prompt').is_visible();v.get_by_role('button',name='进入秘境',exact=True).click();v.get_by_role('button',name='观看视频并开启',exact=True).click();watching(v)
   v.evaluate('__tapHide()');before=int(v.locator('#promo-canvas').get_attribute('data-watched-ms'));v.wait_for_timeout(700);assert int(v.locator('#promo-canvas').get_attribute('data-watched-ms'))==before;v.evaluate('__tapShow()');assert v.locator('#promo-canvas').get_attribute('data-state')=='paused';v.get_by_role('button',name='继续播放',exact=True).click();watching(v)
   v.wait_for_timeout(700);v.screenshot(path=str(R/'validation/promo.png'),full_page=True);v.locator('#skip-promo').click();v.get_by_role('button',name='先离开，回到游戏',exact=True).click();assert save(v)['hiddenUnlocked']==[]
   v.get_by_role('button',name='观看视频并开启',exact=True).click();watching(v);balance=save(v)['candy'];stock=save(v)['inventory'];wait(v,'document.querySelector("#promo-canvas").dataset.state==="completed"',timeout=45000);wait(v,S+'.isHidden && '+S+'.state==="intro"');assert save(v)['hiddenUnlocked']==['h-0-0'];assert save(v)['candy']==balance and save(v)['inventory']==stock;v.reload();ready(v);assert save(v)['hiddenUnlocked']==['h-0-0'];assert v.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1")).candy')==888;vc.close();result['real_promo_unlock_save_and_no_exit_reward']=True;result['host_background_not_counted_in_promo']=True
   assert not errors,errors;assert not [u for u in requests if not (u.startswith(base) or u.startswith('blob:'+base) or u.startswith('data:'))],requests;b.close();result['errors']=errors;result['no_external_asset_requests']=True
 finally:server.shutdown()
for name,sha in json.loads((R/'validation/protected-xhs-files.json').read_text()).items():assert hashlib.sha256((REPO/name).read_bytes()).hexdigest()==sha,name
result['all_original_xhs_files_unchanged']=True
(R/'validation/results.json').write_text(json.dumps({'status':'passed','target':'taptap-h5','version':'1.0.0','zip_sha256':manifest['sha256'],'actual_zip':True,'checks':result,'limits':['Desktop Chromium and simulated optional tap lifecycle only; not a TapTap-client certification','No TapTap account upload, app review, cloud save, login or commercial ad monetization enabled']},ensure_ascii=False,indent=2)+'\n');print('PASS: actual TapTap H5 ZIP, isolated saves, lifecycle, real 30s promo, unchanged gameplay modules and untouched original XHS files.')
