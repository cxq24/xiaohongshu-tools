"""Record the actual release ZIP using normal mouse input, including live game audio."""
from pathlib import Path
from tempfile import TemporaryDirectory
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import base64,hashlib,json,re,subprocess,time
from build_materials import protected

ROOT=Path(__file__).resolve().parent
OUTPUT=ROOT/'gameplay-recording-60s-720x1280.mp4'
AUDIO_TAP=r"""(() => {
 const Native=window.AudioContext||window.webkitAudioContext;
 const taps=new WeakMap(),connect=AudioNode.prototype.connect;
 class RecordingContext extends Native {
  constructor(...args){super(...args);const tap=this.createMediaStreamDestination();taps.set(this,tap);window.__gameAudioTap=tap;}
 }
 AudioNode.prototype.connect=function(...args){
  if(args[0]===this.context.destination&&taps.has(this.context))connect.call(this,taps.get(this.context));
  return connect.apply(this,args);
 };
 window.AudioContext=RecordingContext;
 if(window.webkitAudioContext)window.webkitAudioContext=RecordingContext;
})();
"""
def probe(path):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,sample_rate,channels,r_frame_rate','-of','json',str(path)],text=True))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def record():
 original_sha=protected();release=json.loads((ROOT.parent/'release.json').read_text())
 states=[];shots=0;wins=0
 with TemporaryDirectory() as temp:
  temp=Path(temp)
  with ZipFile(ROOT.parent/release['file']) as archive:archive.extractall(temp/'release')
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(temp/'release')))
  Thread(target=server.serve_forever,daemon=True).start()
  try:
   with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':360,'height':640},record_video_dir=str(temp/'video'),record_video_size={'width':360,'height':640},device_scale_factor=2)
    ctx.add_init_script(AUDIO_TAP)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/{release["archive_root"]}/')
    page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"',timeout=30000)
    page.mouse.click(16,12)
    page.wait_for_function('window.__gameAudioTap && CandyAudio.status.running',timeout=10000)
    page.evaluate('''() => {
     window.__audioParts=[];
     window.__audioRecorder=new MediaRecorder(__gameAudioTap.stream,{mimeType:'audio/webm;codecs=opus'});
     __audioRecorder.ondataavailable=e=>{if(e.data.size)__audioParts.push(e.data)};
     __audioRecorder.start(1000);
    }''')
    started=time.monotonic()
    def point(x,y):
     box=page.locator('#game canvas').bounding_box()
     return box['x']+x*box['width']/360,box['y']+y*box['height']/640
    def click(x,y):page.mouse.click(*point(x,y))
    def state():return page.evaluate('candyGame.scene.getScene("Adventure").state')
    page.wait_for_timeout(1800);click(180,482)
    page.wait_for_timeout(1400)
    while time.monotonic()-started<62:
     current=state()
     if not states or states[-1]!=current:states.append(current)
     if current=='intro':
      button=page.get_by_role('button',name='开始冒险',exact=True)
      if button.count() and button.is_visible():button.click()
      else:click(180,391)
      page.wait_for_timeout(400)
     elif current=='ready':
      target=page.evaluate('''() => {
       const s=candyGame.scene.getScene('Adventure');
       const nodes=[...s.nodes.values()].filter(n=>!n.dead&&n.sprite.active);
       const bombs=nodes.filter(n=>n.kind==='p'&&nodes.some(m=>m.monster&&Math.hypot(n.sprite.x-m.sprite.x,n.sprite.y-m.sprite.y)<100));
       const enemies=nodes.filter(n=>n.monster).sort((a,b)=>b.sprite.y-a.sprite.y||a.sprite.x-b.sprite.x);
       const n=bombs[0]||enemies[0];return n?{x:n.sprite.x,y:n.sprite.y}:null;
      }''')
      if target:
       page.mouse.move(*point(180,480));page.mouse.down()
       page.mouse.move(*point(target['x'],target['y']),steps=8)
       page.wait_for_timeout(260);page.mouse.up();shots+=1
      page.wait_for_timeout(200)
     elif current=='shooting':
      # Use the shipped long-press speed control, without changing simulation state.
      page.mouse.move(*point(30,350));page.mouse.down()
      while state()=='shooting' and time.monotonic()-started<62:page.wait_for_timeout(180)
      page.mouse.up()
     elif current=='won':
      wins+=1;page.wait_for_timeout(3200)
      button=page.get_by_role('button',name='前往下一关',exact=True)
      if button.count():button.click()
      page.wait_for_timeout(600)
     elif current=='lost':
      page.wait_for_timeout(1800);click(180,391)
     else:page.wait_for_timeout(150)
    page.mouse.up()
    audio=page.evaluate('''() => new Promise(resolve=>{
     __audioRecorder.onstop=()=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(new Blob(__audioParts,{type:'audio/webm'}));
     };__audioRecorder.stop();
    })''')
    (temp/'audio.webm').write_bytes(base64.b64decode(audio))
    audio_status=page.evaluate('CandyAudio.status')
    assert shots>=3 and audio_status['events'].get('shoot',0)>0 and audio_status['events'].get('hit',0)>0
    assert not errors,errors
    video=page.video;ctx.close();video_path=Path(video.path());browser.close()
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(temp/'audio.webm'),str(temp/'audio.wav')],check=True)
   audio_duration=float(probe(temp/'audio.wav')['format']['duration'])
   video_duration=float(probe(video_path)['format']['duration'])
   # Align the end of the live audio capture with the end of the browser recording.
   offset=max(0,video_duration-audio_duration)
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(offset),'-i',str(video_path),'-i',str(temp/'audio.wav'),'-t','60','-map','0:v:0','-map','1:a:0','-vf','scale=720:1280:flags=neighbor,fps=30,format=yuv420p,setsar=1','-c:v','libx264','-preset','fast','-crf','20','-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart',str(OUTPUT)],check=True)
  finally:server.shutdown()
 result=probe(OUTPUT);assert float(result['format']['duration'])==60
 video=next(s for s in result['streams'] if s['codec_type']=='video')
 audio=next(s for s in result['streams'] if s['codec_type']=='audio')
 assert video['codec_name']=='h264' and (video['width'],video['height'])==(720,1280) and audio['codec_name']=='aac'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(OUTPUT),'-f','null','-'],check=True)
 volume=subprocess.run(['ffmpeg','-hide_banner','-i',str(OUTPUT),'-vn','-af','volumedetect','-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True).stderr
 mean=float(re.search(r'mean_volume: ([-.\d]+) dB',volume).group(1))
 peak=float(re.search(r'max_volume: ([-.\d]+) dB',volume).group(1))
 assert mean>-60 and peak<0,'Audio must contain audible, non-clipping game sound'
 assert protected()==original_sha
 (ROOT/'gameplay-recording-validation.json').write_text(json.dumps({'source':'Actual unchanged TapTap H5 release ZIP, desktop Chromium, ordinary mouse input','physical_phone_recording':False,'scripted_input':True,'gameplay_state_modified':False,'recording':'continuous; trims startup only; no compositing, holding or speed edit','audio':'live game music and effects; AAC 48kHz','audio_signal_validation':{'mean_volume_db':mean,'max_volume_db':peak,'non_silent':True,'clipping':False},'shots':shots,'wins':wins,'states':states,'game_audio_status':audio_status,'output':result,'sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),'game_zip_unchanged_sha256':original_sha,'errors':errors},ensure_ascii=False,indent=2)+'\n')
 print(f'PASS: {OUTPUT.name}; real mouse input, {shots} volleys, {wins} clears, live game audio, full decode and original releases unchanged.')
if __name__=='__main__':record()
