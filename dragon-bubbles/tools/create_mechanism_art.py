"""One original seven-cell pixel sheet for six mechanisms and the retreat consumable."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];O='#253449';C='#fff1cf';P='#a98acb';B='#78d3d5';G='#f4bc69';M='#79c89d'
sheet=Image.new('RGBA',(224,32))
for i in range(7):
 im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
 if i==0:
  d.ellipse((1,1,30,30),fill=O);d.arc((3,3,28,28),20,320,fill=P,width=3);d.arc((7,7,24,24),130,430,fill=B,width=2);d.ellipse((12,12,20,20),fill='#111a2a');d.rectangle((23,4,25,6),fill=C)
 elif i==1:
  d.rectangle((1,7,30,26),fill=O);d.rectangle((3,9,28,24),fill='#6ba886');d.rectangle((6,5,12,12),fill=M);d.rectangle((20,3,26,13),fill=M);d.rectangle((9,15,13,19),fill='#a2d9a1');d.rectangle((21,17,24,20),fill='#a2d9a1')
 elif i==2:
  d.polygon([(1,8),(25,8),(31,16),(25,24),(1,24)],fill=O);d.rectangle((3,10,25,22),fill=G)
  for x in [7,15]:d.line((x,11,x+5,16,x,21),fill=C,width=2)
 elif i==3:
  d.polygon([(16,1),(30,26),(2,26)],fill=O);d.polygon([(16,4),(26,24),(6,24)],fill=B);d.polygon([(16,4),(16,24),(6,24)],fill=P);d.line((8,20,23,20),fill=C,width=2);d.rectangle((15,10,16,16),fill=C)
 elif i==4:
  d.rectangle((1,7,30,25),fill=O);d.rectangle((3,9,28,23),fill='#8a82a9')
  for x in [7,15,23]:d.line((x-3,11,x+2,16,x-3,21),fill=B,width=2)
  for x in [5,14,23]:d.rectangle((x,25,x+3,27),fill=G)
 elif i==5:
  d.ellipse((2,2,29,29),outline=O,width=3);d.ellipse((8,8,23,23),fill=P);d.rectangle((13,12,18,18),fill=B)
  for a,b,c in [((14,1),(14,6),(11,4)),((30,14),(25,14),(27,11)),((17,30),(17,25),(20,27)),((1,17),(6,17),(4,20))]:d.polygon([a,b,c],fill=G)
 else:
  d.polygon([(0,9),(7,11),(7,21),(0,23)],fill=P);d.polygon([(31,9),(24,11),(24,21),(31,23)],fill=P);d.rectangle((7,5,24,27),fill=O);d.rectangle((9,7,22,25),fill='#92b1ca');d.line((19,12,13,12,13,19,19,19),fill=C,width=2);d.polygon([(10,12),(15,8),(15,16)],fill=G)
 sheet.paste(im,(i*32,0))
sheet.save(ROOT/'build/assets/mechanisms.png');sheet.resize((896,128),Image.Resampling.NEAREST).save(ROOT/'previews/mechanisms.png')
