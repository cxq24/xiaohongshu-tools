/* Build-time only. Keep the vendored engine intact and eliminate profile branches. */
const fs=require('node:fs'),{minify}=require('terser');
(async()=>{
 const input=JSON.parse(fs.readFileSync(0,'utf8')),result={};
 for(const [name,code] of Object.entries(input.sources)){
  const output=await minify({[name]:code},{ecma:2020,compress:{passes:2,global_defs:{'window.CandyRelease.playtest':input.playtest}},mangle:true,format:{comments:false,ascii_only:false}});
  if(!output.code)throw Error('Empty compiled script: '+name);
  result[name]=output.code;
 }
 process.stdout.write(JSON.stringify(result));
})().catch(e=>{process.stderr.write(String(e.stack||e));process.exitCode=1;});
