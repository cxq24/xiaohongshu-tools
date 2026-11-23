"""Deterministic campaign authoring grammar; emits frozen, inspectable level data."""
from pathlib import Path
import json,random,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
WORLDS=[
 ('糖果森林','forest','果冻','爆米花桶','彩虹糖','#c9e4d7','#8ace8d','连锁与反弹'),
 ('泡泡海湾','bay','海盐水母','珊瑚气囊','珍珠','#94d4df','#66c4d0','水流与漂移'),
 ('冰晶雪原','ice','冰晶精灵','冰爆晶簇','极光晶','#bedde8','#99cddd','冰壳与窄道'),
 ('蘑菇秘境','mushroom','蘑菇精','孢子囊','月光菇','#bbceba','#d7a0b4','弹跳台'),
 ('齿轮工厂','factory','齿轮软泥','蒸汽罐','电池','#b7b9ae','#dcaf72','移动挡板'),
 ('沙漠遗迹','desert','沙团守卫','爆裂陶罐','日光石','#ead5ac','#d7b579','镜面石柱'),
 ('星光天文台','space','星云精灵','超新星核','星尘','#8a9bbd','#aaa7df','成对传送门'),
 ('霓虹都市','cyber','数据胶团','过载电池','能量芯片','#91afb7','#67dcc8','周期屏障'),
 ('云端群岛','sky','云团精灵','雷云气团','风铃','#c3e2e2','#bad9e2','高空风场'),
 ('梦境城堡','dream','梦境守卫','梦境火花','梦晶','#b8abc9','#dab4d7','综合机关')]
PATTERNS=[
 [0,1,5,6],[0,2,4,6],[1,2,3,4,5],[0,1,3,5,6],[0,2,3,4,6],
 [1,3,5],[0,1,2,4,5,6],[0,3,6],[1,2,4,5],[0,2,5,6],
 [0,1,4,6],[1,3,4,6],[0,2,3,5],[0,1,2,3,5],[1,2,4,5,6]]
NAMES=[['糖果林入口','软糖溪谷','彩虹小径','爆米花营地','布丁山坡','大果冻的城堡'],['潮汐入口','珊瑚浅滩','珍珠回廊','水母港湾'],['雪松小径','冰壳洞穴','极光长廊','碎冰峡谷'],['孢子林口','弹菇河岸','月光菌环','蘑菇高台'],['铜管车站','蒸汽廊桥','齿轮车间','升降大厅'],['砂岩路口','镜面遗迹','石柱迷宫','日落神庙'],['星轨码头','双生传送阵','星尘长廊','天文穹顶'],['霓虹街角','屏障通道','数据立交','芯片中枢'],['风铃空港','浮云航道','逆风栈桥','雷云平台'],['梦境门廊','万象回廊','星糖钟楼','梦之王座']]

def world_data():
 return [dict(id=i,name=x[0],key=x[1],enemy=x[2],bomb=x[3],pickup=x[4],sky=x[5],accent=x[6],mechanic=x[7],cost=0 if i==0 else round((45+5*(i-1))*30*2.5/100)*100) for i,x in enumerate(WORLDS)]

