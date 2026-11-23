const assert=require('node:assert/strict'),P=require('../build/progress.js'),D=require('../build/levels.js');
assert.equal(P.MAX_FIRE_RANK,99);assert.equal(P.attackAt(0),100);assert.equal(P.attackAt(50),1100);assert.equal(P.attackAt(99),2000);assert.equal(P.attackAt(999),2000);
for(let i=1;i<=99;i++){assert(P.attackAt(i)>P.attackAt(i-1));assert(P.fireGate(i)>=0&&P.fireGate(i)<=294);if(i>1)assert(P.fireGate(i)>P.fireGate(i-1));}
// Actual clears, not paid world ownership, control upgrade eligibility.
let p=P.normalize({version:9,economyVersion:1,candy:999999,worlds:[0,1,2,3,4,5,6,7,8,9]});assert(!P.upgrade(p).ok);assert.equal(P.powerInfo(p).capRank,0);
let spent=0;for(let stage=0;stage<300;stage++){
 while(P.powerInfo(p).eligible){const cost=P.powerInfo(p).cost;assert(P.upgrade(p).ok);spent+=cost;}
 assert.equal(P.attack(p),P.recommendedAttack(D.levels[stage]));
 P.win(p,stage,1,{grade:'C',score:45});
 const expectedCap=P.FIRE_RANK_CAPS[Math.floor(stage/30)];if(stage%30===29)assert.equal(P.powerInfo(p).capRank,expectedCap);
}
assert.equal(p.fireRank,99);assert.equal(spent,13550);assert(!P.upgrade(p).ok);
// A C-only campaign has enough income before the final boss without replay or ads.
p=P.normalize();for(let i=0;i<299;i++){while(P.upgrade(p).ok){}P.win(p,i,1,{grade:'C',score:45});}while(P.upgrade(p).ok){}assert.equal(p.fireRank,99);assert.equal(p.candy,5045);
const old={...p,version:7,fireRank:50,candy:2345,inventory:{...p.inventory,rewind:4}};let migrated=P.normalize(old);assert.equal(migrated.fireRank,50);assert.equal(P.attack(migrated),1100);assert.equal(migrated.candy,2345);assert.equal(migrated.inventory.rewind,4);assert.equal(P.normalize(migrated).fireRank,50);
assert.equal(P.healthAttack(D.levels[299]),1064);assert.equal(Number(D.levels[299].waves.flat().find(t=>t[0]==='K').slice(1))*P.healthAttack(D.levels[299]),436240);
const unlocks=P.FIRE_RANK_CAPS.map((rank,w)=>({world:w+1,rank,damage:P.attackAt(rank),lastGate:P.fireGate(rank)+1}));
require('node:fs').writeFileSync(require('node:path').join(__dirname,'growth-0.9.0.json'),JSON.stringify({version:'0.9.0',upgradeCostTotal:13550,cOnlyBeforeBossBalance:5045,highestGate:295,chapters:unlocks,old50Preserved:true,paidWorldDoesNotUnlockFire:true},null,2)+'\n');
console.log('PASS: 99 increasing upgrades, 2000 cap, chapter gates, final-boss availability, C-only budget and old Lv.50 save migration.');
