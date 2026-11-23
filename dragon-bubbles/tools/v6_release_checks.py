"""Exercise both shipped ZIPs on one origin: gates, scores, HUD and save isolation."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import os
import ast,json,shutil
VERSION=os.environ.get('CANDY_TEST_VERSION','0.6.1')
ROOT=Path(__file__).resolve().parents[1];S='candyGame.scene.getScene("Adventure")'
source=ast.parse((ROOT/'tools/simulate_campaign.py').read_text());INSTALL=next(ast.literal_eval(n.value) for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='INSTALL' for t in n.targets))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass

def f(page,body):return page.evaluate('()=>{const s='+S+';'+body+'}')
def ready(page):page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
with TemporaryDirectory() as folder:
 folder=Path(folder)
 for name,suffix in [('normal',''),('test','-test')]:
  with ZipFile(ROOT/f'dragon-bubbles-{VERSION}{suffix}.zip') as z:z.extractall(folder/name)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(folder)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 with sync_playwright() as p:
  options={'headless':True}
  if shutil.which('chromium'):options.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  browser=p.chromium.launch(**options);ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/normal/');ready(page);f(page,'s.showChapter(0)');assert page.locator('.level-node:not([disabled])').count()==1
  f(page,'s.startLevel(3)');assert f(page,'return s.waveLabel.text')=='后续援军 0/1 批';assert f(page,'return s.energyLabel.text')=='大泡泡能量';assert f(page,'return s.damageLabel.text')=='100';assert f(page,'return s.damageLabel.y')>490
  # Entry modal contains just the win condition.
  assert f(page,'return s.modals.filter(m=>typeof m.text==="string").map(m=>m.text)')==['本关目标','清除全部敌人，守住安全线。']
  f(page,'s.clearModal();s.state="ready"');page.screenshot(path=str(ROOT/'previews/gameplay.png'),full_page=True)
  # Hits, armor and big-skill consumption share the same single energy pool.
  f(page,'const n=[...s.nodes.values()].find(n=>n.monster);s.energy=95;s.damage(n,1);');assert f(page,'return s.energy')==100
  f(page,'s.toggleSkill();s.fire()');assert f(page,'return s.energy')==0
  page.evaluate(INSTALL);result=page.evaluate('runLevel(0)');assert result['state']=='won';assert result['grade'] in ['S','A','B','C'];assert result['productive']<=result['shots']
  assert page.locator('.victory-grade').inner_text()==result['grade'];assert '+'+str(result['reward']) in page.locator('.reward-currency').inner_text()
  page.evaluate('candyGame.loop.wake()');page.wait_for_timeout(100);page.screenshot(path=str(ROOT/'previews/rewards.png'),full_page=True);page.get_by_text('评分与奖励',exact=True).click();assert page.locator('.grade-table tr').count()==5;page.screenshot(path=str(ROOT/'previews/score-rules.png'),full_page=True)
  normal=page.evaluate('localStorage.getItem("apu-candy-v1")');save=json.loads(normal);assert save['bestGrades']['0']==result['grade'];assert save['bestScores']['0']==result['score']
  page.goto(base+'/test/');ready(page);assert '测试版' in page.locator('footer').inner_text();assert page.evaluate('CandyRelease.playtest')
  assert page.evaluate('localStorage.getItem("apu-candy-v1")')==normal
  test=page.evaluate('JSON.parse(localStorage.getItem("apu-candy-playtest-v1"))');assert len(test['worlds'])==10;assert len(test['hiddenUnlocked'])==30;assert len(test['stars'])==0
  f(page,'s.showLevels()');assert page.locator('.world-island.blocked').count()==0
  for w in range(10):
   page.evaluate('(w)=>'+S+'.showChapter(w)',w);assert page.locator('.level-node:not([disabled])').count()==30;assert page.locator('.secret-node:not([disabled])').count()==3
  page.locator('.secret-node').first.click();assert page.get_by_role('button',name='进入隐藏关').is_enabled();page.get_by_role('button',name='进入隐藏关').click();assert f(page,'return s.isHidden');f(page,'s.clearModal();s.state="ready"');assert '秘境守卫' in f(page,'return s.bossStatus.text');page.screenshot(path=str(ROOT/'previews/secret-guardian.png'),full_page=True)
  f(page,'s.startLevel(299);s.clearModal();s.state="ready"');assert f(page,'return s.attackDamage')==page.evaluate('CandyProgress.recommendedAttack(CANDY_LEVELS[299])');assert f(page,'return s.damageLabel.text')==str(f(page,'return s.attackDamage'))
  assert '重型首领' in f(page,'return s.bossStatus.text');page.screenshot(path=str(ROOT/'previews/heavy-boss.png'),full_page=True);f(page,'s.showCodex(s.level)');assert page.locator('.codex-portrait').count()==30;assert page.locator('.codex-portrait[disabled]').count()==0;page.screenshot(path=str(ROOT/'previews/codex-all-test.png'),full_page=True)
  page.locator('[data-enemy="9-K"]').click();assert page.locator('.codex-stage option').count()>=1;assert '生命' in page.locator('.codex-card').inner_text();assert '—' not in page.locator('.codex-card').inner_text()
  # Test victories and profile changes cannot alter the normal save.
  page.evaluate(INSTALL);result=page.evaluate('runLevel(299)');
  for variant in [1,2]:
   if result['state']=='won':break
   result=page.evaluate('(v)=>runLevel(299,false,v)',variant)
  assert result['state']=='won';assert page.evaluate('localStorage.getItem("apu-candy-v1")')==normal
  page.goto(base+'/normal/');ready(page);assert not page.evaluate('CandyRelease.playtest');assert json.loads(page.evaluate('localStorage.getItem("apu-candy-v1")'))==json.loads(normal)
  f(page,'s.showChapter(9)');assert page.locator('.level-node:not([disabled])').count()==0
  assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  (ROOT/f'tools/release-results-{VERSION}.json').write_text(json.dumps({'version':VERSION,'both_actual_zips':True,'reinforcements_start_zero':True,'minimal_intro':True,'turret_damage_badge':True,'shared_energy_pool':True,'real_physics_grade_receipt':True,'test_all_300_and_30_hidden_open':True,'separate_storage_same_origin':True,'gallery_30_portraits':True,'errors':errors},indent=2)+'\n')
  browser.close()
 server.shutdown()
print('PASS: normal/test real ZIPs, zero-based reinforcements, minimal entry, damage placement, energy, physics scoring receipt, all test nodes and save isolation.')
