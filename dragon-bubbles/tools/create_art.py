"""Original pixel art drawn on small integer grids; no downloaded game assets."""
from PIL import Image, ImageDraw
from pathlib import Path
import random
ROOT=Path(__file__).resolve().parents[1]/'build/assets'
ROOT.mkdir(exist_ok=True)
O='#244e49';D='#368d75';M='#67c49b';H='#a3e2ac';Y='#ffe3a0';P='#ed9a83'
def dragon(frame):
 im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
 def r(box,c):d.rectangle(box,fill=c)
 # Stepped wings, horns, tail, silhouette.
 d.polygon([(5,17),(1,12),(1,22),(6,25),(9,22)],fill=O)
 d.polygon([(4,17),(2,15),(3,21),(7,23),(8,20)],fill='#e5a36e')
 d.polygon([(26,17),(30,12),(30,22),(25,25),(22,22)],fill=O)
 d.polygon([(27,17),(29,15),(28,21),(24,23),(23,20)],fill='#e5a36e')
 r((8,2,10,8),O);r((9,3,10,6),Y);r((21,2,23,8),O);r((21,3,22,6),Y)
 r((8,8,23,25),O);r((6,10,25,20),O);r((10,6,21,27),O)
 r((8,10,23,19),M);r((10,8,21,23),M);r((8,12,23,18),M)
 r((11,8,19,9),H);r((10,21,21,26),D);r((12,20,19,27),Y)
 r((8,26,13,29),O);r((18,26,23,29),O);r((9,26,12,28),M);r((19,26,22,28),M)
 # Front paws.
 r((7,20,10,24),O);r((8,20,10,22),H);r((21,20,24,24),O);r((21,20,23,22),H)
 if frame==1:
  r((10,13,13,13),O);r((18,13,21,13),O)
 elif frame==5:
  r((10,12,13,12),O);r((18,12,21,12),O);r((11,13,12,15),O);r((19,13,20,15),O)
 else:
  r((10,11,13,15),'#fff6d5');r((18,11,21,15),'#fff6d5')
  r((12,12,13,15),O);r((20,12,21,15),O);r((12,12,12,12),'white');r((20,12,20,12),'white')
 r((8,16,10,17),P);r((21,16,23,17),P)
 if frame==2:
  r((10,17,21,19),H);r((15,17,16,18),O)
 elif frame==3:
  r((13,16,18,20),O);r((14,17,17,19),'#9cd5c4');r((15,18,16,19),'#e9ffff')
 elif frame==4:
  r((13,17,18,19),O);r((14,19,17,19),P)
 else:r((14,18,17,18),O)
 return im
sheet=Image.new('RGBA',(32*6,32))
for f in range(6):sheet.paste(dragon(f),(f*32,0))
sheet.save(ROOT/'dragon.png')
for kind,colors in {'jelly':('#549d70','#8ace8d','#c7efa9'),'berry':('#91669a','#ba91be','#e8c2df'),'boss':('#b86188','#e79db4','#ffd8bf')}.items():
 im=Image.new('RGBA',(32,24));d=ImageDraw.Draw(im)
 d.rectangle((4,8,27,20),fill=O);d.rectangle((7,4,24,22),fill=O);d.rectangle((10,2,21,21),fill=O)
 d.rectangle((5,9,26,19),fill=colors[0]);d.rectangle((8,5,23,21),fill=colors[1]);d.rectangle((11,3,20,20),fill=colors[1]);d.rectangle((10,6,14,8),fill=colors[2]);d.rectangle((8,11,25,17),fill=colors[1])
 d.rectangle((10,12,12,15),fill=O);d.rectangle((20,12,22,15),fill=O);d.point((10,12),fill='white');d.point((20,12),fill='white');d.rectangle((15,16,17,16),fill=O)
 d.rectangle((7,16,10,17),fill='#f3b6a0');d.rectangle((22,16,25,17),fill='#f3b6a0')
 if kind=='boss':
  d.polygon([(8,4),(7,0),(12,3),(16,0),(20,3),(25,0),(24,5)],fill='#e8b453');d.rectangle((10,4,22,5),fill='#fff0ac')
 im.save(ROOT/(kind+'.png'))
