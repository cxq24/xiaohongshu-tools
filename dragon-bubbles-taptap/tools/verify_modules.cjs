const fs=require('node:fs'),acorn=require('acorn'),crypto=require('node:crypto');
const before=fs.readFileSync(process.argv[2],'utf8'),after=fs.readFileSync(process.argv[3],'utf8');
const a=acorn.parse(before,{ecmaVersion:'latest'}).body,b=acorn.parse(after,{ecmaVersion:'latest'}).body;
if(a.length!==b.length)throw Error('Unexpected top-level module count');
let preserved=0,replaced=[];
for(let i=0;i<a.length;i++){
 const original=before.slice(a[i].start,a[i].end),next=after.slice(b[i].start,b[i].end);
 if(/\.CandyStore\s*=/.test(original)){replaced.push('storage');continue;}
 if(/^window\.CandyRelease\s*=/.test(original)){replaced.push('release');continue;}
 const normalized=next.split('apu-taptap-h5-v1').join('apu-candy-v1').split('apu-taptap-audio-v1').join('apu-audio-v2');
 if(original!==normalized)throw Error('Gameplay module changed at index '+i);preserved++;
}
if(replaced.join(',')!=='release,storage')throw Error('Unexpected replacement set');
process.stdout.write(JSON.stringify({preserved_top_level_statements:preserved,replaced_modules:replaced,gameplay_unchanged_except_save_key_namespace:true}));
