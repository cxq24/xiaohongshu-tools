"""Six minutes of actual Web Audio, with visibility, suspension and source-loss recovery."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import time,json,shutil
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'build')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 opts={'headless':True}
 if shutil.which('chromium'):opts.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 browser=p.chromium.launch(**opts);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('''window.BaseAudioContext=window.AudioContext;window.AudioContext=class extends BaseAudioContext{constructor(o){super(o);window.audioFixture=this;window.musicNodes=[];const create=this.createBufferSource.bind(this);this.createBufferSource=()=>{const s=create();musicNodes.push(s);return s;};const compressor=this.createDynamicsCompressor.bind(this);this.createDynamicsCompressor=()=>{const c=compressor();window.audioMeter=this.createAnalyser();audioMeter.fftSize=256;c.connect(audioMeter);return c;};}};window.testHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.testHidden});''')
 page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.CandyAudio && window.candyGame?.scene.getScene("Adventure")?.state==="title"');page.locator('canvas').click(position={'x':50,'y':200});page.wait_for_function('CandyAudio.status.running && CandyAudio.status.musicPlaying');page.evaluate('CandyAudio.setTheme(7)')
 started=time.monotonic();samples=[]
 for step in range(37):
  if step==6:
   page.evaluate('testHidden=true;document.dispatchEvent(new Event("visibilitychange"))');assert not page.evaluate('CandyAudio.status.musicPlaying');page.evaluate('testHidden=false;document.dispatchEvent(new Event("visibilitychange"))');page.wait_for_function('CandyAudio.status.musicPlaying');assert page.evaluate('CandyAudio.status.theme')==7
  if step==12:
   page.evaluate('audioFixture.suspend()');page.wait_for_function('!CandyAudio.status.running');page.locator('canvas').click(position={'x':50,'y':200});page.wait_for_function('CandyAudio.status.running && CandyAudio.status.musicPlaying')
  if step==20:
   page.evaluate('musicNodes.findLast(n=>n.loop).stop()');page.wait_for_function('CandyAudio.status.musicRestarts>0 && CandyAudio.status.musicPlaying')
  record=page.evaluate('''()=>{const a=new Uint8Array(audioMeter.fftSize);audioMeter.getByteTimeDomainData(a);return {status:CandyAudio.status,rms:Math.sqrt(a.reduce((s,n)=>s+(n-128)**2,0)/a.length),effect:CandyAudio.play('shoot')};}''')
  assert record['status']['running'] and record['status']['musicPlaying'] and record['effect'];record['elapsed']=round(time.monotonic()-started,2);samples.append(record)
  if step%6==0:print('Audio endurance',round(time.monotonic()-started),'seconds, theme',record['status']['theme'],'music running',flush=True)
  if step<36:page.wait_for_timeout(10000)
 assert samples[-1]['elapsed']>=360;assert sum(s['rms']>.1 for s in samples)>25;assert not errors,errors
 (ROOT/'tools/audio-endurance-0.7.0.json').write_text(json.dumps({'version':'0.7.0','seconds':samples[-1]['elapsed'],'real_audio_context':True,'foreground_preserves_theme':True,'suspension_recovers':True,'lost_music_source_recovers':True,'samples':samples,'errors':errors},indent=2)+'\n')
 browser.close()
server.shutdown();print('PASS: six-minute music/effects, visibility/theme, suspended context and lost looping source recovery.')
