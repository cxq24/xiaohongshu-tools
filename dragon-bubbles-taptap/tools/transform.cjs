/* Replace exactly the save and release top-level statements, keeping gameplay bytes. */
const fs=require('node:fs'),crypto=require('node:crypto'),acorn=require('acorn'),{minify}=require('terser');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 const data=JSON.parse(fs.readFileSync(0,'utf8')),source=data.app,ast=acorn.parse(source,{ecmaVersion:'latest'});
 const nodes=ast.body.filter(n=>/\.CandyStore\s*=/.test(source.slice(n.start,n.end)));
 if(nodes.length!==1)throw Error('Expected one original save module');
 const node=nodes[0],original=source.slice(node.start,node.end);
 if(hash(original)!==data.expectedStorageHash)throw Error('Source storage module drift');
 const compiled=await minify(data.adapter,{compress:{passes:3},mangle:true,format:{comments:false}});
 let output=source.slice(0,node.start)+compiled.code+source.slice(node.end);
 const parsed=acorn.parse(output,{ecmaVersion:'latest'}),release=parsed.body.filter(n=>/^window\.CandyRelease\s*=/.test(output.slice(n.start,n.end)));
 if(release.length!==1)throw Error('Expected one release declaration');
 const releaseNode=release[0],declaration='window.CandyRelease=Object.freeze({version:"1.0.0",playtest:false,platform:"taptap-h5",sourceVersion:"1.0.2-xhs-secret-prompt"});';
 output=output.slice(0,releaseNode.start)+declaration+output.slice(releaseNode.end);
 output=output.split('apu-candy-v1').join('apu-taptap-h5-v1').split('apu-audio-v2').join('apu-taptap-audio-v1');
 acorn.parse(output,{ecmaVersion:'latest'});
 if(/\.xhs\b/.test(output)||output.includes('apu-candy-v1')||output.includes('apu-audio-v2'))throw Error('Foreign platform storage remained');
 process.stdout.write(JSON.stringify({app:output,replacedStorageSha256:hash(original),adapterSha256:hash(compiled.code)}));
})().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1;});
