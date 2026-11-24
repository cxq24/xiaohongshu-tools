"""Actual ZIP + documented xhs.miniTool bridge mocks; no platform/cloud claims."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import json,subprocess,shutil
R=Path(__file__).resolve().parents[1];G='apu-candy-v1';A='apu-audio-v2';S='candyGame.scene.getScene("Adventure")'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def f(page,body):return page.evaluate('()=>{const s='+S+';'+body+'}')
def ready(page):page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
profile=json.loads(subprocess.check_output(['node','-e',"const P=require('./build/progress.js');const p=P.normalize();for(let i=0;i<5;i++)P.win(p,i,1,{grade:'C',score:45});p.candy=1000;console.log(JSON.stringify(p));"],cwd=R,text=True))
bridge_js='''window.__holdWrites=false;window.__writers=[];window.__wire=[];
window.xhs={launchOptions:{miniToolEnv:{buildVersion:9462004}},miniTool:{
 getStorage(p){if(window.__holdReads&&p.key==='apu-candy-v1')return new Promise(resolve=>{window.__releaseRead=()=>{window.__holdReads=false;sessionStorage.setItem('__readHoldUsed','1');resolve(window.nativeRead(p));};});return window.nativeRead(p);},
 setStorage(p){window.__wire.push(p);if(window.__holdWrites)return new Promise(resolve=>window.__writers.push(()=>resolve(window.nativeWrite(p))));return window.nativeWrite(p);}
}};'''
with TemporaryDirectory() as temp:
 with ZipFile(R/'dragon-bubbles-1.0.1.zip') as z:z.extractall(temp)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=temp));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox']);errors=[];contexts=[]
  def context(native=None,legacy=None,hold_read=False,read_fail=False):
   data=dict(native or {});log=[];flags={'read_fail':read_fail,'write_fail':False}
   ctx=browser.new_context(viewport={'width':390,'height':844});contexts.append(ctx)
   def read(_src,params):
    log.append(('get',params['key']));return {'errMsg':'getStorage:fail temporary'} if flags['read_fail'] else {'errMsg':'getStorage:ok','data':data.get(params['key'])}
   def write(_src,params):
    log.append(('set',dict(params)))
    if flags['write_fail']:return {'errMsg':'setStorage:fail temporary'}
    assert isinstance(params['data'],str);data[params['key']]=params['data'];return {'errMsg':'setStorage:ok'}
   ctx.expose_binding('nativeRead',read);ctx.expose_binding('nativeWrite',write)
   script=bridge_js+'window.__holdReads='+json.dumps(hold_read)+'&&!sessionStorage.getItem("__readHoldUsed");'
   if legacy is not None:script+='if(!localStorage.getItem('+json.dumps(G)+'))localStorage.setItem('+json.dumps(G)+','+json.dumps(json.dumps(legacy))+');'
   ctx.add_init_script(script);page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);return page,data,log,flags
  # Read gating: no Phaser instance and no default writes until the native read resolves.
  page,data,log,flags=context({G:json.dumps(profile),A:json.dumps({'enabled':False,'music':.12,'effects':.4,'voice':.3})},hold_read=True)
  page.wait_for_function('!!window.__releaseRead');assert not page.evaluate('!!window.candyGame');assert not [r for r in log if r[0]=='set'];page.evaluate('__releaseRead()');ready(page);page.evaluate('CandyStore.flush()');assert page.evaluate('CandyStore.status().mode')=='native';assert json.loads(data[G])['candy']==1000;assert not page.evaluate('CandyAudio.settings.enabled');assert page.evaluate('CandyAudio.settings.music')==.12
  # All three entrances are visible, including unavailable video and unopened milestones.
  f(page,'s.showChapter(0)');assert page.locator('.secret-node').count()==3;page.screenshot(path=str(R/'previews/secret-map-1.0.1.png'),full_page=True)
  page.locator('.secret-node').nth(1).click();assert page.get_by_role('button',name='通关第 15 关后开启',exact=True).is_disabled();assert '通关本章第 15 关后开启' in page.locator('.secret-status').inner_text();page.get_by_role('button',name='返回章节地图',exact=True).click()
  page.locator('.secret-node').first.click();assert page.get_by_role('button',name='秘境暂未开放',exact=True).is_disabled();assert '待配置' not in page.locator('body').inner_text();page.screenshot(path=str(R/'previews/secret-status-1.0.1.png'),full_page=True)
  # Real UI purchases while native acknowledgements are held: serialize and coalesce.
  f(page,'s.showWorkshop("dragon")');page.evaluate('__holdWrites=true');page.locator('.cosmetic-card .map-action').first.click();page.wait_for_function('__writers.length===1');page.get_by_role('button',name='泡泡皮肤',exact=True).click();page.locator('.cosmetic-card .map-action').first.click();assert page.evaluate('__writers.length')==1;assert json.loads(data[G])['candy']==1000
  page.evaluate('__writers.shift()()');page.wait_for_function('__writers.length===1');page.evaluate('__holdWrites=false;__writers.shift()()');page.evaluate('CandyStore.flush()');assert json.loads(data[G])['candy']==920;assert len(json.loads(data[G])['owned'])==6;assert page.locator('#save-status').is_hidden()
  page.reload();ready(page);assert json.loads(data[G])['candy']==920;assert page.evaluate('CandyAudio.settings.music')==.12
  # An actual bridge-declared write failure produces an in-product retry and keeps a journal.
  flags['write_fail']=True;f(page,'s.showWorkshop("turret")');page.locator('.cosmetic-card .map-action').first.click();page.wait_for_function('CandyStore.status().issue?.phase==="write"');assert page.locator('#save-status').is_visible();assert json.loads(data[G])['candy']==920;assert page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1")).candy')==880
  page.screenshot(path=str(R/'previews/save-retry-1.0.1.png'),full_page=True);flags['write_fail']=False;page.locator('#save-retry').click();page.wait_for_function('CandyStore.status().pending===0 && !CandyStore.status().issue');assert json.loads(data[G])['candy']==880
  # Sound settings use the same native contract and survive reload.
  page.locator('#sound').click();page.locator('#volume-music').fill('37');page.locator('#close-audio').click();page.evaluate('CandyStore.flush()');assert json.loads(data[A])['music']==.37;page.reload();ready(page);assert page.evaluate('CandyAudio.settings.music')==.37
  # Empty native data imports the complete old production profile and its unlocks.
  legacy={**profile,'hiddenUnlocked':['h-0-0'],'inventory':{**profile['inventory'],'rewind':2}}
  old,cache,calls,_=context({},legacy);ready(old);old.evaluate('CandyStore.flush()');actual=json.loads(cache[G]);assert actual['candy']==legacy['candy'];assert actual['hiddenUnlocked']==legacy['hiddenUnlocked'];assert actual['inventory']==legacy['inventory']
  f(old,'s.showChapter(0)');assert old.locator('.secret-node').count()==3;old.locator('.secret-node').first.click();assert old.get_by_role('button',name='进入隐藏关',exact=True).is_enabled();old.get_by_role('button',name='进入隐藏关',exact=True).click();assert f(old,'return s.isHidden')
  # Native read failure and corrupt data never overwrite an existing native or browser save.
  failed,cache,calls,fl=context({G:json.dumps(profile)},profile,read_fail=True);failed.wait_for_function('CandyStore.status().issue?.phase==="read"');assert not failed.evaluate('!!window.candyGame');assert not [r for r in calls if r[0]=='set'];assert failed.locator('#save-status').is_visible();fl['read_fail']=False;failed.locator('#save-retry').click();ready(failed);failed.evaluate('CandyStore.flush()');assert json.loads(cache[G])['candy']==1000
  broken,cache,calls,_=context({G:'{invalid'},profile);broken.wait_for_function('CandyStore.status().issue?.phase==="read"');assert not broken.evaluate('!!window.candyGame');assert not [r for r in calls if r[0]=='set'];assert broken.locator('#save-fresh').is_hidden();cache[G]=json.dumps(profile);broken.locator('#save-retry').click();ready(broken)
  assert not errors,errors
  for ctx in contexts:ctx.close()
  (R/'tools/native-storage-browser-1.0.1.json').write_text(json.dumps({'version':'1.0.1','actual_zip':True,'documented_bridge_mocks':True,'native_read_before_game':True,'native_sound_preferences_before_audio':True,'legacy_profile_migration':True,'write_serialization_via_real_shop_ui':True,'write_failure_and_retry':True,'sound_native_save_reload':True,'read_error_blocks_empty_overwrite':True,'corrupt_native_blocks_overwrite':True,'three_secret_nodes_visible':True,'milestone_and_video_gates_preserved':True,'already_unlocked_secret_access':True,'errors':errors},indent=2)+'\n');browser.close()
 server.shutdown()
print('PASS: actual ZIP native-cache bridge, async startup, migration, serialized UI purchases, retry, sound and visible/gated secret nodes.')
