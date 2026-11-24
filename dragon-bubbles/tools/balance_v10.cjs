/* Audit fixed stage HP against earned currency and upgrade availability. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../build/progress.js'),D=require('../build/levels.js');
function economy(grade,share=0){const p=P.normalize(),rows=[];for(const l of D.levels){while(P.upgrade(p).ok){}rows.push({stage:l.id,rank:p.fireRank,attack:P.attack(p),candy:p.candy});const r=P.win(p,l.id,grade==='S'?3:1,{grade,score:grade==='S'?100:grade==='A'?80:45,random:()=>0});p.candy-=Math.floor(r.totalCurrency*share);}return rows;}
const c=economy('C'),a=economy('A'),s=economy('S'),reserve=economy('C',.2);
assert.equal(c[299].rank,99);assert.equal(c[299].candy,5045);assert.equal(reserve[299].rank,99);
for(const level of D.levels){assert.equal(c[level.id].attack,P.recommendedAttack(level));assert.equal(a[level.id].attack,c[level.id].attack);assert.equal(s[level.id].attack,c[level.id].attack);assert(a[level.id].candy>=c[level.id].candy);assert(s[level.id].candy>=a[level.id].candy);assert.equal(reserve[level.id].rank,c[level.id].rank,'20% discretionary spending must not block normal upgrades');}
const rawTokens=require('node:crypto').createHash('sha256').update(JSON.stringify([...D.levels,...D.hidden].map(l=>[l.id,l.waves]))).digest('hex');assert.equal(rawTokens,'1f721197feb9eb3cd5b7b7e67563c29671285de35e41b466c5f0fcf77a8a0967');
const quantile=(values,q)=>{const sorted=values.slice().sort((a,b)=>a-b);return +sorted[Math.floor((sorted.length-1)*q)].toFixed(2);};
const report=[];
for(let world=0;world<10;world++){
 const levels=D.levels.slice(world*30,world*30+30),boss=levels[29],unit=+boss.waves.flat().find(t=>t[0]==='K').slice(1),bossOld=unit*P.healthAttack(boss),bossNew=P.enemyHealth(boss,'K',unit);
 const stats=kind=>{const rows=levels.flatMap(l=>l.waves.flat().filter(t=>t[0]===kind).map(t=>{const u=+t.slice(1),old=u*P.healthAttack(l),hp=P.enemyHealth(l,kind,u);return {old,hp,increase:hp/old-1,hits:Math.ceil(hp/c[l.id].attack)};}));return {increasePercent:[quantile(rows.map(r=>r.increase*100),0),quantile(rows.map(r=>r.increase*100),1)],medianHits:quantile(rows.map(r=>r.hits),.5),p90Hits:quantile(rows.map(r=>r.hits),.9)};};
 report.push({world:world+1,name:D.worlds[world].name,preBossRank:c[boss.id].rank,preBossAttack:c[boss.id].attack,cOnlyWallet:c[boss.id].candy,aGradeWallet:a[boss.id].candy,sGradeWallet:s[boss.id].candy,cWith20PercentSpendWallet:reserve[boss.id].candy,bossOld,bossNew,bossIncreasePercent:+((bossNew/bossOld-1)*100).toFixed(2),ordinary:stats('j'),elite:stats('b')});
 assert(bossNew>bossOld);
 for(const h of D.hidden.filter(h=>h.world===world))for(const token of h.waves.flat().filter(t=>t[0]==='K'))assert(P.enemyHealth(h,'K',+token.slice(1))<=bossNew*h.bossRatioCap);
}
for(const l of [...D.levels,...D.hidden])for(const token of l.waves.flat().filter(t=>t!=='.')){
 const kind=token[0],units=+token.slice(1),base=units*P.healthAttack(l),hp=P.enemyHealth(l,kind,units);
 assert(Number.isInteger(hp)&&hp>0);if(['j','b','K'].includes(kind))assert(hp>base);else assert.equal(hp,base,'Bomb and pickup HP must stay stable');
 // HP is a function only of frozen stage data, never of the player's save.
 assert.equal(hp,P.enemyHealth(JSON.parse(JSON.stringify(l)),kind,units));
}
assert.equal(P.enemyHealth(D.levels[299],'K',410),698000);
fs.writeFileSync(path.join(__dirname,'balance-0.10.0.json'),JSON.stringify({version:'0.10.0',formula:'oldHp * max(1,affordableFire/legacyFire)^0.70 * (1.05 + world*0.008 + local/29*0.035); elite *1.06; round mobs upward to 10; boss table',upgradeCost:13550,rewardsUnchanged:true,allCUpgradesAffordable:true,twentyPercentSpendKeepsUpgrades:true,stageHpIsFixed:true,bombsAndPickupsUnchanged:true,waveHash:rawTokens,chapters:report},null,2)+'\n');
console.log('PASS: 300 C-grade budgets and 20% discretionary spend, fixed increased HP, elite/regular pacing, all guardian caps and stable bombs/rewards.');
console.table(report.map(r=>({world:r.world,fire:r.preBossAttack,oldBoss:r.bossOld,newBoss:r.bossNew,gain:r.bossIncreasePercent+'%',ordinaryHits:r.ordinary.medianHits,eliteHits:r.elite.medianHits})));
