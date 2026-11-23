/* Deterministic victory grading. No score is awarded for a failed stage. */
((root)=>{
 const grades=[{grade:'S',min:90,stars:3,bonus:20},{grade:'A',min:75,stars:2,bonus:10},{grade:'B',min:60,stars:1,bonus:5},{grade:'C',min:0,stars:1,bonus:0}];
 const bounded=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
 function evaluate(s={}){
  if(!s.won)return {score:0,grade:null,stars:0,parts:{}};
  const shots=Math.max(1,Math.floor(s.shots||1)),par=Math.max(1,s.par||6);
  const parts={clear:45,efficiency:Math.max(0,30-Math.max(0,shots-par)*5),accuracy:Math.round(15*bounded(s.productive,0,shots)/shots),control:Math.round(Math.min(10,bounded(s.combo,0,1000)/2))};
  if(s.mode==='defense')parts.control=Math.round(10*bounded(s.lives,0,3)/3);
  if(s.mode==='timed')parts.control=Math.round(10*bounded(1-(s.elapsed||0)/Math.max(1,s.limit||1),0,1));
  let score=Object.values(parts).reduce((a,b)=>a+b,0);
  if(shots>par||(s.mode==='defense'&&s.lives<3)||(s.mode==='timed'&&(s.elapsed||0)>(s.limit||1)*.85))score=Math.min(89,score);
  const rank=grades.find(g=>score>=g.min);return {score,grade:rank.grade,stars:rank.stars,parts};
 }
 const api={grades,evaluate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CandyScore=api;
})(typeof window==='undefined'?globalThis:window);
