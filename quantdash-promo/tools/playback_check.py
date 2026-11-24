"""Smoke-check final MP4 playback and seeking in desktop Chromium."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json,hashlib

root=Path(__file__).resolve().parents[1]/'out'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)));Thread(target=server.serve_forever,daemon=True).start();results=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for name in ['quantdash-30s-v1.mp4','quantdash-30s-v1-nobgm.mp4']:
   page=browser.new_page(viewport={'width':430,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/')
   page.set_content('<button id="play" onclick="v.play()">Play</button><video id="v" controls playsinline style="width:390px"></video>');page.evaluate('(name)=>v.src=name',name);page.wait_for_function('v.readyState>=2');page.locator('#play').click();page.wait_for_function('v.currentTime>.4&&!v.paused');page.evaluate('v.pause();v.currentTime=29.2');page.wait_for_function('!v.seeking&&v.readyState>=2')
   d=page.evaluate('({duration:v.duration,width:v.videoWidth,height:v.videoHeight,muted:v.muted,error:v.error?.message||null,audioDecodedBytes:v.webkitAudioDecodedByteCount||0})');assert not d['error'] and not errors;assert d['width']==1080 and d['height']==1920 and d['audioDecodedBytes']>0
   results.append({'file':name,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest(),'chromium_actual_playback':True,'seek_end_decoded':True,**d});page.close()
  browser.close()
finally:server.shutdown()
(root/'browser-playback.json').write_text(json.dumps({'browser':'Desktop Chromium; not an iPhone/XHS-device test','results':results},indent=2)+'\n');print('PASS: both final MP4s play, decode audio, and seek to the final scene.')
