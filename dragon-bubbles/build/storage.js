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
 function problem(phase,key,fresh=false,slow=false,error=null){issue={phase,key,canStartFresh:fresh,slow,code:error?.errCode??error?.code??'',reason:String(error?.errMsg||error?.message||'').slice(0,180)};notify();}
 function timeout(promise){return new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(Error('Read timeout')),4000);Promise.resolve(promise).then(value=>{clearTimeout(id);resolve(value);},error=>{clearTimeout(id);reject(error);});});}
 function bridgeError(value){const e=new Error(String(value?.errMsg||value?.message||value||'Bridge failed'));e.errCode=value?.errCode??value?.code;return e;}
 function invoke(api,name,params={}){
  return new Promise((resolve,reject)=>{
   let done=false;
   const fail=value=>{if(!done){done=true;reject(bridgeError(value));}};
   const success=value=>{if(done)return;if(value&&typeof value==='object'&&(/:fail\b/i.test(value.errMsg||'')||(value.errCode!==undefined&&Number(value.errCode)!==0))){fail(value);return;}done=true;resolve(value);};
   try{
    // One invocation supports both callback-only and Promise bridges. Passing
    // callbacks makes the published SDK return undefined; that is not a failure.
    const result=api[name]({...params,success,fail});
    if(result&&typeof result.then==='function')result.then(success,fail);
    else if(result!==undefined)success(result);
   }catch(error){fail(error);}
  });
 }
 function unsupported(error){return Number(error?.errCode)===10002||/not supported|unsupported|not implemented|unknown (?:api|method)|(?:api|method).{0,25}(?:unavailable|not found)|xhsInvoke.{0,25}unavailable|bridge.{0,25}unavailable|不支持|未实现/i.test(error?.message||'');}
 function missing(error){
  if([10001,10101,50101,50201,15201].includes(Number(error?.errCode)))return false;
  const text=error?.message||'';if(/timeout|permission|denied|quota|encrypt|exceed|超时|权限|加密/i.test(text))return false;
  return /(?:key|data|cache|item).{0,40}(?:not found|not exist|missing)|(?:不存在|未找到|没有).{0,16}(?:缓存|数据|key)|(?:缓存|数据|key).{0,16}(?:不存在|未找到|没有)/i.test(text);
 }
 function nativeProvider(){
  const api=root.xhs?.miniTool;
  // Version metadata is optional in scan previews. Real calls, not a version
  // string, decide whether the storage capability is available.
  return api&&typeof api.getStorage==='function'&&typeof api.setStorage==='function'?api:null;
 }
 function storedValue(reply){
  let value;
  if(reply===null)value=null;
  else if(typeof reply==='string')value=reply;
  else if(reply&&typeof reply==='object'&&!Array.isArray(reply)){
   if(Object.hasOwn(reply,'data'))value=reply.data;
   else if(['stars','candy','inventory','fireRank','enabled','music','effects','voice'].some(k=>Object.hasOwn(reply,k))){value={...reply};delete value.errMsg;delete value.errCode;}
   else if(/:ok\s*$/i.test(reply.errMsg||'')||Object.keys(reply).length===0)value=null;
   else throw Error('Unknown cache response');
  }else throw Error('Missing cache response');
  if(value===null||value===undefined||value==='')return null;
  if(typeof value==='object'&&!Array.isArray(value)){const raw=JSON.stringify(value);object(raw);return raw;}
  if(typeof value==='string'){
   let parsed=JSON.parse(value);if(parsed===null)return null;
   if(typeof parsed==='string'){parsed=JSON.parse(parsed);const raw=JSON.stringify(parsed);object(raw);return raw;}
   object(value);return value;
  }
  throw Error('Invalid saved value');
 }
 async function readNative(api,key){
  try{return storedValue(await timeout(invoke(api,'getStorage',{key})));}
  catch(error){
   if(unsupported(error))throw error;
   if(typeof api.getStorageInfo==='function'){
    try{const info=await timeout(invoke(api,'getStorageInfo'));if(Array.isArray(info?.keys)){if(!info.keys.includes(key))return null;throw error;}}
    catch(infoError){if(infoError===error)throw error;}
   }
   if(missing(error))return null;
   throw error;
  }
 }
 function rememberNative(s){webWrite(s.key+suffix.native,JSON.stringify({data:s.committed}));}
 function journal(s){
  if(!s.native){
   const previous=meta(s.key,'native');if(previous&&Object.hasOwn(previous,'data'))webWrite(s.key+suffix.journal,JSON.stringify({v:1,data:s.value,bases:[previous.data]}));
   return;
  }
  if(s.pending===null){webRemove(s.key+suffix.journal);return;}
  const bases=[s.committed];if(s.inflight!==null&&!bases.includes(s.inflight))bases.push(s.inflight);
  webWrite(s.key+suffix.journal,JSON.stringify({v:1,data:s.pending,bases}));
 }
 function clearWriteIssue(){if(loaded&&mode!=='preview'&&![...states.values()].some(s=>s.pending!==null)){issue=null;notify();}}
 function drain(s){
  if(s.running)return s.running;
  s.running=Promise.resolve().then(async()=>{
   while(s.pending!==null){
    const data=s.pending;s.inflight=data;journal(s);let slowTimer;
    try{
     if(s.native){
      // A slow write keeps its lock until the real bridge settles. A timeout must
      // never start a second writer while the older operation can still commit.
      slowTimer=setTimeout(()=>problem('write',s.key,false,true),4000);
      await invoke(provider,'setStorage',{key:s.key,data});
     }else if(!webWrite(s.key,data))throw Error('Browser write failed');
     s.committed=data;s.inflight=null;
     if(s.pending===data)s.pending=null;
     if(s.native){rememberNative(s);if(s.pending===null)webWrite(s.key,data);}
     journal(s);
    }catch(error){s.inflight=null;problem('write',s.key,false,false,error);return false;}
    finally{clearTimeout(slowTimer);}
   }
   clearWriteIssue();return true;
  }).finally(()=>{s.running=null;clearWriteIssue();notify();});
  notify();return s.running;
 }
 async function initialize(ignoreLegacy=false){
  if(loading)return false;loading=true;issue=null;const token=++epoch;notify();let staged=[],api;
  try{
   api=nativeProvider();
   for(const key of keys){
    const web=webRead(key);if(web.ok&&(web.data===''||web.data?.trim()==='null'))web.data=null;let value=null,committed=null,pending=null,native=!!api;
    if(api){
     try{committed=await readNative(api,key);}
     catch(error){
      if(key===gameKey){if(unsupported(error)){api=null;native=false;}else throw Object.assign(error,{key});}
      else native=false; // Optional sound preferences cannot lock the whole game.
     }
    }
    if(native){
     value=committed;
     const record=meta(key,'journal');let validJournal=false;
     if(record&&record.v===1&&typeof record.data==='string'&&Array.isArray(record.bases)){
      try{object(record.data);validJournal=true;}catch(_){}
     }
     if(validJournal&&record.data!==committed&&record.bases.includes(committed)){value=record.data;pending=value;}
     else if(validJournal&&record.data!==committed){webWrite(key+suffix.recovery,JSON.stringify(record));}
     if(value===null&&web.ok&&web.data!==null&&!(ignoreLegacy&&key===gameKey)){
      try{object(web.data);value=web.data;pending=value;}
      catch(_){if(key===gameKey)throw Object.assign(Error('Legacy cache corrupt'),{key,fresh:true});}
     }
     // An unavailable legacy Web cache is not a reason to reject a confirmed
     // empty native cache. It is never removed or treated as an existing save.
    }else{
     if(!web.ok&&key===gameKey)throw Object.assign(Error('Browser cache unreadable'),{key});
     if(web.ok&&web.data!==null&&!(ignoreLegacy&&key===gameKey)){
      try{object(web.data);value=web.data;}
      catch(_){if(key===gameKey)throw Object.assign(Error('Browser cache corrupt'),{key,fresh:true});}
     }
     if(key===audioKey&&value===null&&api)value=JSON.stringify({enabled:false});
     committed=value;
    }
    staged.push({key,value,committed,pending,native,inflight:null,running:null});
   }
  }catch(error){if(token===epoch){loading=false;problem('read',error.key||gameKey,!!error.fresh,false,error);}return false;}
  if(token!==epoch)return false;
  provider=api;for(const s of staged)states.set(s.key,s);mode=states.get(gameKey).native?'native':'browser';
  loaded=true;loading=false;issue=null;
  for(const s of states.values()){
   if(s.native){
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
  if(mode==='preview'){s.value=data;notify();return Promise.resolve(false);}
  if(data===s.value&&s.pending===null&&s.committed===data)return Promise.resolve(true);
  s.value=data;s.pending=data;
  journal(s);if(s.native)webWrite(key,data);
  return drain(s);
 }
 async function flush(){if(!loaded||mode==='preview')return false;const result=await Promise.all([...states.values()].map(s=>s.pending!==null?drain(s):Promise.resolve(true)));return result.every(Boolean);}
 root.CandyStore={ready,read(key){const s=states.get(key);return s&&s.value!==null?object(s.value):null;},write,flush,status,onChange(fn){listeners.add(fn);fn(status());return ()=>listeners.delete(fn);},retry(){return loaded?flush():initialize();},startPreview(){if(loaded||!issue)return false;for(const key of keys){const raw=webRead(key);let value=null;try{if(raw.ok)object(raw.data);if(raw.ok)value=raw.data;}catch(_){}states.set(key,{key,value,committed:value,pending:null,native:false,inflight:null,running:null});}mode='preview';loaded=true;issue={phase:'preview',reason:'No persistent writes in preview'};resolveReady();notify();return true;},diagnostics(){return {version:root.CandyRelease.version,mode,...(issue||{})};},startFresh(){return !loaded&&issue&&issue.canStartFresh?initialize(true):Promise.resolve(false);}};
 if(root.document){root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden){if(loaded)flush();}else if(loaded)flush();});root.addEventListener('pagehide',()=>{if(loaded)flush();});}
 initialize();
})(window);
