"""Browser acceptance checks. Fixtures are isolated from input-driven combat runs."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from tempfile import TemporaryDirectory
from zipfile import ZipFile
import json, shutil, argparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--archive',action='store_true',help='Test the extracted release ZIP rather than build/')
args=parser.parse_args()
SCENE='candyGame.scene.getScene("Adventure")'
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

# A test player selects an angle; it never changes target HP or victory conditions.
AI = r"""() => {
 const s=candyGame.scene.getScene('Adventure');
 const nodes=[...s.nodes.values()].filter(n=>!n.dead);
 let best={score:-Infinity,angle:-Math.PI/2};
 for(let degree=13;degree<=167;degree+=3){
  const angle=-degree*Math.PI/180;
  let x=180,y=540,dx=Math.cos(angle)*5,dy=Math.sin(angle)*5;
  let score=0,last=-1,contact=0;
  const hp=new Map(nodes.map(n=>[n.id,n.hp]));
  for(let k=0;k<1000;k++){
   const px=x,py=y;x+=dx;y+=dy;
   if(x<25||x>335){dx=-dx;x=Math.max(25,Math.min(335,x));}
   if(y<111){dy=-dy;y=111;}
   if(y>544)break;
   const node=nodes.find(n=>hp.get(n.id)>0&&Math.abs(x-n.sprite.x)<n.sprite.body.width/2+4&&Math.abs(y-n.sprite.y)<n.sprite.body.height/2+4);
   if(node){
    if(last!==node.id||k-contact>8){
     const hits=hp.get(node.id);hp.set(node.id,hits-1);
     score+=(node.monster?1+(node.sprite.y/490)**3*5:node.kind==='p'?6:2);
     if(node.kind==='p')score+=nodes.filter(n=>n.monster&&Math.hypot(n.sprite.x-node.sprite.x,n.sprite.y-node.sprite.y)<83).length*5;
     if(node.monster&&hits===1)score+=2;
     last=node.id;contact=k;
    }
    if(px<node.sprite.x-node.sprite.body.width/2-4||px>node.sprite.x+node.sprite.body.width/2+4)dx=-dx;else dy=-dy;
    x=px;y=py;
   }else last=-1;
  }
  if(score>best.score)best={score,angle};
 }
 s.angle=best.angle;if(s.energy>=100){s.armed=true;s.drawEnergy();}
 s.fire();s.fast=true;s.physics.world.timeScale=1/8;s.time.timeScale=8;
 return {angle:best.angle,score:best.score,turn:s.turn};
}"""

def fixture(page,script):
    return page.evaluate('() => { const s='+SCENE+'; '+script+' }')

def tap(page,x,y):
    box=page.locator('canvas').bounding_box()
    page.mouse.click(box['x']+x/360*box['width'],box['y']+y/640*box['height'])

def start(page,index=0):
    page.evaluate('(i)=>{const s='+SCENE+';s.startLevel(i);s.clearModal();s.state="ready"}',index)

def clear_targets(page):
    fixture(page,'for(const n of s.nodes.values())n.label?.destroy();s.nodes.clear();s.targets.clear(true,true);')

with TemporaryDirectory() as directory:
    serving=ROOT/'build'
    if args.archive:
        with ZipFile(ROOT/'dragon-bubbles-0.1.1.zip') as archive:
            assert archive.testzip() is None
            archive.extractall(directory)
        serving=Path(directory)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(serving)))
    Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/'
    with sync_playwright() as p:
        options={'headless':True}
        system=shutil.which('chromium')
        if system:options.update(executable_path=system,args=['--no-sandbox'])
        browser=p.chromium.launch(**options)
        page=browser.new_page(viewport={'width':430,'height':860})
        errors=[];requests=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:requests.append(r.url))
        page.goto(url)
        page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state === "title"')
        assert page.evaluate('Phaser.VERSION')=='3.90.0'
        assert not page.evaluate('document.querySelector("canvas").getContext("2d").imageSmoothingEnabled')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        (ROOT/'previews').mkdir(exist_ok=True)
        page.screenshot(path=str(ROOT/'previews/title.png'),full_page=True)
        tap(page,180,482);assert fixture(page,'return s.state')=='intro'
        tap(page,180,391);assert fixture(page,'return s.state')=='ready'
        page.screenshot(path=str(ROOT/'previews/gameplay.png'),full_page=True)
        # Real mouse input must start a volley, hit enemies and finish the turn.
        tap(page,136,177)
        assert fixture(page,'return s.state')=='shooting'
        page.wait_for_function(SCENE+'.hitCount > 0')
        page.screenshot(path=str(ROOT/'previews/action.png'),full_page=True)
        page.locator('#help').click()
        before=fixture(page,'return {clock:s.gameClock,balls:s.balls.getChildren().map(b=>[b.x,b.y])}')
        page.wait_for_timeout(250)
        assert fixture(page,'return {clock:s.gameClock,balls:s.balls.getChildren().map(b=>[b.x,b.y])}')==before
        page.locator('#close-help').click();page.wait_for_function('!'+SCENE+'.uiPaused')
        page.wait_for_function('["ready","won","lost"].includes('+SCENE+'.state)',timeout=16000)
        assert fixture(page,'return s.turn')>=2
        # Static collision bodies stay aligned after wave advancement.
        assert fixture(page,'return [...s.nodes.values()].every(n=>Math.abs(n.sprite.body.x+n.sprite.body.width/2-n.sprite.x)<.6 && Math.abs(n.sprite.body.y+n.sprite.body.height/2-n.sprite.y)<.6)')
        # Mechanic fixtures: controlled arrangements exercise real damage and collision code.
        start(page);clear_targets(page)
        assert fixture(page,"const p=s.addTarget('p1',3,250);const a=s.addTarget('j3',2,250);const b=s.addTarget('p1',4,250);const c=s.addTarget('j3',5,250);s.damage(p,1);return [p,a,b,c].every(n=>n.dead);")
        start(page);clear_targets(page)
        fixture(page,"s.addTarget('r1',3,350);s.addTarget('j4',3,260);s.state='shooting';s.pending=999;const b=s.balls.create(180,440,'bubble');b.body.setCircle(4);b.setBounce(1).setCollideWorldBounds(true).setVelocity(0,-410);b.setData({damage:1,hits:new Map(),big:false});")
        page.wait_for_function(SCENE+'.rainbowUntil > '+SCENE+'.gameClock')
        page.wait_for_function('[...'+SCENE+'.nodes.values()].some(n=>n.monster&&n.hp<4)')
        assert fixture(page,'return s.balls.getChildren()[0].body.velocity.y')<0
        start(page)
        fixture(page,'s.energy=100;s.drawEnergy();')
        tap(page,180,615);assert fixture(page,'return s.armed')
        tap(page,136,177)
        page.wait_for_function(SCENE+'.balls.getChildren().some(b=>b.getData("big"))')
        assert fixture(page,'return s.balls.getChildren().find(b=>b.getData("big")).getData("damage")')==4
        assert fixture(page,'return s.energy')<100
        # Failure, retry and boss replay are explicit regression fixtures.
        start(page);clear_targets(page)
        fixture(page,"s.addTarget('j2',3,470);s.state='shooting';s.pending=0;s.endVolley();")
        assert fixture(page,'return s.state')=='lost'
        tap(page,180,391);assert fixture(page,'return s.state')=='intro'
        for _ in range(2):
            start(page,5)
            assert not fixture(page,'return s.bossSplit')
            fixture(page,"s.damage([...s.nodes.values()].find(n=>n.kind==='K'),32);")
            assert fixture(page,"return s.bossSplit && [...s.nodes.values()].filter(n=>n.kind==='j'&&n.maxHp===4).length===2")
        fixture(page,'s.showTitle();')
        assert fixture(page,'return s.tempObjects.size')==0
        print('PASS: pointer input, wave return, collision alignment, help pause, popcorn chain, rainbow piercing, power ball, failure/retry and boss replay fixtures.',flush=True)
        # Six complete fights: only the test clock is accelerated; aiming uses game input functions.
        results=[]
        for i in range(6):
            start(page,i)
            if i==5:page.screenshot(path=str(ROOT/'previews/boss.png'),full_page=True)
            for _ in range(22):
                if fixture(page,'return s.state')!='ready':break
                page.evaluate(AI)
                page.wait_for_function('["ready","won","lost"].includes('+SCENE+'.state)',timeout=15000)
            result=fixture(page,'return {level:s.index+1,state:s.state,turns:s.turn,hits:s.hitCount,combo:s.bestCombo,bossSplit:s.bossSplit}')
            results.append(result);assert result['state']=='won',result
            print('Combat',result,flush=True)
            if i==5:page.screenshot(path=str(ROOT/'previews/victory.png'),full_page=True)
        page.reload();page.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
        assert page.evaluate('JSON.parse(localStorage.getItem("apu-candy-v1")).unlocked')==5
        assert len(page.evaluate('Object.keys(JSON.parse(localStorage.getItem("apu-candy-v1")).stars)'))==6
        # Actual mobile touch stream from the character to a target.
        phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        touch=phone.new_page();touch.on('pageerror',lambda e:errors.append(str(e)))
        touch.goto(url);touch.wait_for_function('window.candyGame?.scene.getScene("Adventure")?.state==="title"')
        tap(touch,180,482);tap(touch,180,391)
        box=touch.locator('canvas').bounding_box()
        def point(x,y):return {'x':box['x']+x/360*box['width'],'y':box['y']+y/640*box['height']}
        cdp=phone.new_cdp_session(touch)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(180,536)]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point(136,177)]})
        assert fixture(touch,'return s.state')=='aiming'
        touch.screenshot(path=str(ROOT/'previews/mobile-aim.png'),full_page=True)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        assert fixture(touch,'return s.state')=='shooting'
        touch.wait_for_function(SCENE+'.hitCount>0')
        assert touch.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert all(r.startswith(url) or r.startswith('blob:'+url) for r in requests),requests
        assert not errors,errors
        (ROOT/'tools/last-test-results.json').write_text(json.dumps({'combat':results,'errors':errors,'archive_test':args.archive,'external_requests':0},indent=2)+'\n')
        browser.close()
    server.shutdown()
print('PASS: all 6 fights, persistence, mobile touch aim/fire, zero JS errors, zero external runtime requests.',flush=True)
