"""Both actual upload ZIPs: energy, field flight, navigation, receipts and test equipment."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import ast, json, shutil, subprocess
ROOT=Path(__file__).resolve().parents[1]; VERSION='1.0.1'; S='candyGame.scene.getScene("Adventure")'
source=ast.parse((ROOT/'tools/simulate_campaign.py').read_text())
INSTALL=next(ast.literal_eval(n.value) for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='INSTALL' for t in n.targets))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def f(page,code):return page.evaluate('()=>{const s='+S+';'+code+'}')
def ready(page):page.wait_for_function(S+'.state==="title"')
def saved(page,key='apu-candy-playtest-v1'):return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',key)
def fresh(page,i=0):page.evaluate('(i)=>{const s='+S+';s.startLevel(i);s.beginLevel();}',i)
def fixture(page):
 fresh(page)
 f(page,'s.time.removeAllEvents();s.balls.clear(true,true);s.targets.clear(true,true);for(const n of s.nodes.values()){n.label?.destroy();n.bar?.destroy();}s.nodes.clear();s.walls.clear(true,true);s.obstacles=[];for(const p of s.portalSprites)p.destroy();s.portalSprites=[];s.state="shooting";s.pending=1;s.gameClock=1000;s.absorbedThisVolley=0;')
with TemporaryDirectory() as folder:
 folder=Path(folder)
 for name,suffix in [('normal',''),('test','-test')]:
  with ZipFile(ROOT/f'dragon-bubbles-{VERSION}{suffix}.zip') as z:
   assert len(z.namelist())==199;z.extractall(folder/name)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(folder)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/normal/');page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  assert len(saved(page,'apu-candy-v1')['owned'])==4
  assert page.evaluate('CandyRelease.version')==VERSION
  f(page,'s.showChapter(0)');assert page.locator('.secret-node').count()==3
  f(page,'s.showWorkshop("power")');assert page.locator('.test-fire-select').count()==0;assert page.get_by_role('button',name='升级火力',exact=True).is_disabled()
  assert page.get_by_text('测试火力',exact=True).count()==0
  # An operator can enable a real video later without rebuilding the main bundle.
  for fragment in ['待配置','无平台广告收益','仅测试版','调试','诊断']:
   assert fragment not in page.locator('body').inner_text()
  page.locator('#help').click();assert '30 个隐藏挑战' not in page.locator('#help-dialog').inner_text();page.locator('#close-help').click()
  fresh(page);assert not f(page,'return !!s.energyLabel||!!s.energyGraphic')
  f(page,'s.energy=50;s.drawEnergy()');assert page.locator('#power-skill').get_attribute('data-energy')=='50';assert page.locator('#skill-label').inner_text()=='大泡泡 50%'
  f(page,'s.energy=100;s.drawEnergy()');assert 'power-ready' in page.locator('#power-skill').get_attribute('class')
  page.locator('#power-skill').click();assert f(page,'return s.armed');assert 'power-armed' in page.locator('#power-skill').get_attribute('class')
  page.screenshot(path=str(ROOT/'previews/energy-production.png'),full_page=True)
  f(page,'s.fire()');assert f(page,'return s.energy')==0
  page.evaluate(INSTALL);result=page.evaluate('runLevel(0)');assert result['state']=='won',result
  assert page.get_by_role('button',name='前往下一关',exact=True).is_visible();assert page.get_by_role('button',name='返回关卡地图',exact=True).is_visible()
  page.evaluate('candyGame.loop.wake()');page.wait_for_timeout(100);page.screenshot(path=str(ROOT/'previews/rewards-production.png'),full_page=True)
  page.get_by_role('button',name='返回关卡地图',exact=True).click();assert f(page,'return s.state')=='chapter';assert f(page,'return s.mapWorld')==0
  # UI fixtures check chapter/final/hidden routing; the first receipt above is a real physics win.
  fresh(page);f(page,'s.win()');page.get_by_role('button',name='前往下一关',exact=True).click();assert f(page,'return s.index')==1
  fresh(page,29);f(page,'s.win()');page.get_by_role('button',name='前往下一主题',exact=True).click();assert f(page,'return s.mapWorld')==1
  fresh(page,299);f(page,'s.win()');assert page.get_by_role('button',name='返回世界地图',exact=True).is_visible();page.get_by_role('button',name='返回关卡地图',exact=True).click();assert f(page,'return s.mapWorld')==9
  # Continuous physics flight, not direct calls to the field helper.
  fixture(page);f(page,'s.addObstacle({kind:"blackhole",x:180,y:330,width:36,height:36,radius:66});s.createBubble(180,380,-Math.PI/2,410,100)')
  page.wait_for_function(S+'.absorbedThisVolley===1',timeout=1500);assert f(page,'return s.balls.countActive()')==0
  fixture(page);f(page,'s.gameClock=2000;s.addObstacle({kind:"blackhole",x:180,y:330,width:36,height:36,radius:66});s.createBubble(180,380,-Math.PI/2,410,100)');page.wait_for_timeout(200);assert f(page,'return s.absorbedThisVolley')==0;assert f(page,'return s.balls.countActive()')==1
  fixture(page);f(page,'s.addObstacle({kind:"blackhole",x:180,y:330,width:36,height:36,radius:66});for(let i=0;i<4;i++)s.createBubble(180,380,-Math.PI/2,410,100)');page.wait_for_function(S+'.absorbedThisVolley===3',timeout=1500);assert f(page,'return s.balls.countActive()')==1;page.wait_for_function('candyGame.scene.getScene("Adventure").obstacles[0].getData("badge").text==="本轮已满"')
  fixture(page);f(page,'s.addObstacle({kind:"repulsor",x:180,y:330,width:36,height:36,radius:70});s.createBubble(145,330,-Math.PI/2,100,100)');page.wait_for_timeout(100);assert f(page,'return s.balls.getChildren()[0].body.velocity.x')<0;assert f(page,'return s.absorbedThisVolley')==0
  # Manual inspection by long press, with a paused clock and no accidental fire.
  fixture(page);f(page,'s.state="ready";s.gameClock=100;s.addObstacle({kind:"blackhole",x:100,y:330,width:36,height:36,radius:66});s.addObstacle({kind:"repulsor",x:260,y:330,width:36,height:36,radius:70});s.portalSprites.push(s.add.image(180,390,"portal"));s.updateFieldVisuals()')
  page.screenshot(path=str(ROOT/'previews/fields-production.png'),full_page=True)
  for x,y,name,detail in [(100,330,'黑洞','吸入'),(260,330,'斥力','向外偏转'),(180,390,'成对传送门','双向传送')]:
   f(page,f's.pointerDown({{x:{x},y:{y}}})');page.wait_for_timeout(500);assert name in page.locator('.mechanism-dialog h2').inner_text();assert detail in page.locator('.mechanism-status').inner_text();clock=f(page,'return s.gameClock');page.wait_for_timeout(80);assert f(page,'return s.gameClock')==clock;f(page,f's.pointerUp({{x:{x},y:{y}}})');assert f(page,'return s.state')=='ready';page.get_by_role('button',name='继续冒险',exact=True).click()
  # A field sensor must not appear as a solid wall in the aim preview.
  f(page,'for(const w of s.obstacles)w.destroy();s.obstacles=[];s.addObstacle({kind:"blackhole",x:180,y:330,width:36,height:36,radius:66});s.angle=-Math.PI/2;window.rects=0;const old=s.aim.strokeRect;s.aim.strokeRect=function(...a){rects++;return old.apply(this,a)};s.drawAim()');assert page.evaluate('rects')==0
  f(page,'s.addObstacle({kind:"stone",x:180,y:330,width:44,height:12});s.drawAim()');assert page.evaluate('rects')==1
  # Real gesture: a short tap does not speed up; holding does, releasing restores.
  fixture(page);f(page,'s.createBubble(50,420,-Math.PI/2,100,100)')
  canvas=page.locator('#game canvas').bounding_box();x=canvas['x']+300*canvas['width']/360;y=canvas['y']+420*canvas['height']/640
  page.mouse.move(x,y);page.mouse.down();page.wait_for_timeout(100);assert not f(page,'return s.fast');page.wait_for_timeout(170);assert f(page,'return s.fast');assert page.locator('#speed-status').is_visible();page.mouse.up();assert not f(page,'return s.fast')
  # Flight distance per wall-clock second approximately doubles, without changing base velocity.
  fixture(page);f(page,'s.createBubble(50,420,-Math.PI/2,100,100)');a=f(page,'return {y:s.balls.getChildren()[0].y,t:performance.now()}');page.wait_for_timeout(200);b=f(page,'return {y:s.balls.getChildren()[0].y,t:performance.now()}');f(page,'s.setFast(true)');c=f(page,'return {y:s.balls.getChildren()[0].y,t:performance.now()}');page.wait_for_timeout(200);d=f(page,'return {y:s.balls.getChildren()[0].y,t:performance.now()}');ratio=((c['y']-d['y'])/(d['t']-c['t']))/((a['y']-b['y'])/(b['t']-a['t']));assert 1.6<ratio<2.4,ratio
  assert f(page,'return s.balls.getChildren()[0].body.velocity.y')==-100
  f(page,'CandyBattleUI.menu()');assert not f(page,'return s.fast');assert f(page,'return s.physics.world.timeScale')==1;page.get_by_role('button',name='继续冒险',exact=True).click()
  f(page,'s.setFast(true);s.endVolley()');assert not f(page,'return s.fast');assert f(page,'return s.time.timeScale')==1
  fresh(page);f(page,'s.state="shooting";s.setFast(true);s.showChapter(0)');assert not f(page,'return s.fast')
  f(page,'s.startLevel(CANDY_HIDDEN[0]);s.beginLevel();s.state="shooting";s.pending=1;s.setFast(true);const before=s.challengeElapsed;s.update(0,100);window.timedFastDelta=s.challengeElapsed-before;s.releaseFast()');assert page.evaluate('timedFastDelta')==200
  normal=saved(page,'apu-candy-v1')
  page.goto(base+'/test/');ready(page);test=saved(page);assert len(test['owned'])==page.evaluate('CandyProgress.SHOP.length')==78;assert len(test['worlds'])==10;assert len(test['hiddenUnlocked'])==30;assert all(n>=10 for n in test['inventory'].values());assert test['testFireRank'] is None
  assert saved(page,'apu-candy-v1')==normal
  # Independent known stage values and codex/scene agreement after tuning.
  fresh(page,0);assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="j").maxHp')==320;assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="b").maxHp')==340
  fresh(page,299);assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="j").maxHp')==15320
  page.screenshot(path=str(ROOT/'previews/heavy-boss-production.png'),full_page=True)
  f(page,'s.showCodex(s.level)');page.locator('[data-enemy="9-K"]').click();assert '698000' in page.locator('.codex-variant').inner_text();page.screenshot(path=str(ROOT/'previews/codex-boss-production.png'),full_page=True);page.locator('.map-back').click();page.locator('.map-back').click();assert f(page,'return s.state')=='ready'
  # Deterministic per-monster/per-volley critical hits, with armor and chains excluded.
  fresh(page,299);assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="K").maxHp')==698000;r=f(page,'const b=[...s.nodes.values()].find(n=>n.kind==="K"),hp=b.hp;for(let i=0;i<9;i++)s.damage(b,100,true);const after9=hp-b.hp;s.damage(b,100,true);return {after9,total:hp-b.hp,crit:s.criticalHits,count:s.volleyHits.get(b.id)}');assert r=={'after9':900,'total':1100,'crit':1,'count':10},r
  f(page,'const b=[...s.nodes.values()].find(n=>n.kind==="K");b.armor=1;s.damage(b,100,true);s.damage(b,100,false)');assert f(page,'return [...s.volleyHits.values()][0]')==10
  page.screenshot(path=str(ROOT/'previews/critical-production.png'),full_page=True)
  f(page,'s.fire()');assert f(page,'return s.volleyHits.size')==0
  # Multiple preparations are additive and every successful use spends one owned item.
  fresh(page,299);before=saved(page)
  for id in ['balls','aim','guard','nova']:
   for _ in range(2):assert f(page,'return s.useItem("'+id+'").ok')
   assert saved(page)['inventory'][id]==before['inventory'][id]-2
  assert f(page,'return [s.extraBalls,s.itemAim,s.guard,s.nova]')==[6,2,2,2]
  f(page,'s.fire()');page.wait_for_timeout(160);assert f(page,'return s.balls.getChildren().filter(b=>b.getData("damage")===s.attackDamage*6).length')==2
  fresh(page,299);f(page,'s.shotsFired=2;for(const n of s.nodes.values())n.sprite.y=350');before=saved(page)['inventory']['retreat'];hp=f(page,'return [...s.nodes.values()].map(n=>n.hp)')
  assert f(page,'return s.useItem("retreat").ok');assert f(page,'return s.useItem("retreat").ok');assert saved(page)['inventory']['retreat']==before-2;assert f(page,'return [...s.nodes.values()].map(n=>n.hp)')==hp
  f(page,'for(const n of s.nodes.values())n.sprite.y=n.kind==="K"?140:122');before=saved(page)['inventory']['retreat'];assert not f(page,'return s.useItem("retreat").ok');assert saved(page)['inventory']['retreat']==before
  # Two snapshot restores, without inventory or timed-clock refunds.
  fresh(page,299);hp=f(page,'const b=[...s.nodes.values()].find(n=>n.kind==="K");s.takeSnapshot();b.hp-=100;s.shotsFired=1;s.takeSnapshot();b.hp-=100;s.shotsFired=2;s.challengeElapsed=12345;return b.maxHp')
  assert f(page,'return s.useItem("rewind").ok');assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="K").hp')==hp-100
  assert f(page,'return s.useItem("rewind").ok');assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="K").hp')==hp;assert f(page,'return s.challengeElapsed')>=12345
  before=saved(page)['inventory']['rewind'];assert not f(page,'return s.useItem("rewind").ok');assert saved(page)['inventory']['rewind']==before
  f(page,'s.showWorkshop()');assert 'system-ui' in page.locator('#map-screen').evaluate('(e)=>getComputedStyle(e).fontFamily');fresh(page);assert 'system-ui' in f(page,'return s.turnLabel.style.fontFamily');assert f(page,'return parseInt(s.turnLabel.style.fontSize)')>=12
  f(page,'s.showLevels()');assert page.locator('.map-bottom button').all_text_contents()==['营地','图鉴'];assert page.locator('.world-island.blocked').count()==0;page.screenshot(path=str(ROOT/'previews/worlds-production.png'),full_page=True)
  # Deliberately leave an old battle world to catch incorrect back destinations.
  fresh(page,0);f(page,'s.showChapter(7)');assert page.locator('.map-bottom button').all_text_contents()==['战前准备','章节任务'];page.get_by_role('button',name='战前准备',exact=True).click();page.get_by_role('button',name='火力升级',exact=True).click();assert page.locator('.test-fire-select option').count()==101
  page.get_by_role('button',name='道具仓库',exact=True).click();assert f(page,'return s.state')=='warehouse';page.get_by_role('button',name='返回营地',exact=True).click();assert page.locator('.test-fire-select').is_visible();page.get_by_role('button',name='返回',exact=True).click();assert f(page,'return s.mapWorld')==7;assert f(page,'return s.state')=='chapter'
  page.get_by_role('button',name='战前准备',exact=True).click();before=saved(page)['candy']
  for tab,slot in [('角色装扮','dragon'),('泡泡皮肤','bubble'),('炮台外观','turret')]:
   page.get_by_role('button',name=tab,exact=True).click()
   for tier in range(8):
    page.locator('.price-tier-select').select_option(str(tier));assert page.locator('.cosmetic-card').count()==3;assert all('购买' not in t for t in page.locator('.cosmetic-card button.map-action').all_text_contents())
   page.locator('.cosmetic-card button.map-action:not([disabled])').first.click();assert saved(page)['equipped'][slot] in saved(page)['owned']
  page.get_by_role('button',name='功能装备',exact=True).click();page.locator('.cosmetic-card button.map-action:not([disabled])').first.click();assert saved(page)['equipped']['gear']!='gear-none';assert saved(page)['candy']==before
  page.get_by_role('button',name='火力升级',exact=True).click();page.locator('.test-fire-select').select_option('0');fresh(page,299);assert f(page,'return s.attackDamage')==100;assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="K").maxHp')==698000
  f(page,'s.showWorkshop("power")');page.locator('.test-fire-select').select_option('99');fresh(page,299);assert f(page,'return s.attackDamage')==2000;assert f(page,'return [...s.nodes.values()].find(n=>n.kind==="K").maxHp')==698000
  page.reload();ready(page);assert saved(page)['testFireRank']==99;f(page,'s.showWorkshop("power")');page.locator('.test-fire-select').select_option('recommended');fresh(page,299);assert f(page,'return s.attackDamage')==page.evaluate('CandyProgress.recommendedAttack(CANDY_LEVELS[299])')
  fresh(page);assert f(page,'return s.useItem("balls").ok');stock=saved(page)['inventory']['balls'];page.reload();ready(page);assert saved(page)['inventory']['balls']==stock
  f(page,'s.showWorkshop("power")');page.get_by_role('button',name='补满测试道具',exact=True).click();assert all(v==20 for v in saved(page)['inventory'].values());page.screenshot(path=str(ROOT/'previews/test-camp-production.png'),full_page=True)
  # Hidden completion offers both map destinations, without changing the normal profile.
  f(page,'s.startLevel(CANDY_HIDDEN[0]);s.beginLevel();s.win()');assert page.get_by_role('button',name='返回关卡地图',exact=True).is_visible();page.get_by_role('button',name='返回世界地图',exact=True).click();assert f(page,'return s.state')=='worlds'
  assert saved(page,'apu-candy-v1')==normal
  for width in [320,390,430]:
   page.set_viewport_size({'width':width,'height':844});f(page,'s.showWorkshop("power")');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');fresh(page);assert page.locator('#power-skill').bounding_box()['width']>=100
  # A separate normal-build profile earned only C-grade clears and bought no skins.
  # Replay the final encounter with the actually affordable Lv.99, not a test override.
  profile=json.loads(subprocess.check_output(['node','-e',"const P=require('./build/progress.js');const p=P.normalize();for(let i=0;i<299;i++){while(P.upgrade(p).ok){}P.win(p,i,1,{grade:'C',score:45});}while(P.upgrade(p).ok){}console.log(JSON.stringify(p));"],cwd=ROOT,text=True))
  budgetctx=browser.new_context(viewport={'width':390,'height':844});budgetctx.add_init_script('localStorage.setItem("apu-candy-v1",'+json.dumps(json.dumps(profile))+');');bp=budgetctx.new_page();bp.on('pageerror',lambda e:errors.append(str(e)));bp.goto(base+'/normal/');ready(bp);assert not bp.evaluate('CandyRelease.playtest');bp.evaluate(INSTALL)
  f(bp,'const destroy=s.destroyTarget;s.destroyTarget=function(n){if(n.kind==="K")this.bossDefeatedVolley=this.shotsFired;return destroy.call(this,n)}')
  for variant in [0,1,2]:
   f(bp,'s.bossDefeatedVolley=null');budget_result=bp.evaluate('(v)=>runLevel(299,false,v)',variant)
   if budget_result['state']=='won':break
  assert budget_result['state']=='won',budget_result;assert budget_result['attack']==2000;assert budget_result['initialBossHp']==698000;assert budget_result['itemsUsed']==[]
  budget_result['bossDefeatedVolley']=f(bp,'return s.bossDefeatedVolley');budget_result['startingCurrency']=profile['candy'];assert profile['candy']==5045;assert f(bp,'return s.remaining()')==0
  bp.evaluate('candyGame.loop.wake()');bp.wait_for_timeout(80);bp.screenshot(path=str(ROOT/'previews/normal-budget-victory-production.png'),full_page=True)
  assert not errors,errors
  (ROOT/f'tools/features-{VERSION}.json').write_text(json.dumps({'version':VERSION,'both_actual_zips':True,'single_energy_control':True,'real_physics_first_level_receipt':True,'reward_next_and_map_returns':True,'field_absorption_real_flight':True,'sleep_and_quota_visible':True,'repulsion_real_flight':True,'long_press_field_and_portal_inspection':True,'sensor_aim_preview':True,'two_level_navigation_and_context_return':True,'all_78_goods_owned_in_test':True,'all_72_paid_looks_equippable_free':True,'test_fire_0_to_99_and_recommended':True,'test_inventory_persists_and_refills':True,'normal_save_isolated':True,'hold_speed_flight_ratio':ratio,'speed_release_and_pause_reset':True,'timed_challenge_scales_with_speed':True,'production_test_controls_removed':True,'secret_entries_visible_with_conditions':True,'player_copy_clean':True,'fixed_final_boss_hp':698000,'ordinary_elite_hp_examples':[320,340,15320],'codex_matches_scene_hp':True,'test_fire_does_not_change_hp':True,'per_monster_tenth_hit_critical':True,'stackable_inventory_and_repeat_retreat':True,'multiple_rewind_no_refunds':True,'readable_canvas_and_dom_fonts':True,'mobile_widths':[320,390,430],'normal_c_grade_budget_final_boss':budget_result,'errors':errors},indent=2)+'\n');browser.close()
 server.shutdown()
print('PASS: production ZIP energy, physics fields, routing, all test goods, fire control and isolated saves.')