im=Image.new('RGBA',(24,24));d=ImageDraw.Draw(im)
d.polygon([(4,9),(20,9),(18,22),(6,22)],fill=O);d.rectangle((6,10,18,19),fill='#ffe5b0')
for x in [7,12,17]:d.rectangle((x,11,x+1,20),fill='#d67865')
for x,y in [(6,7),(10,4),(15,5),(18,7),(12,8)]:
 d.rectangle((x-2,y-2,x+2,y+2),fill='#9d8156');d.rectangle((x-1,y-1,x+2,y+1),fill='#fff0ba')
im.save(ROOT/'popcorn.png')
im=Image.new('RGBA',(20,20));d=ImageDraw.Draw(im)
d.polygon([(1,6),(6,8),(6,12),(1,14)],fill='#9dd9d0');d.polygon([(19,6),(14,8),(14,12),(19,14)],fill='#9dd9d0')
d.rectangle((5,5,14,14),fill=O)
for i,c in enumerate(['#f2a29d','#f5d48e','#a7d99a','#81c5cd']):d.rectangle((6+i*2,6,7+i*2,13),fill=c)
im.save(ROOT/'rainbow.png')
im=Image.new('RGBA',(10,10));d=ImageDraw.Draw(im)
d.rectangle((2,0,7,9),fill='#80b7a7');d.rectangle((0,2,9,7),fill='#80b7a7');d.rectangle((2,1,7,8),fill='#d1f3d4');d.rectangle((1,2,8,7),fill='#d1f3d4');d.rectangle((2,2,4,3),fill='#fffde5');im.save(ROOT/'bubble.png')
im=Image.new('RGBA',(20,20));d=ImageDraw.Draw(im)
d.polygon([(10,1),(12,7),(19,7),(14,11),(16,18),(10,14),(4,18),(6,11),(1,7),(8,7)],fill='#a27b45');d.polygon([(10,3),(12,8),(17,8),(13,11),(14,15),(10,13),(6,15),(7,11),(3,8),(8,8)],fill='#ffe39b');d.rectangle((8,8,8,10),fill=O);d.rectangle((12,8,12,10),fill=O);im.save(ROOT/'star.png')
# Full scene built at 180x320, then enlarged with nearest-neighbor.
im=Image.new('RGB',(180,320),'#e9edcf');d=ImageDraw.Draw(im);rng=random.Random(88)
d.rectangle((0,0,179,115),fill='#c9e4d7')
for x,y,w in [(10,40,32),(112,23,38),(73,78,24)]:
 d.rectangle((x,y,x+w,y+5),fill='#eef4d7');d.rectangle((x+6,y-4,x+w-6,y+8),fill='#eef4d7')
# Far hills and layered forest.
d.polygon([(0,128),(0,99),(24,79),(46,106),(74,71),(111,107),(143,79),(180,107),(180,153)],fill='#adcdb2')
d.polygon([(0,140),(0,121),(29,102),(64,128),(104,95),(141,121),(180,102),(180,169)],fill='#8fbda1')
for x in [4,31,149,174]:
 d.rectangle((x-2,93,x+2,278),fill='#709d7e')
 for y in [83,114,143,181]:
  d.rectangle((x-12,y,x+13,y+14),fill='#86b18c');d.rectangle((x-8,y-5,x+8,y+20),fill='#86b18c')
scenic=im.copy()
# Soft central arena; textured pixel tiles stay low contrast behind targets.
d.rectangle((10,53,169,260),fill='#d8e4be')
layer=Image.new('RGBA',im.size);ld=ImageDraw.Draw(layer);ld.rectangle((12,55,167,258),fill=(230,237,207,205));im=Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB');d=ImageDraw.Draw(im)
for _ in range(140):
 x=rng.randrange(14,166);y=rng.randrange(57,257);d.rectangle((x,y,x+1,y+1),fill='#dce6c6')
