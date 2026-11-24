/* Exercise the actual published SDK normalization/callback path, with a local host. */
const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
const R=path.resolve(__dirname,'..'),fixture=cp.execFileSync('python',[path.join(__dirname,'fetch_sdk_reference.py')],{encoding:'utf8'}).trim();
const sdk=fs.readFileSync(fixture,'utf8'),source=fs.readFileSync(path.join(R,'build/storage.js'),'utf8'),G='apu-candy-v1',A='apu-audio-v2',settle=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
function boot({version=false,emptyStyle='null',data={},webData={},unsupported=false,ioFail=false,adapter=source}={}){
 const native=new Map(Object.entries(data)),local=new Map(Object.entries(webData)),calls=[];
 const root={CandyRelease:{playtest:false,version:'1.0.2'},addEventListener(){},dispatchEvent(){},location:{href:'https://sdk-test.invalid/'},navigator:{userAgent:'SDK contract test'},document:{addEventListener(){}},localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)}};
 if(version)root.$xhs={launchOptions:{miniToolEnv:{buildVersion:9462004}}};
 root.xhsInvoke={postMessage(raw){const p=JSON.parse(raw);calls.push(p);queueMicrotask(()=>{
  let reply={code:0,data:{}};const k=p.message?.key;
  if(p.event==='getLaunchOptions')reply={code:0,data:root.$xhs?.launchOptions||{}};
  else if(p.event==='getStorage'){
   if(unsupported)reply={code:10002,msg:'API unavailable'};
   else if(ioFail&&k===G)reply={code:50101,msg:'storage I/O failed'};
   else if(native.has(k))reply={code:0,data:native.get(k)};
   else if(emptyStyle==='omitted')reply={code:0};
   else if(emptyStyle==='empty-string')reply={code:0,data:{data:''}};
   else if(emptyStyle==='not-found')reply={code:-1,msg:'key does not exist'};
   else reply={code:0,data:{data:null}};
  }else if(p.event==='getStorageInfo')reply={code:0,data:{keys:[...native.keys()],usedBytes:0,limitBytes:10485760}};
  else if(p.event==='setStorage'){native.set(k,{data:p.message.data});reply={code:0};}
  root.XHS_SDK_INVOKE_CALLBACKS(JSON.stringify(reply),p.callbackId);
 });}};
 const context={window:root,document:root.document,navigator:root.navigator,console,performance,TextEncoder,URL,AbortController,setTimeout,clearTimeout};vm.runInNewContext(sdk,context);assert.equal(root.xhs.miniTool.version,'0.7.1');vm.runInNewContext(adapter,context);return {store:root.CandyStore,native,local,calls};
}
(async()=>{
 const old=cp.execFileSync('git',['show','8bc6c71849d47c174aa21fd5933e24089170d20a:dragon-bubbles/build/storage.js'],{cwd:R,encoding:'utf8'});
 let h=boot({data:{[G]:{data:JSON.stringify({candy:52})}},adapter:old});await settle();assert(!h.store.status().loaded);assert.equal(h.store.status().issue.phase,'read');
 h=boot({version:true,emptyStyle:'omitted',adapter:old});await settle();assert(!h.store.status().loaded);assert.equal(h.store.status().issue.phase,'read');
 const cases=[];
 h=boot({data:{[G]:{data:JSON.stringify({candy:52})}}});await h.store.ready;assert.equal(h.store.read(G).candy,52);assert(!h.calls.some(p=>p.event==='getLaunchOptions'));assert(await h.store.write(G,{candy:50}));assert.equal(JSON.parse(h.native.get(G).data).candy,50);cases.push('missing version metadata no longer blocks boot');
 for(const emptyStyle of ['null','omitted','empty-string','not-found']){h=boot({emptyStyle});await h.store.ready;assert.equal(h.store.read(G),null);assert(await h.store.write(G,{candy:0}));assert.equal(JSON.parse(h.native.get(G).data).candy,0);cases.push('empty cache: '+emptyStyle);}
 h=boot({data:{[G]:{data:{candy:83}},[A]:{data:{enabled:false}}}});await h.store.ready;assert.equal(h.store.read(G).candy,83);assert.equal(h.store.read(A).enabled,false);cases.push('object values inside data');
 h=boot({data:{[G]:{version:9,candy:91,stars:{0:1}}}});await h.store.ready;assert.equal(h.store.read(G).candy,91);assert.equal(h.store.read(G).errMsg,undefined);cases.push('SDK flattening of direct object values');
 h=boot({unsupported:true,data:{[G]:{data:'{"candy":100}'}},webData:{[G]:'{"candy":17}'}});await h.store.ready;assert.equal(h.store.status().mode,'browser');assert.equal(h.store.read(G).candy,17);assert(await h.store.write(G,{candy:16}));assert(!h.calls.some(p=>p.event==='setStorage'));cases.push('unsupported host automatically uses browser storage');
 h=boot({ioFail:true,data:{[G]:{data:'{"candy":100}'}},webData:{[G]:'{"candy":17}'}});await settle();assert(!h.store.status().loaded);assert.equal(Number(h.store.status().issue.code),50101);assert(h.store.startPreview());await h.store.ready;assert.equal(await h.store.write(G,{candy:0}),false);assert.equal(h.local.get(G),'{"candy":17}');assert(!h.calls.some(p=>p.event==='setStorage'));cases.push('real I/O errors preserve saves; opt-in preview does not write');
 fs.writeFileSync(path.join(__dirname,'sdk-storage-1.0.2.json'),JSON.stringify({version:'1.0.2',sdk:'published JS SDK 0.7.1 from @skillbuilder/miniapp-simulator@0.2.12',reproduces_1_0_1_blocked_startup:true,native_host_is_mocked:true,checks:cases},null,2)+'\n');console.log('PASS:',cases.length,'published SDK scenarios; reproduced two old boot blockers.');
})().catch(e=>{console.error(e);process.exitCode=1;});
