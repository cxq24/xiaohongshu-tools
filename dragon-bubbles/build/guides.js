/* First-encounter cards are driven by actual stage contents and saved acknowledgements. */
((root)=>{
 const worlds=typeof module!=='undefined'&&module.exports?require('./levels.js').worlds:root.CANDY_WORLDS;
 const frames={blackhole:0,slime:1,boost:2,prism:3,conveyor:4,repulsor:5,retreat:6};
 const obstacles={
  stone:['石墙','泡泡会被挡回。沿墙反弹，寻找侧面的空隙。'],ice:['脆冰','命中三次后碎裂，可以打开新的弹道。'],spring:['弹跳台','将泡泡斜向上弹出，利用它绕到怪怪身后。'],moving:['移动挡板','挡板会左右移动，瞄准时留意空隙。'],mirror:['镜面石柱','改变反弹方向，将横向来球折向上方。'],phase:['相位屏障','明亮时阻挡泡泡，半透明时可以穿过。'],
  blackhole:['黑洞','紫色旋涡向内吸引泡泡，靠近黑色核心会被吞。休眠时不吸不吞；普通每轮限3颗，秘境5颗。'],slime:['黏液墙','反弹后会短暂减速，稍后恢复。角度不变，飞行节奏会改变。'],boost:['弹射板','命中后短暂提速，可以更快穿过通道；不会增加伤害。'],prism:['分光棱镜','普通泡泡命中可分出一颗半伤害泡泡。每颗只分光一次，每轮最多三颗。'],conveyor:['横推带','进入条纹区域会受到水平推力。箭头显示推力方向。'],repulsor:['电磁斥力场','泡泡进入圆圈时会向外偏转一次，离开后再进入可再次偏转，不会被吞。圆圈是生效范围，向外脉冲代表正在推开。']
 };
 function card(id,name,description,image,atlasFrame){return {id,name,description,image,atlasFrame};}
 function forLevel(level,save){
  const cards=[],world=worlds[level.world];
  if(level.world>0)cards.push(card('world-'+level.world,world.name,'这里的怪怪、机关和拾取物采用新的主题。先观察弹道，再决定发射角度。',`assets/w${level.world}-island.png`));
  const kinds=new Set(level.waves.flat().map(t=>t[0]));
  if(kinds.has('j'))cards.push(card('enemy-j','泡泡与怪怪','按住拖动瞄准，松手连发；怪怪下面的数字是剩余生命。沿墙反弹可以连续命中。',`assets/w${level.world}-jelly.png`));
  cards.push(card('hold-fast-v9','长按加速','泡泡飞行时长按战场，两倍速度播放本轮；松手恢复。限时挑战的倒计时也同步加快。','assets/icon-bubble.png'));
  cards.push(card('critical-v9','连续命中暴击','同一轮对同一只怪怪每命中10次，第10次造成双倍伤害。新一轮重新计数，冰壳和爆炸不计入。','assets/icon-fire.png'));
  cards.push(card('skill-big','大泡泡','每次命中怪怪增加 5 能量，满 100 后可准备大泡泡；下一次首颗造成四倍伤害。','assets/icon-nova.png'));
  if(kinds.has('b'))cards.push(card('enemy-b','精英怪怪','精英更耐打，长按可查看这只怪怪的精确生命和预计命中数。',`assets/w${level.world}-berry.png`));
  if(kinds.has('p'))cards.push(card('bomb','爆炸连锁',`${world.bomb}被打破后会伤害附近目标，找准位置可以连续引爆。`,`assets/w${level.world}-bomb.png`));
  if(kinds.has('r'))cards.push(card('pickup','穿透拾取物',`打中${world.pickup}后，当前泡泡会获得短暂穿透。`,`assets/w${level.world}-pickup.png`));
  if(kinds.has('K'))cards.push(card(level.hidden?'guardian':'boss-v7',level.hidden?'秘境守卫':'章节首领',level.hidden?'守卫有独立挑战规则，生命低于本章最终首领。':`首领本章每轮推进 ${level.bossAdvance||37} 像素，越线会失败。击败后还会出现两个守卫。`,`assets/w${level.world}-boss.png`));
  for(const kind of new Set((level.obstacles||[]).map(o=>o.kind))){const [name,description]=obstacles[kind]||[kind,'观察机关再选择路线。'];cards.push(card('obstacle-'+kind,name,description,frames[kind]===undefined?`assets/obstacle-${kind}.png`:null,frames[kind]));}
  if(level.armor)cards.push(card('armor','冰壳护甲','冰壳先抵挡一次命中，之后才扣除生命。','assets/obstacle-ice.png'));
  if(level.wind)cards.push(card('wind','水流与风场','飞行中的泡泡会受到侧向力，瞄准直线不再等于实际路线。','assets/icon-aim.png'));
  if(level.portals?.length)cards.push(card('portals','成对传送门','两扇蓝色竖门互相连接，泡泡穿门后保留方向，不会被吞。','assets/portal.png'));
  if(level.mode){const rules={timed:['限时清屏',`${level.timeLimit} 秒内完成目标；菜单、道具栏和说明打开时计时暂停。`],defense:['守护工程师','普通怪越线扣一颗生命，首领扣两颗；守住剩余生命并击退进攻。'],obstacle:['机关试炼','多种机关组合出现，先看清空隙和开关节奏。'],raid:['首领讨伐','击败守卫以及分裂出来的小守卫，才能完成挑战。']};const r=rules[level.mode];if(r)cards.push(card('mode-'+level.mode,...r,'assets/portal.png'));}
  if(save.inventory.retreat>0)cards.push(card('item-retreat','退步糖','在两次发射之间使用，让敌阵退回一步并保留已造成的伤害。可以重复使用，到达顶端时不会消耗。',null,frames.retreat));
  if(save.inventory.rewind>0)cards.push(card('item-rewind','时光回退','还原上次发射前的局面；已使用的道具不返还，限时挑战也不回拨时间。','assets/icon-rewind.png'));
  const economy=typeof module!=='undefined'&&module.exports?require('./progress.js'):root.CandyProgress;
  for(const [id,item]of Object.entries(economy.ITEMS))if(save.inventory[id]>0&&!['retreat','rewind'].includes(id))cards.push(card('item-'+id,item.name,item.description,'assets/icon-'+id+'.png'));
  const gear=economy.equipped(save,'gear');if(gear&&gear.id!=='gear-none')cards.push(card('gear-'+gear.id,gear.name,gear.description,'assets/icon-gear.png'));
  if(save.fireRank>0)cards.push(card('power-upgrade','炮台火力','升级提高普通泡泡和大泡泡伤害；实际普通伤害显示在炮台旁，外观不会改变伤害。','assets/icon-fire.png'));
  return cards.filter(c=>!save.seenGuides?.[c.id]);
 }
 const api={frames,obstacles,forLevel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CandyGuides=api;
})(typeof window==='undefined'?globalThis:window);
