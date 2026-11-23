const assert=require('node:assert/strict'),P=require('../build/progress.js'),S=require('../build/score.js'),D=require('../build/levels.js');
const ideal={won:true,shots:5,par:5,productive:5,combo:20};
assert.equal(S.evaluate(ideal).score,100);assert.equal(S.evaluate({...ideal,won:false}).stars,0);
for(const [over,grade]of [[0,'S'],[3,'A'],[6,'B']])assert.equal(S.evaluate({...ideal,shots:5+over,productive:5+over}).grade,grade);
assert.equal(S.evaluate({...ideal,shots:20,productive:0,combo:0}).grade,'C');
assert.notEqual(S.evaluate({...ideal,mode:'defense',lives:2}).grade,'S');assert.notEqual(S.evaluate({...ideal,mode:'timed',elapsed:90,limit:100}).grade,'S');
assert.equal(S.evaluate({...ideal,productive:999}).parts.accuracy,15);
// A first S grants exactly one additional ordinary item, not repeatable rare loot.
let p=P.normalize(),r=P.win(p,0,1,{grade:'C',score:50});assert.equal(r.amount,30);assert.equal(r.totalCurrency,30);
r=P.win(p,0,3,{grade:'S',score:100,random:()=>0});assert.equal(r.amount,25);assert.equal(p.inventory.balls,1);assert.equal(p.bestGrades[0],'S');
r=P.win(p,0,3,{grade:'S',score:100,random:()=>.999});assert.equal(r.amount,5);assert.equal(p.inventory.guard,0);assert.equal(p.inventory.balls,1);
r=P.win(p,0,1,{grade:'C',score:45});assert.equal(r.amount,5);assert.equal(p.bestScores[0],100);assert.equal(p.stars[0],3);
p=P.normalize(JSON.parse(JSON.stringify(p)));P.win(p,0,3,{grade:'S',score:100});assert.equal(p.inventory.balls,1);
// Every final boss has a one-time independent treasure and collectible.
for(let w=0;w<10;w++){p=P.normalize();r=P.win(p,w*30+29,1,{grade:'B',score:65});assert.equal(r.totalCurrency,30+w*5+5+100+w*20+100);assert(p.bossClaims[w]);assert(p.inventory.balls>=1);assert(p.inventory.guard>=2);const cash=p.candy;r=P.win(p,w*30+29,1,{grade:'B',score:65});assert.equal(p.candy,cash+5);assert.equal(r.rewards.length,0);p=P.normalize(p);assert(p.bossClaims[w]);}
// Hidden S gets ordinary S loot alongside the one-time rare first reward.
p=P.normalize();p.stars[4]=1;P.unlockHidden(p,'h-0-0');r=P.winHidden(p,'h-0-0',{grade:'S',score:100,random:()=>.5});assert.equal(r.amount,80);assert.equal(p.inventory.rewind,1);assert.equal(p.inventory.aim,1);P.winHidden(p,'h-0-0',{grade:'S',score:100});assert.equal(p.inventory.rewind,1);assert.equal(p.inventory.aim,1);
// Legacy progress survives without fabricating historical scores or S claims.
p=P.normalize({version:4,economyVersion:1,candy:123,stars:{0:2},claimed:{0:true}});assert.equal(p.candy,123);assert.equal(p.stars[0],2);assert.equal(p.bestScores[0],undefined);assert(!p.perfectClaims[0]);assert(p.seenEnemies['0-j']);assert(!p.seenEnemies['9-K']);
const before=JSON.stringify(p.seenEnemies);assert(!P.discover(p,D.levels[0],'j'));assert.equal(JSON.stringify(p.seenEnemies),before);
// Low-grade progression can afford all 50 upgrades without purchases or adverts.
p=P.normalize();for(let i=0;i<300;i++){while(P.upgrade(p).ok){}assert(P.canEnter(p,i));P.win(p,i,1,{grade:'C',score:45});}while(P.upgrade(p).ok){}assert.equal(p.fireRank,50);assert(p.candy>=0);
// Deterministic fixed HP per token; normalized pressure never falls within a world.
for(let w=0;w<10;w++){const a=D.levels.slice(w*30,w*30+30);for(let i=1;i<30;i++)assert(a[i].healthBudget*a[i-1].balls>=a[i-1].healthBudget*a[i].balls);for(const l of a){assert.equal(l.healthBudget,l.waves.flat().filter(t=>'jbK'.includes(t[0])).reduce((n,t)=>n+Number(t.slice(1)),l.boss?8:0));assert(l.waves.flat().filter(t=>'jbK'.includes(t[0])).every(t=>Number.isInteger(Number(t.slice(1)))))}}
console.log('PASS: score thresholds, fail/no score, reward improvement, first-S RNG/once, all boss chests/once, hidden rare isolation, save migration/discovery, C-grade upgrade budget, and 300 monotonic chapter pressure budgets.');
