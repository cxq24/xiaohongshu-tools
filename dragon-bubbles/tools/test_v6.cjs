const assert=require('node:assert/strict'),P=require('../build/progress.js'),D=require('../build/levels.js');
const baseline=[9,11,14,24,22,27,27,32,47,41],bossHP=l=>Number(l.waves.flat().find(t=>t[0]==='K').slice(1))*P.healthAttack(l);
let previous=0;
for(let w=0;w<10;w++){
 const main=D.levels[w*30+29];assert.equal(main.bossBaseUnits,baseline[w]);assert.equal(main.bossHealthMultiplier,10);assert.equal(bossHP(main),baseline[w]*P.healthAttack(main)*10);assert(bossHP(main)>previous);previous=bossHP(main);assert.equal(main.bossAdvance,Math.min(40,24+w*2));assert.equal(main.starTarget,main.waves.length+4);
 const hidden=D.hidden.filter(l=>l.world===w);for(let i=0;i<3;i++){assert.equal(hidden[i].bossRole,'guardian');assert(bossHP(hidden[i])<=bossHP(main)*[.35,.45,.6][i]);assert(bossHP(hidden[i])<bossHP(main));}
}
for(const slot of ['dragon','bubble','turret']){
 const items=P.SHOP.filter(i=>i.slot===slot).sort((a,b)=>a.price-b.price);assert.equal(items.length,25);for(const price of [40,80,160,260,420,650,1000,1600])assert.equal(items.filter(i=>i.price===price).length,3);assert(items.some(i=>i.rarity===4));for(let i=1;i<items.length;i++)assert(items[i].rarity>=items[i-1].rarity);assert.equal(new Set(items.map(i=>i.description)).size,items.length);assert(items.filter(i=>i.price>0).every(i=>i.frames>1));
}
let p=P.normalize({version:5,economyVersion:1,candy:3,owned:['turret-cosmic','outfit-6','bubble-world-9'],equipped:{turret:'turret-cosmic',dragon:'outfit-6',bubble:'bubble-world-9'},worlds:[0,1,2,3,4,5,6,7,8,9]});for(const id of ['turret-cosmic','outfit-6','bubble-world-9'])assert(P.buy(p,id).ok);assert.equal(p.candy,3);assert.equal(P.attack(p),100);
p=P.normalize();p.candy=9999;assert(!P.buy(p,'outfit-6').ok);assert.equal(p.candy,9999);
console.log('PASS: ten exact 10x chapter boss HPs, rising actual HP, all thirty guardian caps, heavy advance, boss score targets, price-tier ordering, 72 animated designs in eight equal-price trios per category, no extra charge to existing owners, gated premium styles and unchanged firepower.');
