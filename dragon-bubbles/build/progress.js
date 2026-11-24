/* Campaign progression, one currency, owned cosmetics, inventory and one-time claims. */
((root)=>{
 'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('./levels.js'):{worlds:root.CANDY_WORLDS,levels:root.CANDY_LEVELS,hidden:root.CANDY_HIDDEN};
 const COUNT=300,SIZE=30;
 const FIRE_CAPS=[150,200,260,330,410,500,620,760,920,1100];
 const MAX_FIRE_RANK=99,FIRE_RANK_CAPS=[5,10,15,20,25,30,40,55,75,99];
 function attackAt(rank){rank=clamp(rank,0,MAX_FIRE_RANK);if(!rank)return 100;if(rank>50)return Math.round(1100+(rank-50)*900/49);const w=Math.floor((rank-1)/5),step=(rank-1)%5+1,base=w?FIRE_CAPS[w-1]:100;return Math.round(base+(FIRE_CAPS[w]-base)*step/5);}
 function fireGate(rank){rank=clamp(rank,1,MAX_FIRE_RANK);const w=FIRE_RANK_CAPS.findIndex(cap=>rank<=cap),before=w?FIRE_RANK_CAPS[w-1]:0;return w*30+Math.ceil((rank-before)*(w===9?25:30)/(FIRE_RANK_CAPS[w]-before))-1;}
 function maxFireRank(p){let rank=0;while(rank<MAX_FIRE_RANK&&p.stars[fireGate(rank+1)])rank++;return rank;}
 function powerInfo(p){const rank=p.fireRank||0,next=rank+1,w=Math.floor(rank/5),step=rank%5;return {rank,damage:attackAt(rank),capRank:maxFireRank(p),capDamage:attackAt(maxFireRank(p)),nextDamage:attackAt(next),cost:rank<50?80+w*10+step*20:80+Math.floor((rank-50)/4)*5,gate:fireGate(next),maxed:rank>=MAX_FIRE_RANK,eligible:rank<MAX_FIRE_RANK&&next<=maxFireRank(p)};}
 function upgrade(p){const info=powerInfo(p);if(info.maxed)return {ok:false,reason:'火力已满级'};if(!info.eligible)return {ok:false,reason:`通关第 ${info.gate+1} 关后开放下一档`};if(p.candy<info.cost)return {ok:false,reason:`还差 ${info.cost-p.candy} 星糖`};p.candy-=info.cost;p.fireRank++;return {ok:true,reason:`普通泡泡伤害提升至 ${attackAt(p.fireRank)}`};}
 function recommendedRank(level){const before=level.hidden?level.trigger+1:level.id;let rank=0;while(rank<MAX_FIRE_RANK&&fireGate(rank+1)<before)rank++;return rank;}
 function recommendedAttack(level){return attackAt(recommendedRank(level));}
 // Legacy health scale also keeps bombs and pickups stable; enemyHealth applies stage tuning.
 function healthAttack(level){return attackAt(Math.min(49,level.world*5+Math.floor((level.hidden?(level.trigger%30+1):level.local)/6)));}
 // Fixed stage tuning, calibrated against the affordable C-grade upgrade route.
 const BOSS_HEALTH_BOOST=[1.08,1.08,1.08,1.06,1.06,1.06,1.10,1.28,1.35,1.60];
 function enemyHealth(level,kind,units){
  const base=units*healthAttack(level);if(!['j','b','K'].includes(kind))return base;
  const w=level.world,local=level.hidden?level.trigger%30:level.local;
  if(kind==='K'){
   const factor=level.hidden?1+(BOSS_HEALTH_BOOST[w]-1)*.75:BOSS_HEALTH_BOOST[w],step=base>=100000?1000:100;
   const hp=Math.ceil(base*factor/step)*step;
   if(!level.hidden)return hp;
   const main=data.levels[w*30+29],token=main.waves.flat().find(t=>t[0]==='K');
   return Math.min(hp,Math.floor(enemyHealth(main,'K',Number(token.slice(1)))*(level.bossRatioCap||.6)));
  }
  const growth=Math.max(1,recommendedAttack(level)/healthAttack(level));
  const pressure=1.05+w*.008+(local/29)*.035;
  return Math.ceil(base*Math.pow(growth,.70)*pressure*(kind==='b'?1.06:1)/10)*10;
 }
 const cosmeticData=typeof module!=='undefined'&&module.exports?require('./cosmetics.js'):root.CANDY_COSMETICS;
 const SHOP=[
  {id:'dragon-mint',slot:'dragon',name:'薄荷阿噗',price:0,texture:'dragon',description:'薄荷小龙，最初的冒险伙伴'},
  {id:'bubble-classic',slot:'bubble',name:'弹力泡泡',price:0,texture:'bubble',description:'清透弹力泡泡'},
  {id:'turret-wood',slot:'turret',name:'木糖发射器',price:0,texture:'turret-wood',description:'木质单管 · 黄铜卡箍'},
  ...cosmeticData,
  {id:'gear-none',slot:'gear',name:'轻装冒险',price:0,description:'标准瞄准与能量'},
  {id:'gear-lens',slot:'gear',name:'远眺瞄准镜',price:160,description:'延长瞄准线，不增加伤害'},
  {id:'gear-spark',slot:'gear',name:'启明星徽章',price:300,description:'每关以 15% 能量开始'}
 ].map(item=>{
  const rarity=item.price===0?0:item.price<=80?1:item.price<=260?2:item.price<=650?3:4;
  return {...item,rarity,rarityName:Number.isInteger(item.collectionTier)?['初旅','灵巧','精制','珍奇','华彩','史诗','星耀','典藏'][item.collectionTier]:['基础','精选','珍奇','史诗','典藏'][rarity],color:[0x79c89d,0x79c89d,0x78d3d5,0xa98acb,0xf4bc69][rarity],frames:item.slot==='dragon'?6:item.slot==='turret'?4:item.slot==='bubble'&&item.id!=='bubble-classic'?4:1,frameSize:item.slot==='dragon'||item.slot==='turret'?32:item.id==='bubble-classic'?10:item.slot==='bubble'?16:20,fx:item.collectionTier>=5};
 });
 const ITEMS={retreat:{name:'退步糖',description:'敌阵退回一步，保留伤害；可重复使用，已到顶不消耗',rare:false,price:80},balls:{name:'额外泡泡',description:'下一次发射 +3 颗',rare:false},aim:{name:'路线透镜',description:'每个增加一段瞄准距离，可叠加',rare:false},guard:{name:'缓冲护盾',description:'每个抵消一次敌人推进，可叠加',rare:false},rewind:{name:'时光回退',description:'回到上次发射前，已用道具不返还',rare:true},nova:{name:'星爆泡泡',description:'每个让下一次发射多一颗六倍伤害泡泡，可叠加',rare:true},hammer:{name:'障碍消除',description:'移除最靠近安全线的普通障碍',rare:true}};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isInteger(n)?n:a));
 function discoverLevel(p,level){for(const token of level.waves.flat())if(['j','b','K'].includes(token[0]))discover(p,level,token[0]);}
 function discover(p,level,kind){const key=level.world+'-'+kind;if(!p.seenEnemies[key]){p.seenEnemies[key]={stage:level.id};return true;}return false;}
 const gradeBonus={C:0,B:5,A:10,S:20};
 function gradeReward(p,id,stats,rewards){
  if(!Object.hasOwn(gradeBonus,stats.grade))return;
  if(Number.isInteger(stats.score)&&stats.score>=45&&stats.score<=100&&(stats.score>(p.bestScores[id]||0))){p.bestScores[id]=stats.score;p.bestGrades[id]=stats.grade;}
  if(stats.grade==='S'&&!p.perfectClaims[id]){p.perfectClaims[id]=true;const pool=['balls','aim','guard'],roll=Math.max(0,Math.min(.999999,Number((stats.random||Math.random)())||0)),item=pool[Math.floor(roll*3)];addItem(p,item);rewards.push('首次 S 级：'+ITEMS[item].name+' ×1');}
 }
 function normalize(raw={}){
  if(!raw||typeof raw!=='object')raw={};
  const p={version:9,fireRank:0,economyVersion:1,unlocked:clamp(raw.unlocked,0,299),current:0,stars:{},candy:0,claimed:{},owned:['dragon-mint','bubble-classic','gear-none','turret-wood'],equipped:{dragon:'dragon-mint',bubble:'bubble-classic',gear:'gear-none',turret:'turret-wood'},worlds:[0],inventory:{},missions:{},eggs:{},hiddenUnlocked:[],hiddenCleared:{},bestScores:{},bestGrades:{},perfectClaims:{},bossClaims:{},seenEnemies:{},seenGuides:{},retreatGranted:raw.retreatGranted===true};
  for(let i=0;i<COUNT;i++)if([1,2,3].includes(raw.stars?.[i]))p.stars[i]=raw.stars[i];
  if(raw.economyVersion===1){p.candy=clamp(raw.candy,0,999999);for(let i=0;i<COUNT;i++)if(raw.claimed?.[i]===true&&p.stars[i])p.claimed[i]=true;}
  else for(const [i,stars]of Object.entries(p.stars)){p.candy+=30+5*stars;p.claimed[i]=true;}
  if(Array.isArray(raw.owned))for(const item of SHOP)if(raw.owned.includes(item.id)&&!p.owned.includes(item.id))p.owned.push(item.id);
  for(const slot of ['dragon','bubble','gear','turret'])if(SHOP.some(item=>item.id===raw.equipped?.[slot]&&item.slot===slot&&p.owned.includes(item.id)))p.equipped[slot]=raw.equipped[slot];
  for(let w=1;w<10;w++)if(p.stars[w*SIZE-1]||(raw.version>=3&&raw.worlds?.includes(w)))p.worlds.push(w);
  for(const id of Object.keys(ITEMS))p.inventory[id]=clamp(raw.inventory?.[id],0,999);
  for(const k of ['missions','eggs'])if(raw[k]&&typeof raw[k]==='object')for(const [id,value]of Object.entries(raw[k]))if(value===true&&id.length<40)p[k][id]=true;
  for(const [id,value]of Object.entries(raw.seenGuides||{}))if(value===true&&/^[a-z0-9-]{1,60}$/.test(id))p.seenGuides[id]=true;
  if(p.stars[2]&&!p.retreatGranted){p.retreatGranted=true;addItem(p,'retreat');}
  for(const h of data.hidden){if(raw.hiddenUnlocked?.includes(h.id))p.hiddenUnlocked.push(h.id);if(raw.hiddenCleared?.[h.id]===true)p.hiddenCleared[h.id]=true;}
  for(const key of ['perfectClaims','bossClaims'])for(const [id,v]of Object.entries(raw[key]||{}))if(v===true&&((key==='bossClaims'&&/^([0-9])$/.test(id))||(key==='perfectClaims'&&(/^(0|[1-9][0-9]{0,2})$/.test(id)&&+id<300||data.hidden.some(h=>h.id===id)))))p[key][id]=true;
  for(const level of [...data.levels,...data.hidden]){
   const id=level.id,score=raw.bestScores?.[id],grade=raw.bestGrades?.[id];if(Number.isInteger(score)&&score>=45&&score<=100&&['S','A','B','C'].includes(grade)){p.bestScores[id]=score;p.bestGrades[id]=grade;}
   if((!level.hidden&&p.stars[id])||(level.hidden&&p.hiddenCleared[id]))discoverLevel(p,level);
  }
  for(const [key,v]of Object.entries(raw.seenEnemies||{}))if(/^[0-9]-[jbK]$/.test(key)&&v&&[...data.levels,...data.hidden].some(l=>l.id===v.stage&&l.world===+key[0]&&l.waves.flat().some(t=>t[0]===key.slice(2))))p.seenEnemies[key]={stage:v.stage};
  if((raw.version||0)<7){
   for(const level of [...data.levels,...data.hidden])if((!level.hidden&&p.stars[level.id])||(level.hidden&&p.hiddenCleared[level.id])){
    if(level.world)p.seenGuides['world-'+level.world]=true;p.seenGuides['skill-big']=true;
    for(const kind of new Set(level.waves.flat().map(t=>t[0]))){const id={j:'enemy-j',b:'enemy-b',p:'bomb',r:'pickup',K:level.hidden?'guardian':null}[kind];if(id)p.seenGuides[id]=true;}
    for(const o of level.obstacles||[])if(['stone','ice','spring','moving','mirror','phase'].includes(o.kind))p.seenGuides['obstacle-'+o.kind]=true;
    if(level.wind)p.seenGuides.wind=true;if(level.armor)p.seenGuides.armor=true;if(level.portals?.length)p.seenGuides.portals=true;if(level.mode)p.seenGuides['mode-'+level.mode]=true;
   }
   for(const id of Object.keys(ITEMS))if(id!=='retreat'&&p.inventory[id]>0)p.seenGuides['item-'+id]=true;
   if(raw.fireRank>0)p.seenGuides['power-upgrade']=true;if(p.equipped.gear!=='gear-none')p.seenGuides['gear-'+p.equipped.gear]=true;
  }
  for(let w=0;w<10;w++)for(const m of missions(p,w))if(m.ready&&!p.missions[m.id]){p.missions[m.id]=true;p.candy=Math.min(999999,p.candy+m.candy);addItem(p,m.item);}
  p.fireRank=raw.version>=4?clamp(raw.fireRank,0,maxFireRank(p)):maxFireRank(p);
  p.current=clamp(raw.current,0,299);if(!canEnter(p,p.current))p.current=firstAvailable(p);
  return p;
 }
 function canEnter(p,index){return Number.isInteger(index)&&index>=0&&index<COUNT&&p.worlds.includes(Math.floor(index/SIZE))&&(index%SIZE===0||Boolean(p.stars[index-1]));}
 function firstAvailable(p){for(let i=0;i<COUNT;i++)if(canEnter(p,i)&&!p.stars[i])return i;return 0;}
 function addItem(p,id,count=1){if(!ITEMS[id])return;p.inventory[id]=Math.min(999,(p.inventory[id]||0)+count);}
 function spendItem(p,id){if(!ITEMS[id]||!(p.inventory[id]>0))return false;p.inventory[id]--;return true;}
 function missions(p,w){const first=w*30,cleared=Object.keys(p.stars).filter(i=>+i>=first&&+i<first+30).length,three=Object.entries(p.stars).filter(([i,s])=>+i>=first&&+i<first+30&&s===3).length;return [{id:`w${w}-five`,name:'完成本章 5 关',ready:cleared>=5,candy:40,item:'balls'},{id:`w${w}-stars`,name:'本章获得 3 个三星',ready:three>=3,candy:60,item:'aim'},{id:`w${w}-boss`,name:'击败本章首领',ready:!!p.stars[first+29],candy:100,item:'guard'}];}
 function win(p,index,stars,stats={}){
  if(!Number.isInteger(index)||index<0||index>=COUNT||![1,2,3].includes(stars))throw Error('Invalid victory');
  const beforeInventory={...p.inventory},hadMedal=!!p.bossClaims[Math.floor(index/SIZE)];
  const before=p.candy,w=Math.floor(index/SIZE),best=p.stars[index]||0,first=!p.claimed[index],improvement=Math.max(0,stars-best);
  const graded=Object.hasOwn(gradeBonus,stats.grade),bonus=gradeBonus[stats.grade]||0,oldBonus=gradeBonus[p.bestGrades[index]]||0;
  const amount=graded?(first?30+w*5+bonus:5+Math.max(0,bonus-oldBonus)):(first?30+5*stars+w*5:5+5*improvement),rewards=[];
  p.candy=Math.min(999999,p.candy+amount);p.claimed[index]=true;p.stars[index]=Math.max(best,stars);p.unlocked=Math.max(p.unlocked,Math.min(299,index+1));
  if(p.stars[2]&&!p.retreatGranted){p.retreatGranted=true;addItem(p,'retreat');rewards.push('首次补给：退步糖 ×1');}
  if(first&&(index+1)%6===0){addItem(p,'retreat');rewards.push('阶段补给：退步糖 ×1');}
  discoverLevel(p,data.levels[index]);gradeReward(p,index,stats,rewards);
  if(index%30===29&&!p.bossClaims[w]){p.bossClaims[w]=true;const extra=100+w*20;p.candy=Math.min(999999,p.candy+extra);addItem(p,'balls');addItem(p,'guard');rewards.push(`首领宝箱 +${extra} 星糖 · 额外泡泡 / 缓冲护盾 · 主题徽章`);}
  if(index%30===29&&w<9&&!p.worlds.includes(w+1))p.worlds.push(w+1);
  if(first&&(index+1)%3===0){const id=['balls','aim','guard'][Math.floor(index/3)%3];addItem(p,id);rewards.push(ITEMS[id].name+' ×1');}
  if(!p.eggs[index]&&(stats.combo||0)>=12+w*3){p.eggs[index]=true;addItem(p,'aim');rewards.push('连击彩蛋：路线透镜 ×1');}
  for(const m of missions(p,w))if(m.ready&&!p.missions[m.id]){p.missions[m.id]=true;p.candy=Math.min(999999,p.candy+m.candy);addItem(p,m.item);rewards.push(`任务 +${m.candy} 星糖 / ${ITEMS[m.item].name}`);}
  return {amount,totalCurrency:p.candy-before,first,improvement,balance:p.candy,rewards,loot:inventoryDiff(p,beforeInventory),medals:!hadMedal&&p.bossClaims[w]?[w]:[]};
 }
 function inventoryDiff(p,before){return Object.keys(ITEMS).map(id=>({id,count:(p.inventory[id]||0)-(before[id]||0)})).filter(x=>x.count>0);}
 function buyConsumable(p,id){const item=ITEMS[id];if(!item?.price)return {ok:false,reason:'这件道具不能兑换'};if(p.inventory[id]>=999)return {ok:false,reason:'仓库已满'};if(p.candy<item.price)return {ok:false,reason:`还差 ${item.price-p.candy} 星糖`};p.candy-=item.price;addItem(p,id);return {ok:true,reason:'已放入仓库'};}
 function unlockWorld(p,id){const w=data.worlds[id];if(!w||id===0)return {ok:false,reason:'区域不存在'};if(p.worlds.includes(id))return {ok:false,reason:'这个区域已经开放'};if(!p.worlds.includes(id-1))return {ok:false,reason:'只能提前开启相邻区域'};if(p.candy<w.cost)return {ok:false,reason:`需要 ${w.cost} 星糖；通完上一章可免费开启`};p.candy-=w.cost;p.worlds.push(id);return {ok:true,reason:'主题已开启，从第 1 小关开始挑战'};}
 function buy(p,id){const item=SHOP.find(x=>x.id===id);if(!item)return {ok:false,reason:'没有这个商品'};if(item.world!==undefined&&!p.worlds.includes(item.world))return {ok:false,reason:'先开启对应主题，再用星糖购买'};if(!p.owned.includes(id)){if(p.candy<item.price)return {ok:false,reason:`还差 ${item.price-p.candy} 星糖`};p.candy-=item.price;p.owned.push(id);}p.equipped[item.slot]=id;return {ok:true,reason:`已装备${item.name}`};}
 function hiddenEligible(p,id){const h=data.hidden.find(x=>x.id===id);return !!h&&!!p.stars[h.trigger];}
 function unlockHidden(p,id){if(!hiddenEligible(p,id))return false;if(!p.hiddenUnlocked.includes(id))p.hiddenUnlocked.push(id);return true;}
 function winHidden(p,id,stats={}){const h=data.hidden.find(x=>x.id===id);if(!h||!p.hiddenUnlocked.includes(id))return {ok:false};const beforeInventory={...p.inventory},before=p.candy,first=!p.hiddenCleared[id],rewards=[];const bonus=gradeBonus[stats.grade]||0,oldBonus=gradeBonus[p.bestGrades[id]]||0;const amount=first?60+h.world*5+bonus:5+Math.max(0,bonus-oldBonus);p.hiddenCleared[id]=true;if(first){addItem(p,h.rewardItem);rewards.push(ITEMS[h.rewardItem].name+' ×1');}gradeReward(p,id,stats,rewards);discoverLevel(p,h);p.candy=Math.min(999999,p.candy+amount);return {ok:true,first,amount,totalCurrency:p.candy-before,balance:p.candy,rewards,loot:inventoryDiff(p,beforeInventory),medals:[]};}
 const api={buyConsumable,SHOP,ITEMS,COUNT,SIZE,FIRE_CAPS,MAX_FIRE_RANK,FIRE_RANK_CAPS,fireGate,discover,attackAt,attack:p=>attackAt(p.fireRank),powerInfo,upgrade,recommendedRank,recommendedAttack,healthAttack,enemyHealth,BOSS_HEALTH_BOOST,normalize,win,buy,canEnter,firstAvailable,unlockWorld,missions,addItem,spendItem,hiddenEligible,unlockHidden,winHidden,equipped:(p,slot)=>SHOP.find(x=>x.id===p.equipped[slot])};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CandyProgress=api;
})(typeof window==='undefined'?globalThis:window);
