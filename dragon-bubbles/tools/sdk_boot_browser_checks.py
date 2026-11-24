"""Regression against the published SDK, with native replies simulated below it."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import json,subprocess,shutil
R=Path(__file__).resolve().parents[1];G='apu-candy-v1';A='apu-audio-v2';S='candyGame.scene.getScene("Adventure")'
sdk=Path(subprocess.check_output(['python',str(R/'tools/fetch_sdk_reference.py')],text=True).strip()).read_text()
profile=json.loads(subprocess.check_output(['node','-e',"const P=require('./build/progress.js'),p=P.normalize();p.candy=777;console.log(JSON.stringify(p));"],cwd=R,text=True))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def ready(page):page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
with TemporaryDirectory() as temp:
 for name,version in [('old','1.0.1'),('fixed','1.0.2')]:
  folder=Path(temp)/name;folder.mkdir()
  with ZipFile(R/f'dragon-bubbles-{version}.zip') as z:z.extractall(folder)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=temp));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox']);contexts=[];errors=[]
  def context(style='empty',data=None,legacy=None,old=False,version=False):
   native=dict(data or {});wire=[];ctx=b.new_context(viewport={'width':390,'height':844});contexts.append(ctx)
   def host(_src,msg):
    wire.append(msg);event=msg['event'];key=msg.get('message',{}).get('key')
    if event=='getLaunchOptions':return {'code':0,'data':{}}
    if event=='getStorageInfo':return {'code':0,'data':{'keys':list(native)}}
    if event=='getStorage':
     if style=='unsupported':return {'code':10002,'msg':'API unavailable'}
     if style=='io' and key==G:return {'code':50101,'msg':'storage I/O failed'}
     if style=='audio-io' and key==A:return {'code':50101,'msg':'sound cache I/O failed'}
     if key in native:
      if style=='direct-object':return {'code':0,'data':json.loads(native[key])}
      if style=='nested-object':return {'code':0,'data':{'data':json.loads(native[key])}}
      return {'code':0,'data':{'data':native[key]}}
     if style=='empty-string':return {'code':0,'data':{'data':''}}
     if style=='not-found':return {'code':-1,'msg':'key does not exist'}
     return {'code':0} # Real SDK turns this into {errMsg:'getStorage:ok'}.
    if event=='setStorage':
     native[key]=msg['message']['data'];assert 'success' not in msg['message'];return {'code':0}
    return {'code':0,'data':{}}
   ctx.expose_binding('hostRequest',host)
   init="window.xhsInvoke={postMessage(raw){const p=JSON.parse(raw);window.hostRequest(p).then(r=>window.XHS_SDK_INVOKE_CALLBACKS(JSON.stringify(r),p.callbackId));}};"
   if version:init+='window.$xhs={launchOptions:{miniToolEnv:{buildVersion:9462004}}};'
   if legacy is not None:init+='if(!localStorage.getItem('+json.dumps(G)+'))localStorage.setItem('+json.dumps(G)+','+json.dumps(json.dumps(legacy))+');'
   ctx.add_init_script(init+sdk);page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+('/old/' if old else '/fixed/'));return page,native,wire
  # Reproduce both old blockers without inventing a custom xhs object.
  old,olddata,oldwire=context(data={G:json.dumps(profile)},old=True);old.wait_for_function('CandyStore.status().issue?.phase==="read"');assert not old.evaluate('!!window.candyGame');assert old.locator('#save-status').is_visible();old.screenshot(path=str(R/'previews/startup-failure-reproduced.png'),full_page=True)
  old2,_,_=context(old=True,version=True);old2.wait_for_function('CandyStore.status().issue?.phase==="read"');assert not old2.evaluate('!!window.candyGame')
  fixed,data,wire=context(data={G:json.dumps(profile)});ready(fixed);fixed.evaluate('CandyStore.flush()');assert fixed.evaluate('CandyStore.status().mode')=='native';assert json.loads(data[G])['candy']==777;assert not [m for m in wire if m['event']=='getLaunchOptions'];assert fixed.locator('#save-status').is_hidden()
  fixed.screenshot(path=str(R/'previews/startup-fixed-1.0.2.png'),full_page=True)
  # Cold preview, empty cache variants, and object-valued host replies.
  for style in ['empty','empty-string','not-found','direct-object','nested-object']:
   page,data,wire=context(style=style,data={G:json.dumps(profile)} if 'object' in style else None);ready(page);page.evaluate('CandyStore.flush()');assert page.locator('#save-status').is_hidden();assert json.loads(data[G])['candy']==(777 if 'object' in style else 0)
   if style=='direct-object':
    page.evaluate('candyGame.scene.getScene("Adventure").showWorkshop("dragon")');page.locator('.cosmetic-card .map-action').first.click();page.evaluate('CandyStore.flush()');assert json.loads(data[G])['candy']==737;page.reload();ready(page);assert json.loads(data[G])['candy']==737
  # Old hosts with stub methods automatically use browser data; no native write.
  fallback,data,wire=context(style='unsupported',data={G:json.dumps(profile)},legacy={**profile,'candy':64});ready(fallback);assert fallback.evaluate('CandyStore.status().mode')=='browser';assert not [m for m in wire if m['event']=='setStorage'];assert fallback.locator('#save-status').is_hidden()
  # Optional audio failures cannot prevent a good game save loading.
  audio,data,_=context(style='audio-io',data={G:json.dumps(profile),A:'bad-audio'});ready(audio);assert audio.locator('#save-status').is_hidden();assert audio.evaluate('CandyAudio.settings.enabled') is False;assert data[A]=='bad-audio'
  # True I/O errors protect data and allow an explicitly non-writing preview.
  preview,data,wire=context(style='io',data={G:json.dumps(profile)},legacy={**profile,'candy':45});preview.wait_for_function('CandyStore.status().issue?.phase==="read"');assert int(preview.evaluate('CandyStore.diagnostics().code'))==50101;assert preview.locator('#save-copy').is_visible();preview.locator('#save-play').click();ready(preview);assert preview.evaluate('CandyStore.status().mode')=='preview';assert preview.locator('#save-status').is_visible();assert '进度不保存' in preview.locator('#save-message').inner_text();assert not [m for m in wire if m['event']=='setStorage'];assert json.loads(data[G])['candy']==777;assert preview.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1")).candy')==45
  assert not errors,errors
  (R/'tools/sdk-browser-1.0.2.json').write_text(json.dumps({'version':'1.0.2','actual_zips':True,'published_sdk':'0.7.1','native_responses_mocked':True,'old_boot_failures_reproduced':2,'missing_version_metadata_fixed':True,'first_use_cache_variants_fixed':True,'callback_native_write_and_reload':True,'object_storage_responses_fixed':True,'unsupported_host_auto_fallback':True,'optional_audio_failure_nonblocking':True,'true_io_preserves_data_and_preview_never_writes':True,'errors':errors},indent=2)+'\n');b.close()
 server.shutdown()
print('PASS: actual public SDK + old/new ZIP regression, cold boot, object replies, native writes, automatic fallback and protected preview.')
