"""Actual upload bundle: clean stale effect sources and replace a closed context."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
with TemporaryDirectory() as folder:
 with ZipFile(ROOT/'dragon-bubbles-0.7.0.zip') as z:z.extractall(folder)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(folder)));Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as p:
  opts={'headless':True}
  if shutil.which('chromium'):opts.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  browser=p.chromium.launch(**opts);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script('window.OriginalContext=window.AudioContext;window.nodes=[];window.AudioContext=class extends OriginalContext{constructor(o){super(o);window.fixtureContext=this;const f=this.createBufferSource.bind(this);this.createBufferSource=()=>{const s=f();nodes.push(s);return s;};}};')
  page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"');page.locator('canvas').click(position={'x':50,'y':200});page.wait_for_function('CandyAudio.status.musicPlaying');page.evaluate('CandyAudio.setTheme(8)')
  count=page.evaluate('()=>{let n=0;for(let i=0;i<24;i++){if(CandyAudio.play("shoot")){nodes.at(-1).onended=null;n++;}}return n;}');assert count==24;page.wait_for_timeout(400);assert page.evaluate('CandyAudio.play("shoot")');assert page.evaluate('CandyAudio.status.prunedEffects')>=24
  page.evaluate('fixtureContext.close()');page.wait_for_function('!CandyAudio.status.running');page.locator('canvas').click(position={'x':50,'y':200});page.wait_for_function('CandyAudio.status.running && CandyAudio.status.musicPlaying');assert page.evaluate('CandyAudio.status.theme')==8;assert page.evaluate('CandyAudio.play("shoot")')
  page.evaluate('CandyAudio.set("enabled",false)');page.wait_for_timeout(100);assert not page.evaluate('CandyAudio.status.musicPlaying');page.evaluate('window.dispatchEvent(new Event("focus"))');assert not page.evaluate('CandyAudio.status.musicPlaying');assert not errors,errors
  (ROOT/'tools/audio-recovery-0.7.0.json').write_text(json.dumps({'version':'0.7.0','actual_zip':True,'missing_ended_events_pruned':24,'closed_context_recreated':True,'theme_preserved':True,'mute_respected':True,'errors':errors},indent=2)+'\n');browser.close()
 server.shutdown()
print('PASS: actual ZIP prunes 24 lost effect events, recreates closed audio, preserves theme and respects mute.')
