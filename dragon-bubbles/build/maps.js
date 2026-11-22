/* Native, scrollable pixel-world UI. Combat remains in the Phaser canvas. */
(()=>{
 const host=()=>document.getElementById('map-screen');
 const el=(tag,className='',text='')=>{const n=document.createElement(tag);n.className=className;n.textContent=text;return n;};
 const image=(src,alt='')=>{const n=el('img');n.src=src;n.alt=alt;return n;};
 function action(label,fn,className='map-action'){const b=el('button',className,label);b.type='button';b.onclick=()=>{window.CandyAudio.unlock();fn();};return b;}
 function shell(title,subtitle,back){const h=host();h.hidden=false;h.replaceChildren();const top=el('header','map-heading');top.append(action('‹',back,'map-back'),el('div','map-heading-text',title));h.append(top,el('p','map-subtitle',subtitle));const scroll=el('div','map-scroll');h.append(scroll);return {h,scroll};}
 function route(parent,positions,height){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 360 ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('map-route');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',positions.map(([x,y],i)=>i?`C ${positions[i-1][0]},${y-30} ${x},${y-30} ${x},${y}`:`M ${x},${y}`).join(' '));p.setAttribute('fill','none');p.setAttribute('stroke','#e9d7a5');p.setAttribute('stroke-width','8');p.setAttribute('stroke-dasharray','4 7');svg.append(p);parent.append(svg);}
 window.CandyMapView={hide(){if(host())host().hidden=true;},
 worlds({save,worlds,enter,back,unlock,camp,warehouse}){
  const {h,scroll}=shell('阿噗的像素世界',`已完成 ${Object.keys(save.stars).length}/300 关 · 星糖 ${save.candy}`,back);
  scroll.classList.add('world-scroll');const landscape=el('div','world-landscape');landscape.style.height='1420px';scroll.append(landscape);
  const pts=worlds.map((w,i)=>[i%2?257:103,85+i*130]);route(landscape,pts,1420);
  worlds.forEach((w,i)=>{const open=save.worlds.includes(i),count=Object.keys(save.stars).filter(n=>+n>=i*30&&+n<i*30+30).length;
   const b=action('',()=>{
    if(open){enter(i);return;}
    const popup=el('div','map-popup'),card=el('section','map-popup-card');card.append(el('h2','',w.name),el('p','',`通完${worlds[i-1]?.name}的 30 关可免费开启。`),el('p','',`也可用 ${w.cost} 星糖提前开启，从本章第 1 关开始。`));
    card.append(action(`花 ${w.cost} 星糖提前开启`,()=>{const result=unlock(i);if(result.ok){popup.remove();window.CandyMapView.worlds({save,worlds,enter,back,unlock,camp,warehouse});}else card.querySelector('.unlock-status').textContent=result.reason;}));
    card.append(el('p','unlock-status',''),action('继续按顺序冒险',()=>popup.remove()));popup.append(card);h.append(popup);
   },'world-island'+(open?'':' blocked'));
   b.style.left=(pts[i][0]/3.6)+'%';b.style.top=(pts[i][1]-35)+'px';b.setAttribute('aria-label',w.name+(open?'，已开放':'，未解锁'));
   b.append(image(`assets/w${i}-island.png`),el('strong','',`${String(i+1).padStart(2,'0')} ${w.name}`),el('span','',open?`${count}/30 关 · ${w.mechanic}`:'迷雾区域 · '+w.mechanic));landscape.append(b);
  });
  const bottom=el('nav','map-bottom');bottom.append(action('营地与装备',camp),action('道具仓库',warehouse));h.append(bottom);
 },
 chapter({save,world,levels,hidden,canEnter,play,back,secret,warehouse}){
  const start=world.id*30,done=Object.keys(save.stars).filter(n=>+n>=start&&+n<start+30).length;
  const {h,scroll}=shell(world.name,`${done}/30 关完成 · 全局 ${start+1}—${start+30} 关`,back);
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
  hidden.filter(x=>x.world===world.id).forEach((level,i)=>{const eligible=Boolean(save.stars[level.trigger]),open=save.hiddenUnlocked.includes(level.id);const b=action('',()=>secret(level),'secret-node');b.disabled=!eligible;b.style.left='80%';b.style.top=((level.trigger-start)*66+90)+'px';b.append(el('b','','✦'),el('span','',open?'秘境已开启':eligible?'宣传视频秘境':'隐藏挑战'));trail.append(b);});
  const bottom=el('nav','map-bottom');bottom.append(action('道具仓库',warehouse),action('世界地图',back));h.append(bottom);
  if(next)requestAnimationFrame(()=>{scroll.scrollTop=Math.max(0,next.offsetTop-scroll.clientHeight/2);});
 },
 shop({save,items,buy,back}){
  const {scroll}=shell('阿噗的营地',`星糖 ${save.candy} · 皮肤与装备只用星糖兑换`,back);const grid=el('div','shop-grid');scroll.append(grid);
  items.forEach(item=>{const card=el('section','shop-card');const src=item.slot==='dragon'?{'dragon':'dragon','dragonBerry':'dragon-berry','dragonSky':'dragon-sky'}[item.texture]:item.slot==='gear'?'star':item.texture.startsWith('w')?item.texture:({'bubble':'bubble','bubbleStar':'bubble-star','bubbleRainbow':'bubble-rainbow'}[item.texture]);
   const im=image(`assets/${src}.png`,item.name);if(item.slot==='dragon')im.classList.add('dragon-preview');card.append(im,el('strong','',item.name),el('p','',item.description||'外观不会增加伤害'));
   const owned=save.owned.includes(item.id),equipped=save.equipped[item.slot]===item.id;
   const status=el('p','shop-status',owned?'已拥有':`${item.price} 星糖`);card.append(status,action(equipped?'已装备':owned?'装备':'解锁',()=>{const result=buy(item.id);if(result.ok)window.CandyMapView.shop({save,items,buy,back});else status.textContent=result.reason;}));grid.append(card);
  });
 },
 inventory({save,items,use,back,battle=false,missions=[]}){
  const {scroll}=shell(battle?'本关使用道具':'道具仓库',battle?'选择后使用才扣数量；用完可返回继续瞄准。':'道具会累积保存；皮肤在营地用星糖购买。',back);
  for(const [id,item]of Object.entries(items)){const row=el('section','inventory-row');row.append(el('h3','',`${item.rare?'✦ ':''}${item.name} ×${save.inventory[id]||0}`),el('p','',item.description+(item.rare?' · 秘境首通奖励':' · 普通关/任务奖励')));if(battle)row.append(action('使用',()=>{const result=use(id);if(result.ok)back();else row.querySelector('p').textContent=result.reason;}));scroll.append(row);}
  if(missions.length){scroll.append(el('h3','','本章任务（完成后自动发放）'));for(const mission of missions)scroll.append(el('p','mission',`${mission.claimed?'✓':mission.ready?'✓':'○'} ${mission.name} · ${mission.candy} 星糖 + 道具`));}
 },
 secret({save,level,available,unlock,play,back}){
  const {scroll}=shell(level.name,'可跳过，不影响 300 关主线进度',back);const card=el('section','secret-card');card.append(image('assets/portal.png'),el('h2','','秘境挑战'),el('p','',`首通奖励：${window.CandyProgress.ITEMS[level.rewardItem].name} ×1，以及星糖。不会直接赠送皮肤。`),el('p','','首次观看完整宣传视频后开启；失败可免费重试，首通奖励只领取一次。'));
  const open=save.hiddenUnlocked.includes(level.id);const status=el('p','secret-status',open?'已开启，可以进入':available?'自有宣传视频，无平台广告收益':'宣传视频待配置，请先继续主线');
  const b=action(open?'进入隐藏关':available?'观看宣传视频并开启':'视频待配置',async()=>{if(open){play(level);return;}b.disabled=true;status.textContent='正在打开视频…';const result=await unlock(level.id);b.disabled=false;if(result.completed){play(level);}else status.textContent=result.reason;});b.disabled=!open&&!available;card.append(status,b,action('跳过，继续主线',back));scroll.append(card);
 }
 };
})();
