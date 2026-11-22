/* Native, scrollable pixel-world UI. Combat remains in the Phaser canvas. */
(()=>{
 const host=()=>document.getElementById('map-screen');
 const el=(tag,className='',text='')=>{const n=document.createElement(tag);n.className=className;n.textContent=text;return n;};
 const currency=value=>{const c=el('span','currency');c.title='星糖';c.setAttribute('aria-label',`${value} 星糖`);c.append(image('assets/icon-candy.png'),el('span','',String(value)));return c;};
 const glyph=id=>image(`assets/icon-${id}.png`);
 const image=(src,alt='')=>{const n=el('img');n.src=src;n.alt=alt;return n;};
 function action(label,fn,className='map-action'){const b=el('button',className,label);b.type='button';b.onclick=()=>{window.CandyAudio.unlock();fn();};return b;}
 function wallet(h,save){h.querySelector('.map-heading').append(currency(save.candy));}
 function tabs(parent,entries,active,fn){const nav=el('nav','camp-tabs');for(const [id,name]of entries){const b=action(name,()=>fn(id));b.classList.toggle('active',id===active);nav.append(b);}parent.append(nav);}
 function asset(item){if(item.slot==='dragon')return {'dragon':'dragon','dragonBerry':'dragon-berry','dragonSky':'dragon-sky'}[item.texture]||item.texture;if(item.slot==='gear')return 'icon-gear';return {'bubble':'bubble','bubbleStar':'bubble-star','bubbleRainbow':'bubble-rainbow'}[item.texture]||item.texture;}
 function shell(title,subtitle,back){const h=host();h.hidden=false;h.replaceChildren();const top=el('header','map-heading');top.append(action('‹',back,'map-back'),el('div','map-heading-text',title));h.append(top,el('p','map-subtitle',subtitle));const scroll=el('div','map-scroll');h.append(scroll);return {h,scroll};}
 function route(parent,positions,height){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 360 ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('map-route');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',positions.map(([x,y],i)=>i?`C ${positions[i-1][0]},${y-30} ${x},${y-30} ${x},${y}`:`M ${x},${y}`).join(' '));p.setAttribute('fill','none');p.setAttribute('stroke','#e9d7a5');p.setAttribute('stroke-width','8');p.setAttribute('stroke-dasharray','4 7');svg.append(p);parent.append(svg);}
 window.CandyMapView={hide(){if(host())host().hidden=true;},
 worlds({save,worlds,enter,back,unlock,camp,warehouse,codex}){
  const {h,scroll}=shell('阿噗的像素世界',`已完成 ${Object.keys(save.stars).length}/300 关`,back);
  wallet(h,save);scroll.classList.add('world-scroll');const landscape=el('div','world-landscape');landscape.style.height='1420px';scroll.append(landscape);
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
  const bottom=el('nav','map-bottom');bottom.append(action('营地与装备',camp),action('仓库',warehouse),action('图鉴',codex));h.append(bottom);
 },
 chapter({save,world,levels,hidden,canEnter,play,back,secret,warehouse,codex,tasks}){
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
  const bottom=el('nav','map-bottom');bottom.append(action('仓库',warehouse),action('图鉴',codex),action('任务',tasks),action('世界地图',back));h.append(bottom);
  if(next)requestAnimationFrame(()=>{scroll.scrollTop=Math.max(0,next.offsetTop-scroll.clientHeight/2);});
 },
 shop({save,items,buy,back,power,upgrade,tab='dragon',message=''}){
  const {h,scroll}=shell('阿噗的营地','外观与火力独立，所有购买都使用星糖。',back);wallet(h,save);
  tabs(scroll,[['dragon','角色装扮'],['bubble','泡泡皮肤'],['turret','炮台外观'],['power','火力升级'],['gear','功能装备']],tab,t=>this.shop({save,items,buy,back,power,upgrade,tab:t}));
  if(tab==='power'){
   const info=power(),card=el('section','power-card');card.append(glyph('turret'),el('h2','',`Lv.${info.rank} · ${info.damage} 伤害`),el('p','',`大泡泡 ${info.damage*4} · 当前进度上限 ${info.capDamage}`));
   if(info.maxed)card.append(el('p','','火力已满级'));
   else {card.append(el('p','',`下一档 ${info.nextDamage} 伤害`),el('p','',info.eligible?'升级资格已开放':`通关第 ${info.gate+1} 关后开放下一档`),currency(info.cost));const b=action('升级火力',()=>{const result=upgrade();this.shop({save,items,buy,back,power,upgrade,tab,message:result.reason});});b.disabled=!info.eligible||save.candy<info.cost;card.append(b);}
   card.append(el('p','',message||'购买地图不开放火力等级，实际通关才能提高上限。'));scroll.append(card);return;
  }
  const grid=el('div','shop-grid');scroll.append(grid);
  items.filter(item=>item.slot===tab).forEach(item=>{const card=el('section','shop-card');const im=image(`assets/${asset(item)}.png`,item.name);if(item.slot==='dragon')im.classList.add('dragon-preview');card.append(im,el('strong','',item.name),el('p','',item.description||'纯外观，不增加伤害'));
   const owned=save.owned.includes(item.id),equipped=save.equipped[item.slot]===item.id;const status=el('p','shop-status',owned?'已拥有':'');if(!owned)status.append(currency(item.price));card.append(status,action(equipped?'已装备':owned?'装备':'购买',()=>{const result=buy(item.id);if(result.ok)this.shop({save,items,buy,back,power,upgrade,tab});else status.textContent=result.reason;}));grid.append(card);
  });
 },
 inventory({save,items,back,equip,goods,tab='items'}){
  const {h,scroll}=shell('我的仓库','查看已拥有的物品，战斗内用道具袋快捷使用。',back);wallet(h,save);
  tabs(scroll,[['items','道具'],['dragon','阿噗装扮'],['bubble','泡泡外观'],['turret','炮台外观'],['gear','装备']],tab,t=>this.inventory({save,items,back,equip,goods,tab:t}));
  const grid=el('div','shop-grid');scroll.append(grid);
  if(tab==='items')for(const [id,item]of Object.entries(items)){const row=el('section','shop-card');row.append(glyph(id),el('strong','',item.name),el('b','',`×${save.inventory[id]||0}`),el('p','',item.description));grid.append(row);}
  else for(const item of goods.filter(i=>i.slot===tab&&save.owned.includes(i.id))){const row=el('section','shop-card'),im=image(`assets/${asset(item)}.png`);if(tab==='dragon')im.classList.add('dragon-preview');row.append(im,el('strong','',item.name),action(save.equipped[tab]===item.id?'已装备':'装备',()=>{equip(item.id);this.inventory({save,items,back,equip,goods,tab});}));grid.append(row);}
 },
 tasks({save,missions,back}){
  const {h,scroll}=shell('章节任务','达成目标后，奖励自动进入星糖余额和仓库。',back);wallet(h,save);
  for(const m of missions){const card=el('section','task-card');card.append(glyph('tasks'),el('strong','',m.name),el('span','',m.claimed?'✓ 已领取':'进行中'),currency(m.candy),glyph(m.item));scroll.append(card);}
 },
 codex({level,world,attack,recommended,back}){
  const {scroll}=shell(`${world.name} · 本关图鉴`,`普通泡泡 ${attack} · 大泡泡 ${attack*4} · 推荐火力 ${recommended}`,back);
  const stats={};for(const token of level.waves.flat()){if(!['j','b','K'].includes(token[0]))continue;const kind=token[0],hp=Number(token.slice(1))*recommended;const a=stats[kind]||(stats[kind]={min:Infinity,max:0});a.min=Math.min(a.min,hp);a.max=Math.max(a.max,hp);}
  if(stats.K){const a=stats.j||(stats.j={min:Infinity,max:0});a.min=Math.min(a.min,4*recommended);a.max=Math.max(a.max,4*recommended);}
  for(const [kind,a]of Object.entries(stats)){const armor=kind!=='K'?(level.armor||0):0;const card=el('section','codex-card');card.append(image(`assets/w${world.id}-${{j:'jelly',b:'berry',K:'boss'}[kind]}.png`),el('h3','',kind==='K'?'章节首领':kind==='b'?'精英'+world.enemy:world.enemy),el('p','',`生命 ${a.min===a.max?a.min:a.min+'—'+a.max}`),el('p','',`普通泡泡约 ${Math.ceil(a.min/attack)+armor}—${Math.ceil(a.max/attack)+armor} 次命中`));if(armor)card.append(el('p','','冰壳会额外抵挡一次命中'));scroll.append(card);}
  const rule=el('section','codex-card');rule.append(el('h3','','本关目标'),el('p','',level.mode==='timed'?`${level.timeLimit} 秒内清除敌人`:level.mode==='defense'?'保护工程师，守住三颗生命并击退全部进攻':level.mode==='raid'?'击败首领及其分裂守卫':'清除全部敌人；敌人越线则失败'),el('p','',`${world.bomb}引发连锁，${world.pickup}提供穿透。`));scroll.append(rule);
 },
 secret({save,level,available,unlock,play,back}){
  const {scroll}=shell(level.name,'可跳过，不影响 300 关主线进度',back);const card=el('section','secret-card');card.append(image('assets/portal.png'),el('h2','',({timed:'限时清屏',defense:'守护工程师',obstacle:'机关试炼',raid:'首领讨伐'})[level.mode]||'秘境挑战'),el('p','',`首通奖励：${window.CandyProgress.ITEMS[level.rewardItem].name} ×1，以及星糖。不会直接赠送皮肤。`),el('p','','首次完整观看视频后开启；失败可免费重试。'));
  const open=save.hiddenUnlocked.includes(level.id);const status=el('p','secret-status',open?'已开启，可以进入':available?'自有宣传视频，无平台广告收益':'宣传视频待配置，请先继续主线');
  const b=action(open?'进入隐藏关':available?'观看宣传视频并开启':'视频待配置',async()=>{if(open){play(level);return;}b.disabled=true;status.textContent='正在打开视频…';const result=await unlock(level.id);b.disabled=false;if(result.completed){play(level);}else status.textContent=result.reason;});b.disabled=!open&&!available;card.append(status,b,action('跳过，继续主线',back));scroll.append(card);
 }
 };
})();
