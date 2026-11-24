/* No timer-based or simulated ad completion. A real SDK adapter is required. */
(()=>{
 let provider=null,busy=false;
 window.CandyAds={
  register(adapter){if(!adapter||typeof adapter.showRewardedVideo!=='function')throw Error('Invalid rewarded video adapter');provider=adapter;},
  get available(){return !!provider;},
  async request(placement){
   if(!provider)return {completed:false,reason:'秘境暂未开放，可继续主线'};
   if(busy)return {completed:false,reason:'视频正在播放，请稍候'};busy=true;
   try{const result=await provider.showRewardedVideo({placement});return result?.completed===true?{completed:true}:{completed:false,reason:result?.reason||'未完整观看，隐藏关保持未解锁'};}
   catch(_){return {completed:false,reason:'视频暂时无法播放，请稍后再试'};}finally{busy=false;}
  }
 };
})();
