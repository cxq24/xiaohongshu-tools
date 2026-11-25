/* Isolated, interactive landscape recording layout. Never loaded by a release ZIP. */
(() => {
  'use strict';
  const W=1152,H=648,LEFT=40,RIGHT=W-40,CENTER=W/2;
  const x=v=>LEFT+(v-20)*(RIGHT-LEFT)/320;
  const wait=()=>{
    const game=window.candyGame,s=game?.scene.getScene('Adventure');
    if(!s||s.state!=='title'){setTimeout(wait,40);return;}
    const old={start:s.startLevel,addTarget:s.addTarget,obstacle:s.addObstacle,bubble:s.createBubble,down:s.pointerDown,move:s.pointerMove,up:s.pointerUp,modal:s.modal};
    // Render directly at delivery resolution, with a fixed uniform game-camera scale.
    // Text uses its native high-resolution textures; no enlarged video frames.
    game.scale.setGameSize(1920,1080);game.renderer.resize(1920,1080);
    s.cameras.main.setViewport(0,0,1920,1080).setZoom(1920/W).centerOn(W/2,H/2);
    s.physics.world.setBounds(LEFT,106,RIGHT-LEFT,454,true,true,true,false);
    s.background.destroy();
    const scenery=s.add.container(0,0).setDepth(-100);
    scenery.setTexture=function(key){
      this.removeAll(true);
      const g=s.add.graphics();this.add(g);
      g.fillStyle(0xc9e4d7).fillRect(0,0,W,H);
      // A continuous landscape drawn by the running game's renderer.
      g.fillStyle(0xb7d2b5).fillPoints([{x:0,y:355},{x:110,y:242},{x:195,y:325},{x:345,y:205},{x:500,y:347},{x:670,y:225},{x:805,y:352},{x:955,y:236},{x:1152,y:350},{x:1152,y:580},{x:0,y:580}],true);
      g.fillStyle(0x9dc1a1).fillPoints([{x:0,y:400},{x:160,y:310},{x:300,y:405},{x:460,y:290},{x:620,y:398},{x:790,y:310},{x:970,y:400},{x:1152,y:285},{x:1152,y:590},{x:0,y:590}],true);
      for(const [a,b,color] of [[-15,195,0x89b38e],[88,245,0x9ec6a1],[1055,220,0x89b38e],[1140,170,0x9ec6a1]]){
        g.fillStyle(0x9d9b6e).fillRect(a+38,b+65,13,360);
        g.fillStyle(color).fillRect(a+12,b,64,105).fillRect(a-2,b+22,93,60).fillRect(a+25,b-15,38,138);
        g.fillStyle(0xc9dab1,.7).fillRect(a+12,b+10,18,24);
      }
      const cover=key.startsWith('w')?key.replace('-arena','-cover'):'cover',texture=s.textures.get(cover);
      if(texture?.source?.[0]){
        if(!texture.has('landscape-castle'))texture.add('landscape-castle',0,128,208,112,152);
        this.add(s.add.image(CENTER,365,cover,'landscape-castle').setScale(1.45).setAlpha(.32));
      }
      const field=s.add.graphics();this.add(field);
      field.fillStyle(0xf0f0d0,key==='cover'?.30:.72).fillRect(0,106,W,446);
      field.fillStyle(0x8cc99d).fillRect(0,552,W,H-552);
      field.fillStyle(0x79b58c).fillRect(0,556,W,7);
      for(let a=0;a<W;a+=40)field.fillStyle(0xd5e6c8).fillRect(a+8,569,19,9);
      field.fillStyle(0xc6a16e).fillRect(0,586,W,H-586);
      return this;
    };
    s.background=scenery.setTexture('forest');
    const txt=(a,b,value,size=18,color='#fff0ce',align='left')=>s.add.text(a,b,value,{fontFamily:'system-ui,-apple-system,"PingFang SC",sans-serif',fontSize:size+'px',fontStyle:'normal',color,align,resolution:4}).setOrigin(align==='center'?.5:align==='right'?1:0,0);
    const box=(a,b,w,h,fill=0x253449,edge=0x8da87e)=>s.add.graphics().fillStyle(edge).fillRect(a,b,w,h).fillStyle(fill).fillRect(a+2,b+2,w-4,h-4);
    const button=(a,b,w,label,action)=>{
      const face=s.add.rectangle(a,b,w,44,0xe9bf76).setStrokeStyle(3,0x253449).setInteractive();
      const labelText=txt(a,b-12,label,19,'#365b49','center');
      face.on('pointerup',()=>{CandyAudio.unlock();action();});
      return [face,labelText];
    };
    s.showTitle=function(){
      this.clearScreen();this.state='title';this.background.setTexture('cover');
      this.keep(box(26,25,W-52,100),txt(CENTER,35,'APU’S CANDY QUEST',16,'#c5d8ad','center'),txt(CENTER,66,'阿噗的糖果弹弹冒险',32,'#ffe5a1','center'));
      this.keep(txt(CENTER,145,'把小星星，从十个像素世界带回家。',21,'#436e58','center'));
      const hero=this.keep(this.add.sprite(CENTER,304,this.dragonTexture(),0).setScale(5));
      this.tweens.add({targets:hero,y:297,duration:1200,yoyo:true,repeat:-1});
      this.keep(this.add.image(CENTER-200,346,'jelly').setScale(2.5),this.add.image(CENTER+200,346,'berry').setScale(2.5),this.add.image(CENTER+130,235,'star').setScale(2));
      this.keep(txt(CENTER,395,'瞄准反弹  /  爆米花连锁  /  小龙大招',18,'#426d56','center'));
      this.keep(...button(CENTER,458,430,'开始冒险',()=>this.startLevel(0)));
      this.keep(...button(CENTER-145,523,265,'选择关卡',()=>this.showLevels()),...button(CENTER+145,523,265,'营地',()=>this.showWorkshop()));
      this.keep(txt(CENTER,585,'拖动瞄准，松手发射',18,'#426d56','center'));
    };
    s.addTarget=function(token,col,y,options){
      // Keep snapshot coordinates in world space; normal spawns use the seven-column grid.
      return old.addTarget.call(this,token,options?.exact?col:(x(48+col*44)-48)/44,y,options);
    };
    s.createBubble=function(a,b,...rest){return old.bubble.call(this,a===180&&b===540?CENTER:a,b,...rest);};
    s.addObstacle=function(spec){return old.obstacle.call(this,spec.landscape?spec:{...spec,x:x(spec.x),landscape:true});};
    s.setAngle=function(pointer){this.angle=Phaser.Math.Clamp(Math.atan2(Math.min(-22,pointer.y-540),pointer.x-CENTER),-Math.PI+.18,-.18);};
    s.pointerDown=function(pointer){
      if(this.state==='shooting'&&!this.uiPaused&&pointer.y>=110&&pointer.y<=562&&pointer.x>=LEFT&&pointer.x<=RIGHT){
        this.releaseFast();this.fastPointer=pointer.id;this.fastTimer=setTimeout(()=>{if(this.fastPointer===pointer.id)this.setFast(true);},220);return;
      }
      if(this.uiPaused||this.state!=='ready'||pointer.y<110||pointer.y>562||pointer.x<LEFT||pointer.x>RIGHT)return;
      this.state='aiming';this.hero.setFrame(2);this.setAngle(pointer);this.drawAim();this.aimStart={x:pointer.x,y:pointer.y};
    };
    const worldPointer=pointer=>({x:pointer.x*W/1920,y:pointer.y*H/1080,id:pointer.id});
    s.input.off('pointerdown',old.down,s);s.input.off('pointermove',old.move,s);s.input.off('pointerup',old.up,s);
    s.input.on('pointerdown',pointer=>s.pointerDown(worldPointer(pointer)));
    s.input.on('pointermove',pointer=>old.move.call(s,worldPointer(pointer)));
    s.input.on('pointerup',pointer=>old.up.call(s,worldPointer(pointer)));
    s.drawAim=function(){
      this.aim.clear();if(!['ready','aiming'].includes(this.state))return;
      let a=CENTER,b=540,dx=Math.cos(this.angle),dy=Math.sin(this.angle),bounce=0;
      for(let i=0;i<260+(this.itemAim||0)*80;i++){
        a+=dx*5;b+=dy*5;
        if(a<LEFT+5||a>RIGHT-5){dx=-dx;a=Phaser.Math.Clamp(a,LEFT+5,RIGHT-5);bounce++;}
        if(b<111){dy=-dy;b=111;bounce++;}if(b>540||bounce>3)break;
        if(i%3===0)this.aim.fillStyle(this.armed?0xd09c4c:0x4d8b74,Math.max(.12,.8-i/320)).fillRect(Math.round(a)-1,Math.round(b)-1,3,3);
        const target=[...this.nodes.values()].find(n=>!n.dead&&Math.abs(a-n.sprite.x)<n.sprite.body.width/2+3&&Math.abs(b-n.sprite.y)<n.sprite.body.height/2+3);
        if(target){this.aim.lineStyle(2,0xd7ae67,.85).strokeRect(target.sprite.x-target.sprite.body.width/2-3,target.sprite.y-target.sprite.body.height/2-3,target.sprite.body.width+6,target.sprite.body.height+6);break;}
      }
    };
    s.drawBossHUD=function(){
      if(!this.bossBar?.active)return;this.bossBar.clear();const boss=[...this.nodes.values()].find(n=>n.kind==='K'&&!n.dead);
      if(!boss){this.bossStatus.setText('');return;}
      this.bossStatus.setText(`重型首领  ${Math.max(0,boss.hp)} / ${boss.maxHp}`);
      this.bossBar.fillStyle(0x684c55).fillRect(22,47,W-44,3).fillStyle(0xf4bc69).fillRect(22,47,Math.ceil((W-44)*Math.max(0,boss.hp)/boss.maxHp),3);
    };
    s.modal=function(title,detail,label,action,secondary){
      this.aim.clear();
      const shade=this.add.rectangle(CENTER,H/2,W,H,0x183e35,.6).setDepth(70).setInteractive();
      const panel=box(CENTER-330,155,660,345,0xfff0c9,0x668667).setDepth(71);
      this.modals.push(shade,panel,txt(CENTER,183,title,28,'#365f4d','center').setDepth(72),txt(CENTER,250,detail,21,'#63795b','center').setDepth(72));
      this.modals.push(...button(CENTER,380,430,label,action).map(o=>o.setDepth(73)));
      if(secondary)this.modals.push(...button(CENTER,449,430,secondary.label,secondary.action).map(o=>o.setDepth(73)));
    };
    s.startLevel=function(level){
      old.start.call(this,level);
      for(const portal of this.portalSprites)portal.x=x(portal.x);
      const items=this.screenItems;
      items[0].clear().fillStyle(0x91ac80).fillRect(16,10,W-32,43).fillStyle(0x253449).fillRect(18,12,W-36,39);
      items[1].setFontSize(20).setPosition(28,16);
      items[4].setPosition(CENTER-13,514);this.damageLabel.setPosition(CENTER+8,508).setFontSize(14);
      items[6].clear().fillStyle(0x8da87e).fillRect(16,61,W-32,44).fillStyle(0xf5edc9).fillRect(18,63,W-36,40);
      this.turnLabel.setPosition(30,66).setFontSize(16);this.goalLabel.setPosition(W-30,66).setFontSize(16);
      this.waveLabel.setPosition(30,85).setFontSize(14);items[10].setPosition(W-30,85).setFontSize(14);
      items[11].clear().lineStyle(1,0xc88972,.8);for(let a=LEFT;a<RIGHT;a+=12)items[11].lineBetween(a,493,a+6,493);
      items[12].setPosition(LEFT,497).setFontSize(12);
      this.hero.setPosition(CENTER-94,536).setScale(2.5);this.turret.setPosition(CENTER,556).setScale(1.8);this.friend.setPosition(CENTER+110,552).setScale(1.8);
      this.comboText.setPosition(CENTER,457).setFontSize(22);
      this.hintText.setPosition(W-30,536).setOrigin(1,0).setFontSize(14).setAlign('right').setWordWrapWidth(340);
      this.refreshHUD();
    };
    s.showTitle();
    window.LandscapeDemo={ready:true,width:W,height:H,recordingOnly:true,productionCodeModified:false,scene:s};
  };
  wait();
})();
