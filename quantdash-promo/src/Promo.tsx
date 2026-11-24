import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Img, Sequence, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';

export const SHOTS = [
  {id:'opening',from:0,duration:120,title:'把时间留给研究'},
  {id:'markets',from:120,duration:180,title:'四个市场，一套接口'},
  {id:'python',from:300,duration:210,title:'用 Python 连接数据'},
  {id:'capabilities',from:510,duration:180,title:'从行情到研究流程'},
  {id:'brand',from:690,duration:210,title:'QuantDash 官网入口'},
] as const;
const C={bg:'#07121E',panel:'#0C1E2F',text:'#F0F6FC',muted:'#94A9BE',accent:'#66E2D1',line:'#294357'};
const sans='"QD Sans", "Noto Sans CJK SC", sans-serif';
const mono='"QD Mono", "DejaVu Sans Mono", monospace';
export const clamp=(x:number)=>Math.min(1,Math.max(0,x));
export const out=(x:number)=>1-Math.pow(1-clamp(x),3);
const smooth=(x:number)=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const seg=(x:number,a:number,b:number,e:(x:number)=>number=out)=>e(clamp((x-a)/(b-a)));
const mix=(a:number,b:number,x:number)=>a+(b-a)*x;

function Reveal({children,at=0,y=30,style={}}:{children:React.ReactNode;at?:number;y?:number;style?:React.CSSProperties}){
 const f=useCurrentFrame(),p=seg(f,at,at+24);
 return <div style={{opacity:p,transform:`translateY(${(1-p)*y}px)`,...style}}>{children}</div>;
}
const Wordmark:React.FC<{size?:number}> = ({size=45})=><span style={{fontFamily:sans,fontSize:size,fontWeight:800,letterSpacing:-size*.045}}>Quant<span style={{color:C.accent}}>Dash</span></span>;
const Kicker:React.FC<{children:React.ReactNode}>=({children})=><div style={{fontFamily:mono,fontSize:23,letterSpacing:4,color:C.muted,marginBottom:30}}>{children}</div>;
const Subtitle:React.FC<{children:React.ReactNode;at?:number}>=({children,at=12})=><Reveal at={at} style={{fontSize:40,lineHeight:1.7,color:C.muted}}>{children}</Reveal>;
const Label:React.FC<{children:React.ReactNode}>=({children})=><div style={{display:'inline-flex',padding:'14px 26px',border:`1px solid ${C.line}`,borderRadius:40,fontSize:30,color:C.accent,background:'#0D272B'}}>{children}</div>;

function Ambient(){
 return <AbsoluteFill style={{background:C.bg}}>
  <AbsoluteFill style={{background:'radial-gradient(ellipse at 90% 44%, #10353677, transparent 55%), radial-gradient(ellipse at 0% 20%,#142C4C77,transparent 60%)'}}/>
  <svg width={1080} height={1920} style={{position:'absolute',opacity:.18}}><defs><pattern id="grid" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M 90 0 L 0 0 0 90" fill="none" stroke="#537086" strokeWidth="1"/></pattern><radialGradient id="fade"><stop stopColor="white"/><stop offset="1" stopColor="black"/></radialGradient><mask id="mask"><rect width="1080" height="1920" fill="url(#fade)"/></mask></defs><rect width="1080" height="1920" fill="url(#grid)" mask="url(#mask)"/></svg>
 </AbsoluteFill>;
}

