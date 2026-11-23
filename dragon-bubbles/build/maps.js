/* Native, scrollable pixel-world UI. Combat remains in the Phaser canvas. */
(()=>{
 const host=()=>document.getElementById('map-screen');
 const el=(tag,className='',text='')=>{const n=document.createElement(tag);n.className=className;n.textContent=text;return n;};
 const currency=value=>{const c=el('span','currency');c.title='星糖';c.setAttribute('aria-label',`${value} 星糖`);c.append(image('assets/icon-candy.png'),el('span','',String(value)));return c;};
 const glyph=id=>{if(id!=='retreat')return image(`assets/icon-${id}.png`);const n=el('span','atlas-icon');n.style.setProperty('--atlas-frame',6);n.setAttribute('aria-label','退步糖');return n;};
 const image=(src,alt='')=>{const n=el('img');n.src=src;n.alt=alt;return n;};
 function action(label,fn,className='map-action'){const b=el('button',className,label);b.type='button';b.onclick=()=>{window.CandyAudio.unlock();fn();};return b;}
 function wallet(h,save){h.querySelector('.map-heading').append(currency(save.candy));}
 function tabs(parent,entries,active,fn){const nav=el('nav','camp-tabs');nav.style.setProperty('--tab-count',Math.min(5,entries.length));for(const [id,name]of entries){const b=action('',()=>fn(id));b.setAttribute('aria-label',name);const icon={dragon:'dragon',bubble:'bubble',turret:'turret',power:'fire',gear:'gear',items:'bag',medals:'star'}[id];if(icon&&icon!=='star')b.append(glyph(icon));b.append(el('span','',({dragon:'角色',bubble:'泡泡',turret:'炮台',power:'火力',gear:'装备',items:'道具',medals:'收藏'})[id]||name));b.classList.toggle('active',id===active);nav.append(b);}parent.append(nav);}
 function asset(item){if(item.slot==='dragon')return {'dragon':'dragon','dragonBerry':'dragon-berry','dragonSky':'dragon-sky'}[item.texture]||item.texture;if(item.slot==='gear')return 'icon-gear';return {'bubble':'bubble','bubbleStar':'bubble-star','bubbleRainbow':'bubble-rainbow'}[item.texture]||item.texture;}
 function portrait(item,scale=2,className=''){
  const n=el('span','cosmetic-sprite '+className);n.setAttribute('role','img');n.setAttribute('aria-label',item.name);const size=item.frameSize||20,frames=item.frames||1;n.style.width=size*scale+'px';n.style.height=size*scale+'px';n.style.backgroundImage=`url(assets/${asset(item)}.png)`;n.style.backgroundSize=size*scale*frames+'px '+size*scale+'px';n.style.setProperty('--sheet-width',size*scale*frames+'px');n.style.setProperty('--frame-width',size*scale+'px');if(item.slot==='dragon')n.classList.add('portrait-blink');else if(frames>1){n.style.animation=`cosmetic-cycle 1s steps(${frames}) infinite`;}return n;
 }
 function shell(title,subtitle,back){const h=host();h.hidden=false;h.replaceChildren();const top=el('header','map-heading');top.append(action('‹',back,'map-back'),el('div','map-heading-text',title));h.append(top,el('p','map-subtitle',subtitle));const scroll=el('div','map-scroll');h.append(scroll);return {h,scroll};}
 function route(parent,positions,height){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 360 ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('map-route');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',positions.map(([x,y],i)=>i?`C ${positions[i-1][0]},${y-30} ${x},${y-30} ${x},${y}`:`M ${x},${y}`).join(' '));p.setAttribute('fill','none');p.setAttribute('stroke','#e9d7a5');p.setAttribute('stroke-width','8');p.setAttribute('stroke-dasharray','4 7');svg.append(p);parent.append(svg);}
 window.CandyMapView={hide(){if(host())host().hidden=true;},
 worlds({save,worlds,enter,back,unlock,camp,warehouse,codex}){
  const {h,scroll}=shell('阿噗的像素世界',`已完成 ${Object.keys(save.stars).length}/300 关`,back);
  h.querySelector('.map-back').setAttribute('aria-label','返回主菜单');wallet(h,save);scroll.classList.add('world-scroll');const landscape=el('div','world-landscape');landscape.style.height='1420px';scroll.append(landscape);
  const pts=worlds.map((w,i)=>[i%2?257:103,85+i*130]);route(landscape,pts,1420);
  worlds.forEach((w,i)=>{const open=save.worlds.includes(i),count=Object.keys(save.stars).filter(n=>+n>=i*30&&+n<i*30+30).length;
   const b=action('',()=>{
    if(open){enter(i);return;}
    const popup=el('div','map-popup'),card=el('section','map-popup-card');card.append(el('h2','',w.name),el('p','',`通完${worlds[i-1]?.name}的 30 关可免费开启。`),el('p','',`也可用 ${w.cost} 星糖提前开启，从本章第 1 关开始。`));
    card.append(action(`花 ${w.cost} 星糖提前开启`,()=>{const result=unlock(i);if(result.ok){popup.remove();window.CandyMapView.worlds({save,worlds,enter,back,unlock,camp,warehouse,codex});}else card.querySelector('.unlock-status').textContent=result.reason;}));
    card.append(el('p','unlock-status',''),action('继续按顺序冒险',()=>popup.remove()));popup.append(card);h.append(popup);
   },'world-island'+(open?'':' blocked'));
   b.style.left=(pts[i][0]/3.6)+'%';b.style.top=(pts[i][1]-35)+'px';b.setAttribute('aria-label',w.name+(open?'，已开放':'，未解锁'));
   b.append(image(`assets/w${i}-island.png`),el('strong','',`${String(i+1).padStart(2,'0')} ${w.name}`),el('span','',open?`${count}/30 关 · ${w.mechanic}`:'迷雾区域 · '+w.mechanic));landscape.append(b);
  });
  const bottom=el('nav','map-bottom');bottom.append(action('营地',camp),action('图鉴',codex));h.append(bottom);
 },
 chapter({save,world,levels,hidden,canEnter,play,back,secret,prepare,warehouse,codex,tasks}){
  const start=world.id*30,done=Object.keys(save.stars).filter(n=>+n>=start&&+n<start+30).length;
  const {h,scroll}=shell(world.name,`${done}/30 关完成 · 全局 ${start+1}—${start+30} 关`,back);h.querySelector('.map-back').setAttribute('aria-label','返回世界地图');
  scroll.style.backgroundImage=`linear-gradient(#fff0c96e,#fff0c93a),url(assets/w${world.id}-cover.png)`;
  const trail=el('div','chapter-trail');trail.style.height='2110px';scroll.append(trail);
  const xs=[72,178,284,216,108,62,164,274,242,132],pts=Array.from({length:30},(_,i)=>[xs[i%xs.length],65+i*66]);route(trail,pts,2110);
  let next=null;
  levels.slice(start,start+30).forEach((level,i)=>{
   const open=canEnter(start+i),stars=save.stars[start+i]||0;
   const b=action('',()=>{if(open)play(start+i);},'level-node'+(open?'':' locked')+(level.boss?' boss':level.elite?' elite':''));
   b.disabled=!open;b.style.left=pts[i][0]/3.6+'%';b.style.top=(pts[i][1]-24)+'px';b.dataset.level=start+i;
   b.setAttribute('aria-label',`第${i+1}关 ${level.name}${open?'':'，未解锁'}`);
   b.append(el('b','',level.boss?'♛':String(i+1)),el('span','node-stars',stars?'★'.repeat(stars):level.elite?'精英':''),el('span','node-name',level.name));trail.append(b);
   if(open&&!stars&&!next){next=b;b.classList.add('next');const avatar=image('assets/dragon.png','阿噗所在位置');avatar.className='route-avatar';b.append(avatar);}
  });
  hidden.filter(x=>x.world===world.id).forEach((level,i)=>{const eligible=Boolean(save.stars[level.trigger]),open=save.hiddenUnlocked.includes(level.id);const b=action('',()=>secret(level),'secret-node');b.disabled=!eligible&&!open;b.style.left='80%';b.style.top=((level.trigger-start)*66+90)+'px';b.append(el('b','','✦'),el('span','',open?'秘境已开启':eligible?'宣传视频秘境':'隐藏挑战'));trail.append(b);});
  const bottom=el('nav','map-bottom');bottom.append(action('战前准备',prepare),action('章节任务',tasks));h.append(bottom);
  if(next)requestAnimationFrame(()=>{scroll.scrollTop=Math.max(0,next.offsetTop-scroll.clientHeight/2);});
 },
 shop({save,items,buy,back,power,upgrade,warehouse,testPower,tab='dragon',message='',selected=null,priceTier=null}){
  const {h,scroll}=shell('阿噗的营地','试穿外观 · 星糖兑换 · 火力独立成长',back);wallet(h,save);
  const args={save,items,buy,back,power,upgrade,warehouse,testPower};
  h.querySelector('.map-back').setAttribute('aria-label','返回');if(warehouse){const bag=action('',()=>warehouse(tab),'camp-warehouse');bag.setAttribute('aria-label','道具仓库');bag.title='道具仓库';bag.append(glyph('bag'));h.querySelector('.map-heading').append(bag);}
  tabs(scroll,[['dragon','角色装扮'],['bubble','泡泡皮肤'],['turret','炮台外观'],['power','火力升级'],['gear','功能装备']],tab,t=>this.shop({...args,tab:t}));
  if(tab==='power'&&testPower){const card=el('section','power-card test-power-card');card.append(glyph('fire'),el('h2','','测试火力'),el('p','','默认跟随关卡推荐；也可固定等级测试。'));const select=el('select','test-fire-select');select.setAttribute('aria-label','测试火力');const recommended=el('option','','跟随关卡推荐');recommended.value='recommended';recommended.selected=testPower.rank===null;select.append(recommended);for(let rank=0;rank<=50;rank++){const o=el('option','',`Lv.${rank} · ${window.CandyProgress.attackAt(rank)} 伤害`);o.value=rank;o.selected=testPower.rank===rank;select.append(o);}select.onchange=()=>testPower.select(select.value==='recommended'?null:+select.value);card.append(select,el('p','','仅测试版有效，不修改正式存档。'),action('补满测试道具',testPower.refill));scroll.append(card);return;}
  if(tab==='power'){
   const info=power(),card=el('section','power-card');card.append(glyph('turret'),el('h2','',`Lv.${info.rank} · ${info.damage} 伤害`),el('p','',`大泡泡 ${info.damage*4} · 当前进度上限 ${info.capDamage}`));
   if(info.maxed)card.append(el('p','','火力已满级'));
   else {card.append(el('p','',`下一档 ${info.nextDamage} 伤害`),el('p','',info.eligible?'升级资格已开放':`通关第 ${info.gate+1} 关后开放下一档`),currency(info.cost));const b=action('升级火力',()=>{const result=upgrade();this.shop({...args,tab,message:result.reason});});b.disabled=!info.eligible||save.candy<info.cost;card.append(b);}
   card.append(el('p','',message||'购买地图不开放火力等级，实际通关才能提高上限。'));scroll.append(card);return;
  }
  const collection=items.filter(i=>i.slot===tab).sort((a,b)=>a.price-b.price),desired=collection.find(i=>i.id===selected)||collection.find(i=>i.id===save.equipped[tab]);
  const tier=Number.isInteger(priceTier)?Math.max(0,Math.min(7,priceTier)):(desired?.collectionTier??0),goods=tab==='gear'?collection:collection.filter(i=>i.collectionTier===tier);
  const focus=collection.find(i=>i.id===selected)||(priceTier===null?desired:null)||goods[0];
  const showcase=el('section','shop-showcase tier-'+focus.rarity);showcase.dataset.preview=focus.id;
  const scene=el('div','showcase-scene');scene.append(el('span','rarity-badge',focus.rarityName),el('span','preview-note','试穿预览'));
  if(tab==='gear'){scene.append(portrait(focus,4,'showcase-gear'));}else{
   const hero=tab==='dragon'?focus:items.find(i=>i.id===save.equipped.dragon),turret=tab==='turret'?focus:items.find(i=>i.id===save.equipped.turret),bubble=tab==='bubble'?focus:items.find(i=>i.id===save.equipped.bubble);
   scene.append(el('span','showcase-plinth'),portrait(hero,3,'showcase-hero'),portrait(turret,2,'showcase-turret'),portrait(bubble,3,'showcase-bubble'));
   if(focus.fx)for(let i=0;i<4;i++){const spark=el('span','showcase-spark');spark.style.setProperty('--spark',i);scene.append(spark);}
  }
  const info=el('div','showcase-info');info.append(el('strong','',focus.name),el('p','',focus.description||''));const owned=save.owned.includes(focus.id),equipped=save.equipped[tab]===focus.id;
  const purchase=action(equipped?'已装备':owned?'装备此款':'购买并装备',()=>{const result=buy(focus.id);this.shop({...args,tab,selected:focus.id,priceTier:tab==='gear'?null:tier,message:result.ok?'已装备，去冒险看看吧':result.reason});});if(!owned)purchase.append(currency(focus.price));purchase.disabled=equipped;info.append(purchase);if(message)info.append(el('p','shop-message',message));showcase.append(scene,info);scroll.append(showcase);
  const heading=el('div','collection-heading');heading.append(el('strong','',tab==='gear'?'功能装备':'外观收藏 · 24 款'),el('small','',tab==='gear'?'按需装备':'8 档 · 每档 3 款'));if(tab!=='gear')heading.append(action('基础款',()=>this.shop({...args,tab,selected:collection.find(i=>i.price===0).id,priceTier:tier}),'base-look'));scroll.append(heading);
  if(tab!=='gear'){const picker=el('div','price-tier-picker'),select=el('select','price-tier-select'),prices=[40,80,160,260,420,650,1000,1600];select.setAttribute('aria-label','选择皮肤价位');prices.forEach((cost,i)=>{const o=el('option','',`${['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ'][i]} ${['初旅','灵巧','精制','珍奇','华彩','史诗','星耀','典藏'][i]} · ${cost} 星糖`);o.value=i;o.selected=tier===i;select.append(o);});const change=t=>this.shop({...args,tab,priceTier:t,selected:collection.find(i=>i.collectionTier===t).id});select.onchange=()=>change(+select.value);const prev=action('‹',()=>change(Math.max(0,tier-1))),next=action('›',()=>change(Math.min(7,tier+1)));prev.setAttribute('aria-label','上一个价位');next.setAttribute('aria-label','下一个价位');prev.disabled=tier===0;next.disabled=tier===7;picker.append(prev,select,next);scroll.append(picker);}
  const grid=el('div','shop-grid cosmetic-grid');scroll.append(grid);
  for(const item of goods){const card=el('section','shop-card cosmetic-card tier-'+item.rarity+(item.id===focus.id?' selected':''));card.dataset.cosmetic=item.id;
   const preview=action('',()=>this.shop({...args,tab,selected:item.id,priceTier:tab==='gear'?null:tier}),'cosmetic-choice');preview.setAttribute('aria-label','试穿'+item.name);preview.append(el('span','rarity-tag',item.rarityName),portrait(item,item.slot==='bubble'?3:2),el('strong','',item.name));card.append(preview);
   const owned=save.owned.includes(item.id),equipped=save.equipped[tab]===item.id,status=el('p','shop-status',equipped?'✓ 已装备':owned?'已收藏':'');if(!owned)status.append(currency(item.price));card.append(status);
   const b=action(equipped?'已装备':owned?'装备':'购买',()=>{const result=buy(item.id);this.shop({...args,tab,selected:item.id,priceTier:tab==='gear'?null:tier,message:result.ok?'已装备':result.reason});});b.disabled=equipped;card.append(b);grid.append(card);
  }
 },
 inventory({save,items,back,equip,goods,purchase,backLabel='返回',tab='items',message=''}){
  const {h,scroll}=shell('我的仓库','查看已拥有的物品，战斗内用道具袋快捷使用。',back);h.querySelector('.map-back').setAttribute('aria-label',backLabel);wallet(h,save);
  tabs(scroll,[['items','道具'],['dragon','阿噗装扮'],['bubble','泡泡外观'],['turret','炮台外观'],['gear','装备'],['medals','收藏']],tab,t=>this.inventory({save,items,back,equip,goods,purchase,backLabel,tab:t}));
  const grid=el('div','shop-grid');if(message)scroll.append(el('p','inventory-message',message));scroll.append(grid);
  if(tab==='items')for(const [id,item]of Object.entries(items)){const row=el('section','shop-card');row.append(glyph(id),el('strong','',item.name),el('b','',`×${save.inventory[id]||0}`),el('p','',item.description));if(item.price&&purchase){row.append(currency(item.price),action('兑换',()=>{const result=purchase(id);this.inventory({save,items,back,equip,goods,purchase,backLabel,tab,message:result.reason});}));}grid.append(row);}
  else if(tab==='medals'){const medals=Object.keys(save.bossClaims||{});if(!medals.length)grid.append(el('p','empty-collection','击败章节最终首领，收集主题徽章。'));for(const id of medals){const row=el('section','shop-card');row.append(image(`assets/w${id}-island.png`),el('strong','',window.CANDY_WORLDS[+id].name+'徽章'),el('p','','章节首领首通纪念'));grid.append(row);}}
  else for(const item of goods.filter(i=>i.slot===tab&&save.owned.includes(i.id))){const row=el('section','shop-card');row.append(portrait(item,item.slot==='bubble'?3:2),el('strong','',item.name),action(save.equipped[tab]===item.id?'已装备':'装备',()=>{equip(item.id);this.inventory({save,items,back,equip,goods,purchase,backLabel,tab});}));grid.append(row);}
 },
 tasks({save,missions,back}){
  const {h,scroll}=shell('章节任务','达成目标后，奖励自动进入星糖余额和仓库。',back);wallet(h,save);
  for(const m of missions){const card=el('section','task-card');card.append(glyph('tasks'),el('strong','',m.name),el('span','',m.claimed?'✓ 已领取':'进行中'),currency(m.candy),glyph(m.item));scroll.append(card);}
 },
 codex(options){
  const {save,level,worlds,levels,hidden,playtest,attack,back}=options,all=[...levels,...hidden],{scroll}=shell('怪怪图鉴','遇见后解锁详情',back);
  for(const world of worlds){
   const group=el('section','codex-world');group.append(el('h3','',world.name));const grid=el('div','codex-grid');group.append(grid);scroll.append(group);
   for(const kind of ['j','b','K']){const known=playtest||!!save.seenEnemies[world.id+'-'+kind],b=action('',()=>this.enemyDetail({...options,world,kind}),'codex-portrait'+(known?'':' undiscovered'));b.disabled=!known;b.dataset.enemy=world.id+'-'+kind;b.setAttribute('aria-label',world.name+(known?'已遇见怪怪':'未遇见怪怪')+' '+kind);b.append(image(`assets/w${world.id}-${{j:'jelly',b:'berry',K:'boss'}[kind]}.png`));grid.append(b);}
  }
 },
 enemyDetail(options){
  const {save,level,world,worlds,levels,hidden,playtest,attack,kind}=options,all=[...levels,...hidden],seen=save.seenEnemies[world.id+'-'+kind];
  if(!playtest&&!seen)return;
  const hasKind=l=>l.world===world.id&&(l.waves.flat().some(t=>t[0]===kind)||(kind==='j'&&l.boss));
  const available=all.filter(l=>hasKind(l)&&(playtest||save.stars[l.id]||save.hiddenCleared[l.id]||l.id===seen?.stage||l.id===level.id));
  let selected=available.find(l=>l.id===options.selected)||available.find(l=>l.id===level.id)||available.find(l=>l.id===seen?.stage)||available[0];if(!selected)return;
  const title=kind==='K'?(selected.hidden?'秘境守卫':'章节首领'):kind==='b'?'精英'+world.enemy:world.enemy,{scroll}=shell(title,world.name,()=>this.codex(options));
  const select=el('select','codex-stage');select.setAttribute('aria-label','查看关卡生命值');for(const l of available){const o=el('option','',l.hidden?l.name:`第 ${l.local+1} 关 · ${l.name}`);o.value=String(l.id);o.selected=l===selected;select.append(o);}select.onchange=()=>this.enemyDetail({...options,selected:available.find(l=>String(l.id)===select.value)?.id});scroll.append(select);
  const hp=new Set(selected.waves.flat().filter(t=>t[0]===kind).map(t=>Number(t.slice(1))*window.CandyProgress.recommendedAttack(selected)));if(kind==='j'&&selected.boss)hp.add(4*window.CandyProgress.recommendedAttack(selected));
  const card=el('section','codex-card');card.append(image(`assets/w${world.id}-${{j:'jelly',b:'berry',K:'boss'}[kind]}.png`),el('h3','',title));
  [...hp].sort((a,b)=>a-b).forEach((value,i)=>{const armor=kind==='K'?0:selected.armor||0;const row=el('p','codex-variant',`${hp.size>1?'形态 '+(i+1)+' · ':''}生命 ${value} · 普通泡泡 ${Math.ceil(value/attack)+armor} 次命中`);card.append(row);});
  if(selected.armor&&kind!=='K')card.append(el('p','','冰壳额外抵挡一次命中。'));card.append(el('p','','每只怪怪的生命值固定；不同关卡或强化形态会不同。'));scroll.append(card);
 },
 secret({save,level,available,unlock,play,back}){
  const {scroll}=shell(level.name,'可跳过，不影响 300 关主线进度',back);const card=el('section','secret-card');card.append(image('assets/portal.png'),el('h2','',({timed:'限时清屏',defense:'守护工程师',obstacle:'机关试炼',raid:'首领讨伐'})[level.mode]||'秘境挑战'),el('p','',`首通奖励：${window.CandyProgress.ITEMS[level.rewardItem].name} ×1，以及星糖。不会直接赠送皮肤。`),el('p','','首次完整观看视频后开启；失败可免费重试。'));
  const open=save.hiddenUnlocked.includes(level.id);const status=el('p','secret-status',open?'已开启，可以进入':available?'自有宣传视频，无平台广告收益':'宣传视频待配置，请先继续主线');
  const b=action(open?'进入隐藏关':available?'观看宣传视频并开启':'视频待配置',async()=>{if(open){play(level);return;}b.disabled=true;status.textContent='正在打开视频…';const result=await unlock(level.id);b.disabled=false;if(result.completed){play(level);}else status.textContent=result.reason;});b.disabled=!open&&!available;card.append(status,b,action('跳过，继续主线',back));scroll.append(card);
 }
 };
})();
