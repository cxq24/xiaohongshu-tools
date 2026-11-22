/* Economy and save migration are independent of rendering and combat. */
((root) => {
  'use strict';
  const SHOP = [
    {id:'dragon-mint',slot:'dragon',name:'薄荷阿噗',price:0,texture:'dragon'},
    {id:'dragon-berry',slot:'dragon',name:'莓果阿噗',price:40,texture:'dragonBerry'},
    {id:'dragon-sky',slot:'dragon',name:'海盐阿噗',price:80,texture:'dragonSky'},
    {id:'bubble-classic',slot:'bubble',name:'弹力泡泡',price:0,texture:'bubble'},
    {id:'bubble-star',slot:'bubble',name:'星光泡泡',price:40,texture:'bubbleStar'},
    {id:'bubble-rainbow',slot:'bubble',name:'彩虹泡泡',price:70,texture:'bubbleRainbow'}
  ];
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isInteger(n)?n:min));
  function normalize(raw={}) {
    if(!raw || typeof raw!=='object')raw={};
    const p={unlocked:clamp(raw.unlocked,0,5),current:0,stars:{},economyVersion:1,candy:0,claimed:{},owned:['dragon-mint','bubble-classic'],equipped:{dragon:'dragon-mint',bubble:'bubble-classic'}};
    p.current=clamp(raw.current,0,p.unlocked);
    for(let i=0;i<6;i++)if([1,2,3].includes(raw.stars?.[i]))p.stars[i]=raw.stars[i];
    if(raw.economyVersion===1) {
      p.candy=clamp(raw.candy,0,999999);
      for(let i=0;i<6;i++)if(raw.claimed?.[i]===true && p.stars[i])p.claimed[i]=true;
      if(Array.isArray(raw.owned))for(const item of SHOP)if(raw.owned.includes(item.id)&&!p.owned.includes(item.id))p.owned.push(item.id);
      for(const slot of ['dragon','bubble'])if(SHOP.some(item=>item.id===raw.equipped?.[slot]&&item.slot===slot&&p.owned.includes(item.id)))p.equipped[slot]=raw.equipped[slot];
    } else {
      // Existing victories receive their first-clear rewards once on migration.
      for(const [level,stars] of Object.entries(p.stars)){p.candy+=30+5*stars;p.claimed[level]=true;}
    }
    return p;
  }
  function win(p,index,stars) {
    if(!Number.isInteger(index)||index<0||index>5||![1,2,3].includes(stars))throw new Error('Invalid victory');
    const best=p.stars[index]||0,first=!p.claimed[index];
    const improvement=Math.max(0,stars-best);
    const amount=first?30+5*stars:5+5*improvement;
    p.candy=Math.min(999999,p.candy+amount);p.claimed[index]=true;
    p.stars[index]=Math.max(best,stars);p.unlocked=Math.max(p.unlocked,Math.min(5,index+1));
    return {amount,first,improvement,balance:p.candy};
  }
  function buy(p,id) {
    const item=SHOP.find(x=>x.id===id);if(!item)return {ok:false,reason:'没有这个装扮'};
    if(!p.owned.includes(id)){
      if(p.candy<item.price)return {ok:false,reason:`还差 ${item.price-p.candy} 星糖，通关或重玩都能获得`};
      p.candy-=item.price;p.owned.push(id);
    }
    p.equipped[item.slot]=id;return {ok:true,reason:`已装备${item.name}`};
  }
  function equipped(p,slot){return SHOP.find(x=>x.id===p.equipped[slot]);}
  const api={SHOP,normalize,win,buy,equipped};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.CandyProgress=api;
})(typeof window==='undefined'?globalThis:window);
