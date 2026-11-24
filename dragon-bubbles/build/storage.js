/* Local save adapter. Native cache is authoritative; browser copies are recovery journals. */
((root)=>{
 'use strict';
 const gameKey=window.CandyRelease.playtest?'apu-candy-playtest-v1':'apu-candy-v1',audioKey='apu-audio-v2',keys=[gameKey,audioKey];
 const states=new Map(),listeners=new Set();let provider=null,mode='loading',loaded=false,loading=false,issue=null,epoch=0;
 let resolveReady;const ready=new Promise(resolve=>{resolveReady=resolve;});
 const suffix={journal:':pending',native:':native',recovery:':recovery'};
 const webRead=key=>{try{return {ok:true,data:root.localStorage.getItem(key)};}catch(_){return {ok:false,data:null};}};
 const webWrite=(key,data)=>{try{root.localStorage.setItem(key,data);return true;}catch(_){return false;}};
 const webRemove=key=>{try{root.localStorage.removeItem(key);}catch(_){}};
 function object(raw){if(raw===null)return null;const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid saved object');return value;}
 function meta(key,type){const r=webRead(key+suffix[type]);if(!r.ok||r.data===null)return null;try{return JSON.parse(r.data);}catch(_){return null;}}
 function status(){return {mode,loaded,loading,issue:issue?{...issue}:null,pending:[...states.values()].filter(s=>s.pending!==null).length,busy:[...states.values()].some(s=>s.running!==null)};}
 function notify(){const value=status();for(const fn of listeners){try{fn(value);}catch(_){}}}
 function problem(phase,key,fresh=false,slow=false){issue={phase,key,canStartFresh:fresh,slow};notify();}
 function timeout(promise){return new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(Error('Read timeout')),4000);Promise.resolve(promise).then(value=>{clearTimeout(id);resolve(value);},error=>{clearTimeout(id);reject(error);});});}
 function invoke(api,name,params){let result;try{result=api[name](params);}catch(error){return Promise.reject(error);}if(result===undefined)return Promise.reject(Error('Missing bridge result'));return Promise.resolve(result).then(value=>{if(!value||typeof value!=='object')throw Error('Invalid bridge result');if(typeof value.errMsg==='string'&&!value.errMsg.endsWith(':ok'))throw Error(value.errMsg);return value;});}
 async function nativeProvider(){
  const xhs=root.xhs,api=xhs&&xhs.miniTool;if(!api||typeof api.getStorage!=='function'||typeof api.setStorage!=='function')return null;
  let build=Number(xhs.launchOptions&&xhs.launchOptions.miniToolEnv&&xhs.launchOptions.miniToolEnv.buildVersion)||0;
  if(!build&&typeof api.getLaunchOptions==='function'){const launch=await timeout(invoke(api,'getLaunchOptions',{}));build=Number(launch&&launch.miniToolEnv&&launch.miniToolEnv.buildVersion)||0;}
  if(!build)throw Error('Unknown client version');
  return Math.floor(build/1000)>=9460?api:null;
 }
 function rememberNative(s){webWrite(s.key+suffix.native,JSON.stringify({data:s.committed}));}
 function journal(s){
  if(mode!=='native'){
   const previous=meta(s.key,'native');if(previous&&Object.hasOwn(previous,'data'))webWrite(s.key+suffix.journal,JSON.stringify({v:1,data:s.value,bases:[previous.data]}));
   return;
  }
  if(s.pending===null){webRemove(s.key+suffix.journal);return;}
  const bases=[s.committed];if(s.inflight!==null&&!bases.includes(s.inflight))bases.push(s.inflight);
  webWrite(s.key+suffix.journal,JSON.stringify({v:1,data:s.pending,bases}));
 }
 function clearWriteIssue(){if(loaded&&![...states.values()].some(s=>s.pending!==null)){issue=null;notify();}}
 function drain(s){
  if(s.running)return s.running;
  s.running=Promise.resolve().then(async()=>{
   while(s.pending!==null){
    const data=s.pending;s.inflight=data;journal(s);let slowTimer;
    try{
     if(mode==='native'){
      // A slow write keeps its lock until the real bridge settles. A timeout must
      // never start a second writer while the older operation can still commit.
      slowTimer=setTimeout(()=>problem('write',s.key,false,true),4000);
      await invoke(provider,'setStorage',{key:s.key,data});
     }else if(!webWrite(s.key,data))throw Error('Browser write failed');
     s.committed=data;s.inflight=null;
     if(s.pending===data)s.pending=null;
     if(mode==='native'){rememberNative(s);if(s.pending===null)webWrite(s.key,data);}
     journal(s);
    }catch(_){s.inflight=null;problem('write',s.key);return false;}
    finally{clearTimeout(slowTimer);}
   }
   clearWriteIssue();return true;
  }).finally(()=>{s.running=null;clearWriteIssue();notify();});
  notify();return s.running;
 }
 async function initialize(ignoreLegacy=false){
  if(loading)return false;loading=true;issue=null;const token=++epoch;notify();let staged=[],api;
  try{
   api=await nativeProvider();
   for(const key of keys){
    const web=webRead(key);let value=null,committed=null,pending=null;
    if(api){
     const reply=await timeout(invoke(api,'getStorage',{key}));
     if(!reply||!Object.hasOwn(reply,'data')||(reply.data!==null&&typeof reply.data!=='string'))throw Error('Invalid cache response');
     committed=reply.data;object(committed);
     value=committed;
     const record=meta(key,'journal');let validJournal=false;
     if(record&&record.v===1&&typeof record.data==='string'&&Array.isArray(record.bases)){
      try{object(record.data);validJournal=true;}catch(_){}
     }
     if(validJournal&&record.data!==committed&&record.bases.includes(committed)){value=record.data;pending=value;}
     else if(validJournal&&record.data!==committed){webWrite(key+suffix.recovery,JSON.stringify(record));}
     if(value===null){
      if(!web.ok&&key===gameKey&&!(ignoreLegacy&&key===gameKey))throw Object.assign(Error('Legacy cache unreadable'),{key,fresh:true});
      if(web.ok&&web.data!==null&&!(ignoreLegacy&&key===gameKey)){try{object(web.data);value=web.data;pending=value;}catch(_){if(key===gameKey)throw Object.assign(Error('Legacy cache corrupt'),{key,fresh:true});}}
     }
    }else{
     if(!web.ok)throw Object.assign(Error('Browser cache unreadable'),{key});
     if(web.data!==null&&!(ignoreLegacy&&key===gameKey)){try{object(web.data);value=web.data;}catch(_){if(key===gameKey)throw Object.assign(Error('Browser cache corrupt'),{key,fresh:true});}}
     committed=value;
    }
    staged.push({key,value,committed,pending,inflight:null,running:null});
   }
  }catch(error){if(token===epoch){loading=false;problem('read',error.key||gameKey,!!error.fresh);}return false;}
  if(token!==epoch)return false;
  provider=api;mode=api?'native':'browser';for(const s of staged)states.set(s.key,s);
  loaded=true;loading=false;issue=null;
  for(const s of states.values()){
   if(mode==='native'){
    rememberNative(s);
    if(s.pending!==null){journal(s);webWrite(s.key,s.value);}
    else{if(s.value!==null)webWrite(s.key,s.value);webRemove(s.key+suffix.journal);}
   }
  }
  resolveReady();notify();
  for(const s of states.values())if(s.pending!==null)drain(s);
  return true;
 }
 function write(key,value){
  const s=states.get(key);if(!loaded||!s)return Promise.resolve(false);
  let data;try{data=JSON.stringify(value);object(data);}catch(_){problem('write',key);return Promise.resolve(false);}
  if(data===s.value&&s.pending===null&&s.committed===data)return Promise.resolve(true);
  s.value=data;s.pending=data;
  journal(s);if(mode==='native')webWrite(key,data);
  return drain(s);
 }
 async function flush(){if(!loaded)return false;const result=await Promise.all([...states.values()].map(s=>s.pending!==null?drain(s):Promise.resolve(true)));return result.every(Boolean);}
 root.CandyStore={ready,read(key){const s=states.get(key);return s&&s.value!==null?object(s.value):null;},write,flush,status,onChange(fn){listeners.add(fn);fn(status());return ()=>listeners.delete(fn);},retry(){return loaded?flush():initialize();},startFresh(){return !loaded&&issue&&issue.canStartFresh?initialize(true):Promise.resolve(false);}};
 if(root.document){root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden){if(loaded)flush();}else if(loaded)flush();});root.addEventListener('pagehide',()=>{if(loaded)flush();});}
 initialize();
})(window);
