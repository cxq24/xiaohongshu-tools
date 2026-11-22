/* Campaign progression, one currency, owned cosmetics, inventory and one-time claims. */
((root)=>{
 'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('./levels.js'):{worlds:root.CANDY_WORLDS,levels:root.CANDY_LEVELS,hidden:root.CANDY_HIDDEN};
 const COUNT=300,SIZE=30;
 const SHOP=[
  {id:'dragon-mint',slot:'dragon',name:'薄荷阿噗',price:0,texture:'dragon'},
  {id:'dragon-berry',slot:'dragon',name:'莓果阿噗',price:40,texture:'dragonBerry'},
  {id:'dragon-sky',slot:'dragon',name:'海盐阿噗',price:80,texture:'dragonSky'},
  {id:'bubble-classic',slot:'bubble',name:'弹力泡泡',price:0,texture:'bubble'},
  {id:'bubble-star',slot:'bubble',name:'星光泡泡',price:40,texture:'bubbleStar'},
  {id:'bubble-rainbow',slot:'bubble',name:'彩虹泡泡',price:70,texture:'bubbleRainbow'},
  {id:'gear-none',slot:'gear',name:'轻装冒险',price:0,description:'标准瞄准与能量'},
  {id:'gear-lens',slot:'gear',name:'远眺瞄准镜',price:160,description:'延长瞄准线，不增加伤害'},
  {id:'gear-spark',slot:'gear',name:'启明星徽章',price:300,description:'每关以 15% 能量开始'},
  ...data.worlds.map(w=>({id:'bubble-world-'+w.id,slot:'bubble',name:w.name+'泡泡',price:120+w.id*40,texture:`w${w.id}-bubble`,world:w.id}))
 ];
 const ITEMS={balls:{name:'额外泡泡',description:'下一次发射 +3 颗',rare:false},aim:{name:'路线透镜',description:'本次瞄准线延长',rare:false},guard:{name:'缓冲护盾',description:'抵消一次敌人推进',rare:false},rewind:{name:'时光回退',description:'回到上次发射前，已用道具不返还',rare:true},nova:{name:'星爆泡泡',description:'下一次首颗泡泡伤害 6',rare:true},hammer:{name:'障碍消除',description:'移除最靠近安全线的普通障碍',rare:true}};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isInteger(n)?n:a));
 function normalize(raw={}){
  if(!raw||typeof raw!=='object')raw={};
  const p={version:3,economyVersion:1,unlocked:clamp(raw.unlocked,0,299),current:0,stars:{},candy:0,claimed:{},owned:['dragon-mint','bubble-classic','gear-none'],equipped:{dragon:'dragon-mint',bubble:'bubble-classic',gear:'gear-none'},worlds:[0],inventory:{},missions:{},eggs:{},hiddenUnlocked:[],hiddenCleared:{}};
  for(let i=0;i<COUNT;i++)if([1,2,3].includes(raw.stars?.[i]))p.stars[i]=raw.stars[i];
  if(raw.economyVersion===1){p.candy=clamp(raw.candy,0,999999);for(let i=0;i<COUNT;i++)if(raw.claimed?.[i]===true&&p.stars[i])p.claimed[i]=true;}
  else for(const [i,stars]of Object.entries(p.stars)){p.candy+=30+5*stars;p.claimed[i]=true;}
  if(Array.isArray(raw.owned))for(const item of SHOP)if(raw.owned.includes(item.id)&&!p.owned.includes(item.id))p.owned.push(item.id);
  for(const slot of ['dragon','bubble','gear'])if(SHOP.some(item=>item.id===raw.equipped?.[slot]&&item.slot===slot&&p.owned.includes(item.id)))p.equipped[slot]=raw.equipped[slot];
  for(let w=1;w<10;w++)if(p.stars[w*SIZE-1]||(raw.version===3&&raw.worlds?.includes(w)))p.worlds.push(w);
  for(const id of Object.keys(ITEMS))p.inventory[id]=clamp(raw.inventory?.[id],0,999);
  for(const k of ['missions','eggs'])if(raw[k]&&typeof raw[k]==='object')for(const [id,value]of Object.entries(raw[k]))if(value===true&&id.length<40)p[k][id]=true;
  for(const h of data.hidden){if(raw.hiddenUnlocked?.includes(h.id))p.hiddenUnlocked.push(h.id);if(raw.hiddenCleared?.[h.id]===true)p.hiddenCleared[h.id]=true;}
  for(let w=0;w<10;w++)for(const m of missions(p,w))if(m.ready&&!p.missions[m.id]){p.missions[m.id]=true;p.candy=Math.min(999999,p.candy+m.candy);addItem(p,m.item);}
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
  const w=Math.floor(index/SIZE),best=p.stars[index]||0,first=!p.claimed[index],improvement=Math.max(0,stars-best);
  const amount=first?30+5*stars+w*5:5+5*improvement,rewards=[];
  p.candy=Math.min(999999,p.candy+amount);p.claimed[index]=true;p.stars[index]=Math.max(best,stars);p.unlocked=Math.max(p.unlocked,Math.min(299,index+1));
  if(index%30===29&&w<9&&!p.worlds.includes(w+1))p.worlds.push(w+1);
  if(first&&(index+1)%3===0){const id=['balls','aim','guard'][Math.floor(index/3)%3];addItem(p,id);rewards.push(ITEMS[id].name+' ×1');}
  if(!p.eggs[index]&&(stats.combo||0)>=12+w*3){p.eggs[index]=true;addItem(p,'aim');rewards.push('连击彩蛋：路线透镜 ×1');}
  for(const m of missions(p,w))if(m.ready&&!p.missions[m.id]){p.missions[m.id]=true;p.candy=Math.min(999999,p.candy+m.candy);addItem(p,m.item);rewards.push(`任务 +${m.candy} 星糖 / ${ITEMS[m.item].name}`);}
  return {amount,first,improvement,balance:p.candy,rewards};
 }
 function unlockWorld(p,id){const w=data.worlds[id];if(!w||id===0)return {ok:false,reason:'区域不存在'};if(p.worlds.includes(id))return {ok:false,reason:'这个区域已经开放'};if(!p.worlds.includes(id-1))return {ok:false,reason:'只能提前开启相邻区域'};if(p.candy<w.cost)return {ok:false,reason:`需要 ${w.cost} 星糖；通完上一章可免费开启`};p.candy-=w.cost;p.worlds.push(id);return {ok:true,reason:'主题已开启，从第 1 小关开始挑战'};}
 function buy(p,id){const item=SHOP.find(x=>x.id===id);if(!item)return {ok:false,reason:'没有这个商品'};if(item.world!==undefined&&!p.worlds.includes(item.world))return {ok:false,reason:'先开启对应主题，再用星糖购买'};if(!p.owned.includes(id)){if(p.candy<item.price)return {ok:false,reason:`还差 ${item.price-p.candy} 星糖`};p.candy-=item.price;p.owned.push(id);}p.equipped[item.slot]=id;return {ok:true,reason:`已装备${item.name}`};}
 function hiddenEligible(p,id){const h=data.hidden.find(x=>x.id===id);return !!h&&!!p.stars[h.trigger];}
 function unlockHidden(p,id){if(!hiddenEligible(p,id))return false;if(!p.hiddenUnlocked.includes(id))p.hiddenUnlocked.push(id);return true;}
 function winHidden(p,id){const h=data.hidden.find(x=>x.id===id);if(!h||!p.hiddenUnlocked.includes(id))return {ok:false};if(p.hiddenCleared[id]){p.candy=Math.min(999999,p.candy+5);return {ok:true,first:false,amount:5,rewards:[]};}p.hiddenCleared[id]=true;addItem(p,h.rewardItem);const amount=60+h.world*5;p.candy=Math.min(999999,p.candy+amount);return {ok:true,first:true,amount,rewards:[ITEMS[h.rewardItem].name+' ×1']};}
 const api={SHOP,ITEMS,COUNT,SIZE,normalize,win,buy,canEnter,firstAvailable,unlockWorld,missions,addItem,spendItem,hiddenEligible,unlockHidden,winHidden,equipped:(p,slot)=>SHOP.find(x=>x.id===p.equipped[slot])};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CandyProgress=api;
})(typeof window==='undefined'?globalThis:window);