function Opening(){
 const f=useCurrentFrame(),p=seg(f,18,80);
 return <AbsoluteFill>
  <div style={{position:'absolute',left:84,top:420}}>
   <Reveal><Kicker>DATA FOR YOUR NEXT IDEA</Kicker></Reveal>
   <Reveal at={3}><div style={{fontSize:112,fontWeight:750,lineHeight:1.3,letterSpacing:-5}}>把时间<br/>留给<span style={{color:C.accent}}>研究。</span></div></Reveal>
   <div style={{marginTop:46}}><Subtitle at={24}>多市场金融数据服务</Subtitle></div>
   <Reveal at={42} style={{marginTop:38}}><Label>A 股 · ETF · 港股 · 美股</Label></Reveal>
  </div>
  <div style={{position:'absolute',left:84,top:1190,width:912}}>
   <svg viewBox="0 0 912 270" width={912} height={270}>
    {[45,110,175,240].map(y=><line key={y} x1="0" x2="912" y1={y} y2={y} stroke={C.line} opacity=".55"/>)}
    <path d="M0 183 C60 183 72 120 135 120 S205 177 260 177 S330 87 390 87 S460 141 520 141 S585 85 650 85 S730 133 790 133 S852 65 910 65" fill="none" stroke={C.accent} strokeWidth="4" pathLength={1} strokeDasharray={1} strokeDashoffset={1-p}/>
    {[.15,.43,.72].map((x,i)=><circle key={i} cx={x*912} cy={[120,87,85][i]} r={6} fill={C.accent} opacity={seg(f,34+i*12,42+i*12)}/>)}
   </svg>
   <div style={{marginTop:32,fontFamily:mono,fontSize:22,letterSpacing:2,color:C.muted}}>LESS FRICTION. MORE RESEARCH.</div>
  </div>
 </AbsoluteFill>;
}

// Adapted from shotcraft's precise arc-length curve traversal (1600 samples).
const YS=[80,220,360,500],N=1600;
function point(y:number,u:number){const v=1-u;return {x:v*v*v*100+3*v*v*u*350+3*v*u*u*470+u*u*u*720,y:v*v*v*y+3*v*v*u*y+3*v*u*u*290+u*u*u*290};}
const curves=YS.map(y=>{
 const cum=[0];let old=point(y,0),sum=0;
 for(let j=1;j<=N;j++){const p=point(y,j/N);sum+=Math.hypot(p.x-old.x,p.y-old.y);cum.push(sum);old=p;}
 const len=100+sum;
 const at=(fraction:number)=>{const target=clamp(fraction)*len;if(target<=100)return {x:target,y};let lo=1,hi=N;while(lo<hi){const m=(lo+hi)>>1;if(cum[m]<target-100)lo=m+1;else hi=m;}const i=lo;return point(y,(i-1+(target-100-cum[i-1])/(cum[i]-cum[i-1]))/N);};
 return {len,f0:100/len,at};
});
function Markets(){
 const f=useCurrentFrame(),t=clamp(f/160),conv=seg(t,.34,.74,smooth),erase=seg(t,.78,.9),pan=seg(t,.76,.93,smooth)*280;
 const bp=seg(t,.16,.26),pulse=1+seg(t,.7,.78)*.12-seg(t,.78,.86)*.12;
 return <AbsoluteFill>
  <div style={{position:'absolute',left:84,top:350}}><Reveal><Kicker>MULTI-MARKET / ONE INTERFACE</Kicker></Reveal><Reveal at={4}><div style={{fontSize:100,fontWeight:750,lineHeight:1.35,letterSpacing:-4}}>四个市场。<br/><span style={{color:C.accent}}>一套接口。</span></div></Reveal></div>
  <div style={{position:'absolute',left:90,top:850,transform:`translateX(${-pan}px)`}}>
   <svg width={900} height={620} viewBox="0 0 900 620" style={{overflow:'visible'}}>
    {YS.map((y,i)=>{
     const g=curves[i],draw=seg(t,.04+i*.045,.21+i*.045),pt=g.at(g.f0+(1-g.f0)*conv);
     const diameter=conv<.75?mix(106,36,conv/.75):mix(36,0,(conv-.75)/.25);
     const appear=seg(t,.02+i*.04,.12+i*.04);
     const pk=(seg(t,.1,.74,x=>x)*2+i*.13)%1,packet=g.at(g.f0+(1-g.f0)*pk);
     const on=seg(t,.1,.16)*(1-seg(t,.7,.76));
     return <g key={i}>
      <path d={`M0 ${y} L100 ${y} C350 ${y} 470 290 720 290`} stroke={C.line} strokeWidth="3" fill="none" strokeDasharray={g.len} strokeDashoffset={erase>0?-erase*g.len:g.len*(1-draw)} opacity={draw*(1-clamp((erase-.85)/.15))}/>
      <circle cx={packet.x} cy={packet.y} r={6} fill={C.accent} opacity={on}/>
      <g transform={`translate(${pt.x} ${pt.y}) scale(${diameter/106*appear})`} opacity={appear*(conv>.92?(1-conv)/.08:1)}>
       <circle r={53} fill="#E2E8EA" stroke="#FFFFFF55" strokeWidth={1}/><text textAnchor="middle" dominantBaseline="central" fill="#172B3B" fontSize={35} fontWeight={750}>{['A股','ETF','港股','美股'][i]}</text>
      </g>
     </g>;
    })}
    <g transform={`translate(720 290) scale(${mix(.7,1,bp)*pulse})`} opacity={bp}><circle r="108" fill={C.panel} stroke={C.accent} strokeWidth="2"/><text textAnchor="middle" dominantBaseline="central" fill={C.accent} fontSize="34" fontWeight="800">QuantDash</text><text textAnchor="middle" y="49" fill={C.muted} fontSize="20" letterSpacing="3">DATA API</text></g>
   </svg>
  </div>
  <div style={{position:'absolute',top:1505,left:84,right:84}}><Subtitle at={120}>A 股 · ETF · 港股 · 美股<br/>同一调用方式，切换标的代码。</Subtitle></div>
 </AbsoluteFill>;
}

