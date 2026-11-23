/* In-place item tray and pause/exit menu; never navigates away to use an item. */
(()=>{
 const $=id=>document.getElementById(id);let hooks=null,selected=null,press=null,long=false;
 const icon=id=>{const i=document.createElement('img');i.src=`assets/icon-${id}.png`;i.alt='';return i;};
 function button(label,id,fn){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.append(icon(id));b.onclick=e=>{e.stopPropagation();CandyAudio.unlock();fn();};return b;}
 function closeTray(){if(!$('item-tray').hidden){$('item-tray').hidden=true;$('tray-toggle').setAttribute('aria-expanded','false');hooks.pause('tray',false);}}
 function closeModal(){const box=$('battle-modal');box.hidden=true;box.replaceChildren();hooks?.pause('menu',false);hooks?.pause('inspect',false);}
 function panel(title,detail,actions){closeTray();hooks.pause('menu',true);const box=$('battle-modal');box.hidden=false;box.replaceChildren();const card=document.createElement('section');card.className='battle-dialog';const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=detail;card.append(h,p);for(const [name,fn]of actions){const b=document.createElement('button');b.textContent=name;b.onclick=fn;card.append(b);}box.append(card);}
 function confirmExit(destination){panel('退出本局？','本局未结算进度不会保存；已获得的星糖与物品保留，已使用的道具不会返还。',[['继续冒险',closeModal],['确认退出',()=>{closeModal();hooks.leave(destination);}]]);}
 function select(id){selected=id;const item=hooks.items[id];$('item-name').textContent=item.name;$('item-description').textContent=item.description;document.querySelectorAll('.item-icon').forEach(b=>b.classList.toggle('selected',b.dataset.item===id));$('item-use').disabled=!hooks.count(id)||hooks.state()!=='ready';}
 window.CandyBattleUI={
  hide(){if(!$('battle-ui'))return;closeTray();$('battle-ui').hidden=true;$('battle-modal').hidden=true;clearTimeout(press);hooks=null;},
  show(options){hooks=options;selected=null;$('battle-ui').hidden=false;$('item-tray').hidden=true;$('battle-modal').hidden=true;$('tray-items').replaceChildren();
   $('menu-toggle').replaceChildren(icon('menu'));$('menu-toggle').onclick=()=>this.menu();$('exit-battle').replaceChildren(icon('exit'));$('exit-battle').onclick=()=>confirmExit('title');
   $('tray-toggle').replaceChildren(icon('bag'));$('tray-toggle').onclick=()=>{if(hooks.state()!=='ready')return;if(!$('item-tray').hidden){closeTray();return;}hooks.pause('tray',true);$('item-tray').hidden=false;$('tray-toggle').setAttribute('aria-expanded','true');this.refresh();};
   for(const [id,item]of Object.entries(hooks.items)){const b=button(item.name,id,()=>{if(long){long=false;return;}select(id);});b.className='item-icon';b.dataset.item=id;const n=document.createElement('small');n.className='item-count';b.append(n);
    b.onpointerdown=()=>{long=false;clearTimeout(press);press=setTimeout(()=>{long=true;select(id);},420);};b.onpointerup=b.onpointercancel=b.onpointerleave=()=>clearTimeout(press);$('tray-items').append(b);}
   $('item-use').onclick=()=>{if(!selected)return;const result=hooks.use(selected);if(result.ok){closeTray();this.refresh();}else $('item-description').textContent=result.reason;};
   $('item-name').textContent='选择道具';$('item-description').textContent='点图标查看用途，点击“使用”才消耗。';$('item-use').disabled=true;
   $('power-skill').onclick=()=>hooks.skill();this.refresh();
   return {label:{setText(value){$('skill-label').textContent=value;}},setAlpha(value){$('power-skill').style.opacity=value;}};
  },
  refresh(){if(!hooks)return;const state=hooks.state();$('battle-bar').hidden=(!['intro','ready','aiming','shooting'].includes(state)||hooks.obscured?.());$('tray-toggle').disabled=state!=='ready';$('power-skill').disabled=state!=='ready';document.querySelectorAll('.item-icon').forEach(b=>{b.querySelector('.item-count').textContent=hooks.count(b.dataset.item);b.classList.toggle('empty',!hooks.count(b.dataset.item));});if(selected)select(selected);},
  menu(){panel('冒险菜单','战斗已暂停。',[['继续冒险',closeModal],['敌人图鉴',()=>{closeModal();hooks.codex();}],['返回章节地图',()=>confirmExit('chapter')],['退出本局',()=>confirmExit('title')]]);},
  inspect(node){hooks.pause('inspect',true);const a=hooks.attack(),hits=Math.ceil(node.hp/a)+(node.armor?1:0);panel('敌人情报',`生命 ${Math.max(0,node.hp)} / ${node.maxHp}\n普通泡泡 ${a} 伤害，预计还需 ${hits} 次命中${node.armor?'（含冰壳）':''}。`,[['继续冒险',closeModal]]);},
  reward(data){
   panel(data.title,`${data.rating.grade} 级 · ${data.rating.score} 分 · ${data.shots} 次发射${data.loot?'\n'+data.loot:''}`,[[data.nextLabel,()=>{closeModal();data.next();}],['查看仓库',()=>{closeModal();data.warehouse();}]]);
   const card=$('battle-modal').querySelector('.battle-dialog');card.classList.add('reward-dialog');
   const grade=document.createElement('strong');grade.className='victory-grade grade-'+data.rating.grade;grade.textContent=data.rating.grade;card.querySelector('h2').after(grade);
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='评分与奖励';details.append(summary);
   const breakdown=document.createElement('p');breakdown.textContent=`目标 ${data.target} 次发射 · 通关 ${data.rating.parts.clear} · 效率 ${data.rating.parts.efficiency} · 命中 ${data.rating.parts.accuracy} · 技巧 ${data.rating.parts.control}`;details.append(breakdown);
   const table=document.createElement('table');table.className='grade-table';const head=document.createElement('tr');for(const label of ['等级','分数','首通加奖']){const th=document.createElement('th');th.textContent=label;head.append(th);}table.append(head);
   for(const g of CandyScore.grades){const tr=document.createElement('tr');for(const label of [g.grade,g.grade==='S'?'90—100':g.grade==='A'?'75—89':g.grade==='B'?'60—74':'45—59','+'+g.bonus]){const td=document.createElement('td');td.textContent=label;tr.append(td);}table.append(tr);}details.append(table);
   const rule=document.createElement('p');rule.textContent='通关45＋效率30＋有效命中15＋技巧10。发射超过目标每次扣5效率分；命中过怪怪的发射计为有效。超过目标发射次数、守护关损失生命或限时关耗时超过85%不能获S。每关首次S额外随机普通道具；重复通关5星糖，评级提升补差额。';details.append(rule);card.querySelector('p').after(details);
   if(data.powerReady){const upgrade=document.createElement('button');upgrade.textContent='火力升级已开放';upgrade.onclick=()=>{closeModal();data.upgrade();};card.append(upgrade);}
   const row=document.createElement('div');row.className='reward-currency';row.append(icon('candy'));const value=document.createElement('strong');value.textContent='+'+data.amount;const balance=document.createElement('small');balance.textContent='余额 '+data.balance;row.append(value,balance);card.querySelector('p').before(row);
  },
  close:closeTray
 };
})();
