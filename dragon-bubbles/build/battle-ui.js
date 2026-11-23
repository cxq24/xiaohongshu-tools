/* In-place item tray and pause/exit menu; never navigates away to use an item. */
(()=>{
 const $=id=>document.getElementById(id);let hooks=null,selected=null,press=null,long=false;
 const icon=id=>{if(id==='retreat'){const n=document.createElement('span');n.className='atlas-icon';n.style.setProperty('--atlas-frame',6);n.setAttribute('aria-label','退步糖');return n;}const i=document.createElement('img');i.src=`assets/icon-${id}.png`;i.alt='';return i;};
 function button(label,id,fn){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.append(icon(id));b.onclick=e=>{e.stopPropagation();CandyAudio.unlock();fn();};return b;}
 function closeTray(){if(!$('item-tray').hidden){$('item-tray').hidden=true;$('tray-toggle').setAttribute('aria-expanded','false');hooks.pause('tray',false);}}
 function closeModal(){const box=$('battle-modal');box.hidden=true;box.replaceChildren();hooks?.pause('menu',false);hooks?.pause('inspect',false);}
 function panel(title,detail,actions){closeTray();hooks.pause('menu',true);const box=$('battle-modal');box.hidden=false;box.replaceChildren();const card=document.createElement('section');card.className='battle-dialog';const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=detail;card.append(h,p);for(const [name,fn]of actions){const b=document.createElement('button');b.textContent=name;b.onclick=fn;card.append(b);}box.append(card);}
 function confirmExit(destination){panel('退出本局？','本局未结算进度不会保存；已获得的星糖与物品保留，已使用的道具不会返还。',[['继续冒险',closeModal],['确认退出',()=>{closeModal();hooks.leave(destination);}]]);}
 function select(id){selected=id;const item=hooks.items[id];$('item-name').textContent=item.name;$('item-description').textContent=item.description;document.querySelectorAll('.item-icon').forEach(b=>b.classList.toggle('selected',b.dataset.item===id));$('item-use').disabled=!hooks.count(id)||hooks.state()!=='ready';}
 window.CandyBattleUI={
  hide(){if(!$('battle-ui'))return;closeTray();$('battle-ui').hidden=true;$('battle-modal').hidden=true;clearTimeout(press);hooks=null;},
  show(options){hooks=options;selected=null;$('battle-ui').hidden=false;$('item-tray').hidden=true;$('battle-modal').hidden=true;$('tray-items').replaceChildren();
   if(!$('speed-status')){const badge=document.createElement('div');badge.id='speed-status';badge.textContent='加速 ×2 · 松手恢复';badge.hidden=true;badge.setAttribute('aria-live','polite');$('battle-ui').append(badge);}this.speed(false);
   $('menu-toggle').replaceChildren(icon('menu'));$('menu-toggle').onclick=()=>this.menu();$('exit-battle').replaceChildren(icon('exit'));$('exit-battle').onclick=()=>confirmExit('title');
   $('tray-toggle').replaceChildren(icon('bag'));$('tray-toggle').onclick=()=>{if(hooks.state()!=='ready')return;if(!$('item-tray').hidden){closeTray();return;}hooks.pause('tray',true);$('item-tray').hidden=false;$('tray-toggle').setAttribute('aria-expanded','true');this.refresh();};
   for(const [id,item]of Object.entries(hooks.items)){const b=button(item.name,id,()=>{if(long){long=false;return;}select(id);});b.className='item-icon';b.dataset.item=id;const n=document.createElement('small');n.className='item-count';b.append(n);
    b.onpointerdown=()=>{long=false;clearTimeout(press);press=setTimeout(()=>{long=true;select(id);},420);};b.onpointerup=b.onpointercancel=b.onpointerleave=()=>clearTimeout(press);$('tray-items').append(b);}
   $('item-use').onclick=()=>{if(!selected)return;const result=hooks.use(selected);if(result.ok){closeTray();this.refresh();}else $('item-description').textContent=result.reason;};
   $('item-name').textContent='选择道具';$('item-description').textContent='点图标查看用途，点击“使用”才消耗。';$('item-use').disabled=true;
   if(!$('power-skill').querySelector('img'))$('power-skill').prepend(icon('nova'));$('power-skill').onclick=()=>hooks.skill();this.refresh();
   return {label:{setText(value){$('skill-label').textContent=value;}},setAlpha(value){$('power-skill').style.opacity=value;},setEnergy(value,armed){const b=$('power-skill');b.dataset.energy=value;b.style.setProperty('--energy-level',value+'%');b.classList.toggle('power-ready',value>=100);b.classList.toggle('power-armed',armed);b.setAttribute('aria-label',armed?'大泡泡已装填，点击取消':value>=100?'释放大泡泡':'大泡泡能量 '+value+'%');b.title='命中怪怪积能；满100准备一次四倍伤害大泡泡';}};
  },
  refresh(){if(!hooks)return;const state=hooks.state();$('battle-bar').hidden=(!['intro','ready','aiming','shooting'].includes(state)||hooks.obscured?.());$('tray-toggle').disabled=state!=='ready';$('power-skill').disabled=state!=='ready';document.querySelectorAll('.item-icon').forEach(b=>{b.querySelector('.item-count').textContent=hooks.count(b.dataset.item);b.classList.toggle('empty',!hooks.count(b.dataset.item));});if(selected)select(selected);},
  speed(active){$('battle-ui')?.classList.toggle('battle-fast',active);const s=$('speed-status');if(s)s.hidden=!active;},
  menu(){panel('冒险菜单','战斗已暂停。',[['继续冒险',closeModal],['敌人图鉴',()=>{closeModal();hooks.codex();}],['返回章节地图',()=>confirmExit('chapter')],['退出本局',()=>confirmExit('title')]]);},
  inspect(node){hooks.pause('inspect',true);const a=hooks.attack(),hits=Math.ceil(node.hp/a)+(node.armor?1:0);panel('敌人情报',`生命 ${Math.max(0,node.hp)} / ${node.maxHp}\n普通泡泡 ${a} 伤害，预计还需 ${hits} 次命中${node.armor?'（含冰壳）':''}。`,[['继续冒险',closeModal]]);},
  inspectMechanism(data){
   hooks.pause('inspect',true);panel(data.name,data.description,[['继续冒险',closeModal]]);const card=$('battle-modal').querySelector('.battle-dialog');card.classList.add('mechanism-dialog');let visual;
   if(data.atlasFrame!==undefined){visual=document.createElement('span');visual.className='atlas-icon';visual.style.setProperty('--atlas-frame',data.atlasFrame);}else{visual=document.createElement('img');visual.src=data.image;visual.alt='';}
   card.querySelector('h2').after(visual);if(data.status){const status=document.createElement('p');status.className='mechanism-status';status.textContent=data.status;visual.after(status);}
  },
  guide({cards,goal,start}){
   panel('初次发现',goal,[['开始冒险',start]]);const box=$('battle-modal').querySelector('.battle-dialog');box.classList.add('discovery-dialog');const list=document.createElement('div');list.className='discovery-list';
   for(const card of cards){const row=document.createElement('article');row.className='discovery-card';row.dataset.discovery=card.id;let visual;
    if(card.atlasFrame!==undefined){visual=document.createElement('span');visual.className='atlas-icon';visual.style.setProperty('--atlas-frame',card.atlasFrame);}else{visual=document.createElement('img');visual.src=card.image;visual.alt='';}
    const info=document.createElement('div'),name=document.createElement('strong'),description=document.createElement('p');name.textContent=card.name;description.textContent=card.description;info.append(name,description);row.append(visual,info);list.append(row);
   }box.querySelector('p').after(list);const back=document.createElement('button');back.className='guide-close';back.setAttribute('aria-label','返回地图');back.textContent='×';back.onclick=()=>{closeModal();hooks.leave('chapter');};box.append(back);
  },
  finishIntro(){if($('battle-modal').querySelector('.discovery-dialog'))closeModal();},
  reward(data){
   panel(data.title,`${data.rating.grade} 级 · ${data.rating.score} 分 · ${data.shots} 次发射`,[[data.nextLabel,()=>{closeModal();data.next();}],[data.canAdvance?'返回关卡地图':'返回世界地图',()=>{closeModal();data.canAdvance?data.back():data.worldMap();}]]);
   const card=$('battle-modal').querySelector('.battle-dialog');card.classList.add('reward-dialog');
   const grade=document.createElement('strong');grade.className='victory-grade grade-'+data.rating.grade;grade.textContent=data.rating.grade;card.querySelector('h2').after(grade);
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='评分与奖励';details.append(summary);
   const breakdown=document.createElement('p');breakdown.textContent=`目标 ${data.target} 次发射 · 通关 ${data.rating.parts.clear} · 效率 ${data.rating.parts.efficiency} · 命中 ${data.rating.parts.accuracy} · 技巧 ${data.rating.parts.control}`;details.append(breakdown);
   const table=document.createElement('table');table.className='grade-table';const head=document.createElement('tr');for(const label of ['等级','分数','首通加奖']){const th=document.createElement('th');th.textContent=label;head.append(th);}table.append(head);
   for(const g of CandyScore.grades){const tr=document.createElement('tr');for(const label of [g.grade,g.grade==='S'?'90—100':g.grade==='A'?'75—89':g.grade==='B'?'60—74':'45—59','+'+g.bonus]){const td=document.createElement('td');td.textContent=label;tr.append(td);}table.append(tr);}details.append(table);
   const rule=document.createElement('p');rule.textContent='通关45＋效率30＋有效命中15＋技巧10。发射超过目标每次扣5效率分；命中过怪怪的发射计为有效。超过目标发射次数、守护关损失生命或限时关耗时超过85%不能获S。每关首次S额外随机普通道具；重复通关5星糖，评级提升补差额。';details.append(rule);card.querySelector('p').after(details);
   if(data.powerReady){const upgrade=document.createElement('button');upgrade.textContent='火力升级已开放';upgrade.onclick=()=>{closeModal();data.upgrade();};card.append(upgrade);}
   const row=document.createElement('div');row.className='reward-currency';row.append(icon('candy'));const value=document.createElement('strong');value.textContent='+'+data.amount;const balance=document.createElement('small');balance.textContent='余额 '+data.balance;row.append(value,balance);card.querySelector('p').before(row);
   const loot=document.createElement('div');loot.className='reward-loot';loot.setAttribute('aria-label','本次获得');
   for(const item of data.loot||[]){const tile=document.createElement('div');tile.className='reward-loot-card';tile.dataset.reward=item.id;tile.title=CandyProgress.ITEMS[item.id].description;tile.append(icon(item.id));const amount=document.createElement('strong');amount.textContent='+'+item.count;const name=document.createElement('small');name.textContent=CandyProgress.ITEMS[item.id].name;tile.append(amount,name);loot.append(tile);}
   for(const world of data.medals||[]){const tile=document.createElement('div');tile.className='reward-loot-card';tile.dataset.reward='medal-'+world;const img=document.createElement('img');img.src=`assets/w${world}-island.png`;img.alt='主题徽章';const name=document.createElement('small');name.textContent=CANDY_WORLDS[world].name+'徽章';const count=document.createElement('strong');count.textContent='+1';tile.append(img,count,name);loot.append(tile);}
   if(loot.childElementCount)row.after(loot);
  },
  close:closeTray
 };
})();