const CODE=[
 [['from ',C.accent],['quantdash ',C.text],['import ',C.accent],['QuantDash',C.text]],
 [],
 [['qd',C.text],[' = ',C.muted],['QuantDash()',C.text]],
 [['df',C.text],[' = qd.klines.',C.muted],['get(',C.accent]],
 [['    "600519.SH",','#F4CD92']],
 [['    period',C.text],['=',C.muted],['"1d",','#F4CD92']],
 [['    count',C.text],['=',C.muted],['5,','#F4CD92']],
 [['    to_dataframe',C.text],['=',C.muted],['True,',C.accent]],
 [[')',C.accent]],
] as [string,string][][];
function Python(){
 const f=useCurrentFrame();
 return <AbsoluteFill>
  <div style={{position:'absolute',left:84,top:350}}><Reveal><Kicker>PYTHON SDK / OFFICIAL EXAMPLE</Kicker></Reveal><Reveal at={4}><div style={{fontSize:89,fontWeight:750,lineHeight:1.4,letterSpacing:-4}}>用熟悉的 Python，<br/><span style={{color:C.accent}}>连接数据。</span></div></Reveal></div>
  <Reveal at={16} style={{position:'absolute',left:80,right:80,top:785}}>
   <div style={{background:C.panel,border:`2px solid ${C.line}`,borderRadius:28,overflow:'hidden',boxShadow:'0 32px 90px #0005'}}>
    <div style={{height:92,display:'flex',alignItems:'center',gap:12,padding:'0 35px',borderBottom:`1px solid ${C.line}`}}>{[0,1,2].map(i=><span key={i} style={{width:13,height:13,borderRadius:'50%',background:'#78909E66'}}/>)}<span style={{fontFamily:mono,fontSize:26,color:C.muted,marginLeft:22}}>quickstart.py</span></div>
    <div style={{padding:'36px 36px 44px',fontFamily:mono,fontSize:36,lineHeight:'61px',whiteSpace:'pre'}}>
     {CODE.map((row,i)=>{const p=seg(f,35+i*7,43+i*7);return <div key={i} style={{opacity:p,transform:`translateX(${(1-p)*-8}px)`,height:61}}><span style={{display:'inline-block',width:42,fontSize:24,color:'#688093'}}>{i+1}</span>{row.map(([text,color],j)=><span key={j} style={{color}}>{text}</span>)}</div>;})}
    </div>
   </div>
   <Reveal at={103} style={{display:'flex',justifyContent:'space-between',marginTop:32,alignItems:'center'}}><Label>配置 API Key 后调用</Label><span style={{fontFamily:mono,fontSize:29,color:C.muted}}>pip install quantdash</span></Reveal>
  </Reveal>
 </AbsoluteFill>;
}

