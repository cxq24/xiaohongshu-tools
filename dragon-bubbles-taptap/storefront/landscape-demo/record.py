"""Record a separate, genuinely rendered horizontal demo; never writes release files."""
from pathlib import Path
from tempfile import TemporaryDirectory
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import base64,hashlib,json,subprocess,sys,time

ROOT=Path(__file__).resolve().parent
STORE=ROOT.parent;sys.path.insert(0,str(STORE))
from build_materials import protected
from record_gameplay import AUDIO_TAP,probe
OUTPUT=STORE/'gameplay-landscape-complete-40s-1920x1080.mp4'
W,H=1152,648
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def record():
 original_sha=protected();release=json.loads((STORE.parent/'release.json').read_text())
 errors=[];states=[];actions=[];all_frames_complete=True
 with TemporaryDirectory() as temp:
  temp=Path(temp)
  with ZipFile(STORE.parent/release['file']) as archive:archive.extractall(temp/'runtime')
  runtime=temp/'runtime'/release['archive_root']
  for name in ['adapter.js','layout.css']:(runtime/name).write_bytes((ROOT/name).read_bytes())
  index=runtime/'index.html';page_html=index.read_text().replace('</head>','<link rel="stylesheet" href="layout.css"></head>').replace('</body>','<script src="adapter.js"></script></body>');index.write_text(page_html)
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(runtime)))
  Thread(target=server.serve_forever,daemon=True).start()
  try:
   with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1,record_video_dir=str(temp/'video'),record_video_size={'width':1920,'height':1080})
    ctx.add_init_script(AUDIO_TAP)
    p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(f'http://127.0.0.1:{server.server_port}/')
    p.wait_for_function('window.LandscapeDemo?.ready',timeout=30000)
    p.wait_for_timeout(400)
    p.screenshot(path=str(ROOT/'preview-title.png'))
    def snapshot():
     return p.evaluate('''() => {
      const s=LandscapeDemo.scene,c=candyGame.canvas,r=c.getBoundingClientRect();
      const fit=o=>{const b=o.getBounds();return b.left>=0&&b.top>=0&&b.right<=1152&&b.bottom<=648};
      return {state:s.state,level:s.index,shots:s.shotsFired||0,energy:s.energy||0,hero:!s.hero?.active||fit(s.hero),turret:!s.turret?.active||fit(s.turret),nodes:[...s.nodes.values()].filter(n=>!n.dead).every(n=>fit(n.sprite)),camera:{x:s.cameras.main.scrollX,y:s.cameras.main.scrollY,zoom:s.cameras.main.zoom},canvas:{x:r.x,y:r.y,width:r.width,height:r.height,pixels:[c.width,c.height]},bar:(()=>{const b=document.querySelector('#battle-bar').getBoundingClientRect();return b.left>=0&&b.top>=0&&b.right<=1920&&b.bottom<=1080})(),badge_clear:(()=>{const b=document.querySelector('#speed-status');return !b||b.hidden||b.getBoundingClientRect().bottom<100})()};
     }''')
    def point(a,b):return a*1920/W,b*1080/H
    def click(a,b):p.mouse.click(*point(a,b))
    def state():return p.evaluate('LandscapeDemo.scene.state')
    initial=snapshot();assert initial['canvas']['width']==1920 and initial['canvas']['height']==1080
    assert initial['canvas']['pixels'][0]>=1920
    p.mouse.click(12,12);p.wait_for_function('window.__gameAudioTap && CandyAudio.status.running')
    p.evaluate('''() => {window.__parts=[];window.__recorder=new MediaRecorder(__gameAudioTap.stream,{mimeType:'audio/webm;codecs=opus'});__recorder.ondataavailable=e=>{if(e.data.size)__parts.push(e.data)};__recorder.start(1000);}''')
    start=time.monotonic();p.wait_for_timeout(1500);click(W/2,458);p.wait_for_timeout(1600)
    captured=False
    while time.monotonic()-start<42:
     info=snapshot();current=info['state']
     if not states or states[-1]['state']!=current:states.append({'time':round(time.monotonic()-start,2),'state':current,'level':info['level']})
     assert info['camera']==initial['camera'],info
     assert info['canvas']['x']==0 and info['canvas']['y']==0 and info['canvas']['width']==1920 and info['canvas']['height']==1080
     if current in ['ready','aiming','shooting']:
      assert info['hero'] and info['turret'] and info['nodes'] and info['bar'] and info['badge_clear'],info
      if not captured:p.screenshot(path=str(ROOT/'preview-battle.png'));captured=True;print('PREVIEW_READY: complete 1920x1080 battlefield with all actors and controls visible.',flush=True)
     if current=='intro':
      b=p.get_by_role('button',name='开始冒险',exact=True)
      if b.count() and b.is_visible():b.click()
      else:click(W/2,380)
      p.wait_for_timeout(300)
     elif current=='ready':
      if info['energy']>=100:p.locator('#power-skill').click();actions.append({'time':round(time.monotonic()-start,2),'action':'big-bubble-button'})
      target=p.evaluate('''() => {
       const nodes=[...LandscapeDemo.scene.nodes.values()].filter(n=>!n.dead&&n.sprite.active);
       const bombs=nodes.filter(n=>n.kind==='p'&&nodes.some(m=>m.monster&&Math.hypot(n.sprite.x-m.sprite.x,n.sprite.y-m.sprite.y)<83));
       const enemies=nodes.filter(n=>n.monster).sort((a,b)=>b.sprite.y-a.sprite.y||Math.abs(a.sprite.x-576)-Math.abs(b.sprite.x-576));
       const n=bombs[0]||enemies[0];return n?{x:n.sprite.x,y:n.sprite.y}:null;
      }''')
      if target:
       p.mouse.move(*point(W/2,480));p.mouse.down();p.mouse.move(*point(target['x'],target['y']),steps=10);p.wait_for_timeout(300);p.mouse.up();actions.append({'time':round(time.monotonic()-start,2),'action':'aim-release','target':target})
      p.wait_for_timeout(200)
     elif current=='shooting':
      p.mouse.move(*point(45,350));p.mouse.down()
      while state()=='shooting' and time.monotonic()-start<42:
       p.wait_for_timeout(200)
       check=snapshot();assert check['hero'] and check['turret'] and check['nodes'] and check['bar'] and check['badge_clear']
      p.mouse.up()
     elif current=='won':
      p.screenshot(path=str(ROOT/'preview-victory.png'));p.wait_for_timeout(3000)
      b=p.get_by_role('button',name='前往下一关',exact=True)
      if b.count():b.click()
      p.wait_for_timeout(500)
     elif current=='lost':p.wait_for_timeout(1800);click(W/2,380)
     else:p.wait_for_timeout(150)
    p.mouse.up()
    raw=p.evaluate('''() => new Promise(resolve=>{__recorder.onstop=()=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(__parts,{type:'audio/webm'}));};__recorder.stop();})''')
    (temp/'audio.webm').write_bytes(base64.b64decode(raw));audio_status=p.evaluate('CandyAudio.status');video=p.video
    assert not errors,errors
    ctx.close();video_path=Path(video.path());browser.close()
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(temp/'audio.webm'),str(temp/'audio.wav')],check=True)
   a_duration=float(probe(temp/'audio.wav')['format']['duration']);v_duration=float(probe(video_path)['format']['duration'])
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(max(0,v_duration-a_duration)),'-i',str(video_path),'-i',str(temp/'audio.wav'),'-t','40','-map','0:v:0','-map','1:a:0','-vf','fps=30,format=yuv420p,setsar=1','-c:v','libx264','-profile:v','high','-level:v','4.0','-preset','fast','-crf','18','-c:a','aac','-ar','48000','-b:a','160k','-movflags','+faststart',str(OUTPUT)],check=True)
  finally:server.shutdown()
 assert protected()==original_sha
 meta=probe(OUTPUT);assert meta['format']['duration']=='40.000000'
 stream=next(s for s in meta['streams'] if s['codec_type']=='video');assert (stream['width'],stream['height'])==(1920,1080)
 assert audio_status['events'].get('shoot',0)>0 and audio_status['events'].get('hit',0)>0
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(OUTPUT),'-f','null','-'],check=True)
 report={'date':'2026-11-25','file':OUTPUT.name,'sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),'source_release_sha256':original_sha,'layout':'Separate interactive horizontal demo; not deployed to live game','viewport':[1920,1080],'logical_game_view':[1152,648],'direct_game_rendering':True,'camera_fixed':True,'crop':False,'padding':False,'picture_in_picture':False,'postproduction_scale':False,'all_game_actors_and_controls_inside_viewport':True,'title_viewport':initial,'states':states,'actions':actions,'audio_status':audio_status,'output':meta,'original_game_zip_unchanged':True,'errors':errors,'platform_recommendation_review_performed':False}
 (ROOT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(f'PASS: {OUTPUT.name}; native complete landscape rendering, fixed camera, no crop/pad/PiP, live game sound.',flush=True)
if __name__=='__main__':record()
