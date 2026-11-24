"""Final normal ZIP: clean UI, profile separation, old saves and video availability."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import json,subprocess,shutil
R=Path(__file__).resolve().parents[1];S='candyGame.scene.getScene("Adventure")'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def f(page,body):return page.evaluate('()=>{const s='+S+';'+body+'}')
def ready(page):page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
with TemporaryDirectory() as temp:
 with ZipFile(R/'dragon-bubbles-1.0.1.zip') as z:
  z.extractall(temp);app=z.read('app.js').decode()
  for marker in ['测试火力','测试版','补满测试道具','testFireRank','testStockVersion','apu-candy-playtest-v1','无平台广告收益','宣传视频待配置']:
   assert marker not in app,marker
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=temp));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844});errors=[];requests=[]
  # Existing test progress must never leak into a new production save.
  ctx.add_init_script('localStorage.setItem("apu-candy-playtest-v1",JSON.stringify({fireRank:99,candy:999999,worlds:[0,1,2,3,4,5,6,7,8,9]}))');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:requests.append({'url':r.url,'status':r.status}));page.goto(url);ready(page)
  profile=page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1"))');assert profile['fireRank']==0 and profile['candy']==0 and len(profile['owned'])==4 and profile['worlds']==[0]
  page.screenshot(path=str(R/'previews/production-title.png'),full_page=True)
  f(page,'s.showLevels()');assert page.locator('.world-island.blocked').count()==9
  f(page,'s.showChapter(0)');assert page.locator('.level-node:not([disabled])').count()==1;assert page.locator('.secret-node').count()==3;page.screenshot(path=str(R/'previews/production-chapter.png'),full_page=True)
  # Even an accidental runtime profile flag cannot restore compiled-out test controls.
  f(page,'window.CandyRelease={version:"1.0.1",playtest:true};s.showWorkshop("power")');assert page.locator('.test-fire-select').count()==0;assert page.get_by_role('button',name='补满测试道具',exact=True).count()==0
  assert page.get_by_role('button',name='升级火力',exact=True).is_disabled()
  for text in ['测试版','测试火力','待配置','无平台广告收益','诊断','调试']:assert text not in page.locator('body').inner_text()
  page.locator('#help').click();page.get_by_text('成长与奖励',exact=True).click();assert 'Lv.99' in page.locator('#help-dialog').inner_text();page.screenshot(path=str(R/'previews/production-help.png'),full_page=True);page.locator('#close-help').click()
  assert not [r for r in requests if r['status']>=400],requests
  external=[r for r in requests if not (r['url'].startswith(url) or r['url'].startswith('blob:'+url))];assert not external,external
  # A real, consistent older normal profile keeps all purchases, claims and unlocks.
  old=json.loads(subprocess.check_output(['node','-e',"const P=require('./build/progress.js');const p=P.normalize();for(let i=0;i<36;i++){while(P.upgrade(p).ok){}P.win(p,i,1,{grade:'C',score:45});}P.buy(p,'turret-candy');P.unlockHidden(p,'h-0-0');console.log(JSON.stringify(p));"],cwd=R,text=True))
  old['testFireRank']=99 # obsolete debug data in a normal save must be ignored.
  oc=b.new_context(viewport={'width':390,'height':844});oc.add_init_script('if(!localStorage.getItem("apu-candy-v1"))localStorage.setItem("apu-candy-v1",'+json.dumps(json.dumps(old))+');');op=oc.new_page();op.on('pageerror',lambda e:errors.append(str(e)));op.goto(url);ready(op);actual=op.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1"))')
  for key in ['fireRank','candy','stars','owned','equipped','inventory','worlds','hiddenUnlocked','bossClaims','claimed']:assert actual[key]==old[key],key
  assert 'testFireRank' not in actual
  f(op,'s.showChapter(0)');assert op.locator('.secret-node').count()==3;assert op.locator('.secret-node').first.is_enabled();op.locator('.secret-node').first.click();assert '待配置' not in op.locator('body').inner_text();op.get_by_role('button',name='进入隐藏关',exact=True).click();assert f(op,'return s.isHidden');f(op,'s.beginLevel()');assert f(op,'return s.attackDamage')==150
  assert not errors,errors
  (R/'tools/production-profile-1.0.1.json').write_text(json.dumps({'version':'1.0.1','actual_production_zip':True,'test_code_absent':True,'fresh_save_gated':True,'test_save_does_not_leak':True,'runtime_flag_cannot_restore_test_ui':True,'old_profile_purchases_currency_and_unlocks_preserved':True,'secret_entries_visible_with_conditions':True,'previously_unlocked_secrets_preserved':True,'no_external_asset_requests':True,'no_failed_resources':True,'errors':errors},indent=2)+'\n');b.close()
 server.shutdown()
print('PASS: production-only controls, fresh/old profiles, hidden unavailable video, existing secret access and local assets.')