# Candy trees along the sides.
for x,y,color in [(3,177,'#e8a69a'),(174,131,'#d9b6bd'),(4,223,'#ebc98c'),(174,230,'#a4cfbb')]:
 d.rectangle((x-1,y+9,x+1,y+33),fill='#a78f6d')
 d.rectangle((x-8,y-4,x+8,y+10),fill='#70977b');d.rectangle((x-5,y-8,x+5,y+14),fill='#70977b')
 d.rectangle((x-7,y-3,x+7,y+8),fill=color);d.rectangle((x-4,y-7,x+4,y+12),fill=color)
 d.rectangle((x-4,y-3,x-2,y+2),fill='#f6e4b8')
# Biscuit bank.
d.rectangle((0,274,179,284),fill='#7da180');d.rectangle((0,280,179,319),fill='#b98e60');d.rectangle((0,281,179,286),fill='#f0cf91')
for y in range(292,320,13):
 for x in range(-10,180,23):
  x+=(11 if y%2 else 0);d.rectangle((x,y,x+18,y+8),fill='#d9af78');d.rectangle((x+4,y+3,x+5,y+4),fill='#b98e60');d.rectangle((x+12,y+3,x+13,y+4),fill='#b98e60')
for x in [17,38,143,162]:
 d.rectangle((x,269,x+1,279),fill='#557e65');d.rectangle((x-2,270,x+3,273),fill='#f4d6a3');d.rectangle((x,269,x+1,271),fill='#d9948c')
im.resize((360,640),Image.Resampling.NEAREST).save(ROOT/'forest.png')
print('Created original pixel sprites and forest scene')

# Scenic title illustration: candy canopy, a winding path and a distant castle.
cover=scenic.copy();c=ImageDraw.Draw(cover)
c.polygon([(66,300),(115,300),(101,244),(94,218),(93,194),(87,194),(83,229)],fill='#ead4a0')
c.polygon([(72,300),(106,300),(96,244),(90,219),(90,195),(86,230)],fill='#f4e3b9')
# Distant biscuit castle, behind the title character.
c.rectangle((68,125,111,170),fill='#e2c799');c.rectangle((64,117,78,166),fill='#d6b786');c.rectangle((103,117,117,166),fill='#d6b786')
c.polygon([(61,118),(71,100),(81,118)],fill='#d19397');c.polygon([(100,118),(110,100),(120,118)],fill='#d19397')
c.rectangle((76,138,103,143),fill='#f5dfb3');c.rectangle((85,152,95,170),fill='#92b797')
for x in [68,108]:c.rectangle((x,124,x+4,131),fill='#789f88')
def candy_tree(x,y,color,scale=1):
 c.rectangle((x-2,y+10,x+2,y+57),fill='#9c8262');c.rectangle((x-1,y+12,x+1,y+55),fill='#edcda0')
 c.rectangle((x-16,y-6,x+16,y+13),fill='#5e937a');c.rectangle((x-11,y-13,x+11,y+20),fill='#5e937a')
 c.rectangle((x-14,y-5,x+14,y+11),fill=color);c.rectangle((x-10,y-11,x+10,y+18),fill=color)
 c.rectangle((x-9,y-5,x-5,y+5),fill='#f8e7b9');c.rectangle((x-4,y-8,x+2,y-5),fill='#f8e7b9')
for x,y,color in [(17,102,'#e4a1a0'),(160,114,'#e4c589'),(22,182,'#e2bcce'),(157,190,'#b4d4b0')]:candy_tree(x,y,color)
c.rectangle((0,278,179,319),fill='#7ea47e');c.rectangle((0,290,179,319),fill='#caa16d')
for x in range(0,180,11):c.rectangle((x,277,x+6,282),fill='#9fbd8e')
cover.resize((360,640),Image.Resampling.NEAREST).save(ROOT/'cover.png')
