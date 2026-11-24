"""Exercise all fixed levels with actual Phaser Arcade Physics, without items/ads.
The test clock advances synchronously; particle rendering is disabled for speed.
A test aiming heuristic is not a proof that every losing case is unsolvable.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import argparse,json,shutil,hashlib
from io import BytesIO
from tempfile import TemporaryDirectory
from zipfile import ZipFile
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--start',type=int,default=0);parser.add_argument('--end',type=int,default=None);parser.add_argument('--hidden',action='store_true');parser.add_argument('--archive',type=Path);args=parser.parse_args();args.end=args.end or (30 if args.hidden else 300)
if not 0<=args.start<args.end<=(30 if args.hidden else 300):parser.error("Invalid level range")
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
INSTALL=r'''()=>{
 const s=candyGame.scene.getScene('Adventure');candyGame.loop.sleep();CandyAudio.set('enabled',false);s.burst=()=>{};window.simTime=s.time.now;
 window.tick=()=>{const d=1000/120;simTime+=d;s.time.preUpdate(simTime,d);s.time.update(simTime,d);s.physics.world.update(simTime,d);s.physics.world.postUpdate();s.update(simTime,d);s.tweens.update();};
 window.pickAngle=(variant=0)=>{
  const nodes=[...s.nodes.values()].map(n=>({id:n.id,x:n.sprite.x,y:n.sprite.y,w:n.sprite.body.width/2+4,h:n.sprite.body.height/2+4,hp:n.hp/s.attackDamage,kind:n.kind,monster:n.monster}));
  const walls=s.obstacles.filter(o=>o.active).map((o,i)=>({id:10000+i,x:o.x,y:o.y,w:o.body.width/2+4,h:o.body.height/2+4,hp:999,kind:o.getData('kind'),wall:true}));
  const bodies=nodes.concat(walls);let best={score:-Infinity,angle:-Math.PI/2};
  for(let degree=12+variant%3;degree<=168;degree+=3){
   const angle=-degree*Math.PI/180,dt=5/410;let x=180,y=540,vx=Math.cos(angle)*410,vy=Math.sin(angle)*410,score=0,last=-1,lastHit=-1000,tele=-1000;
   const hp=new Map(bodies.map(n=>[n.id,n.hp]));
   for(let k=0;k<700;k++){
    let px=x,py=y;vx=Phaser.Math.Clamp(vx+(s.level.wind||0)*dt,-500,500);x+=vx*dt;y+=vy*dt;
    if(x<24||x>336){vx=-vx;x=Phaser.Math.Clamp(x,24,336);}if(y<110){vy=-vy;y=110;}if(y>544)break;
    if(s.portalSprites.length===2&&k-tele>55){const pi=s.portalSprites.findIndex(p=>Math.hypot(x-p.x,y-p.y)<18);if(pi>=0){const dest=s.portalSprites[1-pi];x=dest.x+Math.sign(vx||1)*20;y=dest.y+Math.sign(vy||1)*22;tele=k;}}
    const n=bodies.find(n=>hp.get(n.id)>0&&Math.abs(x-n.x)<n.w&&Math.abs(y-n.y)<n.h);
    if(!n){last=-1;continue;}
    if(n.kind==='phase'&&Math.floor((s.gameClock+k*dt*1000)/1200)%2!==0)continue;
    if(last!==n.id||k-lastHit>8){
     if(!n.wall){const health=hp.get(n.id);hp.set(n.id,health-1);score+=(n.monster?1+Math.pow(n.y/493,4)*(variant===1?20:10):n.kind==='p'?5:2);if(health===1&&n.monster)score+=3;
      if(n.kind==='p')score+=nodes.filter(m=>m.monster&&Math.hypot(m.x-n.x,m.y-n.y)<83).reduce((a,m)=>a+Math.min(m.hp,4)*(variant===2?2:1),0);
     }last=n.id;lastHit=k;
    }
    if(n.kind==='r')continue;
    if(px<n.x-n.w||px>n.x+n.w)vx=-vx;else vy=-vy;x=px;y=py;
    if(n.kind==='spring'){vx=Math.sign(x-n.x||1)*410*.7;vy=-410*.75;}
    if(n.kind==='mirror'){const a=vx;vx=Math.sign(vx||1)*Math.max(80,Math.abs(vy));vy=-Math.max(80,Math.abs(a));}
   }
   if(score>best.score)best={score,angle};
  }return best;
 };
 window.runLevel=(index,hidden=false,variant=0,allowRetreat=false)=>{
  const level=hidden?CANDY_HIDDEN[index]:CANDY_LEVELS[index];if(!hidden)while(s.upgradePower().ok){}s.startLevel(hidden?level:index);if(hidden)s.attackDamage=CandyProgress.recommendedAttack(level);s.beginLevel?s.beginLevel():(s.clearModal(),s.state='ready');
  const initialBossHp=[...s.nodes.values()].find(n=>n.kind==='K')?.maxHp||null,angles=[],used=[];let ticks=0;
  for(let attempt=0;attempt<20&&s.state==='ready';attempt++){
   if(allowRetreat){if(!used.includes('balls')&&s.useItem('balls').ok)used.push('balls');if(!used.includes('guard')&&[...s.nodes.values()].some(n=>n.monster&&n.sprite.y>355)&&s.useItem('guard').ok)used.push('guard');if(!used.includes('retreat')&&[...s.nodes.values()].some(n=>n.monster&&n.sprite.y>395)&&s.useItem('retreat').ok)used.push('retreat');}
   const choice=pickAngle(variant);s.angle=choice.angle;if(s.energy>=100)s.armed=true;s.fire();angles.push(choice.angle);
   let t=0;while(s.state==='shooting'&&t++<4000){tick();ticks++;}
   if(t>=4000)break;
  }
  return {id:level.id,world:level.world,state:s.state,shots:s.shotsFired,hits:s.hitCount,remaining:s.remaining(),defeated:s.defeated,total:s.totalMonsters,escaped:s.escaped,attack:s.attackDamage,initialBossHp,criticalHits:s.criticalHits,itemsUsed:used,mode:s.level.mode||'normal',grade:s.rating?.grade,score:s.rating?.score,productive:s.productiveShots,reward:s.reward?.totalCurrency,angles,ticks,variant};
 };
}'''
folder=TemporaryDirectory()
serve=ROOT/'build';archive_sha256=None
if args.archive:
 archive_bytes=args.archive.read_bytes();archive_sha256=hashlib.sha256(archive_bytes).hexdigest()
 with ZipFile(BytesIO(archive_bytes)) as z:z.extractall(folder.name)
 serve=Path(folder.name)
with sync_playwright() as p:
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(serve)));Thread(target=server.serve_forever,daemon=True).start()
 options={'headless':True}
 if shutil.which('chromium'):options.update(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 browser=p.chromium.launch(**options);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"');page.evaluate(INSTALL)
 results=[]
 for i in range(args.start,args.end):
  result=page.evaluate('([i,h])=>runLevel(i,h,0)',[i,args.hidden])
  if result['state']!='won':
   for variant in [1,2]:
    result=page.evaluate('([i,h,v])=>runLevel(i,h,v)',[i,args.hidden,variant])
    if result['state']=='won':break
  if result['state']!='won' and not args.hidden:
   for variant in [0,1,2]:
    result=page.evaluate('([i,v])=>runLevel(i,false,v,true)',[i,variant])
    if result['state']=='won':break
  results.append(result)
  if (i+1)%10==0 or result['state']!='won':print('Progress',i+1,'/',args.end,'latest',result['state'],'shots',result['shots'],flush=True)
  (ROOT/f'tools/simulation-1.0.2-{args.start}-{args.end}{"-hidden" if args.hidden else ""}.json').write_text(json.dumps({'version':'1.0.2','actual_zip':bool(args.archive),'archive_sha256':archive_sha256,'results':results,'errors':errors},indent=2)+'\n')
 failed=[r['id'] for r in results if r['state']!='won'];print('Finished',len(results),'passed',len(results)-len(failed),'failed',failed,'JS errors',errors,flush=True)
 browser.close();server.shutdown()
 if failed or errors:raise SystemExit(1)