function MiniChart({progress=1}:{progress?:number}){
 return <svg width={650} height={75} viewBox="0 0 650 140">{Array.from({length:23},(_,i)=>{const v=38+Math.sin(i*1.31)*16+Math.cos(i*.63)*12;return <g key={i} opacity={seg(progress,Math.min(.8,i*.025),Math.min(.98,.18+i*.025))}><line x1={14+i*27} x2={14+i*27} y1={v-14} y2={v+55} stroke={i%3?C.accent:'#94A9BE'} strokeWidth="2"/><rect x={7+i*27} y={v} width={14} height={24+(i%4)*6} rx={2} fill={i%3?C.accent:'#94A9BE'}/></g>;})}</svg>;
}
function Capabilities(){
 const f=useCurrentFrame();
 const cards=[{n:'01',title:'K 线数据',sub:'日 K 示例 · 复权参数',kind:'chart'},{n:'02',title:'A 股行情快照',sub:'全市场快照，一次获取',kind:'quotes'},{n:'03',title:'DataFrame 输出',sub:'接入你的 Python 研究流程',kind:'data'}];
 return <AbsoluteFill>
  <div style={{position:'absolute',left:84,top:350}}><Reveal><Kicker>BUILT FOR YOUR RESEARCH</Kicker></Reveal><Reveal at={4}><div style={{fontSize:91,fontWeight:750,lineHeight:1.4,letterSpacing:-4}}>从行情，<br/>到你的<span style={{color:C.accent}}>研究流程。</span></div></Reveal></div>
  <div style={{position:'absolute',left:80,right:80,top:790,display:'flex',flexDirection:'column',gap:25}}>
   {cards.map((c,i)=>{const p=seg(f,15+i*19,39+i*19);return <div key={c.n} style={{height:245,background:`linear-gradient(110deg, ${C.panel},#0D222E)`,border:`1px solid ${C.line}`,borderRadius:24,padding:'25px 34px',overflow:'hidden',boxSizing:'border-box',opacity:p,transform:`translateY(${(1-p)*40}px)`}}>
    <div style={{display:'flex',alignItems:'center',gap:23,lineHeight:1.25}}><span style={{fontFamily:mono,fontSize:23,color:C.accent}}>{c.n}</span><span style={{fontSize:48,fontWeight:700}}>{c.title}</span></div>
    <div style={{marginLeft:60,marginTop:8,fontSize:34,lineHeight:1.5,color:C.muted}}>{c.sub}</div>
    <div style={{marginLeft:60,marginTop:8,height:80,overflow:'hidden'}}>
     {c.kind==='chart'?<MiniChart progress={p}/>:c.kind==='quotes'?<div style={{display:'flex',gap:18,marginTop:16}}>{['600519.SH','000001.SZ','…'].map((s,j)=><span key={s} style={{fontFamily:mono,fontSize:30,color:j===2?C.accent:C.text,borderBottom:`2px solid ${C.line}`,padding:'0 12px 12px 0'}}>{s}</span>)}</div>:<div style={{fontFamily:mono,fontSize:34,lineHeight:1.8,color:C.accent}}>→ pandas.DataFrame</div>}
    </div>
   </div>;})}
  </div>
  <div style={{position:'absolute',top:1650,left:84,fontSize:36,color:C.muted}}>功能示意 · 非产品界面或实时行情</div>
 </AbsoluteFill>;
}

