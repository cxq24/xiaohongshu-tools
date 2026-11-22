"""Original integer-grid world art and themed creatures; no external art assets."""
from PIL import Image,ImageDraw
from pathlib import Path
import random
from generate_campaign import WORLDS
ROOT=Path(__file__).resolve().parents[1]/'build/assets'
O='#244e49'
for w,world in enumerate(WORLDS):
 name,key,enemy,bomb,pickup,sky,accent,mechanic=world
 rng=random.Random(99+w)
 base=Image.new('RGB',(180,320),sky);d=ImageDraw.Draw(base)
 # Theme-specific silhouettes and landmarks.
 if w==0:
  base=Image.open(ROOT/'cover.png').resize((180,320),Image.Resampling.NEAREST).convert('RGB');d=ImageDraw.Draw(base)
 elif w==1:
  for y in range(90,320,15):d.rectangle((0,y,179,y+6),fill='#86becb')
  for x in [6,151]:
   d.rectangle((x+8,122,x+11,275),fill='#619faa')
   for y in [146,181,220]:d.rectangle((x,y,x+26,y+7),fill='#b7c9b1');d.rectangle((x+3,y-12,x+7,y+7),fill='#cf9b9b')
  d.polygon([(0,280),(44,270),(99,287),(180,273),(180,320),(0,320)],fill='#dacba2')
 elif w==2:
  for x,y in [(5,80),(60,45),(135,66)]:d.polygon([(x-25,160),(x,y),(x+45,160)],fill='#9bbdc9');d.polygon([(x-10,y+35),(x,y),(x+15,y+35)],fill='#ecf3e8')
  for x in [4,160]:d.polygon([(x-4,285),(x+2,185),(x+19,285)],fill='#81baca')
  for _ in range(100):x,y=rng.randrange(180),rng.randrange(300);d.rectangle((x,y,x+1,y+1),fill='#eef6ea')
 elif w==3:
  for x,y in [(12,120),(157,105),(18,223),(165,234)]:
   d.rectangle((x-2,y,x+4,y+63),fill='#a5ad7d');d.rectangle((x-20,y-9,x+20,y+6),fill='#ad7b9f');d.rectangle((x-13,y-18,x+13,y+10),fill='#ad7b9f');d.rectangle((x-10,y-9,x-4,y-3),fill='#eee3c6')
 elif w==4:
  for x in [2,150]:
   d.rectangle((x,65,x+24,283),fill='#7d8f81')
   for y in range(80,280,35):d.rectangle((x+2,y,x+23,y+10),fill='#bba980')
  for x in [45,86,123]:d.rectangle((x,82,x+18,180),fill='#97a195');d.rectangle((x+4,72,x+13,82),fill='#7f938a')
  for y in [280,288,296]:d.rectangle((0,y,179,y+3),fill='#7a8b78')
 elif w==5:
  for x,y in [(20,100),(114,72)]:d.polygon([(x-45,205),(x,y),(x+72,205)],fill='#d1b382');d.line((x,y,x+24,205),fill='#efd4a0',width=2)
  for x in [8,156]:d.rectangle((x,130,x+13,280),fill='#af976b');d.rectangle((x-2,128,x+15,138),fill='#e3c48d')
 elif w==6:
  base=Image.new('RGB',(180,320),'#667b9e');d=ImageDraw.Draw(base)
  for _ in range(140):x,y=rng.randrange(180),rng.randrange(320);d.rectangle((x,y,x+1,y+1),fill='#c7d8cc')
  d.ellipse((112,58,158,104),fill='#b8abc9');d.rectangle((106,78,166,82),fill='#d7cdca')
  d.ellipse((15,192,48,225),fill='#8daec0')
 elif w==7:
  base=Image.new('RGB',(180,320),'#3e6574');d=ImageDraw.Draw(base)
  for x in range(0,180,25):
   y=rng.randrange(75,150);d.rectangle((x,y,x+20,286),fill='#304d63')
   for yy in range(y+8,280,18):d.rectangle((x+4,yy,x+6,yy+6),fill='#7ad7ce');d.rectangle((x+13,yy,x+15,yy+6),fill='#d39bbd')
  for y in range(285,320,8):d.line((0,y,179,y),fill='#568990')
 elif w==8:
  for x,y in [(8,95),(122,125),(16,225),(125,247)]:
   d.rectangle((x,y,x+43,y+7),fill='#f1efdc');d.rectangle((x+8,y-8,x+33,y+13),fill='#f1efdc')
   d.polygon([(x,y+10),(x+43,y+10),(x+24,y+35)],fill='#9fbeb1')
 elif w==9:
  base=Image.new('RGB',(180,320),'#aa9dbf');d=ImageDraw.Draw(base)
  d.ellipse((109,42,146,79),fill='#eee1bf');d.ellipse((119,36,150,68),fill='#aa9dbf')
  for x in [7,153]:
   d.rectangle((x,107,x+19,281),fill='#7e809e');d.polygon([(x-4,108),(x+10,77),(x+25,108)],fill='#c19ab5')
   d.rectangle((x+5,131,x+13,151),fill='#e4cbb3')
 # Pixel ground and flowers / switches.
 d.rectangle((0,279,179,285),fill=accent);d.rectangle((0,286,179,319),fill='#8ba58b' if w not in [6,7,9] else '#667a8d')
 for x in range(0,180,17):d.rectangle((x,288,x+10,292),fill=sky)
 base.resize((360,640),Image.Resampling.NEAREST).save(ROOT/f'w{w}-cover.png')
 arena=base.convert('RGBA');overlay=Image.new('RGBA',arena.size);od=ImageDraw.Draw(overlay);od.rectangle((10,54,169,260),fill=(241,239,211,219));arena=Image.alpha_composite(arena,overlay)
 arena.resize((360,640),Image.Resampling.NEAREST).save(ROOT/f'w{w}-arena.png')
 # Island icon cutout for the outer world map.
 island=Image.new('RGBA',(96,70));di=ImageDraw.Draw(island)
 di.polygon([(3,33),(17,19),(72,18),(92,34),(74,62),(25,65)],fill=O);di.polygon([(6,33),(19,22),(71,21),(88,34),(70,47),(23,49)],fill=accent);di.polygon([(23,49),(70,47),(65,58),(27,60)],fill='#8d886a')
 thumb=base.crop((0,60,180,240)).resize((52,42),Image.Resampling.NEAREST)
 island.paste(thumb,(21,5));di=ImageDraw.Draw(island);di.line((20,46,73,46),fill='#dbe5b1',width=2)
 island.save(ROOT/f'w{w}-island.png')
 for kind in ['jelly','berry','boss','bomb','pickup','bubble']:
  if w==0 and kind in ['jelly','berry','boss']:
   Image.open(ROOT/(kind+'.png')).save(ROOT/f'w{w}-{kind}.png');continue
  if w==0 and kind in ['bomb','pickup','bubble']:
   Image.open(ROOT/({'bomb':'popcorn','pickup':'rainbow','bubble':'bubble'}[kind]+'.png')).save(ROOT/f'w{w}-{kind}.png');continue
  if kind=='bubble':
   im=Image.new('RGBA',(10,10));q=ImageDraw.Draw(im);q.rectangle((2,0,7,9),fill=O);q.rectangle((0,2,9,7),fill=O);q.rectangle((2,1,7,8),fill=accent);q.rectangle((1,2,8,7),fill=accent);q.rectangle((2,2,4,3),fill='#fff4d5');im.save(ROOT/f'w{w}-{kind}.png');continue
  im=Image.new('RGBA',(32,24));q=ImageDraw.Draw(im);color=accent if kind!='berry' else '#bc91af'
  if kind=='bomb':
   q.rectangle((7,7,24,20),fill=O);q.rectangle((9,9,22,18),fill='#e8bc82');q.rectangle((13,3,18,7),fill=accent);q.rectangle((14,11,17,16),fill='#d87d76')
  elif kind=='pickup':
   q.polygon([(16,1),(26,11),(16,22),(6,11)],fill=O);q.polygon([(16,3),(23,11),(16,19),(9,11)],fill=accent);q.rectangle((14,7,16,10),fill='#fff6d4')
  elif w==1:
   q.rectangle((5,6,26,15),fill=O);q.rectangle((9,2,22,17),fill=O);q.rectangle((7,7,24,14),fill=color);q.rectangle((10,4,21,16),fill=color)
   for x in [9,15,21]:q.rectangle((x,16,x+2,22),fill=color)
  elif w==2:
   q.polygon([(16,0),(28,10),(24,22),(8,22),(3,10)],fill=O);q.polygon([(16,2),(26,10),(22,20),(10,20),(5,10)],fill=color);q.line((16,3,16,9),fill='#eaf9f1',width=2)
  elif w==3:
   q.rectangle((12,11,21,23),fill=O);q.rectangle((14,12,19,21),fill='#ead8ad');q.rectangle((3,7,28,14),fill=O);q.rectangle((7,2,24,16),fill=O);q.rectangle((5,8,26,12),fill=color);q.rectangle((9,4,22,14),fill=color);q.rectangle((10,6,13,8),fill='#fae5c0')
  elif w==4:
   q.rectangle((4,6,27,19),fill=O);q.rectangle((10,1,21,23),fill=O);q.rectangle((7,4,24,21),fill=O);q.rectangle((7,8,24,17),fill=color);q.rectangle((12,4,19,21),fill=color);q.rectangle((11,8,21,18),fill='#e0d0a7')
  elif w==5:
   q.polygon([(8,3),(23,3),(29,13),(23,22),(7,22),(2,13)],fill=O);q.polygon([(9,5),(22,5),(26,13),(21,20),(9,20),(5,13)],fill=color);q.rectangle((10,6,20,8),fill='#eee0b8')
  elif w==6:
   q.ellipse((5,2,27,23),fill=O);q.ellipse((7,4,25,21),fill=color);q.rectangle((1,11,31,14),fill='#d4c7d5');q.rectangle((9,5,14,7),fill='#eee7cd')
  elif w==7:
   q.rectangle((5,3,26,22),fill=O);q.rectangle((3,6,28,18),fill=O);q.rectangle((7,5,24,20),fill=color);q.rectangle((9,8,23,17),fill='#356579');q.rectangle((10,4,21,5),fill='#e3a5cd')
  elif w==8:
   q.rectangle((3,9,28,18),fill=O);q.rectangle((7,4,24,22),fill=O);q.rectangle((11,1,19,21),fill=O);q.rectangle((5,10,26,17),fill=color);q.rectangle((9,6,22,20),fill=color);q.rectangle((12,3,18,19),fill=color)
  else:
   q.polygon([(5,7),(10,1),(16,6),(23,1),(28,8),(25,22),(7,22)],fill=O);q.rectangle((8,8,24,20),fill=color);q.polygon([(8,8),(11,4),(16,9),(22,4),(25,8)],fill='#f1d394')
  if kind in ['jelly','berry','boss']:
   q.rectangle((10,11,12,14),fill=O);q.rectangle((20,11,22,14),fill=O);q.point((10,11),fill='white');q.point((20,11),fill='white');q.rectangle((15,17,17,17),fill=O)
   if kind=='boss':q.polygon([(8,4),(7,0),(12,3),(16,0),(20,3),(25,0),(24,5)],fill='#e9bf76')
  im.save(ROOT/f'w{w}-{kind}.png')
# Mechanics sprites.
for name,color in [('stone','#a9a58b'),('ice','#a7d4df'),('spring','#bb9ec1'),('moving','#d5b47d'),('mirror','#b8d4d4'),('phase','#77cfc7')]:
 im=Image.new('RGBA',(40,12));d=ImageDraw.Draw(im);d.rectangle((0,0,39,11),fill=O);d.rectangle((2,2,37,9),fill=color)
 for x in [6,18,30]:d.rectangle((x,3,x+3,4),fill='#edf0cf')
 im.save(ROOT/f'obstacle-{name}.png')
im=Image.new('RGBA',(20,30));d=ImageDraw.Draw(im);d.rectangle((4,0,15,29),fill='#667c9e');d.rectangle((0,5,19,24),fill='#667c9e');d.rectangle((5,3,14,26),fill='#c7c1de');d.rectangle((3,7,16,22),fill='#c7c1de');d.rectangle((7,7,12,22),fill='#7795b1');im.save(ROOT/'portal.png')
print('Created ten biome scenes, island icons, creature silhouettes, pickups and obstacle art.')