def build_level(w,local,hidden=False):
 rng=random.Random(400003+w*1000+local+(70000 if hidden else 0))
 boss=local==29 or hidden
 elite=local in [14,24]
 tier=local//6
 hp=2+w//2+tier//2
 wave_count=3+(local//10)+(w//5)
 waves=[]
 for row in range(wave_count):
  mask=PATTERNS[(local*3+row*5+w)%len(PATTERNS)].copy()
  shift=(local//5+row+w)%7
  mask=sorted({(x+shift)%7 for x in mask})
  # One explicitly placed weak point per row creates angle/chain opportunities.
  weak=mask[rng.randrange(len(mask))]
  tokens=['.']*7
  for col in mask:
   kind='b' if (col+row+local)%4==0 else 'j'
   health=hp+(1 if kind=='b' else 0)+((col+row+local)%2)
   tokens[col]=kind+str(health)
  tokens[weak]='p1'
  if (row+local)%2==0:
   holes=[c for c in range(7) if tokens[c]=='.']
   if holes:tokens[rng.choice(holes)]='r1'
  if boss and row==0:
   tokens[2]=tokens[4]='.';tokens[3]='K'+str(14+w*3+tier*2)
  waves.append(tokens)
 # Authoring grammar always leaves multiple firing lanes and no solid full-width wall.
 obstacles=[]
 if w>=2 or local>=8:
  count=1+int(local>=20 and w>=4)
  for n in range(count):
   col=(local*2+w+n*3)%7
   obstacles.append(dict(x=48+col*44,y=260+n*65,width=30+(local%3)*5,height=10,kind='ice' if w==2 else 'stone'))
 if w in [3,4,5,7,9]:
  obstacles.append(dict(x=180,y=325,width=65 if w==4 else 44,height=10,kind={3:'spring',4:'moving',5:'mirror',7:'phase',9:['mirror','phase','moving'][local%3]}[w]))
 portals=[dict(x=64,y=290),dict(x=296,y=210)] if w in [6,9] and local>=3 else []
 wind=(18+w*2)*(1 if local%2 else -1) if w in [1,8] else 0
 names=NAMES[w];name=names[local%len(names)]
 if local>=len(names):name+=' · '+str(local+1)
 if local==29:name=WORLDS[w][0]+'首领'
 return dict(id=w*30+local,world=w,local=local,name=name,subtitle=WORLDS[w][6],balls=10+w//2+min(3,tier),initial=2,boss=boss,elite=elite,hidden=hidden,waves=waves,obstacles=obstacles,portals=portals,wind=wind,armor=1 if w==2 else 0,starTarget=wave_count+1)

def main():
 # Health pressure grows smoothly inside each chapter. Geometry and mechanics
 # vary, while the auditable health-per-bubble budget never drops in a chapter.
 levels=[build_level(w,l) for w in range(10) for l in range(30)]
 last_budget,last_balls=0,1
 for lev in levels:
  w,l,balls=lev['world'],lev['local'],lev['balls']
  budget=round(balls*(2.2+w*.9+l*.028+(0.35 if lev['boss'] else 0)))
  if l==0:last_budget,last_balls=0,1
  budget=max(budget,(last_budget*balls+last_balls-1)//last_balls)
  last_budget,last_balls=budget,balls
  cells=[(row,col) for row in lev['waves'] for col,t in enumerate(row) if t[0] in 'jbK']
  # Reserve the two four-hit guards which spawn when a boss splits.
  target=max(len(cells),budget-(8 if lev['boss'] else 0))
  weights=[int(row[col][1:]) for row,col in cells];total=sum(weights)
  hp=[max(1,int(target*v/total)) for v in weights]
  while sum(hp)<target:
   i=max(range(len(cells)),key=lambda i:target*weights[i]/total-hp[i]);hp[i]+=1
  while sum(hp)>target:
   i=max(range(len(cells)),key=lambda i:hp[i] if hp[i]>1 else -1);hp[i]-=1
  for (row,col),health in zip(cells,hp):row[col]=row[col][0]+str(health)
  lev['healthBudget']=target+(8 if lev['boss'] else 0)
  lev['pressure']=round(lev['healthBudget']/balls,3)
 # Chapter final bosses are ten times their 0.5 base, outside ordinary mob budget.
 for lev in levels:
  if not lev['boss']:continue
  for row in lev['waves']:
   for col,token in enumerate(row):
    if token[0]=='K':
     base=int(token[1:]);row[col]='K'+str(base*10);lev.update(bossBaseUnits=base,bossHealthMultiplier=10,bossRole='chapter',bossAdvance=min(40,24+lev['world']*2),starTarget=len(lev['waves'])+4)
     lev['healthBudget']+=base*9;lev['pressure']=round(lev['healthBudget']/lev['balls'],3)
 hidden=[]
 for w in range(10):
  for slot,trigger in enumerate([4,14,24]):
   lev=build_level(w,25+slot,True);lev.update(id=f'h-{w}-{slot}',trigger=w*30+trigger,name=WORLDS[w][0]+'秘境 '+str(slot+1),rewardItem=['rewind','nova','hammer'][slot]);
   if slot==0:lev.update(mode='timed',timeLimit=120+w*5,name=WORLDS[w][0]+'限时清屏')
   elif slot==1:lev.update(mode='defense',baseLives=3,initial=1,name=WORLDS[w][0]+'守护工程师')
   elif w%2==0:
    lev.update(mode='obstacle',name=WORLDS[w][0]+'机关试炼');lev['obstacles'].extend([dict(x=100,y=370,width=38,height=10,kind='phase'),dict(x=260,y=395,width=38,height=10,kind='ice')])
   else:
    lev.update(mode='raid',name=WORLDS[w][0]+'首领讨伐');lev['waves'][0][3]='K'+str(36+w*4)
   chapter=levels[w*30+29];main_units=next(int(t[1:]) for row in chapter['waves'] for t in row if t[0]=='K')
   ratio=[.35,.45,.6][slot]
   for row in lev['waves']:
    for col,token in enumerate(row):
     if token[0]=='K':
      base=int(token[1:]);row[col]='K'+str(min(base*10,int(main_units*ratio)));lev.update(bossBaseUnits=base,bossRole='guardian',bossRatioCap=ratio)
   hidden.append(lev)
 # Mechanisms have theme-specific placements; lanes remain open on both sides.
 for lev in levels+hidden:
  w,l=lev['world'],lev['local'];lev['advance']=37+w//3
  def add(kind,x=96,y=310,**extra):
   sizes={'blackhole':(36,36),'slime':(48,12),'boost':(44,12),'prism':(38,28),'conveyor':(76,20),'repulsor':(36,36)}
   width,height=sizes[kind];lev['obstacles'].append(dict(kind=kind,x=x,y=y,width=width,height=height,**extra))
  if w==0 and l>=8:add('slime',96,315)
  if w==1 and l>=5:add('boost',264,305)
  if w==2 and l>=8:add('prism',96,325)
  if w==3 and l>=6:add('slime',264,355)
  if w in [4,5] and l>=8:add('conveyor',100 if l%2 else 260,365,force=160 if l%2 else -160)
  if w==6 and l>=3:add('blackhole',96,330,radius=66,period=3200)
  if w==7 and l>=5:add('repulsor',264,310,radius=70)
  if w==8 and l>=5:add('boost',96,345)
  if w==8 and l>=17:add('prism',264,300)
  if w==9:add(['blackhole','prism','repulsor'][min(2,l//10)],264,330,radius=66)
  if lev.get('hidden'):
   slot=int(lev['id'].split('-')[-1]);kind=['boost','conveyor','blackhole' if w>=6 else 'prism'][slot]
   if not any(o['kind']==kind for o in lev['obstacles']):add(kind,264 if slot==0 else 96,395 if slot==1 else 350,force=-150,radius=62)
 data=dict(version=7,worlds=world_data(),levels=levels,hidden=hidden)
 (ROOT/'tools/campaign-manifest.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 js='/* Frozen campaign data generated by tools/generate_campaign.py. */\n(function(root){const data='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';if(typeof module!=="undefined"&&module.exports)module.exports=data;else{root.CANDY_WORLDS=data.worlds;root.CANDY_LEVELS=data.levels;root.CANDY_HIDDEN=data.hidden;}})(typeof window==="undefined"?globalThis:window);\n'
 (ROOT/'build/levels.js').write_text(js)
 print('Authored',len(levels),'main levels,',len(hidden),'hidden levels,',len(WORLDS),'worlds.')
if __name__=='__main__':main()