function Brand(){
 const f=useCurrentFrame(),t=clamp(f/131),shrink=seg(t,.02,.28,smooth),brake=Math.sin(seg(t,.26,.37,x=>x)*Math.PI)*.06;
 const scale=mix(5.4,1,shrink)*(1+brake),shift=seg(t,.34,.47,smooth)*-318,mark=seg(t,.24,.32),wave=seg(t,.28,.46);
 return <AbsoluteFill>
  <div style={{position:'absolute',left:0,right:0,top:405,textAlign:'center'}}><Reveal><Kicker>MULTI-MARKET FINANCIAL DATA</Kicker></Reveal></div>
  <div style={{position:'absolute',left:540,top:790,transform:`translateX(${shift}px) scale(${scale})`,width:100,height:100,marginLeft:-50,marginTop:-50}}>
   <svg width={100} height={100} style={{position:'absolute',transform:`rotate(${-150*seg(t,0,.3)}deg)`}}><circle cx={50} cy={50} r={36} fill="none" stroke={C.accent} strokeWidth={10} strokeDasharray={`${175+52*shrink} ${52*(1-shrink)}`} opacity={1-mark}/></svg>
   <span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:88,fontWeight:800,color:C.text,opacity:mark,fontFamily:sans}}>Q</span>
  </div>
  {wave>0&&wave<1&&<div style={{position:'absolute',left:540,top:790,width:120+wave*270,height:120+wave*270,transform:'translate(-50%,-50%)',border:`1px solid ${C.accent}`,borderRadius:'50%',opacity:(1-wave)*.45}}/>}
  <div style={{position:'absolute',left:306,top:724,display:'flex',alignItems:'center',height:126}}>
   {[...'QuantDash'].map((ch,i)=>{const p=seg(t,.46+i*.24/9,.56+i*.24/9);return <span key={i} style={{fontSize:105,fontWeight:800,fontFamily:sans,letterSpacing:-4,color:i>=5?C.accent:C.text,opacity:p,transform:`translateX(${(1-p)*30}px)`,filter:p<.999?`blur(${(1-p)*2.5}px)`:undefined}}>{ch}</span>;})}
  </div>
  <div style={{position:'absolute',top:955,left:80,right:80,textAlign:'center',opacity:seg(t,.72,.84)}}>
   <div style={{fontSize:49,color:C.muted,letterSpacing:4}}>为研究连接数据</div>
   <div style={{fontFamily:sans,fontSize:74,fontWeight:750,color:C.accent,letterSpacing:-2,marginTop:92}}>quantdash.net</div>
   <div style={{fontSize:37,color:C.text,marginTop:22}}>获取 API Key，开始接入</div>
  </div>
  <Reveal at={117} style={{position:'absolute',top:1318,left:80,right:80,display:'flex',alignItems:'center',justifyContent:'center',gap:42}}>
   <div style={{padding:13,background:'#fff',borderRadius:16}}><Img src={staticFile('qr-quantdash.png')} style={{width:202,height:202,display:'block'}}/></div>
   <div style={{color:C.muted,fontSize:31,lineHeight:1.8}}>扫码了解 QuantDash<br/><span style={{fontFamily:mono,fontSize:36}}>docs.quantdash.net</span></div>
  </Reveal>
 </AbsoluteFill>;
}

export const Promo: React.FC<{bgm?:boolean}>=({bgm=true})=>{
 const f=useCurrentFrame();
 const [fontHandle]=useState(()=>delayRender('Load bundled QuantDash promo fonts'));
 useEffect(()=>{Promise.all([document.fonts.load('400 40px "QD Sans"'),document.fonts.load('700 100px "QD Sans"'),document.fonts.load('400 33px "QD Mono"')]).then(()=>continueRender(fontHandle)).catch(cancelRender);},[fontHandle]);
 const scene=f<120?0:f<300?1:f<510?2:f<690?3:4;
 return <AbsoluteFill style={{fontFamily:sans,color:C.text,WebkitFontSmoothing:'antialiased'}}>
  <style>{`@font-face{font-family:'QD Sans';src:url('${staticFile('fonts/qd-sans.otf')}')}@font-face{font-family:'QD Sans';src:url('${staticFile('fonts/qd-bold.otf')}');font-weight:700 900}@font-face{font-family:'QD Mono';src:url('${staticFile('fonts/qd-mono.ttf')}')}`}</style>
  <Ambient/>
  <div style={{position:'absolute',left:84,top:150,right:84,display:'flex',alignItems:'center',justifyContent:'space-between',opacity:scene===4?.4:1}}><Wordmark/><span style={{fontSize:24,color:C.muted,letterSpacing:2}}>产品介绍</span></div>
  <Sequence from={0} durationInFrames={120}><Opening/></Sequence>
  <Sequence from={120} durationInFrames={180}><Markets/></Sequence>
  <Sequence from={300} durationInFrames={210}><Python/></Sequence>
  <Sequence from={510} durationInFrames={180}><Capabilities/></Sequence>
  <Sequence from={690} durationInFrames={210}><Brand/></Sequence>
  <div style={{position:'absolute',left:84,right:84,bottom:138,display:'flex',alignItems:'center',gap:16}}>{SHOTS.map((s,i)=><div key={s.id} style={{height:3,flex:1,background:C.line}}><div style={{height:3,width:`${clamp((f-s.from)/s.duration)*100}%`,background:i<=scene?C.accent:C.line}}/></div>)}<span style={{fontFamily:mono,fontSize:20,color:C.muted,marginLeft:13}}>{String(scene+1).padStart(2,'0')} / 05</span></div>
  {bgm&&<Audio src={staticFile('audio/music.wav')} volume={1}/>}
  <Audio src={staticFile('audio/sfx.wav')} volume={1}/>
 </AbsoluteFill>;
};
