"""0.2.0 audio, goal clarity and economy integration checks on the extracted ZIP."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
SCENE='candyGame.scene.getScene("Adventure")'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def state(page,body):return page.evaluate('()=>{const s='+SCENE+';'+body+'}')
def tap(page,x,y):
 page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
 b=page.locator('canvas').bounding_box();page.mouse.click(b['x']+x/360*b['width'],b['y']+y/640*b['height'])
def start(page,i=0):page.evaluate('(i)=>{const s='+SCENE+';s.startLevel(i);s.clearModal();s.state="ready"}',i)
def saved(page):return page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1"))')
with TemporaryDirectory() as folder:
 with ZipFile(ROOT/'dragon-bubbles-0.2.0.zip') as z:
  assert [n for n in z.namelist() if n.lower().endswith(('.html','.htm'))]==['index.html']
  z.extractall(folder)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=folder));Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as p:
  options={'headless':True}
  if shutil.which('chromium'):options.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  browser=p.chromium.launch(**options);page=browser.new_page(viewport={'width':430,'height':860});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/')
  page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  assert not page.evaluate('CandyAudio.status.running')
  tap(page,180,482);tap(page,180,391)
  page.wait_for_function('CandyAudio.status.running && CandyAudio.status.musicStarts>0')
  assert page.evaluate('CandyAudio.status.events.voiceStart')>=1
  assert '已消灭 0/8' in state(page,'return s.goalLabel.text')
  tap(page,136,177);page.wait_for_function('CandyAudio.status.events.shoot>=3')
  page.wait_for_function('CandyAudio.status.events.hit>0')
  # Isolated audio fixtures inspect actual audio buffers and source scheduling.
  dsp=page.evaluate('''()=>{const names=['shoot','big','hit','berry','boss','voiceStart'];return names.map(name=>{const a=CandyAudio.render(name,8000);return {name,length:a.length,rms:Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length),finite:a.every(Number.isFinite)};});}''')
  assert all(d['finite'] and .01<d['rms']<.8 for d in dsp),dsp
  assert dsp[0]['length']!=dsp[1]['length']
  music=page.evaluate('()=>{const a=CandyAudio.renderMusic(8000);return {rms:Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length),finite:a.every(Number.isFinite)}}')
  assert music['finite'] and music['rms']>.01
  start(page);state(page,'s.energy=100;s.drawEnergy();');tap(page,180,615);tap(page,136,177)
  page.wait_for_function('CandyAudio.status.events.big>0')
  assert page.evaluate('CandyAudio.status.events.voicePower')>=1
  page.locator('#sound').click();assert state(page,'return s.uiPaused')
  previous=page.evaluate('CandyAudio.status.events.shoot||0');page.locator('[data-sound="shoot"]').click()
  page.wait_for_function('CandyAudio.status.events.shoot>'+str(previous))
  page.locator('#volume-music').fill('15');page.locator('#volume-effects').fill('40');page.locator('#volume-voice').fill('60')
  assert page.evaluate('CandyAudio.settings.music')==.15
  page.locator('#audio-enabled').uncheck();assert not page.evaluate('CandyAudio.play("shoot")')
  page.locator('#audio-enabled').check();page.wait_for_function('CandyAudio.settings.enabled')
  page.screenshot(path=str(ROOT/'previews/audio-settings.png'),full_page=True)
  page.locator('#close-audio').click();page.wait_for_function('!'+SCENE+'.uiPaused')
  # Isolated victory fixture verifies award-once and the visible spend loop.
  start(page);state(page,'s.win();');assert saved(page)['candy']==45
  state(page,'s.win();');assert saved(page)['candy']==45,'Duplicate win must not award twice'
  tap(page,180,438);assert state(page,'return s.state')=='workshop'
  tap(page,180,293);assert saved(page)['candy']==5
  assert saved(page)['equipped']['dragon']=='dragon-berry'
  tap(page,295,293);assert saved(page)['candy']==5,'Insufficient balance must not charge'
  page.screenshot(path=str(ROOT/'previews/camp.png'),full_page=True)
  start(page);assert state(page,'return s.hero.texture.key')=='dragonBerry'
  state(page,'s.win();');assert saved(page)['candy']==10
  start(page);state(page,'s.lose();');assert saved(page)['candy']==10
  # A fifth level can legitimately reach its seventh shot after all five batches arrive.
  start(page,4)
  state(page,"for(const n of s.nodes.values())n.label?.destroy();s.nodes.clear();s.targets.clear(true,true);s.wave=5;s.turn=7;s.shotsFired=7;s.defeated=s.totalMonsters-1;s.addTarget('j2',3,320);s.refreshHUD();s.state='shooting';s.pending=0;s.endVolley();")
  assert state(page,'return s.state')=='ready'
  assert '已发射 7 次' in state(page,'return s.turnLabel.text')
  assert '已全部到场' in state(page,'return s.waveLabel.text')
  page.screenshot(path=str(ROOT/'previews/goal-clarity.png'),full_page=True)
  state(page,'s.damage([...s.nodes.values()][0],2);s.state="shooting";s.pending=0;s.endVolley();')
  assert state(page,'return s.state')=='won'
  assert state(page,'return s.defeated===s.totalMonsters')
  # Purchase bubble skins then verify the equipped runtime texture and persistence.
  state(page,'s.showWorkshop();');tap(page,180,477)
  assert saved(page)['equipped']['bubble']=='bubble-star',saved(page)
  start(page);tap(page,136,177)
  page.wait_for_function(SCENE+'.balls.countActive()>0')
  assert state(page,'return s.balls.getChildren()[0].texture.key')=='bubbleStar'
  page.reload();page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  assert saved(page)['equipped']['dragon']=='dragon-berry'
  assert saved(page)['equipped']['bubble']=='bubble-star',saved(page)
  assert page.evaluate('CandyAudio.settings.music')==.15
  # Legacy saves receive historical first-clear rewards once, retaining progress.
  legacy=browser.new_context()
  legacy.add_init_script('if(!localStorage.getItem("apu-candy-v1"))localStorage.setItem("apu-candy-v1",JSON.stringify({unlocked:1,current:1,stars:{0:3,1:2}}))')
  old=legacy.new_page();old.on('pageerror',lambda e:errors.append(str(e)));old.goto(f'http://127.0.0.1:{server.server_port}/');old.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  assert saved(old)['candy']==85
  old.reload();old.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
  assert saved(old)['candy']==85
  assert not errors,errors
  (ROOT/'tools/feature-test-results.json').write_text(json.dumps({'version':'0.2.0','audio_dsp':dsp,'music_dsp':music,'award_once':True,'shop_and_skins':True,'legacy_migration_once':True,'rounds_vs_batches':True,'errors':errors},indent=2)+'\n')
  browser.close()
 server.shutdown()
print('PASS: audible-source scheduling, distinct DSP buffers, BGM, volume/mute persistence, goals, duplicate-win guard, rewards, shop and equipped sprites, one-time legacy migration.')
