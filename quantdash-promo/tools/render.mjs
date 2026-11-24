import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill,renderMedia} from '@remotion/renderer';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),publicDir:path.join(root,'public')});
const browser=await openBrowser('chrome',{browserExecutable:'/usr/bin/chromium',chromeMode:'chrome-for-testing',logLevel:'error'});
const composition=await selectComposition({serveUrl,id:'QuantDashPromo',inputProps:{bgm:true},puppeteerInstance:browser,logLevel:'error'});
try{
 if(process.argv.includes('--stills')){
  fs.mkdirSync(path.join(root,'out/qa/frames'),{recursive:true});
  for(const frame of [45,90,150,180,210,250,285,345,405,480,540,585,660,710,745,790,840,899]){
   await renderStill({serveUrl,composition,frame,inputProps:{bgm:true},output:path.join(root,`out/qa/frames/f${frame}.png`),imageFormat:'png',puppeteerInstance:browser,logLevel:'error'});console.log('Still',frame);
  }
 }
 if(process.argv.includes('--render')){
  // Both exports use the same bundle, composition, deterministic frame source and SFX.
  for(const bgm of (process.argv.includes('--nobgm-only')?[false]:[true,false])){
   // renderMedia uses composition.props as resolved props. Resolve per variant;
   // changing inputProps alone leaves the selected composition at bgm:true.
   const selected=await selectComposition({serveUrl,id:'QuantDashPromo',inputProps:{bgm},puppeteerInstance:browser,logLevel:'error'});
   let last=-1;
   await renderMedia({serveUrl,composition:selected,inputProps:{bgm},outputLocation:path.join(root,`out/quantdash-30s-v1${bgm?'':'-nobgm'}.mp4`),codec:'h264',pixelFormat:'yuv420p',audioCodec:'aac',sampleRate:48000,audioBitrate:'160k',crf:20,x264Preset:'medium',colorSpace:'bt709',concurrency:2,puppeteerInstance:browser,logLevel:'error',onProgress:p=>{const k=Math.floor(p.progress*10);if(k!==last){last=k;console.log(bgm?'Music':'SFX only',`${k*10}%`);}}});
  }
 }
} finally {await browser.close({silent:true});}
