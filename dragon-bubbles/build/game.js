/* Original game logic. Phaser 3.90.0 supplies rendering, input and Arcade Physics. */
(() => {
  'use strict';
  const W=360,H=640,LAUNCH={x:180,y:540},SPEED=410,ENERGY_MAX=100;
  const COLORS={ink:0x253449,cream:0xffefc2,green:0x477d60,light:0xb8d39e,gold:0xf0c77c};
  const FONT='Apu Pixel, monospace';
  const levels=window.CANDY_LEVELS;
  const Economy=window.CandyProgress;
  const playtest=window.CandyRelease?.playtest===true,storageKey=playtest?'apu-candy-playtest-v1':'apu-candy-v1';
  let rawSave={};try{rawSave=JSON.parse(localStorage.getItem(storageKey))||{};}catch(_){}
  const save=Economy.normalize(rawSave);
  function persist(){try{localStorage.setItem(storageKey,JSON.stringify(save));}catch(_){}}
  if(playtest){save.worlds=Array.from({length:10},(_,i)=>i);save.hiddenUnlocked=window.CANDY_HIDDEN.map(h=>h.id);document.querySelector('footer span')?.replaceChildren(document.createTextNode('测试版 · 全关开放 · 推荐火力'));}
  persist();
  function text(scene,x,y,value,size=14,color='#fff1c7',align='left'){
    return scene.add.text(x,y,value,{fontFamily:FONT,fontSize:size+'px',fontStyle:'normal',color,align,resolution:2}).setOrigin(align==='center'?.5:0,0);
  }
  function panel(scene,x,y,w,h,fill=COLORS.ink,edge=0x91ac80){
    const g=scene.add.graphics();g.fillStyle(0x193d36,.5).fillRect(x+3,y+4,w,h);g.fillStyle(edge).fillRect(x,y,w,h);g.fillStyle(fill).fillRect(x+2,y+2,w-4,h-4);return g;
  }
  function button(scene,x,y,w,label,callback,kind='green'){
    const container=scene.add.container(x,y),g=scene.add.graphics();
    const fill=kind==='gold'?0xe9bf76:COLORS.green;
    g.fillStyle(0x163d35).fillRect(-w/2+3,-19+4,w,40);g.fillStyle(COLORS.ink).fillRect(-w/2,-19,w,40);g.fillStyle(fill).fillRect(-w/2+2,-17,w-4,36);g.fillStyle(kind==='gold'?0xffdfa0:0x7fab7c).fillRect(-w/2+3,-16,w-6,3);
    const labelText=text(scene,0,-8,label,13,kind==='gold'?'#3e5744':'#fff1c7','center');container.add([g,labelText]);
    container.setSize(w,40).setInteractive(new Phaser.Geom.Rectangle(-w/2,-20,w,40),Phaser.Geom.Rectangle.Contains);
    // Containers use centered bounds with an explicit rectangle to avoid tiny hit targets.
    container.input.hitArea.setTo(0,0,w,40);
    container.on('pointerdown',()=>{window.CandyAudio.unlock();container.setScale(.97);});
    container.on('pointerout',()=>container.setScale(1));
    container.on('pointerup',()=>{container.setScale(1);callback();});
    container.label=labelText;return container;
  }
  class Adventure extends Phaser.Scene{
    constructor(){super('Adventure');}
    preload(){
      for(const world of window.CANDY_WORLDS)for(const part of ['cover','arena','island','jelly','berry','boss','bomb','pickup'])this.load.image(`w${world.id}-${part}`,`assets/w${world.id}-${part}.png`);
      for(const part of ['stone','ice','spring','moving','mirror','phase'])this.load.image('obstacle-'+part,`assets/obstacle-${part}.png`);this.load.image('portal','assets/portal.png');this.load.spritesheet('mechanism-sheet','assets/mechanisms.png',{frameWidth:32,frameHeight:32});
      this.load.image('forest','assets/forest.png');this.load.image('cover','assets/cover.png');
      for(const item of Economy.SHOP.filter(i=>i.slot==='dragon'||i.slot==='bubble'||i.slot==='turret')){
        const file={dragon:'dragon',dragonBerry:'dragon-berry',dragonSky:'dragon-sky',bubble:'bubble',bubbleStar:'bubble-star',bubbleRainbow:'bubble-rainbow'}[item.texture]||item.texture;
        if(item.frames>1)this.load.spritesheet(item.texture,`assets/${file}.png`,{frameWidth:item.frameSize,frameHeight:item.frameSize});else this.load.image(item.texture,`assets/${file}.png`);
      }
      this.load.image('engineer','assets/engineer.png');this.load.image('icon-fire','assets/icon-fire.png');this.load.image('icon-candy','assets/icon-candy.png');
      for(const key of ['jelly','berry','boss','popcorn','rainbow','bubble','star'])this.load.image(key,`assets/${key}.png`);
    }
    create(){
      document.getElementById('loading')?.remove();
      this.physics.world.setBounds(20,106,320,454,true,true,true,false);
      this.physics.world.setBoundsCollision(true,true,true,false);
      this.gameClock=0;this.state='boot';this.uiPaused=false;this.screenItems=[];this.modals=[];this.tempObjects=new Set();this.nodes=new Map();this.nextId=0;this.generation=0;
      this.background=this.add.image(180,320,'forest');
      this.fx=this.add.graphics().setDepth(40);this.aim=this.add.graphics().setDepth(30);
      this.balls=this.physics.add.group({allowGravity:false});this.targets=this.physics.add.staticGroup();
      this.physics.add.collider(this.balls,this.targets,this.onHit,this.shouldCollide,this);
      this.walls=this.physics.add.staticGroup();this.obstacles=[];this.portalSprites=[];
      this.physics.add.collider(this.balls,this.walls,this.hitObstacle,(ball,wall)=>!['blackhole','conveyor','repulsor'].includes(wall.getData('kind'))&&(wall.getData('kind')!=='phase'||Math.floor(this.gameClock/1200)%2===0),this);
      this.input.on('pointerdown',this.pointerDown,this);this.input.on('pointermove',this.pointerMove,this);this.input.on('pointerup',this.pointerUp,this);
      this.input.on('gameout',()=>{if(this.state==='aiming'){this.state='ready';this.aim.clear();this.hero?.setFrame(0);}});
      this.input.keyboard?.on('keydown',e=>{
        if(this.uiPaused||document.getElementById('help-dialog').open)return;
        if(['Space','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
        if(e.code==='ArrowLeft'&&this.state==='ready'){this.angle=Phaser.Math.Clamp(this.angle-.06,-Math.PI+.18,-.18);this.drawAim();}
        if(e.code==='ArrowRight'&&this.state==='ready'){this.angle=Phaser.Math.Clamp(this.angle+.06,-Math.PI+.18,-.18);this.drawAim();}
        if(e.code==='Space'&&this.state==='ready')this.fire();
      });
      this.events.on('shutdown',()=>this.time.removeAllEvents());
      this.showTitle();
    }
    dragonTexture(){return Economy.equipped(save,'dragon').texture;}
    bubbleTexture(){return Economy.equipped(save,'bubble').texture;}
    keep(...items){this.screenItems.push(...items);return items[0];}
    clearScreen(){
      window.CandyBattleUI.hide();window.CandyMapView.hide();this.inventoryOpen=false;this.itemTrayOpen=false;this.menuOpen=false;this.inspectingEnemy=false;this.codexOpen=false;clearTimeout(this.inspectTimer);
      this.generation++;this.time.removeAllEvents();this.tweens.killAll();this.aim.clear();this.fx.clear();
      this.balls.clear(true,true);this.targets.clear(true,true);
      this.walls?.clear(true,true);this.obstacles=[];this.portalSprites?.forEach(o=>o.destroy());this.portalSprites=[];
      this.tempObjects.forEach(o=>o.destroy());this.tempObjects.clear();
      for(const n of this.nodes.values()){n.label?.destroy();n.bar?.destroy();}this.nodes.clear();
      this.screenItems.forEach(o=>o?.destroy());this.screenItems=[];this.clearModal();
      this.physics.world.timeScale=1;this.time.timeScale=1;this.fast=false;this.input.enabled=true;this.uiPaused=false;this.physics.world.resume();this.time.paused=false;this.tweens.resumeAll();window.CandyAudio.pause(false);
    }
    clearModal(){this.modals.forEach(o=>o?.destroy());this.modals=[];}
    showTitle(){
      this.clearScreen();this.background.setTexture('cover');this.state='title';
      this.keep(panel(this,26,37,308,69,COLORS.ink,0xc2d29d),text(this,180,51,'APU’S CANDY QUEST',11,'#bcd6aa','center'),text(this,180,72,'阿噗的糖果弹弹冒险',23,'#ffe5a1','center'));
      this.keep(text(this,180,135,'把小星星，从十个像素世界带回家。',13,'#436e58','center'));
      const dragon=this.keep(this.add.sprite(180,326,this.dragonTexture(),0).setScale(5));
      this.tweens.add({targets:dragon,y:319,duration:1200,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.keep(this.add.image(66,392,'jelly').setScale(2),this.add.image(299,389,'berry').setScale(2),this.add.image(270,209,'star').setScale(2));
      for(const [x,y,s] of [[88,234,1.3],[284,283,1.5],[91,306,.9]]){const bubble=this.keep(this.add.image(x,y,'bubble').setScale(s));this.tweens.add({targets:bubble,y:y-10,duration:900+x,yoyo:true,repeat:-1});}
      this.keep(text(this,180,423,'瞄准反弹  /  爆米花连锁  /  小龙大招',11,'#426d56','center'));
      this.keep(button(this,180,482,240,save.current>0?`继续冒险 · 第 ${save.current+1} 关`:'开始冒险  →',()=>this.startLevel(save.current),'gold'));
      this.keep(button(this,112,536,122,'选择关卡',()=>this.showLevels()),button(this,248,536,122,'营地',()=>this.showWorkshop()));
      this.keep(text(this,180,588,`已完成 ${Object.keys(save.stars).length}/300 · 十个主题世界`,11,'#3b6450','center'));
    }
    showLevels(){
      this.clearScreen();this.state='worlds';this.input.enabled=false;
      window.CandyMapView.worlds({save,worlds:window.CANDY_WORLDS,enter:id=>this.showChapter(id),back:()=>this.showTitle(),unlock:id=>{const result=Economy.unlockWorld(save,id);if(result.ok)persist();return result;},camp:()=>this.showWorkshop(),warehouse:()=>this.showInventory(),codex:()=>this.showCodex()});
    }
    showChapter(id){
      this.clearScreen();this.state='chapter';this.mapWorld=id;this.input.enabled=false;
      window.CandyMapView.chapter({save,world:window.CANDY_WORLDS[id],levels,hidden:window.CANDY_HIDDEN,canEnter:i=>playtest||Economy.canEnter(save,i),play:i=>this.startLevel(i),back:()=>this.showLevels(),secret:h=>this.showSecret(h),warehouse:()=>this.showInventory(id),codex:()=>this.showCodex(levels.slice(id*30,id*30+30).find(l=>Economy.canEnter(save,l.id)&&!save.stars[l.id])||levels[id*30+29]),tasks:()=>this.showTasks(id)});
    }
    showSecret(level){
      this.clearScreen();this.state='secret';this.input.enabled=false;
      window.CandyMapView.secret({save,level,available:window.CandyAds.available,back:()=>this.showChapter(level.world),play:h=>this.startLevel(h),unlock:async id=>{const result=await window.CandyAds.request(id);if(result.completed&&Economy.unlockHidden(save,id))persist();return result;}});
    }
    showWorkshop(tab='dragon'){
      this.clearScreen();this.state='workshop';this.input.enabled=false;
      window.CandyMapView.shop({save,tab,items:Economy.SHOP,buy:id=>{const result=Economy.buy(save,id);if(result.ok)persist();return result;},power:()=>Economy.powerInfo(save),upgrade:()=>this.upgradePower(),back:()=>this.showLevels()});
    }
    upgradePower(){const result=Economy.upgrade(save);if(result.ok)persist();return result;}
    showInventory(world=this.mapWorld||0){
      this.clearScreen();this.state='warehouse';this.input.enabled=false;
      window.CandyMapView.inventory({save,purchase:id=>{const r=Economy.buyConsumable(save,id);if(r.ok)persist();return r;},items:Economy.ITEMS,goods:Economy.SHOP,equip:id=>{const result=Economy.buy(save,id);if(result.ok)persist();return result;},back:()=>this.showChapter(world)});
    }
    showTasks(world){
      this.clearScreen();this.state='tasks';this.input.enabled=false;
      window.CandyMapView.tasks({save,missions:Economy.missions(save,world).map(m=>({...m,claimed:save.missions[m.id]})),back:()=>this.showChapter(world)});
    }
    showCodex(level=levels[save.current]){
      const battle=['intro','ready','aiming','shooting'].includes(this.state),from=this.state;
      if(battle){this.codexOpen=true;this.setPausedByUI(true);this.input.enabled=false;}else{this.clearScreen();this.state='codex';this.input.enabled=false;}
      window.CandyMapView.codex({save,level,worlds:window.CANDY_WORLDS,levels,hidden:window.CANDY_HIDDEN,playtest,attack:battle?this.attackDamage:Economy.attack(save),back:()=>{if(battle){window.CandyMapView.hide();this.codexOpen=false;this.input.enabled=true;this.setPausedByUI(false);}else if(from==='worlds')this.showLevels();else this.showChapter(level.world);}});
    }
    takeSnapshot(){
      this.snapshot={nodes:[...this.nodes.values()].map(n=>({kind:n.kind,hp:n.hp,maxHp:n.maxHp,x:n.sprite.x,y:n.sprite.y,armor:n.armor||0})),obstacles:this.obstacles.filter(o=>o.active).map(o=>({...o.getData('spec'),x:o.x,y:o.y,hp:o.getData('hp')})),wave:this.wave,turn:this.turn,shots:this.shotsFired,energy:this.energy,defeated:this.defeated,bossSplit:this.bossSplit,clock:this.gameClock,hits:this.hitCount,bestCombo:this.bestCombo,productive:this.productiveShots};
    }
    useItem(id){
      if(this.state!=='ready')return {ok:false,reason:'请在两次发射之间使用道具'};
      if(!save.inventory[id])return {ok:false,reason:'仓库里没有这个道具'};
      if(id==='retreat'&&this.shotsFired===0)return {ok:false,reason:'敌阵推进后再使用退步糖'};
      if(id==='retreat'&&this.retreatUsed)return {ok:false,reason:'每局只能使用一次退步糖'};
      if(id==='rewind'&&!this.snapshot)return {ok:false,reason:'还没有可回退的发射'};
      if(id==='hammer'&&!this.obstacles.some(o=>o.active))return {ok:false,reason:'本关没有可移除的障碍'};
      if((id==='balls'&&this.extraBalls)||(id==='aim'&&this.itemAim)||(id==='guard'&&this.guard)||(id==='nova'&&this.nova))return {ok:false,reason:'这个效果已经准备好了'};
      if(!Economy.spendItem(save,id))return {ok:false,reason:'道具不足'};persist();
      if(id==='retreat'){this.retreatUsed=true;for(const n of this.nodes.values()){n.sprite.y=Math.max(n.kind==='K'?140:122,n.sprite.y-(n.kind==='K'?(this.level.bossAdvance||this.level.advance||37):(this.level.advance||37)));const bw=n.kind==='K'?72:n.kind==='p'?27:n.kind==='r'?22:33,bh=n.kind==='K'?46:n.kind==='r'?22:23;this.fitTarget(n.sprite,bw,bh);if(n.label)n.label.y=n.sprite.y+5;this.drawHealth(n);}}
      if(id==='balls')this.extraBalls=3;
      if(id==='aim')this.itemAim=true;
      if(id==='guard')this.guard=1;
      if(id==='nova'){this.nova=true;this.armed=false;}
      if(id==='hammer'){const wall=this.obstacles.filter(o=>o.active).sort((a,b)=>b.y-a.y)[0];wall.disableBody(true,true);}
      if(id==='rewind'){
        const snap=this.snapshot;this.time.removeAllEvents();this.balls.clear(true,true);for(const n of this.nodes.values()){n.label?.destroy();n.bar?.destroy();}this.nodes.clear();this.targets.clear(true,true);this.walls.clear(true,true);this.obstacles=[];
        for(const n of snap.nodes){const node=this.addTarget(n.kind+String(n.hp),(n.x-48)/44,n.y,{exact:true});node.maxHp=n.maxHp;node.armor=n.armor;this.drawHealth(node);node.label?.setText(String(n.hp)+(n.armor?'◇':''));}
        for(const spec of snap.obstacles)this.addObstacle(spec);
        Object.assign(this,{wave:snap.wave,turn:snap.turn,shotsFired:snap.shots,energy:snap.energy,defeated:snap.defeated,bossSplit:snap.bossSplit,gameClock:snap.clock,hitCount:snap.hits,bestCombo:snap.bestCombo,productiveShots:snap.productive||0,volleyProductive:false,snapshot:null,extraBalls:0,itemAim:false,nova:false,guard:0});
      }
      this.drawEnergy();this.refreshHUD();this.hintText.setText(Economy.ITEMS[id].name+'已使用');return {ok:true};
    }
    addObstacle(spec){
      const frame=window.CandyGuides.frames[spec.kind],wall=this.walls.create(spec.x,spec.y,frame===undefined?'obstacle-'+spec.kind:'mechanism-sheet',frame===undefined?undefined:frame).setDisplaySize(spec.width,spec.height).setDepth(14);
      this.fitTarget(wall,spec.width,spec.height);wall.setData({kind:spec.kind,spec:{...spec},hp:spec.hp??(spec.kind==='ice'?3:999)});if(spec.kind==='conveyor')wall.setFlipX((spec.force||150)<0);this.obstacles.push(wall);return wall;
    }
    hitObstacle(ball,wall){
      const last=ball.getData('lastObstacle')||-1000;if(this.gameClock-last<80)return;ball.setData('lastObstacle',this.gameClock);
      const kind=wall.getData('kind');
      if(kind==='slime'){ball.setVelocity(ball.body.velocity.x*.65,ball.body.velocity.y*.65);ball.setData({slowUntil:this.gameClock+900,boostUntil:0});}
      if(kind==='boost'){const v=ball.body.velocity,n=Math.hypot(v.x,v.y)||SPEED;ball.setVelocity(v.x/n*480,v.y/n*480);ball.setData({boostUntil:this.gameClock+750,slowUntil:0});}
      if(kind==='prism'&&!ball.getData('prismMade')&&!ball.getData('big')&&this.prismCount<3){ball.setData('prismMade',true);this.prismCount++;const v=ball.body.velocity,angle=Math.atan2(v.y,v.x)+(ball.x<wall.x?-.32:.32);const clone=this.createBubble(ball.x+Math.sign(Math.cos(angle)||1)*12,wall.y+Math.sign(Math.sin(angle)||-1)*(wall.displayHeight/2+8),angle,SPEED,Math.max(1,Math.round(ball.getData('damage')*.5)),false);clone.setData('prismMade',true);this.burst(wall.x,wall.y,0xa98acb,4);}
      if(kind==='ice'){wall.setData('hp',wall.getData('hp')-1);if(wall.getData('hp')<=0){this.burst(wall.x,wall.y,0xccebf0);wall.disableBody(true,true);}}
      if(kind==='spring')ball.setVelocity(Math.sign(ball.x-wall.x||1)*SPEED*.7,-SPEED*.75);
      if(kind==='mirror'){const x=ball.body.velocity.x,y=ball.body.velocity.y;ball.setVelocity(Math.sign(x||1)*Math.max(80,Math.abs(y)),-Math.max(80,Math.abs(x)));}
      window.CandyAudio.play('hit');
    }
    startLevel(index){
      this.clearScreen();this.isHidden=typeof index==='object';this.level=this.isHidden?index:levels[index];this.index=this.isHidden?this.level.world*30+this.level.local:index;this.world=window.CANDY_WORLDS[this.level.world];this.background.setTexture(`w${this.world.id}-arena`);window.CandyAudio.setTheme(this.world.id);if(!this.isHidden){save.current=index;persist();}
      this.attackDamage=Math.max(Economy.attack(save),playtest?Economy.recommendedAttack(this.level):0);this.balanceAttack=Economy.recommendedAttack(this.level);this.challengeElapsed=0;this.baseLives=this.level.baseLives||3;this.escaped=0;
      this.bubbleLook=Economy.equipped(save,'bubble');this.dragonLook=Economy.equipped(save,'dragon');this.turretLook=Economy.equipped(save,'turret');this.cosmeticAt=0;
      this.retreatUsed=false;this.prismCount=0;this.absorbedThisVolley=0;this.snapshot=null;this.extraBalls=0;this.itemAim=false;this.guard=0;this.nova=false;
      this.rewardClaimed=false;this.rating=null;this.reward=null;this.shotsFired=0;this.productiveShots=0;this.volleyProductive=false;this.defeated=0;this.totalMonsters=this.level.waves.flat().filter(t=>['j','b','K'].includes(t[0])).length+this.level.waves.flat().filter(t=>t[0]==='K').length*2;
      this.gameClock=0;this.state='intro';this.turn=1;this.wave=0;this.energy=save.equipped.gear==='gear-spark'?15:0;this.armed=false;this.combo=0;this.bestCombo=0;this.pending=0;this.rainbowUntil=0;this.hitCount=0;this.angle=-Math.PI/2;this.nextId=0;this.volleyAge=0;this.bossSplit=false;
      this.keep(panel(this,10,10,340,43),text(this,22,18,`${this.isHidden?'秘境':String(this.level.local+1).padStart(2,'0')} / ${this.level.name}`,16));
      this.bossBar=this.keep(this.add.graphics());this.bossStatus=this.keep(text(this,22,36,'',9,'#ffe5b1'));
      this.keep(this.add.image(174,514,'icon-fire'));this.damageLabel=this.keep(text(this,190,508,String(this.attackDamage),11,'#365f4d'));

      this.keep(panel(this,10,61,340,44,0xf5edc9,0x8da87e));
      this.turnLabel=this.keep(text(this,23,67,'',10,'#42654b'));
      this.goalLabel=this.keep(text(this,337,67,'',10,'#42654b'));this.goalLabel.setOrigin(1,0);
      this.waveLabel=this.keep(text(this,23,86,'',10,'#42654b'));
      this.keep(text(this,337,86,'长按怪怪查看生命',9,'#8b7551').setOrigin(1,0));
      const danger=this.keep(this.add.graphics());danger.lineStyle(1,0xc88972,.8);for(let x=25;x<337;x+=9)danger.lineBetween(x,493,x+4,493);
      this.keep(text(this,30,496,'守住这条线',8,'#af7b60'));
      this.hero=this.keep(this.add.sprite(128,536,this.dragonTexture(),0).setScale(2));
      this.turret=this.keep(this.add.sprite(180,556,Economy.equipped(save,'turret').texture).setScale(1.5));
      if(this.level.mode==='defense')this.keep(this.add.image(245,540,'engineer').setScale(1.5));
      this.friend=this.keep(this.add.image(this.level.mode==='defense'?287:245,552,'star').setScale(1.5).setAlpha(.45));
      this.energyLabel=this.keep(text(this,28,540,'大泡泡能量',9,'#42634c'));
      this.energyGraphic=this.keep(this.add.graphics());
      this.comboText=this.keep(text(this,180,457,'',18,'#4a8062','center').setDepth(35));
      this.hintText=this.keep(text(this,180,583,'',10,'#395f4d','center'));
      this.skillButton=window.CandyBattleUI.show({items:Economy.ITEMS,count:id=>save.inventory[id]||0,state:()=>this.state,obscured:()=>this.codexOpen,use:id=>this.useItem(id),skill:()=>this.toggleSkill(),attack:()=>this.attackDamage,pause:(kind,value)=>{this[{tray:'itemTrayOpen',menu:'menuOpen',inspect:'inspectingEnemy'}[kind]]=value;this.setPausedByUI(value);},leave:dest=>dest==='chapter'?this.showChapter(this.world.id):this.showTitle(),codex:()=>this.showCodex(this.level)});
      for(let i=0;i<this.level.initial;i++)this.spawnWave(140+i*37);
      for(const spec of this.level.obstacles||[])this.addObstacle(spec);
      for(const spec of this.level.portals||[])this.portalSprites.push(this.add.image(spec.x,spec.y,'portal').setScale(1.3).setAlpha(.85).setDepth(8));
      this.refreshHUD();this.drawEnergy();
      const goal=this.level.mode==='timed'?`${this.level.timeLimit} 秒内清除全部敌人。`:this.level.mode==='defense'?'保护工程师，击退全部进攻。':this.level.mode==='raid'?'击败首领及其分裂守卫。':'清除全部敌人，守住安全线。';
      this.discoveryCards=window.CandyGuides.forLevel(this.level,save);if(this.discoveryCards.length)window.CandyBattleUI.guide({cards:this.discoveryCards,goal:'本关目标：'+goal,start:()=>this.beginLevel()});else this.modal('本关目标',goal,'开始这一关',()=>this.beginLevel(),{label:'怪怪图鉴',action:()=>this.showCodex(this.level)});
    }
    beginLevel(){
      if(this.state!=='intro')return;for(const card of this.discoveryCards||[])save.seenGuides[card.id]=true;persist();this.clearModal();window.CandyBattleUI.finishIntro();this.state='ready';this.setPausedByUI(false);this.hintText.setText('阿噗：'+window.CandyAudio.voice('start')+' 按住瞄准，松手发射');
    }
    modal(title,detail,label,callback,secondary=null){
      this.aim.clear();
      const shade=this.add.rectangle(180,320,360,640,0x183e35,.60).setDepth(70).setInteractive();
      const box=panel(this,26,174,308,289,0xfff0c9,0x668667).setDepth(71);
      const icon=this.add.image(180,202,'star').setScale(1.4).setDepth(72);
      const titleText=text(this,180,231,title,23,'#365f4d','center').setDepth(72);
      const detailText=text(this,180,274,detail,12,'#63795b','center').setLineSpacing(7).setDepth(72);
      const action=button(this,180,391,234,label,callback,'gold').setDepth(73);
      this.modals.push(shade,box,icon,titleText,detailText,action);
      if(secondary)this.modals.push(button(this,180,438,234,secondary.label,secondary.action).setDepth(73));
    }
    spawnWave(y=140){
      if(this.wave>=this.level.waves.length)return;
      const row=this.level.waves[this.wave++];
      row.forEach((token,col)=>{if(token==='.')return;this.addTarget(token,col,y);});
    }
    addTarget(token,col,y,options={}){
      const kind=token[0],hp=Number(token.slice(1))*(options.exact?1:this.balanceAttack),texture=`w${this.world.id}-`+{j:'jelly',b:'berry',p:'bomb',r:'pickup',K:'boss'}[kind];
      const sprite=this.targets.create(48+col*44,y,texture);
      sprite.setScale(kind==='K'?2.5:kind==='p'?1.4:kind==='r'?1.4:1.2).refreshBody();
      const bw=kind==='K'?72:kind==='p'?27:kind==='r'?22:33,bh=kind==='K'?46:kind==='r'?22:23;
      this.fitTarget(sprite,bw,bh);
      const node={id:++this.nextId,kind,hp,maxHp:hp,armor:['j','b'].includes(kind)?this.level.armor||0:0,sprite,baseScale:sprite.scaleX,monster:['j','b','K'].includes(kind),dead:false};
      sprite.setData('node',node);sprite.setDepth(10);
      if(node.monster&&Economy.discover(save,this.level,kind))persist();
      if(node.monster)node.label=text(this,sprite.x,sprite.y+5,String(hp)+(node.armor?'◇':''),kind==='K'?12:9,'#254d43','center').setDepth(12);
      if(node.monster){node.bar=this.add.graphics().setDepth(11);this.drawHealth(node);}this.nodes.set(node.id,node);return node;
    }
    drawHealth(node){if(!node.bar)return;const w=node.kind==='K'?62:32;node.bar.clear().fillStyle(0x527465).fillRect(node.sprite.x-w/2,node.sprite.y+17,w,3).fillStyle(0xa9cf8b).fillRect(node.sprite.x-w/2+1,node.sprite.y+18,Math.max(0,(w-2)*node.hp/node.maxHp),1);if(node.kind==='K')this.drawBossHUD();}
    drawBossHUD(){
      if(!this.bossBar?.active)return;this.bossBar.clear();const boss=[...this.nodes.values()].find(n=>n.kind==='K'&&!n.dead);if(!boss){this.bossStatus.setText('');return;}
      this.bossStatus.setText((this.isHidden?'秘境守卫':'重型首领')+`  ${Math.max(0,boss.hp)} / ${boss.maxHp}`);this.bossBar.fillStyle(0x684c55).fillRect(22,47,316,3).fillStyle(boss.hp/boss.maxHp<.25?0xe68da8:0xf4bc69).fillRect(22,47,Math.ceil(316*Math.max(0,boss.hp)/boss.maxHp),3);
    }
    fitTarget(sprite,bw,bh){
      sprite.body.setOffset(0,0);sprite.refreshBody();sprite.body.setSize(bw,bh);
      sprite.body.setOffset((sprite.displayWidth-bw)/2,(sprite.displayHeight-bh)/2);
    }
    remaining(){return [...this.nodes.values()].filter(n=>n.monster&&!n.dead).length;}
    refreshHUD(){
      this.drawBossHUD();
      this.turnLabel?.setText(`已发射 ${this.shotsFired} 次 · 每次 ${this.level.balls} 颗`);
      this.goalLabel?.setText(`已消灭 ${this.defeated}/${this.totalMonsters} 只`);
      if(this.level.mode==='defense')this.goalLabel?.setText(`守护 ♥ ${this.baseLives}/3`);
      if(this.level.mode==='timed')this.goalLabel?.setText(`剩余 ${Math.max(0,Math.ceil(this.level.timeLimit-this.challengeElapsed/1000))} 秒`);
      const total=Math.max(0,this.level.waves.length-this.level.initial),arrived=Math.max(0,this.wave-this.level.initial);
      this.waveLabel?.setText(total?`后续援军 ${arrived}/${total} 批${arrived===total?' · 已到齐':''}`:'无后续援军');
      this.damageLabel?.setText(String(this.attackDamage));
    }
    drawEnergy(){
      this.energyGraphic.clear();this.energyGraphic.fillStyle(0x7a9b74).fillRect(28,556,80,9);this.energyGraphic.fillStyle(0xf2d38e).fillRect(30,558,Math.round(this.energy/100*76),5);
      this.skillButton.label.setText(this.armed?'大泡泡 已就绪':this.energy>=100?'释放大泡泡':`大泡泡 ${this.energy}%`);
      this.skillButton.setAlpha(this.energy>=100||this.armed?1:.68);
    }
    toggleSkill(){
      if(this.state!=='ready')return;
      if(this.nova){this.hintText.setText('这次已准备星爆泡泡，能量留待下次');return;}
      if(this.energy<100&&!this.armed){this.hintText.setText('每次命中怪怪 +5 能量，满 100 可释放大泡泡');return;}
      this.armed=!this.armed;this.drawEnergy();if(this.armed){window.CandyAudio.play('ready');window.CandyAudio.voice('power');}this.hintText.setText(this.armed?'阿噗：大泡泡，准备！首颗伤害 ×4':'已取消，继续普通发射');this.drawAim();
    }
    pointerDown(pointer){
      if(this.uiPaused||this.state!=='ready'||pointer.y<110||pointer.y>562||pointer.x<20||pointer.x>340||(pointer.y>520&&pointer.x>265))return;
      this.state='aiming';this.hero.setFrame(2);this.setAngle(pointer);this.drawAim();this.aimStart={x:pointer.x,y:pointer.y};
      const node=[...this.nodes.values()].find(n=>n.monster&&Math.abs(pointer.x-n.sprite.x)<n.sprite.body.width/2+5&&Math.abs(pointer.y-n.sprite.y)<n.sprite.body.height/2+5);
      clearTimeout(this.inspectTimer);if(node)this.inspectTimer=setTimeout(()=>{if(this.state==='aiming'){this.state='ready';this.aim.clear();this.hero.setFrame(0);window.CandyBattleUI.inspect(node);}},450);
    }
    pointerMove(pointer){if(this.state==='aiming'&&!this.uiPaused){if(this.aimStart&&Phaser.Math.Distance.Between(pointer.x,pointer.y,this.aimStart.x,this.aimStart.y)>8)clearTimeout(this.inspectTimer);this.setAngle(pointer);this.drawAim();}}
    pointerUp(pointer){clearTimeout(this.inspectTimer);if(this.state!=='aiming'||this.uiPaused)return;if(pointer.y>575){this.state='ready';this.hero.setFrame(0);this.aim.clear();return;}this.setAngle(pointer);this.fire();}
    setAngle(pointer){this.angle=Phaser.Math.Clamp(Math.atan2(Math.min(-22,pointer.y-LAUNCH.y),pointer.x-LAUNCH.x),-Math.PI+.18,-.18);}
    drawAim(){
      this.aim.clear();if(!['ready','aiming'].includes(this.state))return;
      let x=LAUNCH.x,y=LAUNCH.y,dx=Math.cos(this.angle),dy=Math.sin(this.angle),bounce=0;
      for(let i=0;i<90+(this.itemAim?80:0)+(save.equipped.gear==='gear-lens'?50:0);i++){
        x+=dx*5;y+=dy*5;
        if(x<25||x>335){dx=-dx;x=Phaser.Math.Clamp(x,25,335);bounce++;}
        if(y<111){dy=-dy;y=111;bounce++;}
        if(y>LAUNCH.y||bounce>3)break;
        const obstacle=this.obstacles.find(o=>o.active&&Math.abs(x-o.x)<o.body.width/2+3&&Math.abs(y-o.y)<o.body.height/2+3);if(obstacle){this.aim.lineStyle(2,0xbd8c6c,.8).strokeRect(obstacle.x-obstacle.body.width/2-2,obstacle.y-7,obstacle.body.width+4,14);break;}
        if(i%3===0)this.aim.fillStyle(this.armed?0xd09c4c:0x4d8b74,Math.max(.1,.8-i/120)).fillRect(Math.round(x)-1,Math.round(y)-1,3,3);
        const target=[...this.nodes.values()].find(n=>!n.dead&&Math.abs(x-n.sprite.x)<n.sprite.body.width/2+3&&Math.abs(y-n.sprite.y)<n.sprite.body.height/2+3);
        if(target){this.aim.lineStyle(2,0xd7ae67,.85).strokeRect(target.sprite.x-target.sprite.body.width/2-3,target.sprite.y-target.sprite.body.height/2-3,target.sprite.body.width+6,target.sprite.body.height+6);break;}
      }
    }
    fire(){
      if(!['ready','aiming'].includes(this.state)||this.uiPaused)return;
      this.takeSnapshot();this.prismCount=0;this.absorbedThisVolley=0;this.volleyProductive=false;this.state='shooting';this.shotsFired++;this.refreshHUD();this.aim.clear();this.combo=0;this.volleyAge=0;this.rainbowUntil=0;
      this.hero.setFrame(3);this.tweens.add({targets:this.hero,y:541,duration:80,yoyo:true});
      this.hintText.setText('利用反弹和连锁命中敌人');
      const powered=this.armed;this.armed=false;if(powered)this.energy=0;this.drawEnergy();
      const generation=this.generation,volleyBalls=this.level.balls+this.extraBalls,nova=this.nova;this.extraBalls=0;this.nova=false;this.itemAim=false;this.pending=volleyBalls;
      for(let i=0;i<volleyBalls;i++)this.time.delayedCall(i*70,()=>{
        if(this.generation!==generation||this.state!=='shooting')return;
        this.pending--;const big=(powered||nova)&&i===0;
        const ball=this.createBubble(LAUNCH.x,LAUNCH.y,this.angle,SPEED,this.attackDamage*(big?(nova?6:4):1),big);ball.setData('cosmeticOffset',i%4);if(this.turretLook.fx)this.burst(LAUNCH.x,LAUNCH.y,this.turretLook.color,2);
        window.CandyAudio.play(big?'big':'shoot',i);
      });
      this.time.delayedCall(220,()=>{if(this.generation===generation&&this.hero.active)this.hero.setFrame(0);});
    }
    createBubble(x,y,angle,speed,damage,big=false){
      const ball=this.balls.create(x,y,this.bubbleTexture()).setDepth(25).setScale(big?2:1);ball.body.setCircle(4,(ball.width-8)/2,(ball.height-8)/2);ball.setCollideWorldBounds(true).setBounce(1).setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed);ball.setAccelerationX(this.level.wind||0).setMaxVelocity(550,550);ball.setData({cosmeticOffset:0,cosmeticAt:0,damage,hits:new Map(),big,prismMade:false});if(big)ball.setTint(0xffd779);return ball;
    }
    shouldCollide(ball,sprite){
      const node=sprite.getData('node');if(!node||node.dead||!ball.active)return false;
      if(this.rainbowUntil>this.gameClock||node.kind==='r'){
        const last=ball.getData('hits').get(node.id)||-1000;
        if(this.gameClock-last>180){ball.getData('hits').set(node.id,this.gameClock);this.damage(node,ball.getData('damage'));}
        return false;
      }
      return true;
    }
    onHit(ball,sprite){
      const node=sprite.getData('node');if(!node||node.dead)return;
      this.damage(node,ball.getData('damage'));
      // Prevent shallow, almost-horizontal loops from waiting indefinitely.
      if(ball.active&&Math.abs(ball.body.velocity.y)<50)ball.setVelocityY(ball.body.velocity.y<0?-85:85);
    }
    damage(node,amount){
      if(node.dead)return;
      if(node.armor>0){node.armor--;amount=0;}node.hp-=amount;this.hitCount++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
      if(node.monster){this.volleyProductive=true;this.energy=Math.min(100,this.energy+5);this.drawEnergy();}
      node.label?.setText(String(Math.max(0,node.hp))+(node.armor?'◇':''));
      this.drawHealth(node);this.comboText.setText(this.combo>=3?`${this.combo} 连击!`:'');
      window.CandyAudio.play(node.kind==='K'?'boss':node.kind==='b'?'berry':'hit',this.combo);
      if(node.hp<=0){this.destroyTarget(node);return;}
      node.sprite.setTintFill(0xfff6c9);
      this.tweens.killTweensOf(node.sprite);node.sprite.setScale(node.baseScale);
      this.tweens.add({targets:node.sprite,scaleX:node.baseScale*1.08,scaleY:node.baseScale*.86,duration:60,yoyo:true});
      this.time.delayedCall(65,()=>{if(node.sprite.active&&!node.dead)node.sprite.clearTint();});
      this.burst(node.sprite.x,node.sprite.y,0xffedb2,3);
    }
    destroyTarget(node){
      if(node.dead)return;node.dead=true;
      const x=node.sprite.x,y=node.sprite.y;if(node.monster)this.defeated++;
      this.tweens.killTweensOf(node.sprite);node.sprite.disableBody(true,true);node.label?.destroy();node.bar?.destroy();this.nodes.delete(node.id);
      this.burst(x,y,node.kind==='p'?0xf6ca7c:node.kind==='r'?0xa8d7da:0xa9d7a2,node.kind==='K'?32:12);
      window.CandyAudio.play(node.kind==='p'?'explode':node.kind==='r'?'rainbow':'pop');
      if(node.kind==='p'){
        const ring=this.add.rectangle(x,y,8,8,0xffdc8b,.6).setDepth(32);
        this.tempObjects.add(ring);
        this.tweens.add({targets:ring,scaleX:18,scaleY:18,alpha:0,duration:270,onComplete:()=>{this.tempObjects.delete(ring);ring.destroy();}});
        const nearby=[...this.nodes.values()].filter(n=>!n.dead&&Phaser.Math.Distance.Between(x,y,n.sprite.x,n.sprite.y)<83);
        for(const n of nearby)this.damage(n,4*this.balanceAttack);
        this.hintText.setText(this.world.bomb+'连锁！邻近目标受到 '+(4*this.balanceAttack)+' 伤害');
      }else if(node.kind==='r'){
        this.rainbowUntil=this.gameClock+3000;this.balls.getChildren().forEach(b=>b.setTint(0xf3b7df));this.hintText.setText(this.world.pickup+'穿透！持续 3 秒');
      }else if(node.kind==='K'&&!this.bossSplit){
        this.bossSplit=true;this.hintText.setText('首领分裂了，清除两个小守卫！');
        const left=this.addTarget('j4',2,Math.min(y+37,450)),right=this.addTarget('j4',4,Math.min(y+37,450));
        // The boss row keeps its adjacent slots empty; split children get new IDs.
        left.sprite.setTint(0xf4b6c7);right.sprite.setTint(0xf4b6c7);
      }
      this.refreshHUD();
    }
    burst(x,y,color,count=8){
      for(let i=0;i<count;i++){
        const particle=this.add.rectangle(x,y,3+(i%2),3+(i%2),color).setDepth(34);
        this.tempObjects.add(particle);
        const angle=i/count*Math.PI*2,distance=12+Math.random()*24;
        this.tweens.add({targets:particle,x:x+Math.cos(angle)*distance,y:y+Math.sin(angle)*distance,alpha:0,duration:300+Math.random()*180,onComplete:()=>{this.tempObjects.delete(particle);particle.destroy();}});
      }
    }
    endVolley(){
      if(this.state!=='shooting')return;
      if(this.volleyProductive)this.productiveShots++;this.volleyProductive=false;
      this.state='advancing';this.physics.world.timeScale=1;this.time.timeScale=1;this.hero.setFrame(0);this.comboText.setText('');
      if(this.remaining()===0&&this.wave>=this.level.waves.length){this.win();return;}
      if(this.guard>0){this.guard--;this.turn++;this.state='ready';this.refreshHUD();this.hintText.setText('缓冲护盾抵消了本次推进');return;}
      let danger=false;
      for(const node of this.nodes.values()){
        node.sprite.y+=node.kind==='K'?(this.level.bossAdvance||this.level.advance||37):(this.level.advance||37);node.sprite.clearTint();this.tweens.killTweensOf(node.sprite);node.sprite.setScale(node.baseScale);
        // refreshBody resets the custom collision size, so restore it each advance.
        const bw=node.kind==='K'?72:node.kind==='p'?27:node.kind==='r'?22:33,bh=node.kind==='K'?46:node.kind==='r'?22:23;
        this.fitTarget(node.sprite,bw,bh);
        if(node.label)node.label.y=node.sprite.y+5;this.drawHealth(node);
        if(node.monster&&node.sprite.y+bh/2>=493){if(this.level.mode==='defense'){this.baseLives=Math.max(0,this.baseLives-(node.kind==='K'?2:1));this.escaped+=node.kind==='K'&&!this.bossSplit?3:1;node.dead=true;node.sprite.disableBody(true,true);node.label?.destroy();node.bar?.destroy();this.nodes.delete(node.id);}else danger=true;}
        if(!node.monster&&node.sprite.y>478){node.dead=true;node.sprite.disableBody(true,true);this.nodes.delete(node.id);}
      }
      if(danger||this.baseLives<=0){this.lose(this.level.mode==='defense'?'工程师的生命耗尽了。':undefined);return;}
      this.spawnWave();this.turn++;this.refreshHUD();this.state='ready';this.hintText.setText(this.wave>=this.level.waves.length?'最后一波已到齐，清掉剩下的敌人！':'敌人前进了，重新找一个好角度');
    }
    win(){
      if(this.rewardClaimed)return;this.rewardClaimed=true;this.state='won';this.time.removeAllEvents();this.balls.clear(true,true);this.physics.world.pause();this.hero.setFrame(4);this.friend.setAlpha(1);this.burst(245,552,0xffdb86,25);
      const target=this.level.starTarget||6;this.rating=window.CandyScore.evaluate({won:true,shots:this.shotsFired,par:target,productive:this.productiveShots,combo:this.bestCombo,mode:this.level.mode,lives:this.baseLives,elapsed:this.challengeElapsed/1000,limit:this.level.timeLimit});const {stars}=this.rating,stats={...this.rating,combo:this.bestCombo};
      this.reward=this.isHidden?Economy.winHidden(save,this.level.id,stats):Economy.win(save,this.index,stars,stats);persist();
      window.CandyAudio.play('win');window.CandyAudio.voice('win');
      const amount=this.reward.totalCurrency??this.reward.amount??0,loot=this.reward.rewards||[];
      window.CandyBattleUI.reward({title:this.isHidden?'秘境挑战完成！':'小星星，回家啦！',stars,rating:this.rating,amount,balance:save.candy,shots:this.shotsFired,target,loot:this.reward.loot||[],medals:this.reward.medals||[],nextLabel:this.isHidden||this.level.local===29?'返回主题地图':'前往下一关',next:()=>this.isHidden||this.level.local===29?this.showChapter(this.world.id):this.startLevel(this.index+1),warehouse:()=>this.showInventory(this.world.id),powerReady:Economy.powerInfo(save).eligible,upgrade:()=>this.showWorkshop('power')});
    }
    lose(reason='敌人越过了安全线。'){
      this.state='lost';this.refreshHUD();this.time.removeAllEvents();this.balls.clear(true,true);this.physics.world.pause();this.hero.setFrame(5);window.CandyAudio.play('lose');window.CandyAudio.voice('lose');
      this.modal('这次先撤退！',`阿噗：再试一次，我陪你！\n${reason}\n试试沿墙反弹，优先引爆连锁机关。\n本关最高连击：${this.bestCombo}`, '再试一次',()=>this.startLevel(this.isHidden?this.level:this.index),{label:'返回地图',action:()=>this.showLevels()});
    }
    setPausedByUI(paused){
      paused=Boolean(paused||this.inventoryOpen||this.itemTrayOpen||this.menuOpen||this.inspectingEnemy||this.codexOpen);this.uiPaused=paused;window.CandyAudio.pause(paused&&!this.audioSettingsOpen&&this.state!=='won');
      if(this.state==='aiming'){this.state='ready';this.aim.clear();this.hero?.setFrame(0);}
      if(paused){this.physics.world.pause();this.time.paused=true;this.tweens.pauseAll();}
      else{this.physics.world.resume();this.time.paused=false;this.tweens.resumeAll();}
    }
    fieldActive(wall){if(wall.getData('kind')==='blackhole'&&this.absorbedThisVolley>=(this.isHidden?5:3))return false;const spec=wall.getData('spec');return this.gameClock%(spec.period||3200)<1400;}
    applyFields(ball,delta){
      for(const wall of this.obstacles){if(!wall.active)continue;const kind=wall.getData('kind'),spec=wall.getData('spec'),dx=wall.x-ball.x,dy=wall.y-ball.y,d=Math.hypot(dx,dy),dt=delta/1000;
        if(kind==='conveyor'&&Math.abs(dx)<spec.width/2&&Math.abs(dy)<spec.height/2+4)ball.setVelocityX(Phaser.Math.Clamp(ball.body.velocity.x+(spec.force||150)*dt,-500,500));
        if((kind==='blackhole'||kind==='repulsor')&&this.fieldActive(wall)&&d<(spec.radius||66)){
          if(kind==='blackhole'&&d<11&&this.absorbedThisVolley<(this.isHidden?5:3)){this.absorbedThisVolley++;this.burst(ball.x,ball.y,0xa98acb,3);ball.destroy();window.CandyAudio.play('pop');return false;}
          if(kind==='blackhole'&&this.absorbedThisVolley>=(this.isHidden?5:3))continue;
          if(d===0)continue;const force=(kind==='blackhole'?180:-220)*(1-d/(spec.radius||66));ball.setVelocity(Phaser.Math.Clamp(ball.body.velocity.x+dx/d*force*dt,-500,500),Phaser.Math.Clamp(ball.body.velocity.y+dy/d*force*dt,-500,500));
        }
      }return true;
    }
    update(_time,delta){
      window.CandyBattleUI.refresh();
      if(this.uiPaused)return;
      this.gameClock+=delta;
      if(['ready','aiming','shooting'].includes(this.state)){this.challengeElapsed+=delta;if(this.level.mode==='timed'){this.refreshHUD();if(this.challengeElapsed>=this.level.timeLimit*1000){this.lose('限时挑战结束了，再试试更直接的路线。');return;}}}
      if(['ready','aiming','shooting'].includes(this.state)){for(const wall of this.obstacles){if(!wall.active)continue;const spec=wall.getData('spec');if(spec.kind==='moving'){wall.x=spec.x+Math.sin(this.gameClock/1200)*55;this.fitTarget(wall,spec.width,spec.height);}if(spec.kind==='blackhole'||spec.kind==='repulsor')wall.setAlpha(this.fieldActive(wall)?1:.3);if(spec.kind==='phase')wall.setAlpha(Math.floor(this.gameClock/1200)%2===0?1:.28);}}
      if(this.state==='shooting'){
        this.volleyAge+=delta;
        for(const wall of this.obstacles){if(!wall.active)continue;const kind=wall.getData('kind');if(kind==='blackhole'||kind==='repulsor')wall.setAlpha(this.fieldActive(wall)?1:.3);}
        for(const ball of [...this.balls.getChildren()]){
          if(!this.applyFields(ball,delta))continue;
          const slow=ball.getData('slowUntil'),boost=ball.getData('boostUntil');if((slow&&slow<this.gameClock)||(boost&&boost<this.gameClock)){const v=ball.body.velocity,n=Math.hypot(v.x,v.y)||1;ball.setVelocity(v.x/n*SPEED,v.y/n*SPEED);ball.setData({slowUntil:0,boostUntil:0});}
          if(this.bubbleLook.frames>1)ball.setFrame((Math.floor(this.gameClock/140)+ball.getData('cosmeticOffset'))%4);
          if(this.bubbleLook.fx&&this.gameClock-ball.getData('cosmeticAt')>180){ball.setData('cosmeticAt',this.gameClock);this.burst(ball.x,ball.y,this.bubbleLook.color,1);}
          if(this.portalSprites.length===2&&this.gameClock-(ball.getData('portalAt')||-1000)>650){const index=this.portalSprites.findIndex(p=>Phaser.Math.Distance.Between(ball.x,ball.y,p.x,p.y)<18);if(index>=0){const dest=this.portalSprites[1-index];ball.setPosition(dest.x+Math.sign(ball.body.velocity.x||1)*20,dest.y+Math.sign(ball.body.velocity.y||1)*22);ball.setData('portalAt',this.gameClock);}}
          if(ball.y>LAUNCH.y+4&&ball.body.velocity.y>0){this.burst(ball.x,LAUNCH.y,0xc9e4b6,2);ball.destroy();}
          else if(this.rainbowUntil<=this.gameClock&&!ball.getData('big'))ball.clearTint();
        }
        if(this.pending===0&&this.balls.countActive()===0)this.endVolley();
        // Degenerate loops gently fall back, without changing speed or discarding hits.
        if(this.volleyAge>22000)for(const ball of this.balls.getChildren())ball.setAccelerationY(180);
      }
      if(this.turret?.active&&['ready','aiming','shooting'].includes(this.state))this.turret.setFrame(Math.floor(this.gameClock/180)%4);
      if(this.hero?.active&&this.dragonLook?.fx&&['ready','aiming','shooting'].includes(this.state)&&this.gameClock-this.cosmeticAt>800){this.cosmeticAt=this.gameClock;this.burst(this.hero.x+(Math.random()>.5?25:-25),this.hero.y-12,this.dragonLook.color,1);}
      if(this.hero?.active&&this.state==='ready'){
        if(Math.floor(this.gameClock/3500)%2===0&&this.gameClock%3500<100)this.hero.setFrame(1);else this.hero.setFrame(0);
      }
    }
  }
  const config={type:Phaser.CANVAS,width:W,height:H,parent:'game',backgroundColor:'#c9e4d7',pixelArt:true,roundPixels:true,antialias:false,
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
    physics:{default:'arcade',arcade:{gravity:{x:0,y:0},fps:120,fixedStep:true,debug:false}},
    scene:[Adventure],audio:{noAudio:true},banner:false};
  const boot=()=>{window.candyGame=new Phaser.Game(config);};if(document.fonts)document.fonts.load('12px "Apu Pixel"').then(boot,boot);else boot();
})();
