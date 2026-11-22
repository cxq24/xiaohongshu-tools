/* Original game logic. Phaser 3.90.0 supplies rendering, input and Arcade Physics. */
(() => {
  'use strict';
  const W=360,H=640,LAUNCH={x:180,y:540},SPEED=410,ENERGY_MAX=100;
  const COLORS={ink:0x244e49,cream:0xffefc2,green:0x477d60,light:0xb8d39e,gold:0xf0c77c};
  const FONT='system-ui, -apple-system, sans-serif';
  const levels=window.CANDY_LEVELS;
  const Economy=window.CandyProgress;
  let rawSave={};try{rawSave=JSON.parse(localStorage.getItem('apu-candy-v1'))||{};}catch(_){}
  const save=Economy.normalize(rawSave);
  function persist(){try{localStorage.setItem('apu-candy-v1',JSON.stringify(save));}catch(_){}}
  persist();
  function text(scene,x,y,value,size=14,color='#fff1c7',align='left'){
    return scene.add.text(x,y,value,{fontFamily:FONT,fontSize:size+'px',fontStyle:'bold',color,align,resolution:2}).setOrigin(align==='center'?.5:0,0);
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
      for(const world of window.CANDY_WORLDS)for(const part of ['cover','arena','island','jelly','berry','boss','bomb','pickup','bubble'])this.load.image(`w${world.id}-${part}`,`assets/w${world.id}-${part}.png`);
      for(const part of ['stone','ice','spring','moving','mirror','phase'])this.load.image('obstacle-'+part,`assets/obstacle-${part}.png`);this.load.image('portal','assets/portal.png');
      this.load.image('forest','assets/forest.png');this.load.image('cover','assets/cover.png');
      for(const [name,file] of [['dragon','dragon'],['dragonBerry','dragon-berry'],['dragonSky','dragon-sky']])this.load.spritesheet(name,`assets/${file}.png`,{frameWidth:32,frameHeight:32});
      this.load.image('bubbleStar','assets/bubble-star.png');this.load.image('bubbleRainbow','assets/bubble-rainbow.png');
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
      this.physics.add.collider(this.balls,this.walls,this.hitObstacle,(ball,wall)=>wall.getData('kind')!=='phase'||Math.floor(this.gameClock/1200)%2===0,this);
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
      window.CandyMapView.hide();this.inventoryOpen=false;
      this.generation++;this.time.removeAllEvents();this.tweens.killAll();this.aim.clear();this.fx.clear();
      this.balls.clear(true,true);this.targets.clear(true,true);
      this.walls?.clear(true,true);this.obstacles=[];this.portalSprites?.forEach(o=>o.destroy());this.portalSprites=[];
      this.tempObjects.forEach(o=>o.destroy());this.tempObjects.clear();
      for(const n of this.nodes.values())n.label?.destroy();this.nodes.clear();
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
      this.keep(button(this,112,536,122,'选择关卡',()=>this.showLevels()),button(this,248,536,122,'营地 · '+save.candy+'糖',()=>this.showWorkshop()));
      this.keep(text(this,180,588,`已完成 ${Object.keys(save.stars).length}/300 · 十个主题世界`,11,'#3b6450','center'));
    }
    showLevels(){
      this.clearScreen();this.state='worlds';this.input.enabled=false;
      window.CandyMapView.worlds({save,worlds:window.CANDY_WORLDS,enter:id=>this.showChapter(id),back:()=>this.showTitle(),unlock:id=>{const result=Economy.unlockWorld(save,id);if(result.ok)persist();return result;},camp:()=>this.showWorkshop(),warehouse:()=>this.showInventory()});
    }
    showChapter(id){
      this.clearScreen();this.state='chapter';this.mapWorld=id;this.input.enabled=false;
      window.CandyMapView.chapter({save,world:window.CANDY_WORLDS[id],levels,hidden:window.CANDY_HIDDEN,canEnter:i=>Economy.canEnter(save,i),play:i=>this.startLevel(i),back:()=>this.showLevels(),secret:h=>this.showSecret(h),warehouse:()=>this.showInventory(id)});
    }
    showSecret(level){
      this.clearScreen();this.state='secret';this.input.enabled=false;
      window.CandyMapView.secret({save,level,available:window.CandyAds.available,back:()=>this.showChapter(level.world),play:h=>this.startLevel(h),unlock:async id=>{const result=await window.CandyAds.request(id);if(result.completed&&Economy.unlockHidden(save,id))persist();return result;}});
    }
    showWorkshop(){
      this.clearScreen();this.state='workshop';this.input.enabled=false;
      window.CandyMapView.shop({save,items:Economy.SHOP,buy:id=>{const result=Economy.buy(save,id);if(result.ok)persist();return result;},back:()=>this.showLevels()});
    }
    showInventory(world=this.mapWorld||0){
      const battle=['ready','aiming'].includes(this.state);this.inventoryOpen=true;
      if(battle){this.setPausedByUI(true);this.input.enabled=false;}else{this.clearScreen();this.state='warehouse';this.input.enabled=false;}
      const back=()=>{if(battle){window.CandyMapView.hide();this.inventoryOpen=false;this.input.enabled=true;this.setPausedByUI(false);}else this.showChapter(world);};
      window.CandyMapView.inventory({save,items:Economy.ITEMS,battle,back,use:id=>this.useItem(id),missions:Economy.missions(save,world).map(m=>({...m,claimed:save.missions[m.id]}))});
    }
    takeSnapshot(){
      this.snapshot={nodes:[...this.nodes.values()].map(n=>({kind:n.kind,hp:n.hp,maxHp:n.maxHp,x:n.sprite.x,y:n.sprite.y,armor:n.armor||0})),obstacles:this.obstacles.filter(o=>o.active).map(o=>({...o.getData('spec'),x:o.x,y:o.y,hp:o.getData('hp')})),wave:this.wave,turn:this.turn,shots:this.shotsFired,energy:this.energy,defeated:this.defeated,bossSplit:this.bossSplit,clock:this.gameClock,hits:this.hitCount,bestCombo:this.bestCombo};
    }
    useItem(id){
      if(this.state!=='ready')return {ok:false,reason:'请在两次发射之间使用道具'};
      if(!save.inventory[id])return {ok:false,reason:'仓库里没有这个道具'};
      if(id==='rewind'&&!this.snapshot)return {ok:false,reason:'还没有可回退的发射'};
      if(id==='hammer'&&!this.obstacles.some(o=>o.active))return {ok:false,reason:'本关没有可移除的障碍'};
      if((id==='balls'&&this.extraBalls)||(id==='aim'&&this.itemAim)||(id==='guard'&&this.guard)||(id==='nova'&&this.nova))return {ok:false,reason:'这个效果已经准备好了'};
      if(!Economy.spendItem(save,id))return {ok:false,reason:'道具不足'};persist();
      if(id==='balls')this.extraBalls=3;
      if(id==='aim')this.itemAim=true;
      if(id==='guard')this.guard=1;
      if(id==='nova'){this.nova=true;this.armed=false;}
      if(id==='hammer'){const wall=this.obstacles.filter(o=>o.active).sort((a,b)=>b.y-a.y)[0];wall.disableBody(true,true);}
      if(id==='rewind'){
        const snap=this.snapshot;this.time.removeAllEvents();this.balls.clear(true,true);for(const n of this.nodes.values())n.label?.destroy();this.nodes.clear();this.targets.clear(true,true);this.walls.clear(true,true);this.obstacles=[];
        for(const n of snap.nodes){const node=this.addTarget(n.kind+String(n.hp),(n.x-48)/44,n.y);node.maxHp=n.maxHp;node.armor=n.armor;node.label?.setText(String(n.hp)+(n.armor?'◇':''));}
        for(const spec of snap.obstacles)this.addObstacle(spec);
        Object.assign(this,{wave:snap.wave,turn:snap.turn,shotsFired:snap.shots,energy:snap.energy,defeated:snap.defeated,bossSplit:snap.bossSplit,gameClock:snap.clock,hitCount:snap.hits,bestCombo:snap.bestCombo,snapshot:null,extraBalls:0,itemAim:false,nova:false,guard:0});
      }
      this.drawEnergy();this.refreshHUD();this.hintText.setText(Economy.ITEMS[id].name+'已使用');return {ok:true};
    }
    addObstacle(spec){
      const wall=this.walls.create(spec.x,spec.y,'obstacle-'+spec.kind).setDisplaySize(spec.width,spec.height).setDepth(14);
      this.fitTarget(wall,spec.width,spec.height);wall.setData({kind:spec.kind,spec:{...spec},hp:spec.hp??(spec.kind==='ice'?3:999)});this.obstacles.push(wall);return wall;
    }
    hitObstacle(ball,wall){
      const last=ball.getData('lastObstacle')||-1000;if(this.gameClock-last<80)return;ball.setData('lastObstacle',this.gameClock);
      const kind=wall.getData('kind');
      if(kind==='ice'){wall.setData('hp',wall.getData('hp')-1);if(wall.getData('hp')<=0){this.burst(wall.x,wall.y,0xccebf0);wall.disableBody(true,true);}}
      if(kind==='spring')ball.setVelocity(Math.sign(ball.x-wall.x||1)*SPEED*.7,-SPEED*.75);
      if(kind==='mirror'){const x=ball.body.velocity.x,y=ball.body.velocity.y;ball.setVelocity(Math.sign(x||1)*Math.max(80,Math.abs(y)),-Math.max(80,Math.abs(x)));}
      window.CandyAudio.play('hit');
    }
    startLevel(index){
      this.clearScreen();this.isHidden=typeof index==='object';this.level=this.isHidden?index:levels[index];this.index=this.isHidden?this.level.world*30+this.level.local:index;this.world=window.CANDY_WORLDS[this.level.world];this.background.setTexture(`w${this.world.id}-arena`);window.CandyAudio.setTheme(this.world.id);if(!this.isHidden){save.current=index;persist();}
      this.snapshot=null;this.extraBalls=0;this.itemAim=false;this.guard=0;this.nova=false;
      this.rewardClaimed=false;this.shotsFired=0;this.defeated=0;this.totalMonsters=this.level.waves.flat().filter(t=>['j','b','K'].includes(t[0])).length+this.level.waves.flat().filter(t=>t[0]==='K').length*2;
      this.gameClock=0;this.state='intro';this.turn=1;this.wave=0;this.energy=save.equipped.gear==='gear-spark'?15:0;this.armed=false;this.combo=0;this.bestCombo=0;this.pending=0;this.rainbowUntil=0;this.hitCount=0;this.recalled=0;this.angle=-Math.PI/2;this.nextId=0;this.volleyAge=0;this.bossSplit=false;
      this.keep(panel(this,10,10,340,43),text(this,22,18,`${this.isHidden?'秘境':String(this.level.local+1).padStart(2,'0')} / ${this.level.name}`,16));
      this.homeButton=this.keep(button(this,316,31,48,'地图',()=>this.showLevels()));this.homeButton.setScale(.75);
      this.bagButton=this.keep(button(this,305,540,74,'道具',()=>this.showInventory(this.world.id)));this.bagButton.setScale(.7);
      this.keep(panel(this,10,61,340,44,0xf5edc9,0x8da87e));
      this.turnLabel=this.keep(text(this,23,67,'',10,'#42654b'));
      this.goalLabel=this.keep(text(this,337,67,'',10,'#42654b'));this.goalLabel.setOrigin(1,0);
      this.waveLabel=this.keep(text(this,23,86,'',10,'#42654b'));
      this.keep(text(this,337,86,'敌人数字 = 剩余耐久',9,'#8b7551').setOrigin(1,0));
      const danger=this.keep(this.add.graphics());danger.lineStyle(1,0xc88972,.8);for(let x=25;x<337;x+=9)danger.lineBetween(x,493,x+4,493);
      this.keep(text(this,30,496,'守住这条线',8,'#af7b60'));
      this.hero=this.keep(this.add.sprite(180,536,this.dragonTexture(),0).setScale(2));
      this.friend=this.keep(this.add.image(245,552,'star').setScale(1.5).setAlpha(.45));
      this.energyLabel=this.keep(text(this,28,540,'阿噗的能量',9,'#42634c'));
      this.energyGraphic=this.keep(this.add.graphics());
      this.comboText=this.keep(text(this,180,457,'',18,'#4a8062','center').setDepth(35));
      this.hintText=this.keep(text(this,180,583,'',10,'#395f4d','center'));
      this.retryButton=this.keep(button(this,62,615,95,'重试本关',()=>this.startLevel(this.isHidden?this.level:this.index)));
      this.skillButton=this.keep(button(this,180,615,125,'大泡泡 0%',()=>this.toggleSkill(),'gold'));
      this.actionButton=this.keep(button(this,298,615,95,'加速 ×1',()=>this.action()));
      this.recallButton=this.keep(button(this,298,574,74,'收球',()=>this.recall()));this.recallButton.setScale(.72).setVisible(false);
      for(let i=0;i<this.level.initial;i++)this.spawnWave(140+i*37);
      for(const spec of this.level.obstacles||[])this.addObstacle(spec);
      for(const spec of this.level.portals||[])this.portalSprites.push(this.add.image(spec.x,spec.y,'portal').setScale(1.3).setAlpha(.85).setDepth(8));
      this.refreshHUD();this.drawEnergy();
      this.modal('阿噗，出发！',`本关清除 ${this.totalMonsters} 只敌人${this.level.boss?'（含分裂）':''}。数字是耐久。\n敌人分 ${this.level.waves.length} 批到场，不是发射上限。\n清空全部敌人获胜，越过虚线失败。\n首通得星糖，去营地解锁外观！`, '开始这一关',()=>{this.clearModal();this.state='ready';this.hintText.setText('阿噗：'+window.CandyAudio.voice('start')+' 按住瞄准，松手发射');});
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
    addTarget(token,col,y){
      const kind=token[0],hp=Number(token.slice(1)),texture=`w${this.world.id}-`+{j:'jelly',b:'berry',p:'bomb',r:'pickup',K:'boss'}[kind];
      const sprite=this.targets.create(48+col*44,y,texture);
      sprite.setScale(kind==='K'?2.5:kind==='p'?1.4:kind==='r'?1.4:1.2).refreshBody();
      const bw=kind==='K'?72:kind==='p'?27:kind==='r'?22:33,bh=kind==='K'?46:kind==='r'?22:23;
      this.fitTarget(sprite,bw,bh);
      const node={id:++this.nextId,kind,hp,maxHp:hp,armor:['j','b'].includes(kind)?this.level.armor||0:0,sprite,baseScale:sprite.scaleX,monster:['j','b','K'].includes(kind),dead:false};
      sprite.setData('node',node);sprite.setDepth(10);
      if(node.monster)node.label=text(this,sprite.x,sprite.y+5,String(hp)+(node.armor?'◇':''),kind==='K'?15:11,'#254d43','center').setDepth(12);
      this.nodes.set(node.id,node);return node;
    }
    fitTarget(sprite,bw,bh){
      sprite.body.setOffset(0,0);sprite.refreshBody();sprite.body.setSize(bw,bh);
      sprite.body.setOffset((sprite.displayWidth-bw)/2,(sprite.displayHeight-bh)/2);
    }
    remaining(){return [...this.nodes.values()].filter(n=>n.monster&&!n.dead).length;}
    refreshHUD(){
      this.turnLabel?.setText(`已发射 ${this.shotsFired} 次 · 每次 ${this.level.balls} 颗`);
      this.goalLabel?.setText(`已消灭 ${this.defeated}/${this.totalMonsters} 只`);
      this.waveLabel?.setText(this.wave>=this.level.waves.length?'增援已全部到场，清空余敌':`敌人已到场 ${this.wave}/${this.level.waves.length} 批`);
    }
    drawEnergy(){
      this.energyGraphic.clear();this.energyGraphic.fillStyle(0x7a9b74).fillRect(28,556,80,9);this.energyGraphic.fillStyle(0xf2d38e).fillRect(30,558,Math.round(this.energy/100*76),5);
      this.skillButton.label.setText(this.armed?'大泡泡 已就绪':this.energy>=100?'释放大泡泡':`大泡泡 ${this.energy}%`);
      this.skillButton.setAlpha(this.energy>=100||this.armed?1:.68);
    }
    toggleSkill(){
      if(this.state!=='ready')return;
      if(this.nova){this.hintText.setText('这次已准备星爆泡泡，能量留待下次');return;}
      if(this.energy<100&&!this.armed){this.hintText.setText('命中敌人积能，满能量后可释放大泡泡');return;}
      this.armed=!this.armed;this.drawEnergy();if(this.armed){window.CandyAudio.play('ready');window.CandyAudio.voice('power');}this.hintText.setText(this.armed?'阿噗：大泡泡，准备！首颗伤害 ×4':'已取消，继续普通发射');this.drawAim();
    }
    pointerDown(pointer){
      if(this.uiPaused||this.state!=='ready'||pointer.y<110||pointer.y>562||pointer.x<20||pointer.x>340||(pointer.y>520&&pointer.x>265))return;
      this.state='aiming';this.hero.setFrame(2);this.setAngle(pointer);this.drawAim();
    }
    pointerMove(pointer){if(this.state==='aiming'&&!this.uiPaused){this.setAngle(pointer);this.drawAim();}}
    pointerUp(pointer){if(this.state!=='aiming'||this.uiPaused)return;if(pointer.y>575){this.state='ready';this.hero.setFrame(0);this.aim.clear();return;}this.setAngle(pointer);this.fire();}
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
      this.takeSnapshot();this.state='shooting';this.shotsFired++;this.refreshHUD();this.aim.clear();this.combo=0;this.volleyAge=0;this.fast=false;this.rainbowUntil=0;
      this.actionButton.label.setText('加速 ×1');this.recallButton.setVisible(true);
      this.hero.setFrame(3);this.tweens.add({targets:this.hero,y:541,duration:80,yoyo:true});
      this.hintText.setText('看泡泡反弹！可加速或提前收球');
      const powered=this.armed;this.armed=false;if(powered)this.energy=0;this.drawEnergy();
      const generation=this.generation,volleyBalls=this.level.balls+this.extraBalls,nova=this.nova;this.extraBalls=0;this.nova=false;this.itemAim=false;this.pending=volleyBalls;
      for(let i=0;i<volleyBalls;i++)this.time.delayedCall(i*70,()=>{
        if(this.generation!==generation||this.state!=='shooting')return;
        this.pending--;const big=(powered||nova)&&i===0;
        const ball=this.balls.create(LAUNCH.x,LAUNCH.y,this.bubbleTexture()).setDepth(25).setScale(big?2:1);
        ball.body.setCircle(4);ball.setCollideWorldBounds(true).setBounce(1).setVelocity(Math.cos(this.angle)*SPEED,Math.sin(this.angle)*SPEED);
        ball.setAccelerationX(this.level.wind||0).setMaxVelocity(500,500);
        ball.setData({damage:big?(nova?6:4):1,hits:new Map(),big});if(big)ball.setTint(0xffd779);
        window.CandyAudio.play(big?'big':'shoot',i);
      });
      this.time.delayedCall(220,()=>{if(this.generation===generation&&this.hero.active)this.hero.setFrame(0);});
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
      if(node.monster){this.energy=Math.min(100,this.energy+5);this.drawEnergy();}
      node.label?.setText(String(Math.max(0,node.hp))+(node.armor?'◇':''));
      this.comboText.setText(this.combo>=3?`${this.combo} 连击!`:'');
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
      this.tweens.killTweensOf(node.sprite);node.sprite.disableBody(true,true);node.label?.destroy();this.nodes.delete(node.id);
      this.burst(x,y,node.kind==='p'?0xf6ca7c:node.kind==='r'?0xa8d7da:0xa9d7a2,node.kind==='K'?32:12);
      window.CandyAudio.play(node.kind==='p'?'explode':node.kind==='r'?'rainbow':'pop');
      if(node.kind==='p'){
        const ring=this.add.rectangle(x,y,8,8,0xffdc8b,.6).setDepth(32);
        this.tempObjects.add(ring);
        this.tweens.add({targets:ring,scaleX:18,scaleY:18,alpha:0,duration:270,onComplete:()=>{this.tempObjects.delete(ring);ring.destroy();}});
        const nearby=[...this.nodes.values()].filter(n=>!n.dead&&Phaser.Math.Distance.Between(x,y,n.sprite.x,n.sprite.y)<83);
        for(const n of nearby)this.damage(n,4);
        this.hintText.setText(this.world.bomb+'连锁！邻近目标受到 4 点伤害');
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
    action(){
      if(this.state!=='shooting')return;
      this.fast=!this.fast;this.physics.world.timeScale=this.fast?.5:1;this.time.timeScale=this.fast?2:1;
      this.actionButton.label.setText(this.fast?'加速 ×2':'加速 ×1');
    }
    recall(){
      if(this.state!=='shooting')return;
      this.recalled++;this.pending=0;this.time.removeAllEvents();this.balls.clear(true,true);this.endVolley();
    }
    endVolley(){
      if(this.state!=='shooting')return;
      this.state='advancing';this.physics.world.timeScale=1;this.time.timeScale=1;this.fast=false;this.actionButton.label.setText('加速 ×1');this.recallButton.setVisible(false);this.hero.setFrame(0);this.comboText.setText('');
      if(this.remaining()===0&&this.wave>=this.level.waves.length){this.win();return;}
      if(this.guard>0){this.guard--;this.turn++;this.state='ready';this.refreshHUD();this.hintText.setText('缓冲护盾抵消了本次推进');return;}
      let danger=false;
      for(const node of this.nodes.values()){
        node.sprite.y+=37;node.sprite.clearTint();this.tweens.killTweensOf(node.sprite);node.sprite.setScale(node.baseScale);
        // refreshBody resets the custom collision size, so restore it each advance.
        const bw=node.kind==='K'?72:node.kind==='p'?27:node.kind==='r'?22:33,bh=node.kind==='K'?46:node.kind==='r'?22:23;
        this.fitTarget(node.sprite,bw,bh);
        if(node.label)node.label.y=node.sprite.y+5;
        if(node.monster&&node.sprite.y+bh/2>=493)danger=true;
        if(!node.monster&&node.sprite.y>478){node.dead=true;node.sprite.disableBody(true,true);this.nodes.delete(node.id);}
      }
      if(danger){this.lose();return;}
      this.spawnWave();this.turn++;this.refreshHUD();this.state='ready';this.hintText.setText(this.wave>=this.level.waves.length?'最后一波已到齐，清掉剩下的敌人！':'敌人前进了，重新找一个好角度');
    }
    win(){
      if(this.rewardClaimed)return;this.rewardClaimed=true;this.state='won';this.hero.setFrame(4);this.friend.setAlpha(1);this.burst(245,552,0xffdb86,25);
      const target=this.level.starTarget||6,stars=this.turn<=target&&this.recalled===0?3:this.turn<=target+4?2:1;
      this.reward=this.isHidden?Economy.winHidden(save,this.level.id):Economy.win(save,this.index,stars,{combo:this.bestCombo});persist();
      window.CandyAudio.play('win');window.CandyAudio.voice('win');
      const amount=this.reward.amount||0,loot=this.reward.rewards||[];
      this.modal(this.isHidden?'秘境挑战完成！':'小星星，回家啦！',`${'★'.repeat(stars)}${'☆'.repeat(3-stars)} · ${this.shotsFired} 次发射\n基础 +${amount} 星糖 · 余额 ${save.candy}\n${loot.length?loot[0]:'物品和奖励已自动保存'}\n三星目标：${target} 次内完成，且不提前收球`,this.isHidden||this.level.local===29?'返回主题地图':'前往下一关',()=>{this.clearModal();this.isHidden||this.level.local===29?this.showChapter(this.world.id):this.startLevel(this.index+1);},{label:'查看仓库与任务',action:()=>this.showInventory(this.world.id)});
    }
    lose(){
      this.state='lost';this.hero.setFrame(5);window.CandyAudio.play('lose');window.CandyAudio.voice('lose');
      this.modal('这次先撤退！',`阿噗：再试一次，我陪你！\n敌人越过了安全线。\n试试沿墙反弹，优先引爆连锁机关。\n本关最高连击：${this.bestCombo}`, '再试一次',()=>this.startLevel(this.isHidden?this.level:this.index),{label:'返回地图',action:()=>this.showLevels()});
    }
    setPausedByUI(paused){
      paused=Boolean(paused||this.inventoryOpen);this.uiPaused=paused;window.CandyAudio.pause(paused);
      if(this.state==='aiming'){this.state='ready';this.aim.clear();this.hero?.setFrame(0);}
      if(paused){this.physics.world.pause();this.time.paused=true;this.tweens.pauseAll();}
      else{this.physics.world.resume();this.time.paused=false;this.tweens.resumeAll();}
    }
    update(_time,delta){
      if(this.uiPaused)return;
      this.gameClock+=delta*this.time.timeScale;
      if(['ready','aiming','shooting'].includes(this.state)){for(const wall of this.obstacles){if(!wall.active)continue;const spec=wall.getData('spec');if(spec.kind==='moving'){wall.x=spec.x+Math.sin(this.gameClock/1200)*55;this.fitTarget(wall,spec.width,spec.height);}if(spec.kind==='phase')wall.setAlpha(Math.floor(this.gameClock/1200)%2===0?1:.28);}}
      if(this.state==='shooting'){
        this.volleyAge+=delta*(this.fast?2:1);
        for(const ball of [...this.balls.getChildren()]){
          if(this.portalSprites.length===2&&this.gameClock-(ball.getData('portalAt')||-1000)>650){const index=this.portalSprites.findIndex(p=>Phaser.Math.Distance.Between(ball.x,ball.y,p.x,p.y)<18);if(index>=0){const dest=this.portalSprites[1-index];ball.setPosition(dest.x+Math.sign(ball.body.velocity.x||1)*20,dest.y+Math.sign(ball.body.velocity.y||1)*22);ball.setData('portalAt',this.gameClock);}}
          if(ball.y>LAUNCH.y+4&&ball.body.velocity.y>0){this.burst(ball.x,LAUNCH.y,0xc9e4b6,2);ball.destroy();}
          else if(this.rainbowUntil<=this.gameClock&&!ball.getData('big'))ball.clearTint();
        }
        if(this.pending===0&&this.balls.countActive()===0)this.endVolley();
        else if(this.volleyAge>18000)this.hintText.setText('还在反弹？可以加速，或收球开始下一轮');
        // A hard upper bound protects against pathological repeated ricochets.
        if(this.volleyAge>30000)this.recall();
      }
      if(this.hero?.active&&this.state==='ready'){
        if(Math.floor(this.gameClock/3500)%2===0&&this.gameClock%3500<100)this.hero.setFrame(1);else this.hero.setFrame(0);
      }
    }
  }
  const config={type:Phaser.CANVAS,width:W,height:H,parent:'game',backgroundColor:'#c9e4d7',pixelArt:true,roundPixels:true,antialias:false,
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
    physics:{default:'arcade',arcade:{gravity:{x:0,y:0},fps:120,fixedStep:true,debug:false}},
    scene:[Adventure],audio:{noAudio:true},banner:false};
  window.candyGame=new Phaser.Game(config);
})();
