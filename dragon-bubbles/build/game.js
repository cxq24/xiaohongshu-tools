/* Original game logic. Phaser 3.90.0 supplies rendering, input and Arcade Physics. */
(() => {
  'use strict';
  const W=360,H=640,LAUNCH={x:180,y:540},SPEED=410,ENERGY_MAX=100;
  const COLORS={ink:0x244e49,cream:0xffefc2,green:0x477d60,light:0xb8d39e,gold:0xf0c77c};
  const FONT='system-ui, -apple-system, sans-serif';
  const levels=window.CANDY_LEVELS;
  let audioContext=null, soundEnabled=false;
  window.CandyAudio={toggle(){soundEnabled=!soundEnabled;if(soundEnabled){try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();}catch(_){soundEnabled=false;}}return soundEnabled;}};
  function tone(freq=500,duration=.06,type='square',volume=.018){
    if(!soundEnabled||!audioContext)return;
    const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*.65,t+duration);
    gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+duration);
  }
  let save={unlocked:0,current:0,stars:{}};
  try{const s=JSON.parse(localStorage.getItem('apu-candy-v1'));if(s){save.unlocked=Phaser.Math.Clamp(Number.isInteger(s.unlocked)?s.unlocked:0,0,5);save.current=Phaser.Math.Clamp(Number.isInteger(s.current)?s.current:0,0,save.unlocked);if(s.stars&&typeof s.stars==='object')for(let i=0;i<6;i++)if([1,2,3].includes(s.stars[i]))save.stars[i]=s.stars[i];}}catch(_){}
  function persist(){try{localStorage.setItem('apu-candy-v1',JSON.stringify(save));}catch(_){}}
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
    container.on('pointerdown',()=>{container.setScale(.97);});
    container.on('pointerout',()=>container.setScale(1));
    container.on('pointerup',()=>{container.setScale(1);callback();});
    container.label=labelText;return container;
  }
  class Adventure extends Phaser.Scene{
    constructor(){super('Adventure');}
    preload(){
      this.load.image('forest','assets/forest.png');this.load.image('cover','assets/cover.png');
      this.load.spritesheet('dragon','assets/dragon.png',{frameWidth:32,frameHeight:32});
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
    keep(...items){this.screenItems.push(...items);return items[0];}
    clearScreen(){
      this.generation++;this.time.removeAllEvents();this.tweens.killAll();this.aim.clear();this.fx.clear();
      this.balls.clear(true,true);this.targets.clear(true,true);
      this.tempObjects.forEach(o=>o.destroy());this.tempObjects.clear();
      for(const n of this.nodes.values())n.label?.destroy();this.nodes.clear();
      this.screenItems.forEach(o=>o?.destroy());this.screenItems=[];this.clearModal();
      this.physics.world.timeScale=1;this.time.timeScale=1;this.fast=false;this.input.enabled=true;
    }
    clearModal(){this.modals.forEach(o=>o?.destroy());this.modals=[];}
    showTitle(){
      this.clearScreen();this.background.setTexture('cover');this.state='title';
      this.keep(panel(this,26,37,308,69,COLORS.ink,0xc2d29d),text(this,180,51,'APU’S CANDY QUEST',11,'#bcd6aa','center'),text(this,180,72,'阿噗的糖果弹弹冒险',23,'#ffe5a1','center'));
      this.keep(text(this,180,135,'把小星星，从果冻森林救回来。',13,'#436e58','center'));
      const dragon=this.keep(this.add.sprite(180,326,'dragon',0).setScale(5));
      this.tweens.add({targets:dragon,y:319,duration:1200,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.keep(this.add.image(66,392,'jelly').setScale(2),this.add.image(299,389,'berry').setScale(2),this.add.image(270,209,'star').setScale(2));
      for(const [x,y,s] of [[88,234,1.3],[284,283,1.5],[91,306,.9]]){const bubble=this.keep(this.add.image(x,y,'bubble').setScale(s));this.tweens.add({targets:bubble,y:y-10,duration:900+x,yoyo:true,repeat:-1});}
      this.keep(text(this,180,423,'瞄准反弹  /  爆米花连锁  /  小龙大招',11,'#426d56','center'));
      this.keep(button(this,180,482,240,save.current>0?`继续冒险 · 第 ${save.current+1} 关`:'开始冒险  →',()=>this.startLevel(save.current),'gold'));
      this.keep(button(this,180,536,240,'选择关卡',()=>this.showLevels()));
      this.keep(text(this,180,588,'原创像素角色 · 6 个手工关卡',11,'#3b6450','center'));
    }
    showLevels(){
      this.clearScreen();this.background.setTexture('cover');this.state='levels';this.keep(panel(this,24,38,312,58),text(this,180,55,'糖果森林地图',24,'#ffe5a1','center'));
      for(let i=0;i<levels.length;i++){
        const unlocked=i<=save.unlocked,y=145+i*66;
        this.keep(button(this,180,y,298,`${String(i+1).padStart(2,'0')}  ${levels[i].name}   ${save.stars[i]?'★'.repeat(save.stars[i]):unlocked?'→':'未解锁'}`,()=>{if(unlocked)this.startLevel(i);},unlocked?'gold':'green'));
      }
      this.keep(button(this,180,584,180,'返回首页',()=>this.showTitle()));
    }
    startLevel(index){
      this.clearScreen();this.background.setTexture('forest');this.index=index;this.level=levels[index];save.current=index;persist();
      this.gameClock=0;this.state='intro';this.turn=1;this.wave=0;this.energy=0;this.armed=false;this.combo=0;this.bestCombo=0;this.pending=0;this.rainbowUntil=0;this.hitCount=0;this.recalled=0;this.angle=-Math.PI/2;this.nextId=0;this.volleyAge=0;this.bossSplit=false;
      this.keep(panel(this,10,10,340,43),text(this,22,18,`0${index+1} / ${this.level.name}`,16));
      this.homeButton=this.keep(button(this,316,31,48,'地图',()=>this.showLevels()));this.homeButton.setScale(.75);
      this.keep(panel(this,10,61,340,35,0xf5edc9,0x8da87e));
      this.turnLabel=this.keep(text(this,23,70,'',11,'#42654b'));
      this.goalLabel=this.keep(text(this,337,70,'',11,'#42654b'));this.goalLabel.setOrigin(1,0);
      this.keep(text(this,30,104,'糖果森林 / CANDY WOODS',8,'#69966f'));
      const danger=this.keep(this.add.graphics());danger.lineStyle(1,0xc88972,.8);for(let x=25;x<337;x+=9)danger.lineBetween(x,493,x+4,493);
      this.keep(text(this,30,496,'守住这条线',8,'#af7b60'));
      this.hero=this.keep(this.add.sprite(180,536,'dragon',0).setScale(2));
      this.friend=this.keep(this.add.image(306,552,'star').setScale(1.5).setAlpha(.45));
      this.energyLabel=this.keep(text(this,28,540,'阿噗的能量',9,'#42634c'));
      this.energyGraphic=this.keep(this.add.graphics());
      this.comboText=this.keep(text(this,180,457,'',18,'#4a8062','center').setDepth(35));
      this.hintText=this.keep(text(this,180,583,'',10,'#395f4d','center'));
      this.retryButton=this.keep(button(this,62,615,95,'重试本关',()=>this.startLevel(this.index)));
      this.skillButton=this.keep(button(this,180,615,125,'大泡泡 0%',()=>this.toggleSkill(),'gold'));
      this.actionButton=this.keep(button(this,298,615,95,'加速 ×1',()=>this.action()));
      this.recallButton=this.keep(button(this,298,574,74,'收球',()=>this.recall()));this.recallButton.setScale(.72).setVisible(false);
      for(let i=0;i<this.level.initial;i++)this.spawnWave(140+i*37);
      this.refreshHUD();this.drawEnergy();
      this.modal('阿噗，出发！',this.level.subtitle+'\n\n按住战斗区域瞄准，松手发射。\n清掉全部果冻，救出小星星。', '开始这一关',()=>{this.clearModal();this.state='ready';this.hintText.setText('按住瞄准，松手吐出泡泡');});
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
      const kind=token[0],hp=Number(token.slice(1)),texture={j:'jelly',b:'berry',p:'popcorn',r:'rainbow',K:'boss'}[kind];
      const sprite=this.targets.create(48+col*44,y,texture);
      sprite.setScale(kind==='K'?2.5:kind==='p'?1.4:kind==='r'?1.4:1.2).refreshBody();
      const bw=kind==='K'?72:kind==='p'?27:kind==='r'?22:33,bh=kind==='K'?46:kind==='r'?22:23;
      this.fitTarget(sprite,bw,bh);
      const node={id:++this.nextId,kind,hp,maxHp:hp,sprite,baseScale:sprite.scaleX,monster:['j','b','K'].includes(kind),dead:false};
      sprite.setData('node',node);sprite.setDepth(10);
      if(node.monster)node.label=text(this,sprite.x,sprite.y+5,String(hp),kind==='K'?15:11,'#254d43','center').setDepth(12);
      this.nodes.set(node.id,node);return node;
    }
    fitTarget(sprite,bw,bh){
      sprite.body.setOffset(0,0);sprite.refreshBody();sprite.body.setSize(bw,bh);
      sprite.body.setOffset((sprite.displayWidth-bw)/2,(sprite.displayHeight-bh)/2);
    }
    remaining(){return [...this.nodes.values()].filter(n=>n.monster&&!n.dead).length;}
    refreshHUD(){
      this.turnLabel?.setText(`第 ${this.turn} 轮 · 泡泡 ×${this.level.balls}`);
      const future=this.level.waves.slice(this.wave).flat().filter(t=>t!=='.'&&['j','b','K'].includes(t[0])).length;
      this.goalLabel?.setText(`果冻 ${this.remaining()+future} · 波次 ${this.wave}/${this.level.waves.length}`);
    }
    drawEnergy(){
      this.energyGraphic.clear();this.energyGraphic.fillStyle(0x7a9b74).fillRect(28,556,80,9);this.energyGraphic.fillStyle(0xf2d38e).fillRect(30,558,Math.round(this.energy/100*76),5);
      this.skillButton.label.setText(this.armed?'大泡泡 已就绪':this.energy>=100?'释放大泡泡':`大泡泡 ${this.energy}%`);
      this.skillButton.setAlpha(this.energy>=100||this.armed?1:.68);
    }
    toggleSkill(){
      if(this.state!=='ready')return;
      if(this.energy<100&&!this.armed){this.hintText.setText('命中果冻积能，满能量后可释放大泡泡');return;}
      this.armed=!this.armed;this.drawEnergy();this.hintText.setText(this.armed?'下一轮首颗泡泡变大，伤害 ×4！':'已取消，继续普通发射');this.drawAim();
    }
    pointerDown(pointer){
      if(this.uiPaused||this.state!=='ready'||pointer.y<110||pointer.y>562||pointer.x<20||pointer.x>340)return;
      this.state='aiming';this.hero.setFrame(2);this.setAngle(pointer);this.drawAim();
    }
    pointerMove(pointer){if(this.state==='aiming'&&!this.uiPaused){this.setAngle(pointer);this.drawAim();}}
    pointerUp(pointer){if(this.state!=='aiming'||this.uiPaused)return;if(pointer.y>575){this.state='ready';this.hero.setFrame(0);this.aim.clear();return;}this.setAngle(pointer);this.fire();}
    setAngle(pointer){this.angle=Phaser.Math.Clamp(Math.atan2(Math.min(-22,pointer.y-LAUNCH.y),pointer.x-LAUNCH.x),-Math.PI+.18,-.18);}
    drawAim(){
      this.aim.clear();if(!['ready','aiming'].includes(this.state))return;
      let x=LAUNCH.x,y=LAUNCH.y,dx=Math.cos(this.angle),dy=Math.sin(this.angle),bounce=0;
      for(let i=0;i<90;i++){
        x+=dx*5;y+=dy*5;
        if(x<25||x>335){dx=-dx;x=Phaser.Math.Clamp(x,25,335);bounce++;}
        if(y<111){dy=-dy;y=111;bounce++;}
        if(y>LAUNCH.y||bounce>2)break;
        if(i%3===0)this.aim.fillStyle(this.armed?0xd09c4c:0x4d8b74,Math.max(.1,.8-i/120)).fillRect(Math.round(x)-1,Math.round(y)-1,3,3);
        const target=[...this.nodes.values()].find(n=>!n.dead&&Math.abs(x-n.sprite.x)<n.sprite.body.width/2+3&&Math.abs(y-n.sprite.y)<n.sprite.body.height/2+3);
        if(target){this.aim.lineStyle(2,0xd7ae67,.85).strokeRect(target.sprite.x-target.sprite.body.width/2-3,target.sprite.y-target.sprite.body.height/2-3,target.sprite.body.width+6,target.sprite.body.height+6);break;}
      }
    }
    fire(){
      if(!['ready','aiming'].includes(this.state)||this.uiPaused)return;
      this.state='shooting';this.aim.clear();this.combo=0;this.volleyAge=0;this.fast=false;this.rainbowUntil=0;
      this.actionButton.label.setText('加速 ×1');this.recallButton.setVisible(true);
      this.hero.setFrame(3);this.tweens.add({targets:this.hero,y:541,duration:80,yoyo:true});
      this.hintText.setText('看泡泡反弹！可加速或提前收球');
      const powered=this.armed;this.armed=false;if(powered)this.energy=0;this.drawEnergy();
      const generation=this.generation;this.pending=this.level.balls;
      for(let i=0;i<this.level.balls;i++)this.time.delayedCall(i*70,()=>{
        if(this.generation!==generation||this.state!=='shooting')return;
        this.pending--;const big=powered&&i===0;
        const ball=this.balls.create(LAUNCH.x,LAUNCH.y,'bubble').setDepth(25).setScale(big?2:1);
        ball.body.setCircle(4);ball.setCollideWorldBounds(true).setBounce(1).setVelocity(Math.cos(this.angle)*SPEED,Math.sin(this.angle)*SPEED);
        ball.setData({damage:big?4:1,hits:new Map(),big});if(big)ball.setTint(0xffd779);
        tone(540+i*18,.045,'triangle',.012);
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
      node.hp-=amount;this.hitCount++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
      if(node.monster){this.energy=Math.min(100,this.energy+5);this.drawEnergy();}
      node.label?.setText(String(Math.max(0,node.hp)));
      this.comboText.setText(this.combo>=3?`${this.combo} 连击!`:'');
      tone(320+Math.min(900,this.combo*19),.045,'triangle');
      if(node.hp<=0){this.destroyTarget(node);return;}
      node.sprite.setTintFill(0xfff6c9);
      this.tweens.killTweensOf(node.sprite);node.sprite.setScale(node.baseScale);
      this.tweens.add({targets:node.sprite,scaleX:node.baseScale*1.08,scaleY:node.baseScale*.86,duration:60,yoyo:true});
      this.time.delayedCall(65,()=>{if(node.sprite.active&&!node.dead)node.sprite.clearTint();});
      this.burst(node.sprite.x,node.sprite.y,0xffedb2,3);
    }
    destroyTarget(node){
      if(node.dead)return;node.dead=true;
      const x=node.sprite.x,y=node.sprite.y;
      this.tweens.killTweensOf(node.sprite);node.sprite.disableBody(true,true);node.label?.destroy();this.nodes.delete(node.id);
      this.burst(x,y,node.kind==='p'?0xf6ca7c:node.kind==='r'?0xa8d7da:0xa9d7a2,node.kind==='K'?32:12);
      tone(node.kind==='p'?130:680,.1,node.kind==='p'?'sawtooth':'triangle');
      if(node.kind==='p'){
        const ring=this.add.rectangle(x,y,8,8,0xffdc8b,.6).setDepth(32);
        this.tempObjects.add(ring);
        this.tweens.add({targets:ring,scaleX:18,scaleY:18,alpha:0,duration:270,onComplete:()=>{this.tempObjects.delete(ring);ring.destroy();}});
        const nearby=[...this.nodes.values()].filter(n=>!n.dead&&Phaser.Math.Distance.Between(x,y,n.sprite.x,n.sprite.y)<83);
        for(const n of nearby)this.damage(n,4);
        this.hintText.setText('爆米花连锁！周围目标受到 4 点伤害');
      }else if(node.kind==='r'){
        this.rainbowUntil=this.gameClock+3000;this.balls.getChildren().forEach(b=>b.setTint(0xf3b7df));this.hintText.setText('彩虹穿透！持续 3 秒');
      }else if(node.kind==='K'&&!this.bossSplit){
        this.bossSplit=true;this.hintText.setText('果冻王散成两只小果冻！');
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
      this.spawnWave();this.turn++;this.refreshHUD();this.state='ready';this.hintText.setText(this.wave>=this.level.waves.length?'最后一波已到齐，清掉剩下的果冻！':'果冻前进了，重新找一个好角度');
    }
    win(){
      this.state='won';this.hero.setFrame(4);this.friend.setAlpha(1);this.burst(306,552,0xffdb86,25);
      const stars=this.turn<=5+this.index&&this.recalled===0?3:this.turn<=9+this.index?2:1;
      save.stars[this.index]=Math.max(stars,save.stars[this.index]||0);save.unlocked=Math.max(save.unlocked,Math.min(5,this.index+1));persist();
      tone(880,.25,'triangle');
      this.modal(this.index===5?'小星星，回家啦！':'小星星获救了！',`${'★'.repeat(stars)}${'☆'.repeat(3-stars)}\n${this.turn} 轮完成 · 最高 ${this.bestCombo} 连击\n${this.index===5?'六关冒险已完成，可以回地图挑战更高星级。':'阿噗学会了新路线，继续深入糖果森林。'}`,this.index===5?'返回森林地图':'前往下一关',()=>{this.clearModal();this.index===5?this.showLevels():this.startLevel(this.index+1);},{label:'重玩这一关',action:()=>this.startLevel(this.index)});
    }
    lose(){
      this.state='lost';this.hero.setFrame(5);tone(140,.3,'triangle');
      this.modal('这次先撤退！',`果冻越过了安全线。\n试试沿墙反弹，优先打爆米花桶。\n本关最高连击：${this.bestCombo}`, '再试一次',()=>this.startLevel(this.index),{label:'返回地图',action:()=>this.showLevels()});
    }
    setPausedByUI(paused){
      this.uiPaused=paused;
      if(this.state==='aiming'){this.state='ready';this.aim.clear();this.hero?.setFrame(0);}
      if(paused){this.physics.world.pause();this.time.paused=true;this.tweens.pauseAll();}
      else{this.physics.world.resume();this.time.paused=false;this.tweens.resumeAll();}
    }
    update(_time,delta){
      if(this.uiPaused)return;
      this.gameClock+=delta*this.time.timeScale;
      if(this.state==='shooting'){
        this.volleyAge+=delta*(this.fast?2:1);
        for(const ball of this.balls.getChildren()){
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
