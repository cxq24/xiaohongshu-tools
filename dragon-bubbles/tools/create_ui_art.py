"""Original tiny UI glyphs, outfits and cannon skins on integer pixel grids."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'build/assets';O='#244e49';L='#fff0c9'
for i in range(5):
 sheet=Image.open(ROOT/'dragon.png').convert('RGBA')
 for frame in range(6):
  d=ImageDraw.Draw(sheet);x=frame*32
  def r(box,c):d.rectangle((box[0]+x,box[1],box[2]+x,box[3]),fill=c)
  if i==0:r((6,3,25,7),L);r((9,1,22,5),L);r((7,6,24,7),'#709eb7');r((12,21,19,26),'#94bdd0')
  if i==1:r((8,2,23,7),'#8cb3c9');r((10,0,21,4),'#8cb3c9');r((7,7,24,8),L);r((13,21,18,26),'#a2c9db')
  if i==2:d.polygon([(x+7,7),(x+16,0),(x+25,7)],fill='#a690b8');r((7,7,24,8),'#756991');r((10,21,21,26),'#a690b8');r((15,21,16,22),'#f2cf7d')
  if i==3:r((11,21,20,27),'#e5b67a');r((13,21,18,23),'#af8158');r((9,20,11,24),'#e5b67a');r((20,20,22,24),'#e5b67a')
  if i==4:r((10,21,21,27),'#8c7baf');r((11,21,12,26),'#83d6cf');r((19,21,20,26),'#83d6cf');r((9,8,22,9),'#a8e6d2')
 sheet.save(ROOT/f'outfit-{i}.png')
for name,c in [('wood','#c79e69'),('candy','#e6a7ad'),('ice','#a5d6de'),('neon','#80d2c7'),('cosmic','#b8a6d4')]:
 im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im);d.rectangle((5,21,26,29),fill=O);d.rectangle((7,21,24,27),fill=c);d.rectangle((10,15,21,25),fill=O);d.rectangle((12,14,19,24),fill=c);d.rectangle((12,3,19,17),fill=O);d.rectangle((14,5,17,15),fill=c);d.rectangle((14,3,17,5),fill='#173e39');d.rectangle((6,27,10,30),fill=O);d.rectangle((21,27,25,30),fill=O);d.rectangle((13,20,18,21),fill=L);im.save(ROOT/f'turret-{name}.png')
for name in ['candy','bag','menu','exit','codex','tasks','fire','balls','aim','guard','rewind','nova','hammer','music','effects','voice','gear','turret','dragon','bubble','play']:
 im=Image.new('RGBA',(20,20));d=ImageDraw.Draw(im)
 if name=='candy':
  d.polygon([(1,5),(6,7),(6,13),(1,15)],fill='#d89cb2');d.polygon([(19,5),(14,7),(14,13),(19,15)],fill='#d89cb2');d.rectangle((5,4,14,15),fill=O);d.rectangle((6,5,13,14),fill='#efcb78');d.polygon([(10,6),(11,9),(13,9),(11,11),(12,13),(10,12),(8,13),(9,11),(7,9),(9,9)],fill=L)
 elif name in ['bag','tasks']:
  d.rectangle((3,6,16,17),fill=O);d.rectangle((5,7,14,16),fill='#cda16e');d.rectangle((7,2,12,6),outline=O,width=2);d.rectangle((8,10,11,12),fill='#f2d78a')
 elif name=='menu':
  for y in [4,9,14]:d.rectangle((3,y,16,y+2),fill=O)
 elif name=='exit':
  d.rectangle((3,2,13,18),outline=O,width=2);d.line((7,10,18,10),fill='#b77566',width=2);d.polygon([(14,6),(19,10),(14,14)],fill='#b77566')
 elif name=='codex':
  d.rectangle((2,3,17,17),fill=O);d.rectangle((3,4,8,15),fill='#a6c999');d.rectangle((10,4,16,15),fill=L);d.rectangle((11,6,14,7),fill='#a1ae8e')
 elif name in ['fire','nova']:
  d.polygon([(10,1),(14,8),(15,5),(18,12),(15,18),(5,18),(2,12),(7,6),(7,11)],fill='#c98567');d.polygon([(10,7),(14,14),(12,17),(7,17),(6,13)],fill='#f2d78a')
 elif name in ['bubble','balls']:
  d.ellipse((2,3,14,15),fill='#85b6a0');d.ellipse((4,5,12,13),fill='#dcf0ce');d.rectangle((5,5,7,6),fill=L)
  if name=='balls':d.line((15,10,15,18),fill=O,width=2);d.line((11,14,19,14),fill=O,width=2)
 elif name=='aim':d.ellipse((2,2,17,17),outline=O,width=2);d.line((9,0,9,19),fill='#6a9f85');d.line((0,9,19,9),fill='#6a9f85');d.rectangle((8,8,11,11),fill='#dfaf71')
 elif name=='guard':d.polygon([(3,3),(10,1),(17,3),(16,13),(10,18),(4,13)],fill=O);d.polygon([(5,5),(10,3),(15,5),(14,12),(10,15),(6,12)],fill='#9dc7d1')
 elif name=='rewind':d.arc((2,2,17,17),30,315,fill=O,width=2);d.polygon([(1,1),(2,9),(8,4)],fill='#8d9fbd');d.line((10,6,10,10,14,12),fill=O,width=2)
 elif name=='hammer':d.rectangle((8,7,11,18),fill='#a88a67');d.polygon([(3,3),(15,2),(17,7),(5,9)],fill='#8eacb2')
 elif name=='music':d.line((7,14,7,4,16,2,16,13),fill=O,width=2);d.ellipse((2,12,8,17),fill='#8a9fba');d.ellipse((11,11,17,16),fill='#8a9fba')
 elif name in ['effects','voice']:
  d.polygon([(2,7),(6,7),(11,3),(11,17),(6,13),(2,13)],fill=O);d.arc((9,3,18,17),-70,70,fill='#7b9b7c',width=2)
 elif name=='play':d.polygon([(5,2),(17,10),(5,18)],fill='#6f9a7d')
 elif name=='gear':d.ellipse((3,3,16,16),fill=O);d.ellipse((6,6,13,13),fill='#e3c58b')
 elif name=='turret':d.rectangle((3,13,16,17),fill=O);d.rectangle((7,3,12,14),fill='#c79e69');d.rectangle((8,2,11,4),fill=O)
 else:d.rectangle((5,5,14,15),fill='#6fb798');d.rectangle((5,2,7,7),fill=O);d.rectangle((12,2,14,7),fill=O);d.rectangle((7,8,8,10),fill=O);d.rectangle((12,8,13,10),fill=O)
 im.save(ROOT/f'icon-{name}.png')
im=Image.new('RGBA',(24,32));d=ImageDraw.Draw(im);d.rectangle((7,10,16,19),fill='#e4c9a4');d.rectangle((5,6,18,11),fill='#d7ad6e');d.rectangle((7,4,16,7),fill='#d7ad6e');d.rectangle((5,20,18,28),fill='#7da4a6');d.rectangle((7,29,10,31),fill=O);d.rectangle((14,29,17,31),fill=O);d.rectangle((8,13,9,14),fill=O);d.rectangle((14,13,15,14),fill=O);im.save(ROOT/'engineer.png')
print('Created outfit sheets, cosmetic cannons, a common currency glyph and item/menu icons.')
