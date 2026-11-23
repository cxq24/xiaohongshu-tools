"""Actual 0.7 upload ZIP: first encounters, loot pictures, retreat and six field behaviours."""
from pathlib import Path
from zipfile import ZipFile
from tempfile import TemporaryDirectory
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import ast,json,shutil
ROOT=Path(__file__).resolve().parents[1];S='candyGame.scene.getScene("Adventure")'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass

def f(page,code):return page.evaluate('()=>{const s='+S+';'+code+'}')
def saved(page):return page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1"))')
def fresh(page,i=0):page.evaluate('(i)=>{const s='+S+';s.startLevel(i);s.beginLevel();}',i)
def fixture(page):
 fresh(page);f(page,'s.time.removeAllEvents();s.balls.clear(true,true);s.walls.clear(true,true);s.obstacles=[];s.state="shooting";s.pending=1;s.gameClock=1000;s.absorbedThisVolley=0;s.prismCount=0;')
with TemporaryDirectory() as folder:
 with ZipFile(ROOT/'dragon-bubbles-0.7.0.zip') as z:assert len(z.namelist())<=200;z.extractall(folder)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(folder)));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
 with sync_playwright() as p:
  options={'headless':True}
  if shutil.which('chromium'):options.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  browser=p.chromium.launch(**options);page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"');f(page,'s.startLevel(0)');assert page.locator('.discovery-dialog').is_visible();assert page.locator('.discovery-card').count()>=4;before=f(page,'return s.challengeElapsed');page.wait_for_timeout(250);assert f(page,'return s.challengeElapsed')==before;assert saved(page)['seenGuides']=={}
  page.screenshot(path=str(ROOT/'previews/first-discovery.png'),full_page=True);page.get_by_role('button',name='返回地图',exact=True).click();assert saved(page)['seenGuides']=={}
  f(page,'s.startLevel(0)');page.get_by_role('button',name='开始冒险',exact=True).click();assert f(page,'return s.state')=='ready';assert saved(page)['seenGuides']['skill-big']
  f(page,'s.startLevel(0)');assert page.locator('.discovery-dialog').count()==0;f(page,'s.beginLevel()')
  f(page,'s.startLevel(8)');assert page.locator('[data-discovery="obstacle-slime"]').is_visible();page.get_by_role('button',name='开始冒险',exact=True).click();f(page,'s.startLevel(9)');assert page.locator('[data-discovery="obstacle-slime"]').count()==0
  f(page,'s.startLevel(183)');assert page.locator('[data-discovery="obstacle-blackhole"]').is_visible();page.screenshot(path=str(ROOT/'previews/blackhole-discovery.png'),full_page=True);page.get_by_role('button',name='开始冒险',exact=True).click();page.reload();page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"');f(page,'s.startLevel(183)');assert page.locator('[data-discovery="obstacle-blackhole"]').count()==0;f(page,'s.beginLevel()')
  # Supply acquisition uses the real warehouse UI. Rewind and retreat are separate items.
  data=saved(page);data.update(candy=200,inventory={'retreat':2,'rewind':1},retreatGranted=True,version=7)
  page.evaluate('(p)=>localStorage.setItem("apu-candy-v1",JSON.stringify(p))',data);page.reload();page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"');f(page,'s.showInventory(0)');page.locator('.shop-card').filter(has=page.get_by_text('退步糖',exact=True)).get_by_role('button',name='兑换').click();assert saved(page)['candy']==120;assert saved(page)['inventory']['retreat']==3
  fresh(page,299);assert f(page,'return s.attackDamage')==100;assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="K").maxHp')==436240
  assert not f(page,'return s.useItem("retreat").ok');assert saved(page)['inventory']['retreat']==3
  f(page,'s.shotsFired=1;const b=[...s.nodes.values()].find(n=>n.kind==="K");b.sprite.y=350;');before=f(page,'const b=[...s.nodes.values()].find(n=>n.kind==="K");return {hp:b.hp,y:b.sprite.y}')
  page.locator('#tray-toggle').click();page.locator('[data-item="retreat"]').click();page.locator('#item-use').click();after=f(page,'const b=[...s.nodes.values()].find(n=>n.kind==="K");return {hp:b.hp,y:b.sprite.y}');assert after['hp']==before['hp'];assert before['y']-after['y']==40;assert saved(page)['inventory']['retreat']==2;assert not f(page,'return s.useItem("retreat").ok');assert saved(page)['inventory']['retreat']==2
  fresh(page,8);before=f(page,'return [...s.nodes.values()].map(n=>[n.kind,n.hp,n.sprite.y])');f(page,'s.angle=-Math.PI/2;s.fire()');page.wait_for_function(S+'.state==="ready"',timeout=30000);assert f(page,'return s.useItem("rewind").ok');assert before==f(page,'return [...s.nodes.values()].map(n=>[n.kind,n.hp,n.sprite.y])')
  # Real scene methods on controlled bodies: absorption cap, force direction, expiry and split cap.
  fixture(page);a=f(page,'const w=s.addObstacle({kind:"blackhole",x:180,y:300,width:36,height:36,radius:66});const outcomes=[];for(let i=0;i<4;i++){const b=s.createBubble(180,300,-Math.PI/2,100,100);outcomes.push(s.applyFields(b,16));}return outcomes');assert a==[False,False,False,True]
  f(page,'s.gameClock=2000');assert f(page,'const b=s.createBubble(180,300,-Math.PI/2,100,100);return s.applyFields(b,16)')
  fixture(page);assert f(page,'s.addObstacle({kind:"blackhole",x:180,y:300,width:36,height:36,radius:66});const b=s.createBubble(145,300,-Math.PI/2,100,100);s.applyFields(b,100);return b.body.velocity.x>0')
  fixture(page);assert f(page,'s.addObstacle({kind:"repulsor",x:180,y:300,width:36,height:36,radius:70});const b=s.createBubble(145,300,-Math.PI/2,100,100);s.applyFields(b,100);return b.active&&b.body.velocity.x<0')
  fixture(page);assert f(page,'s.addObstacle({kind:"conveyor",x:180,y:300,width:76,height:20,force:160});const b=s.createBubble(180,300,-Math.PI/2,100,100);s.applyFields(b,100);return b.body.velocity.x>15')
  for kind,wanted in [('slime',410*.65),('boost',480)]:
   fixture(page);speed=f(page,f'const w=s.addObstacle({{kind:"{kind}",x:180,y:300,width:44,height:12}}),b=s.createBubble(180,300,-Math.PI/2,410,100);s.hitObstacle(b,w);return Math.hypot(b.body.velocity.x,b.body.velocity.y)');assert abs(speed-wanted)<.01
   f(page,'s.gameClock+=1100;s.update(0,0)');assert f(page,'const b=s.balls.getChildren()[0];return Math.abs(Math.hypot(b.body.velocity.x,b.body.velocity.y)-410)<.01')
  fixture(page);assert f(page,'const a=s.addObstacle({kind:"boost",x:180,y:300,width:44,height:12}),b=s.addObstacle({kind:"slime",x:240,y:300,width:48,height:12}),ball=s.createBubble(180,300,-Math.PI/2,410,100);s.hitObstacle(ball,a);s.gameClock+=100;s.hitObstacle(ball,b);return ball.getData("boostUntil")===0&&ball.getData("slowUntil")>s.gameClock')
  fixture(page);result=f(page,'const w=s.addObstacle({kind:"prism",x:180,y:300,width:38,height:28});for(let i=0;i<5;i++){const b=s.createBubble(160,300,-Math.PI/2,410,100);s.gameClock+=100;s.hitObstacle(b,w);}return {split:s.prismCount,half:s.balls.getChildren().filter(b=>b.getData("damage")===50).length};');assert result=={'split':3,'half':3}
  fresh(page,29);f(page,'s.shotsFired=5;s.productiveShots=5;s.bestCombo=20;s.win()');assert not page.evaluate('CandyAudio.status.paused');assert page.locator('.reward-currency img').get_attribute('src')=='assets/icon-candy.png';assert page.locator('.reward-loot-card').count()>=3;assert page.locator('[data-reward="medal-0"] img').is_visible();assert page.locator('[data-reward="retreat"] .atlas-icon').is_visible();assert '首领宝箱' not in page.locator('.battle-dialog>p').inner_text();page.screenshot(path=str(ROOT/'previews/rewards-v7.png'),full_page=True)
  # Render the deliverable receipt from a real boss victory, using a documented
  # progressed-save fixture. The aiming driver never changes HP or win conditions.
  renderctx=browser.new_context(viewport={'width':390,'height':844});profile={'version':7,'economyVersion':1,'candy':200,'fireRank':4,'stars':{str(i):3 for i in range(29)},'claimed':{str(i):True for i in range(29)},'missions':{'w0-five':True,'w0-stars':True},'retreatGranted':True,'inventory':{'balls':6,'guard':4,'aim':3}}
  renderctx.add_init_script('localStorage.setItem("apu-candy-v1",'+json.dumps(json.dumps(profile))+');');rp=renderctx.new_page();rp.on('pageerror',lambda e:errors.append(str(e)));rp.goto(url);rp.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  source=ast.parse((ROOT/'tools/simulate_campaign.py').read_text());install=next(ast.literal_eval(n.value) for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='INSTALL' for t in n.targets));rp.evaluate(install);result=rp.evaluate('runLevel(29)')
  for variant in [1,2]:
   if result['state']=='won':break
   result=rp.evaluate('(v)=>runLevel(29,false,v)',variant)
  assert result['state']=='won',result;assert f(rp,'return s.remaining()')==0;rp.evaluate('candyGame.loop.wake()');rp.wait_for_timeout(100);rp.screenshot(path=str(ROOT/'previews/rewards-v7.png'),full_page=True)
  assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  (ROOT/'tools/features-0.7.0.json').write_text(json.dumps({'version':'0.7.0','actual_zip':True,'first_encounter_ack_only_once':True,'guides_survive_reload':True,'guide_pauses_clock':True,'warehouse_retreat_purchase':True,'retreat_keeps_damage_once_per_battle':True,'rewind_snapshot_restores':True,'boss_base_fire_100_vs_fixed_hp':True,'blackhole_absorption_phase_and_cap':True,'gravity_and_repulsion':True,'conveyor_force':True,'slime_boost_and_expiry':True,'prism_half_damage_cap':True,'loot_item_and_candy_and_medal_images':True,'real_physics_boss_reward':True,'errors':errors},indent=2)+'\n')
  browser.close()
 server.shutdown()
print('PASS: actual ZIP first encounters, persisted acknowledgements, retreat, rewind, six mechanisms and image-based loot.')
