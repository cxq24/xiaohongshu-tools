"""Release 0.6 input, combat tray, exit, growth, codex, settings and hidden-rule checks."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import os
import json,shutil,subprocess
VERSION=os.environ.get('CANDY_TEST_VERSION','0.10.0')
ROOT=Path(__file__).resolve().parents[1];S='candyGame.scene.getScene("Adventure")'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass

def f(page,body):return page.evaluate('()=>{const s='+S+';'+body+'}')
def saved(page):return page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1"))')
def tap(page,x,y,hold=0):
 b=page.locator('canvas').bounding_box();page.mouse.move(b['x']+x/360*b['width'],b['y']+y/640*b['height']);page.mouse.down()
 if hold:page.wait_for_timeout(hold)
 page.mouse.up()
def fresh(page,i=0):page.evaluate('(i)=>{const s='+S+';s.startLevel(i);s.beginLevel?s.beginLevel():(s.clearModal(),s.state="ready");}',i);page.wait_for_timeout(35)

with TemporaryDirectory() as folder:
 folder=Path(folder)
 with ZipFile(ROOT/f'dragon-bubbles-{VERSION}.zip') as z:
  assert z.testzip() is None;assert [n for n in z.namelist() if n.lower().endswith(('.html','.htm'))]==['index.html'];z.extractall(folder)
 subprocess.run(['ffmpeg','-loglevel','error','-f','lavfi','-i','color=c=teal:s=176x96:r=15','-t','31','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(folder/'fixture.mp4')],check=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(folder)));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
 with sync_playwright() as p:
  options={'headless':True}
  if shutil.which('chromium'):options.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  browser=p.chromium.launch(**options);ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  ctx.add_init_script('window.NativeAudioContext=window.AudioContext;window.AudioContext=class extends NativeAudioContext{constructor(o){super(o);window.fixtureAudio=this;}};')
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  f(page,'s.showLevels()');page.get_by_role('button',name='糖果森林，已开放',exact=True).click();assert page.locator('.level-node').count()==30
  page.get_by_role('button',name='第1关 糖果林入口',exact=True).click();(page.get_by_role('button',name='开始冒险',exact=True).click() if page.locator('.discovery-dialog').count() else tap(page,180,391));page.wait_for_function(S+'.state==="ready"')
  assert f(page,'return s.attackDamage')==100;assert f(page,'return [...s.nodes.values()].find(n=>n.monster).maxHp')>=200
  assert page.locator('#battle-bar button').count()==4
  assert page.get_by_role('button',name='加速',exact=False).count()==0 and page.get_by_role('button',name='收球',exact=False).count()==0
  page.wait_for_function('CandyAudio.status.running');page.evaluate('fixtureAudio.suspend()');tap(page,136,177);page.wait_for_function('CandyAudio.status.running && '+S+'.hitCount>0')
  page.wait_for_function(S+'.state==="ready"',timeout=18000)
  # Explicit isolated save fixture supplies stock; ordinary players earn these in play.
  data=saved(page);data.update(version=4,fireRank=0,candy=1000,missions={'w0-five':True,'w0-stars':True},stars={str(i):3 for i in range(6)},claimed={str(i):True for i in range(6)},inventory={i:2 for i in ['balls','aim','guard','rewind','nova','hammer']})
  page.evaluate('(p)=>localStorage.setItem("apu-candy-v1",JSON.stringify(p))',data);page.reload();page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"');fresh(page)
  assert page.locator('#item-tray').is_hidden();page.locator('#tray-toggle').click();assert page.locator('#item-tray').is_visible();assert page.locator('#map-screen').is_hidden()
  page.locator('[data-item="balls"]').click();assert '+3' in page.locator('#item-description').inner_text();assert saved(page)['inventory']['balls']==2
  page.screenshot(path=str(ROOT/'previews/quick-items.png'),full_page=True)
  page.locator('#item-use').click();assert page.locator('#item-tray').is_hidden();assert saved(page)['inventory']['balls']==1;assert f(page,'return s.extraBalls')==3
  page.locator('#tray-toggle').click();page.locator('[data-item="balls"]').click();page.locator('#item-use').click();assert saved(page)['inventory']['balls']==0;assert f(page,'return s.extraBalls')==6
  tap(page,136,177);page.wait_for_timeout(750);assert f(page,'return s.balls.countActive()+s.pending')==f(page,'return s.level.balls+6')
  page.locator('#exit-battle').click();assert page.get_by_role('heading',name='退出本局？').is_visible();before=f(page,'return s.gameClock');page.wait_for_timeout(200);assert f(page,'return s.gameClock')==before
  page.screenshot(path=str(ROOT/'previews/exit-confirm.png'),full_page=True)
  page.get_by_role('button',name='继续冒险',exact=True).click();assert f(page,'return s.state')=='shooting';page.locator('#exit-battle').click();page.get_by_role('button',name='确认退出').click();assert f(page,'return s.state')=='title';assert f(page,'return s.balls.countActive()')==0;assert saved(page)['inventory']['balls']==0
  # Persistent growth and cosmetics are separate purchases.
  f(page,'s.showWorkshop()');page.get_by_role('button',name='火力升级',exact=True).click();cash=saved(page)['candy'];page.get_by_role('button',name='升级火力').click();assert saved(page)['fireRank']==1;assert saved(page)['candy']==cash-80;assert page.get_by_role('button',name='升级火力').is_disabled()
  page.screenshot(path=str(ROOT/'previews/fire-upgrade.png'),full_page=True)
  page.get_by_role('button',name='炮台外观',exact=True).click();page.locator('.price-tier-select').select_option('1');page.locator('.shop-card').filter(has=page.get_by_text('糖果发射器',exact=True)).get_by_role('button',name='购买').click();assert saved(page)['equipped']['turret']=='turret-candy';assert saved(page)['fireRank']==1
  page.get_by_role('button',name='角色装扮',exact=True).click();page.locator('.price-tier-select').select_option('1');page.locator('.shop-card').filter(has=page.get_by_text('阿噗的雪帽',exact=True)).get_by_role('button',name='购买').click();assert saved(page)['equipped']['dragon']=='outfit-1'
  page.screenshot(path=str(ROOT/'previews/outfit-shop.png'),full_page=True)
  fresh(page);assert f(page,'return s.attackDamage')==110;assert f(page,'return s.turret.texture.key')=='turret-candy';assert f(page,'return s.hero.texture.key')=='outfit-1'
  f(page,'s.showCodex(s.level)');assert page.locator('.codex-portrait').count()==30;assert page.locator('.codex-portrait.undiscovered').count()>0;assert page.locator('.codex-card').count()==0;assert page.locator('[data-enemy="9-K"]').is_disabled();page.screenshot(path=str(ROOT/'previews/codex.png'),full_page=True);page.locator('[data-enemy="0-j"]').click();assert '生命' in page.locator('.codex-card').inner_text();assert '—' not in page.locator('.codex-card').inner_text();page.screenshot(path=str(ROOT/'previews/codex-detail.png'),full_page=True);page.locator('.map-back').click();page.locator('.map-back').click();assert f(page,'return s.state')=='ready'
  node=f(page,'const n=[...s.nodes.values()].find(n=>n.monster);return {x:n.sprite.x,y:n.sprite.y,hp:n.hp}');tap(page,node['x'],node['y'],500);assert page.get_by_role('heading',name='敌人情报').is_visible();assert str(node['hp']) in page.locator('.battle-dialog').inner_text();assert f(page,'return s.shotsFired')==0;page.get_by_role('button',name='继续冒险',exact=True).click()
  page.locator('#sound').click();assert page.locator('#audio-dialog input[type="range"]').count()==3;assert page.locator('#audio-diagnostics').count()==0;assert f(page,'return s.uiPaused');assert not page.evaluate('CandyAudio.status.paused');page.screenshot(path=str(ROOT/'previews/audio-settings.png'),full_page=True);page.locator('#close-audio').click();page.wait_for_function('!'+S+'.uiPaused')
  # Rewind restores actual scaled HP, not HP multiplied a second time.
  fresh(page,70);old=f(page,'return [...s.nodes.values()].map(n=>[n.kind,n.sprite.x,n.hp])');f(page,'s.angle=-Math.PI/2;s.fire()');page.wait_for_function(S+'.state==="ready"',timeout=18000);assert f(page,'return s.useItem("rewind").ok');assert f(page,'return [...s.nodes.values()].map(n=>[n.kind,n.sprite.x,n.hp])')==old;assert saved(page)['inventory']['rewind']==1
  # Different hidden rules have real win/fail conditions, not just different labels.
  page.evaluate('()=>{const s='+S+';s.startLevel(CANDY_HIDDEN[0]);s.beginLevel?s.beginLevel():(s.clearModal(),s.state="ready");;s.challengeElapsed=s.level.timeLimit*1000-300;}');page.locator('#menu-toggle').click();elapsed=f(page,'return s.challengeElapsed');page.wait_for_timeout(400);assert f(page,'return s.challengeElapsed')==elapsed;page.get_by_role('button',name='继续冒险',exact=True).click();page.wait_for_function(S+'.state==="lost"');assert f(page,'return s.balls.countActive()')==0
  page.evaluate('()=>{const s='+S+';s.startLevel(CANDY_HIDDEN[1]);s.beginLevel?s.beginLevel():(s.clearModal(),s.state="ready");;for(const n of s.nodes.values()){n.label?.destroy();n.bar?.destroy();}s.nodes.clear();s.targets.clear(true,true);s.wave=s.level.waves.length;s.addTarget("j2",3,480);s.state="shooting";s.endVolley();}');assert f(page,'return s.baseLives')==2;assert f(page,'return s.state')=='ready';f(page,'s.state="shooting";s.endVolley()');assert f(page,'return s.state')=='won'
  # Promo integration uses an actual local 31-second TEST FIXTURE, not a countdown.
  videoctx=browser.new_context(viewport={'width':390,'height':844});videoctx.add_init_script('if(!localStorage.getItem("apu-candy-v1"))localStorage.setItem("apu-candy-v1",JSON.stringify({version:4,economyVersion:1,stars:{0:3,1:3,2:3,3:3,4:3},claimed:{0:true,1:true,2:true,3:true,4:true}}));')
  videoctx.route('**/video-config.js',lambda route:route.fulfill(status=200,content_type='application/javascript',body=f'window.CANDY_PROMO={{src:{json.dumps(url+"fixture.mp4")},minimumSeconds:30}};'))
  v=videoctx.new_page();v.on('pageerror',lambda e:errors.append(str(e)));v.goto(url);v.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"');f(v,'s.showChapter(0)');v.locator('.secret-node').first.click();v.get_by_role('button',name='观看宣传视频并开启').click();v.wait_for_function('document.getElementById("promo-video").readyState>=2');v.locator('#skip-promo').click();assert saved(v)['hiddenUnlocked']==[]
  v.get_by_role('button',name='观看宣传视频并开启').click();v.wait_for_function(S+'.isHidden && '+S+'.state==="intro"',timeout=45000);assert 'h-0-0' in saved(v)['hiddenUnlocked']
  assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  (ROOT/f'tools/browser-results-{VERSION}.json').write_text(json.dumps({'version':VERSION,'inline_item_tray':True,'exit_cancel_confirm':True,'progress_gated_upgrades':True,'cosmetics_independent':True,'codex_and_enemy_inspect':True,'audio_clean_and_recovers':True,'timed_pause_timeout':True,'defense_lives':True,'real_promo_completion':True,'errors':errors},indent=2)+'\n')
  browser.close()
 server.shutdown()
print('PASS: v6 tray, exit, growth, skins, codex, settings, scaled rewind, hidden objectives and actual promo playback.')
