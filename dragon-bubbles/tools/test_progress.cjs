const assert=require('node:assert/strict');
const P=require('../build/progress.js');
let p=P.normalize();
assert.equal(p.candy,0);
let reward=P.win(p,0,1);assert.equal(reward.amount,35);assert.equal(p.unlocked,1);
assert.equal(P.buy(p,'dragon-berry').ok,false);assert.equal(p.candy,35);
reward=P.win(p,0,3);assert.equal(reward.amount,15);assert.equal(p.candy,50);
assert.equal(P.buy(p,'dragon-berry').ok,true);assert.equal(p.candy,10);assert.equal(p.equipped.dragon,'dragon-berry');
P.buy(p,'dragon-berry');assert.equal(p.candy,10,'Equipping owned items must not charge again');
P.win(p,0,1);assert.equal(p.candy,15);assert.equal(p.stars[0],3,'Replay must preserve best stars');
const restored=P.normalize(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored,p);
const legacy=P.normalize({unlocked:3,current:2,stars:{0:3,1:2,2:1}});
assert.equal(legacy.candy,120);assert.deepEqual(P.normalize(JSON.parse(JSON.stringify(legacy))),legacy,'Migration must credit old wins only once');
assert.equal(P.win(legacy,0,3).amount,5,'Migrated victories are not new first clears');
assert.equal(P.normalize({economyVersion:1,candy:-100,owned:['unknown'],equipped:{dragon:'unknown'}}).candy,0);
assert.equal(P.normalize({economyVersion:1,candy:NaN}).candy,0);
assert.throws(()=>P.win(p,300,3));assert.throws(()=>P.win(p,1,4));
console.log('PASS: first clears, replay/improvement rewards, prices, insufficient balance, free re-equip, save roundtrip and one-time legacy migration.');

const campaign=require('../build/levels.js');assert.equal(campaign.levels.length,300);assert.equal(campaign.hidden.length,30);
let paid=P.normalize();paid.candy=campaign.worlds[1].cost;assert.equal(P.unlockWorld(paid,2).ok,false);assert.equal(P.unlockWorld(paid,1).ok,true);assert.equal(paid.candy,0);assert(P.canEnter(paid,30));assert(!P.canEnter(paid,31));P.unlockWorld(paid,1);assert.equal(paid.candy,0);
const all=P.normalize();for(let i=0;i<300;i++){assert(P.canEnter(all,i),'Main progression must not lock the next stage');P.win(all,i,3);}
assert.equal(all.worlds.length,10);assert.equal(Object.keys(all.stars).length,300);assert.deepEqual(P.normalize(JSON.parse(JSON.stringify(all))),all);
assert.equal(Object.keys(all.hiddenCleared).length,0);assert.equal(all.inventory.nova,0,'Ordinary stages must not drop rare consumables');
assert(!P.winHidden(all,'h-0-0').ok);assert(P.unlockHidden(all,'h-0-0'));
let h=P.winHidden(all,'h-0-0');assert(h.ok&&h.first);assert.equal(all.inventory.rewind,1);const cash=all.candy;P.winHidden(all,'h-0-0');assert.equal(all.inventory.rewind,1);assert.equal(all.candy,cash+5);
assert(P.spendItem(all,'rewind'));assert(!P.spendItem(all,'rewind'));assert.equal(all.inventory.rewind,0);
assert.equal(P.buy(all,'bubble-world-9').ok,true);assert.equal(all.equipped.bubble,'bubble-world-9');
const ids=new Set();for(const level of [...campaign.levels,...campaign.hidden]){assert(!ids.has(level.id));ids.add(level.id);assert(level.waves.every(row=>row.length===7));assert(level.obstacles.every(o=>o.width<100));}
console.log('PASS: all 300 sequential unlocks, paid adjacent worlds, inventory conservation, 30 hidden gates, rare first-clear rewards and themed cosmetics.');
const vm=require('node:vm'),fs=require('node:fs');
const box={setInterval(){},window:{addEventListener(){},dispatchEvent(){}},document:{hidden:false,addEventListener(){}},navigator:{},localStorage:{getItem(){return null;}},Event:class {}};
box.window.CandyStore={ready:{then(fn){fn();}},read(){return null;},write(){return Promise.resolve(true);}};
vm.runInNewContext(fs.readFileSync(require.resolve('../build/audio.js'),'utf8'),box);
for(let world=0;world<10;world++){
 const samples=box.window.CandyAudio.renderMusic(8000,world);let energy=0;
 for(const sample of samples){assert(Number.isFinite(sample));energy+=sample*sample;}
 assert(energy/samples.length>.0001,'Every theme must contain a finite, non-silent music track');
}
console.log('PASS: all ten theme music arrangements render finite, non-silent PCM.');
assert.equal(P.attackAt(0),100);assert.equal(P.attackAt(30),500);assert.equal(P.attackAt(50),1100);
let growth=P.normalize();growth.candy=1000;assert(!P.upgrade(growth).ok);assert.equal(growth.candy,1000);growth.stars[5]=3;assert(P.upgrade(growth).ok);assert.equal(P.attack(growth),110);assert.equal(growth.candy,920);assert(!P.upgrade(growth).ok);
const damage=P.attack(growth);P.buy(growth,'turret-candy');P.buy(growth,'bubble-star');assert.equal(P.attack(growth),damage,'Cosmetics must not change firepower');
const migrated=P.normalize({version:3,economyVersion:1,candy:321,stars:Object.fromEntries(Array.from({length:30},(_,i)=>[i,3])),claimed:Object.fromEntries(Array.from({length:30},(_,i)=>[i,true]))});assert.equal(migrated.fireRank,5);assert.equal(P.normalize(migrated).fireRank,5);
let budget=P.normalize();let spent=0;
for(let i=0;i<300;i++){
 while(P.powerInfo(budget).eligible){const cost=P.powerInfo(budget).cost;assert(budget.candy>=cost,'Normal progression must fund recommended firepower');assert(P.upgrade(budget).ok);spent+=cost;}
 assert.equal(P.attack(budget),P.recommendedAttack(campaign.levels[i]));P.win(budget,i,1);
}
while(P.powerInfo(budget).eligible){spent+=P.powerInfo(budget).cost;assert(P.upgrade(budget).ok);}
assert.equal(budget.fireRank,99);assert.equal(spent,13550);assert(budget.candy>0);
console.log('PASS: 99 progress-gated fire upgrades, 100→2000 damage, chapter-six cap 500, cosmetic isolation, legacy migration and complete one-star income budget.');
const questMoney=P.normalize();P.win(questMoney,0,3);P.win(questMoney,1,3);const beforeQuest=questMoney.candy;const receipt=P.win(questMoney,2,3);assert.equal(receipt.totalCurrency,questMoney.candy-beforeQuest);assert.equal(receipt.totalCurrency,105,'Reward UI must include the completed three-star mission bonus');
