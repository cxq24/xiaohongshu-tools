"""Original outfits, distinct cannon silhouettes and four-frame bubble animations.
All drawing is on integer pixel grids; visual frames never set collision/damage.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import ast,math,json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'build/assets'
O='#253449';CREAM='#fff1cf';GOLD='#f4bc69';MINT='#79c89d';CYAN='#78d3d5';PINK='#e68da8';PURPLE='#a98acb'
# Reuse the original procedural character function without executing its build script.
source=ast.parse((ROOT/'tools/create_art.py').read_text());node=next(n for n in source.body if isinstance(n,ast.FunctionDef) and n.name=='dragon')
ns=dict(Image=Image,ImageDraw=ImageDraw,O='#244e49',D='#368d75',M='#67c49b',H='#a3e2ac',Y='#ffe3a0',P='#ed9a83');exec(compile(ast.Module(body=[node],type_ignores=[]),'<original-character>','exec'),ns);base_dragon=ns['dragon']
def star(d,x,y,c,r=2):
 d.rectangle((x-r,y,x+r,y),fill=c);d.rectangle((x,y-r,x,y+r),fill=c)
def outfit(kind,frame):
 im=base_dragon(frame);d=ImageDraw.Draw(im)
 def r(b,c):d.rectangle(b,fill=c)
 # Face and expressions stay recognisably Apu; clothes change silhouette and trim.
 if kind=='berry':
  r((8,3,23,7),O);r((9,2,22,5),CREAM);r((12,0,19,4),CREAM);r((11,21,20,27),PINK);r((14,22,17,25),'#b85676');r((14,21,16,22),MINT);r((9,21,11,25),CREAM)
 elif kind=='sky':
  d.polygon([(5,10),(8,2),(23,2),(27,10),(24,12),(22,7),(9,7),(7,12)],fill='#739cb8');r((7,5,24,8),O);r((9,3,22,6),CYAN);r((9,21,22,27),'#7cacc4');r((11,22,20,23),CREAM);r((14,23,16,26),GOLD)
 elif kind==0:
  d.polygon([(4,6),(7,2),(24,2),(28,6),(28,8),(4,8)],fill=O);d.polygon([(6,5),(10,0),(21,0),(26,5)],fill='#43678b');r((5,6,26,7),GOLD);r((9,21,22,27),'#43678b');r((10,21,21,22),CREAM);r((14,22,17,26),PINK);r((9,25,22,26),CREAM)
 elif kind==1:
  d.polygon([(5,9),(7,3),(11,1),(21,1),(25,3),(27,10),(23,11),(22,7),(9,7),(8,11)],fill='#8fb9d0');r((6,6,25,9),CREAM);r((9,2,22,5),CYAN);r((24,0,27,3),CREAM);r((8,20,23,23),PINK);r((20,22,24,29),PINK);r((9,24,21,27),'#80aac5');r((12,25,18,26),CREAM)
 elif kind==2:
  d.polygon([(2,29),(6,18),(10,19),(21,19),(26,22),(30,29)],fill=O);d.polygon([(4,27),(8,19),(14,21),(22,20),(27,27),(23,30),(9,30)],fill=PURPLE);r((12,20,19,27),'#675387');d.polygon([(6,8),(13,0),(21,2),(24,8)],fill=O);d.polygon([(9,6),(14,1),(20,3),(22,6)],fill=PURPLE);r((6,7,25,8),GOLD);star(d,5,25,GOLD,1);star(d,25,26,GOLD,1);r((15,21,16,22),GOLD)
 elif kind==3:
  r((5,4,26,8),O);r((7,2,24,6),'#bd8d55');r((9,4,14,8),O);r((17,4,22,8),O);r((10,5,13,7),CYAN);r((18,5,21,7),CYAN);r((9,21,22,28),'#c99a63');r((11,22,20,26),'#a77246');r((9,25,22,26),O);r((13,25,15,26),GOLD);r((23,20,27,26),O);r((24,20,26,24),'#9bafbc');r((7,22,10,26),'#9bafbc')
 elif kind==4:
  r((4,5,7,15),O);r((24,5,27,15),O);r((5,6,6,12),CYAN);r((25,6,26,12),PINK);r((8,3,23,5),'#796494');r((6,8,25,9),CYAN);r((8,20,23,28),'#65547c');r((8,21,10,27),PINK);r((21,21,23,27),CYAN);r((14,22,17,27),O);r((9,28,12,29),CYAN);r((19,28,22,29),PINK)
 elif kind==5:
  d.polygon([(1,22),(7,17),(9,20),(22,20),(25,17),(31,22),(27,29),(5,29)],fill=O);r((4,22,8,26),CREAM);r((23,22,27,26),CREAM);r((10,20,21,28),'#4c659b');r((11,21,20,22),GOLD);r((14,22,17,27),CREAM);r((8,3,23,6),'#4c659b');r((5,5,26,8),CREAM);r((15,1,17,5),GOLD);star(d,29,8,CYAN,1);star(d,2,14,GOLD,1)
 elif kind==6:
  d.polygon([(1,27),(4,17),(9,19),(22,19),(27,17),(31,27),(26,31),(5,31)],fill=O);d.polygon([(3,26),(5,19),(10,21),(21,21),(26,19),(29,27),(24,30),(7,30)],fill='#91608f');d.line([(4,26),(8,29),(23,29),(28,26)],fill=GOLD,width=2);r((10,21,21,27),CREAM);r((13,22,18,27),GOLD);d.polygon([(6,7),(5,1),(11,4),(16,0),(21,4),(27,1),(25,7)],fill=O);d.polygon([(8,6),(8,3),(12,5),(16,2),(20,5),(25,3),(24,6)],fill=GOLD);r((7,7,25,8),GOLD);r((15,5,17,7),PINK);star(d,2+(frame%2),7,CREAM,1);star(d,29,12-(frame%2),GOLD,1)
 elif kind==7:
  d.ellipse((4,1,27,9),fill=O);d.ellipse((5,1,26,7),fill='#d9ad69');r((2,7,29,9),GOLD);r((9,21,22,28),'#5f9a82');r((10,20,12,26),CREAM);r((19,20,21,26),CREAM);r((14,23,17,25),GOLD)
 elif kind==8:
  r((7,2,24,7),O);r((8,3,23,6),'#5d88b0');r((5,7,24,8),GOLD);r((9,21,22,28),'#5d88b0');d.line((8,18,23,27),fill='#b88d59',width=2);r((18,23,26,28),O);r((19,23,25,26),CREAM);d.line((19,23,22,25,25,23),fill='#b88d59')
 elif kind==9:
  d.polygon([(2,9),(5,3),(11,0),(21,0),(27,3),(30,9)],fill=O);d.polygon([(4,7),(7,3),(23,3),(28,7)],fill='#bc7496');r((10,2,12,4),CREAM);r((20,5,23,6),CREAM);r((6,8,25,9),PINK);d.polygon([(6,20),(25,20),(28,29),(3,29)],fill='#9076aa');r((14,21,17,28),CREAM)
 elif kind==10:
  d.polygon([(5,8),(8,3),(21,1),(25,8)],fill=O);d.polygon([(8,6),(11,4),(21,3),(23,7)],fill='#77a16c');d.line((22,3,27,0),fill=GOLD,width=2);r((24,17,28,28),'#997657');r((25,14,26,20),CREAM);d.polygon([(5,21),(15,22),(24,20),(27,28),(20,28),(15,25),(7,29)],fill='#668d62');r((14,23,16,24),GOLD)
 elif kind==11:
  d.ellipse((3,1,28,24),outline=O,width=3);d.ellipse((5,3,26,22),outline='#c59860',width=2);r((13,0,18,4),'#c59860');r((9,23,22,29),'#b18451');r((12,24,19,27),GOLD);r((5,26,9,29),O);r((23,26,27,29),O);r((0,11,4,15),'#b18451');r((28,11,31,15),'#b18451')
 elif kind==12:
  r((7,2,24,8),'#885e48');r((5,6,8,15),'#885e48');r((23,6,26,15),'#885e48');r((8,4,14,8),O);r((17,4,23,8),O);r((9,5,13,7),CYAN);r((18,5,22,7),CYAN);r((9,20,22,28),'#8c604b');r((9,20,22,22),CREAM);r((22,22,27,24),CREAM);r((15,23,16,27),GOLD)
 elif kind==13:
  r((10,0,21,7),O);r((7,6,25,8),O);r((11,4,20,5),GOLD);r((9,21,22,28),O);d.polygon([(11,21),(20,21),(16,27)],fill=CREAM);r((13,21,18,22),PINK);r((15,23,16,24),GOLD);r((7,28,12,30),O);r((19,28,24,30),O)
 elif kind==14:
  d.polygon([(6,8),(7,2),(13,4),(16,1),(19,4),(25,2),(26,8)],fill=O);d.line((8,1,11,4,16,5,21,4,24,1),fill=GOLD,width=2);r((7,7,25,9),'#b16675')
  for y in [21,24,27]:r((8,y,23,y+1),'#b16675');r((10,y,21,y),GOLD)
  r((4,21,8,25),O);r((24,21,28,25),O)
 elif kind==15:
  d.ellipse((2,0,29,24),outline=O,width=2);d.ellipse((4,1,27,22),outline=CYAN,width=2);d.line((9,3,15,3),fill=CREAM,width=2);r((8,22,23,29),CREAM);r((13,23,18,26),CYAN);r((2,20,6,28),'#7c91b4');r((26,20,30,28),'#7c91b4');r((3,27,5,30),GOLD);r((27,27,29,30),GOLD)
 elif kind==16:
  d.polygon([(6,8),(10,2),(15,4),(19,1),(25,8)],fill=O);d.polygon([(9,7),(11,4),(15,6),(19,3),(22,7)],fill='#a0bbcb');d.polygon([(2,23),(7,17),(12,21),(20,21),(25,17),(30,23),(26,27),(5,27)],fill='#95b4c8');r((10,22,21,29),'#55739e');d.polygon([(16,22),(19,25),(16,28),(13,25)],fill=CYAN);r((11,28,20,29),GOLD)
 elif kind==17:
  d.polygon([(5,8),(11,1),(19,0),(24,8)],fill=O);d.polygon([(8,7),(12,3),(19,2),(22,7)],fill='#746793');d.arc((16,0,24,7),50,290,fill=GOLD,width=2);d.polygon([(5,21),(24,20),(30,30),(2,30)],fill='#665581');d.line((5,28,14,30,26,28),fill=GOLD,width=2);star(d,9,24,CREAM,1);star(d,24,26,CYAN,1)
 elif kind==18:
  d.polygon([(5,8),(7,0),(11,4),(16,0),(21,4),(26,0),(27,8)],fill='#b46252');d.polygon([(8,7),(9,3),(13,6),(16,2),(20,6),(24,3),(24,7)],fill=GOLD);d.polygon([(0,17),(7,19),(8,24),(12,21),(21,21),(24,24),(31,17),(29,29),(23,28),(8,30),(2,26)],fill='#c77757');d.line((2,20,5,26,9,28),fill=GOLD,width=2);d.line((29,20,26,26,23,28),fill=GOLD,width=2);r((12,22,19,28),CREAM)
 elif kind==19:
  r((4,4,7,11),CYAN);r((24,4,27,11),PINK);r((7,1,24,3),O);r((8,2,23,3),CYAN);r((1,1,3,3),PINK);r((28,0,30,2),CYAN);r((8,21,23,29),O);r((9,21,11,27),CYAN);r((20,21,22,27),PINK);d.polygon([(16,22),(19,25),(16,28),(13,25)],outline=CYAN);r((3,24,5,28),CYAN);r((27,23,29,26),PINK)
 elif kind==20:
  d.ellipse((1,0,30,29),outline=GOLD,width=2)
  for x,y in [(1,2),(27,2),(0,14),(29,14),(14,0)]:star(d,x,y,CREAM,1)
  r((7,5,25,8),CREAM);r((12,1,20,5),GOLD);r((15,0,17,7),CREAM);d.polygon([(8,20),(23,20),(28,30),(3,30)],fill=CREAM);r((13,21,18,30),GOLD);r((15,22,16,28),PURPLE)
 elif kind==21:
  d.polygon([(0,22),(4,16),(8,21),(12,20),(21,20),(25,18),(31,23),(27,30),(3,30)],fill=PINK);d.polygon([(3,23),(6,19),(10,24),(22,24),(26,20),(29,24),(25,29),(6,29)],fill=CREAM);r((13,22,18,28),PURPLE)
  for x,y,c in [(7,4,PINK),(14,1,CYAN),(21,4,PINK)]:d.rectangle((x-1,y-1,x+3,y+2),fill=c);d.point((x+1,y),fill=CREAM)
  r((5,7,26,8),GOLD);star(d,1,10,CYAN,1);star(d,30,13,PINK,1)
 return im
for kind,file in [('berry','dragon-berry'),('sky','dragon-sky')]+[(i,'outfit-'+str(i)) for i in range(22)]:
 sheet=Image.new('RGBA',(192,32))
 for f in range(6):sheet.paste(outfit(kind,f),(f*32,0))
 sheet.save(OUT/(file+'.png'))

def cannon(kind,frame):
 im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im);pulse=[CYAN,CREAM,CYAN,'#5ab2c6'][frame]
 d.rectangle((5,27,26,30),fill=O)
 if kind=='wood':
  d.rectangle((7,21,24,27),fill='#ba8557');d.rectangle((12,3,19,24),fill=O);d.rectangle((14,4,17,22),fill='#dfb579');d.rectangle((12,11,19,13),fill='#8c6348');d.rectangle((8,23,10,27),fill=CREAM);d.rectangle((21,23,23,27),fill=CREAM)
 elif kind=='candy':
  d.rectangle((7,20,24,28),fill='#b85879');d.rectangle((8,22,23,25),fill=PINK);d.rectangle((10,3,21,11),fill=O);d.rectangle((12,2,19,10),fill=CREAM)
  for y in [3,7]:d.rectangle((12,y,19,y+1),fill=PINK)
  d.rectangle((4,12,27,22),fill=O);d.rectangle((6,13,25,21),fill='#e4b9a1')
  for x,y,c in [(8,15,PINK),(13,17,GOLD),(19,15,CYAN),(23,18,MINT)]:d.rectangle((x,y,x+2,y+2),fill=c)
  d.rectangle((14,24,17,26),fill=GOLD)
 elif kind=='ice':
  d.polygon([(3,25),(6,13),(10,16),(9,8),(13,12),(16,0),(19,12),(23,6),(23,16),(27,12),(29,25)],fill=O)
  d.polygon([(6,24),(8,17),(12,21),(12,12),(15,17),(16,3),(19,18),(22,10),(22,22),(26,16),(27,24)],fill='#80b9d3');d.polygon([(16,4),(17,20),(14,22)],fill=CREAM);d.rectangle((9,25,23,27),fill='#b3dfdf');star(d,24,4,CREAM,1);d.rectangle((15,12,17,15),fill=pulse)
 elif kind=='neon':
  d.rectangle((2,21,29,27),fill=O);d.rectangle((5,22,26,24),fill='#65517d');d.rectangle((10,9,21,24),fill=O);d.rectangle((12,8,19,22),fill='#806b9b');d.rectangle((13,3,18,10),fill=O)
  for y in [6,12,17]:d.rectangle((9,y,22,y+2),fill=CYAN if frame%2 else PINK)
  for x in [3,26]:d.rectangle((x,10,x+2,22),fill=O);d.rectangle((x,10,x+2,12),fill=pulse)
  d.rectangle((13,22,18,25),fill=pulse)
 elif kind=='cosmic':
  d.polygon([(1,23),(4,17),(10,20),(12,10),(16,2),(20,10),(22,20),(28,17),(31,23),(26,27),(6,27)],fill=O);d.rectangle((10,15,21,26),fill=PURPLE);d.ellipse((6,9,26,22),outline=GOLD,width=2);d.polygon([(16,2),(19,8),(16,14),(13,8)],fill=GOLD);d.rectangle((15,6,17,9),fill=CREAM);d.rectangle((3,22,8,24),fill=GOLD);d.rectangle((24,22,29,24),fill=GOLD);d.rectangle((12,23,20,26),fill='#705080');star(d,3+frame,5,CREAM,1);star(d,26,3+frame,GOLD,1);d.rectangle((14,18,17,21),fill=pulse)
 elif kind=='log':
  d.polygon([(2,29),(6,23),(5,13),(9,7),(23,7),(27,13),(26,23),(31,29)],fill=O);d.rectangle((8,9,24,26),fill='#a07850');d.rectangle((11,8,20,11),fill=CREAM);d.rectangle((14,2,18,9),fill='#9c724f');d.line((10,13,10,23,14,26),fill='#644f40',width=2);d.line((22,12,20,18,23,24),fill=GOLD,width=1)
 elif kind=='bamboo':
  for x,y in [(9,3),(18,8)]:
   d.rectangle((x,y,x+5,25),fill=O);d.rectangle((x+1,y+1,x+4,23),fill='#8eb382')
   for z in range(y+4,24,6):d.rectangle((x,z,x+5,z+1),fill='#c9d3a4')
  d.polygon([(18,13),(28,8),(26,14),(21,17)],fill=MINT);d.polygon([(9,19),(2,15),(3,21),(10,23)],fill=MINT)
 elif kind=='acorn':
  d.polygon([(5,14),(8,8),(24,8),(27,14),(26,23),(17,29),(6,24)],fill=O);d.polygon([(8,16),(24,16),(23,23),(16,27),(9,23)],fill='#c49160');d.rectangle((6,12,26,17),fill='#806448');d.rectangle((14,2,18,13),fill=O);d.rectangle((15,3,17,12),fill=GOLD)
  for x in [8,13,18,23]:d.rectangle((x,13,x+1,15),fill=GOLD)
 elif kind=='cookie':
  d.rectangle((5,17,26,28),fill=O);d.rectangle((7,18,24,26),fill='#cc9b63');d.rectangle((12,3,19,18),fill='#e9bd7c')
  for y in [6,10,14]:d.line((12,y,19,y-2),fill='#a57a50')
  for x,y in [(9,21),(21,20),(14,25),(24,25)]:d.rectangle((x,y,x+2,y+1),fill='#80604b')
 elif kind=='teapot':
  d.ellipse((5,11,25,27),fill=O);d.ellipse((7,12,23,26),fill='#b4a0bb');d.arc((22,12,31,23),-100,100,fill=GOLD,width=2);d.polygon([(7,16),(1,11),(1,16),(8,23)],fill=GOLD);d.rectangle((12,3,19,13),fill=O);d.rectangle((14,4,17,12),fill=CREAM);d.rectangle((7,10,24,12),fill=GOLD);star(d,15,18,CREAM,1)
 elif kind=='snowman':
  d.ellipse((5,15,26,29),fill=O);d.ellipse((7,16,24,27),fill=CREAM);d.ellipse((8,4,23,19),fill=CREAM);d.rectangle((13,0,18,8),fill=CYAN);d.rectangle((7,15,24,17),fill=PINK);d.rectangle((20,16,23,23),fill=PINK);d.rectangle((12,10,13,11),fill=O);d.rectangle((19,10,20,11),fill=O);d.rectangle((15,12,20,13),fill=GOLD)
 elif kind=='penguin':
  d.ellipse((5,6,26,29),fill=O);d.ellipse((9,13,22,27),fill=CREAM);d.rectangle((12,0,19,11),fill=CYAN);d.rectangle((14,2,17,10),fill=CREAM);d.rectangle((9,11,11,13),fill=CREAM);d.rectangle((20,11,22,13),fill=CREAM);d.rectangle((14,15,18,17),fill=GOLD);d.rectangle((5,27,11,29),fill=GOLD);d.rectangle((21,27,27,29),fill=GOLD)
 elif kind=='mushroom':
  d.rectangle((10,16,22,27),fill=O);d.rectangle((12,15,20,25),fill=CREAM);d.polygon([(1,17),(5,8),(10,5),(23,5),(28,9),(31,17)],fill=O);d.rectangle((5,11,27,16),fill=PURPLE);d.rectangle((9,7,23,13),fill=PURPLE);d.rectangle((14,1,19,11),fill=O);d.rectangle((15,2,18,9),fill=PINK);d.rectangle((7,11,10,13),fill=CREAM);d.rectangle((24,12,27,13),fill=CREAM)
 elif kind=='lantern':
  d.rectangle((8,7,24,26),fill=O);d.rectangle((10,8,22,24),fill=PINK)
  for x in [11,16,21]:d.rectangle((x,8,x+1,24),fill=GOLD)
  d.rectangle((7,5,25,8),fill=GOLD);d.rectangle((7,24,25,27),fill=GOLD);d.rectangle((14,1,19,7),fill=O);d.rectangle((15,2,18,6),fill=CREAM)
 elif kind=='flower':
  for x,y in [(6,9),(18,8),(2,15),(23,14)]:d.rectangle((x,y,x+6,y+6),fill=PINK)
  d.rectangle((12,2,19,21),fill=O);d.rectangle((13,3,18,18),fill=GOLD);d.polygon([(4,22),(13,23),(16,28),(4,27)],fill=MINT);d.polygon([(18,24),(27,20),(28,26),(17,29)],fill=MINT)
 elif kind=='steam':
  d.rectangle((6,10,25,27),fill=O);d.rectangle((8,12,23,25),fill='#a18e7a');d.rectangle((12,1,19,14),fill=O);d.rectangle((14,2,17,13),fill=GOLD);d.ellipse((10,15,22,25),fill=GOLD);d.line((16,17,16,21,20,21),fill=O,width=1);d.rectangle((1,17,7,20),fill='#a18e7a');d.rectangle((1,10,3,20),fill=CYAN)
 elif kind=='clockwork':
  d.ellipse((3,8,29,29),fill=GOLD);d.ellipse((7,12,25,27),fill=O);d.ellipse((10,14,23,25),fill=CREAM);d.line((16,15,16,20,21,22),fill='#967150',width=2);d.rectangle((13,0,19,13),fill=O);d.rectangle((14,1,18,11),fill=GOLD)
  for x,y in [(0,16),(27,16),(6,6),(23,7)]:d.rectangle((x,y,x+3,y+4),fill=GOLD)
 elif kind=='rail':
  d.rectangle((3,18,28,27),fill=O);d.rectangle((5,20,26,25),fill='#947294');d.rectangle((12,2,19,21),fill=O);d.rectangle((14,3,17,19),fill='#c2a47a');d.rectangle((9,2,22,5),fill=GOLD);d.rectangle((22,10,28,20),fill=O);d.rectangle((23,12,27,16),fill=CYAN)
  for x in [7,22]:d.ellipse((x-3,24,x+3,30),fill=O);d.ellipse((x-1,26,x+1,28),fill=GOLD)
 elif kind=='hologram':
  d.rectangle((5,23,26,28),fill=O);d.rectangle((7,24,24,26),fill=PURPLE);d.rectangle((7,5,24,20),outline=CYAN,width=2);d.rectangle((11,2,28,17),outline=PINK,width=1);d.polygon([(16,6),(21,12),(16,18),(11,12)],fill=pulse);d.rectangle((13,0,19,4),fill=CYAN)
 elif kind=='drone':
  d.polygon([(2,17),(7,11),(25,11),(30,17),(26,21),(6,21)],fill=O);d.rectangle((6,13,25,18),fill=PURPLE);d.rectangle((12,2,20,17),fill=O);d.rectangle((14,3,18,14),fill=pulse);d.rectangle((2,21,9,23),fill=CYAN);d.rectangle((23,21,30,23),fill=PINK);d.ellipse((8,25,24,29),outline=CYAN,width=1)
 elif kind=='lunar':
  d.arc((2,2,29,29),40,310,fill=GOLD,width=5);d.rectangle((12,12,19,28),fill=PURPLE);d.polygon([(16,0),(21,8),(16,16),(11,8)],fill=CYAN);star(d,26,6,CREAM,1);d.rectangle((14,5,17,9),fill=pulse)
 elif kind=='comet':
  d.polygon([(2,26),(8,13),(12,19),(16,3),(21,18),(27,12),(30,26)],fill=O);d.polygon([(5,25),(9,17),(12,23),(16,9),(20,23),(26,16),(27,25)],fill=PURPLE);d.polygon([(16,0),(20,7),(16,14),(12,7)],fill=GOLD);d.rectangle((15,5,17,8),fill=CREAM);d.line((7,25,24,25),fill=CYAN,width=2)
 elif kind=='crown':
  d.polygon([(2,16),(9,20),(16,12),(23,20),(30,16),(28,28),(4,28)],fill=O);d.polygon([(5,20),(10,23),(16,16),(22,23),(27,20),(26,26),(6,26)],fill=GOLD);d.rectangle((13,2,19,19),fill=PURPLE);d.polygon([(16,0),(21,7),(16,13),(11,7)],fill=GOLD);d.rectangle((14,5,18,9),fill=pulse)
 elif kind=='phoenix':
  d.polygon([(1,10),(8,16),(12,22),(16,8),(20,22),(25,16),(31,10),(28,26),(21,28),(10,28),(3,26)],fill='#b36555');d.line((3,15,6,24,13,26),fill=GOLD,width=2);d.line((29,15,26,24,21,26),fill=GOLD,width=2);d.rectangle((13,1,19,22),fill=GOLD);d.rectangle((15,2,17,17),fill=CREAM)
 elif kind=='cathedral':
  d.rectangle((4,14,27,29),fill=O);d.rectangle((6,15,25,27),fill=PURPLE)
  for x in [3,23]:d.rectangle((x,8,x+6,24),fill=CREAM);d.polygon([(x-1,8),(x+3,1),(x+7,8)],fill=PINK)
  d.rectangle((13,3,19,26),fill=GOLD);d.polygon([(16,0),(21,7),(16,15),(11,7)],fill=CYAN);d.rectangle((14,18,18,24),fill=O)
 if kind!='wood':
  # A real travelling glint on every paid cannon, including low-price mechanisms.
  px,py=[(15,9),(17,15),(14,21),(20,24)][frame]
  if im.getpixel((px,py))[3]==0:
   px,py=min(((x,y) for y in range(28) for x in range(32) if im.getpixel((x,y))[3]>0),key=lambda q:abs(q[0]-px)+abs(q[1]-py))
  d.point((px,py),fill=CREAM)
 return im
catalog=json.loads((ROOT/'tools/cosmetic-catalog.json').read_text())['items']
for kind in ['wood']+[i['art'] for i in catalog if i['slot']=='turret']:
 sheet=Image.new('RGBA',(128,32))
 for f in range(4):sheet.paste(cannon(kind,f),(32*f,0))
 sheet.save(OUT/f'turret-{kind}.png')

def orb(style,frame):
 im=Image.new('RGBA',(16,16));d=ImageDraw.Draw(im);bright=CREAM if frame%2 else '#fffaff'
 if style=='star':
  d.polygon([(8,0),(10,5),(15,5),(11,9),(13,15),(8,12),(3,15),(4,9),(0,5),(6,5)],fill=O);d.polygon([(8,2),(9,6),(13,6),(10,9),(11,12),(8,10),(5,12),(6,8),(3,6),(7,6)],fill=GOLD);star(d,8,7,bright,1)
 elif style=='rainbow':
  d.polygon([(8,0),(15,8),(8,15),(0,8)],fill=O)
  for y,c in [(3,PINK),(5,GOLD),(7,MINT),(9,CYAN),(11,PURPLE)]:d.line((max(2,abs(8-y)),y,15-max(2,abs(8-y)),y),fill=c,width=2)
 elif style==0:
  for x,y in [(2,3),(9,2),(2,10),(9,10)]:d.rectangle((x,y,x+4,y+4),fill=PINK)
  d.rectangle((5,5,10,10),fill=GOLD);d.rectangle((11,0,14,3),fill=MINT);star(d,7,7,bright,1)
 elif style==1:
  d.polygon([(1,5),(5,1),(10,1),(14,5),(14,12),(2,12)],fill=O);d.rectangle((3,6,12,12),fill='#8699ca')
  for x in [4,7,10]:d.line((7,3,x,10),fill=CYAN,width=1)
  d.rectangle((5,9,10,14),fill=CREAM);d.rectangle((7,9,9,10),fill=bright)
 elif style==2:
  for a,b in [((7,0),(7,15)),((1,3),(13,12)),((1,12),(13,3))]:d.line((*a,*b),fill=CYAN,width=2)
  d.polygon([(7,3),(11,7),(7,12),(3,7)],fill=O);d.polygon([(7,5),(9,7),(7,10),(5,7)],fill=bright)
 elif style==3:
  d.rectangle((5,8,10,14),fill=CREAM);d.rectangle((2,4,13,9),fill=O);d.rectangle((3,3,12,7),fill=PURPLE);d.rectangle((6,1,9,4),fill=PURPLE);d.rectangle((4,4,5,5),fill=bright);d.rectangle((10,4,11,5),fill=PINK)
 elif style==4:
  for box in [(6,0,9,15),(0,6,15,9),(2,2,13,13)]:d.rectangle(box,fill=GOLD)
  d.rectangle((4,4,11,11),fill=O);d.rectangle((6,6,9,9),fill=CYAN);star(d,7,7,bright,1)
 elif style==5:
  d.polygon([(8,0),(10,4),(14,2),(13,6),(16,8),(12,10),(14,14),(10,13),(8,16),(6,12),(2,14),(3,10),(0,8),(4,6),(2,2),(6,3)],fill=GOLD);d.rectangle((5,5,10,10),fill='#cb7359');star(d,7,7,bright,1)
 elif style==6:
  d.ellipse((4,2,12,13),fill=PURPLE);d.ellipse((0,5,15,10),outline=GOLD,width=2);d.rectangle((7,4,9,5),fill=bright);star(d,13,2 if frame%2 else 13,CREAM,1)
 elif style==7:
  d.polygon([(3,0),(13,0),(16,4),(16,12),(12,16),(2,16),(0,12),(0,3)],fill=O);d.rectangle((2,2,12,12),outline=CYAN,width=2);d.rectangle((5,5,15,15),outline=PINK,width=1);d.rectangle((6,6,9,9),fill=bright)
 elif style==8:
  d.rectangle((1,6,14,11),fill=CYAN);d.rectangle((3,4,12,12),fill=CREAM);d.rectangle((5,2,10,12),fill=CREAM);d.rectangle((1,8,4,10),fill=bright);d.rectangle((11,7,14,9),fill=bright);star(d,7,13,GOLD,1)
 elif style==9:
  d.polygon([(8,0),(13,5),(16,8),(12,10),(11,14),(8,16),(5,12),(1,10),(0,7),(5,5)],fill=GOLD);d.polygon([(8,2),(12,7),(8,13),(4,7)],fill=PURPLE);d.polygon([(8,4),(10,7),(8,10),(6,7)],fill=bright);star(d,2,2,PINK,1);star(d,13,13,PINK,1)
 elif style=='leaf':
  d.polygon([(1,1),(10,1),(15,5),(13,12),(7,15),(2,10)],fill=O);d.polygon([(3,3),(9,3),(12,6),(10,11),(6,12),(4,9)],fill=MINT);d.line((3,3,11,11),fill=CREAM,width=1)
 elif style=='droplet':
  d.polygon([(8,0),(14,8),(14,12),(11,15),(4,15),(1,11),(2,7)],fill=O);d.polygon([(8,3),(12,9),(11,13),(5,13),(3,10)],fill=CYAN);d.rectangle((5,8,6,10),fill=CREAM)
 elif style=='fish':
  d.ellipse((0,3,12,13),fill=GOLD);d.polygon([(11,8),(15,3),(15,13)],fill=PINK);d.rectangle((3,5,5,7),fill=O);d.rectangle((0,8,3,9),fill=CREAM);d.rectangle((6,0,8,3),fill=GOLD)
 elif style=='jellyfish':
  d.rectangle((3,4,12,9),fill=PURPLE);d.rectangle((5,1,10,7),fill=PINK);d.rectangle((1,6,14,9),fill=PINK)
  for x,h in [(3,14),(7,12),(11,15)]:d.line((x,10,x,h),fill=CYAN,width=2)
  d.rectangle((5,4,6,5),fill=CREAM)
 elif style=='crystal':
  d.polygon([(5,0),(11,0),(15,6),(10,15),(6,15),(0,6)],fill=O);d.polygon([(6,2),(10,2),(12,6),(8,13),(3,6)],fill=CYAN);d.line((8,2,8,13),fill=CREAM,width=2)
 elif style=='snowflake':
  for x,y in [(7,0),(14,3),(15,8),(12,14),(7,15),(1,12),(0,7),(2,2)]:d.line((7,7,x,y),fill='#9fc9e1',width=2)
  d.rectangle((4,4,10,10),fill=CREAM);d.rectangle((6,6,8,8),fill=CYAN)
 elif style=='lantern':
  d.rectangle((4,2,11,13),fill=O);d.rectangle((5,3,10,11),fill=GOLD);d.rectangle((2,4,13,10),fill=GOLD);d.rectangle((4,1,11,3),fill=PURPLE);d.rectangle((4,12,11,13),fill=PURPLE);d.rectangle((7,13,8,15),fill=PINK);d.rectangle((7,4,8,9),fill=CREAM)
 elif style=='butterfly':
  d.polygon([(1,1),(6,3),(7,7),(6,13),(2,14),(0,9)],fill=PURPLE);d.polygon([(14,1),(9,3),(8,7),(9,13),(13,14),(15,9)],fill=PINK);d.rectangle((7,3,8,13),fill=O);d.rectangle((2,4,4,6),fill=CREAM);d.rectangle((11,4,13,6),fill=CYAN)
 elif style=='battery':
  d.rectangle((1,3,13,13),fill=O);d.rectangle((13,6,15,10),fill=GOLD);d.rectangle((3,5,11,11),fill=CYAN);d.polygon([(8,4),(5,8),(8,8),(6,12),(10,7),(7,7)],fill=CREAM)
 elif style=='comet':
  d.polygon([(0,0),(12,6),(15,10),(11,15),(6,12)],fill=PURPLE);d.line((2,1,9,7),fill=PINK,width=2);d.line((0,4,6,9),fill=CYAN,width=2);d.polygon([(10,4),(12,8),(15,10),(11,12),(10,15),(8,11),(5,10),(8,8)],fill=GOLD);star(d,10,10,CREAM,1)
 elif style=='moon':
  d.arc((1,0,14,14),70,300,fill=GOLD,width=4);star(d,11,3,CREAM,1);star(d,13,11,CYAN,1);star(d,6,8,CREAM,1)
 elif style=='phoenix':
  d.polygon([(0,2),(5,5),(7,10),(8,1),(10,9),(15,2),(14,11),(10,14),(5,15),(1,11)],fill='#c87558');d.line((1,5,3,10,6,12),fill=GOLD,width=2);d.line((14,5,12,10,10,12),fill=GOLD,width=2);star(d,8,7,CREAM,2)
 # Every cosmetic has four glint frames; higher tiers also get in-combat trails.
 d.point([(4,3),(11,3),(11,11),(3,11)][frame],fill=bright)
 return im
for item in [i for i in catalog if i['slot']=='bubble']:
 kind=item['art'];file={'bubbleStar':'bubble-star','bubbleRainbow':'bubble-rainbow'}.get(item['texture'],item['texture']);sheet=Image.new('RGBA',(64,16))
 for f in range(4):sheet.paste(orb(kind,f),(16*f,0))
 sheet.save(OUT/(file+'.png'))
# Pixel backdrops are decorative, never collision geometry.
for name in ['shop-stage','shop-plinth']:
 size=(180,90) if name=='shop-stage' else (90,24);im=Image.new('RGB',size,'#30364f');d=ImageDraw.Draw(im)
 if name=='shop-stage':
  for y in range(0,90,8):
   for x in range(0,180,8):
    if (x//8+y//8)%2:d.rectangle((x,y,x+7,y+7),fill='#343c58')
  d.polygon([(65,0),(115,0),(160,89),(20,89)],fill='#41435b');d.rectangle((0,70,179,89),fill='#253449')
  for x in range(0,180,16):d.rectangle((x,71,x+14,73),fill='#a4826d');d.rectangle((x,82,x+14,84),fill='#44485d')
 else:
  d.polygon([(5,0),(84,0),(89,5),(89,20),(84,23),(5,23),(0,20),(0,5)],fill=O);d.rectangle((5,2,84,6),fill=GOLD);d.rectangle((3,7,86,17),fill='#9c7e68');d.rectangle((6,8,83,10),fill='#cba277')
 im.save(OUT/(name+'.png'))
# Comparison contact sheet, kept outside the upload.
items=[({'dragonBerry':'dragon-berry','dragonSky':'dragon-sky','bubbleStar':'bubble-star','bubbleRainbow':'bubble-rainbow'}.get(i['texture'],i['texture']),32 if i['slot']!='bubble' else 16,6 if i['slot']=='dragon' else 4) for i in catalog]
contact=Image.new('RGB',(480,math.ceil(len(items)/6)*100),'#f7e6c5');draw=ImageDraw.Draw(contact)
for i,(name,n,frames) in enumerate(items):
 im=Image.open(OUT/(name+'.png')).crop((0,0,n,n)).resize((64,64),Image.Resampling.NEAREST);x=i%6*80;y=i//6*100;contact.paste(im,(x+8,y+8),im);draw.text((x+3,y+76),name,fill=O)
contact.save(ROOT/'previews/cosmetic-lineup.png')
print('Created 72 paid designs: 24 outfits, 24 cannons, 24 bubbles, plus free bases and pixel shop stage.')
