"""One original seven-cell pixel sheet for six mechanisms and the retreat consumable."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];O='#253449';C='#fff1cf';P='#a98acb';B='#78d3d5';G='#f4bc69';M='#79c89d'
sheet=Image.new('RGBA',(224,32))
for i in range(7):
 im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
 if i==0:
  d.ellipse((2,2,29,29),fill=O);d.arc((3,3,28,28),15,300,fill=P,width=3);d.arc((7,7,24,24),110,390,fill='#d794d3',width=2);d.ellipse((11,11,21,21),fill='#0d1021')
  for pts in [[(2,7),(7,7),(7,12)],[(25,2),(25,7),(20,7)],[(30,25),(25,25),(25,20)],[(7,30),(7,25),(12,25)]]:d.polygon(pts,fill=P)
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
  d.rectangle((7,7,24,24),fill=O);d.rectangle((9,9,22,22),fill=B);d.rectangle((12,12,19,19),fill='#d8ffff');d.rectangle((14,14,17,17),fill=O)
  d.polygon([(16,0),(11,6),(21,6)],fill=G);d.polygon([(31,16),(25,11),(25,21)],fill=G);d.polygon([(16,31),(11,25),(21,25)],fill=G);d.polygon([(0,16),(6,11),(6,21)],fill=G)
 else:
  d.polygon([(0,9),(7,11),(7,21),(0,23)],fill=P);d.polygon([(31,9),(24,11),(24,21),(31,23)],fill=P);d.rectangle((7,5,24,27),fill=O);d.rectangle((9,7,22,25),fill='#92b1ca');d.line((19,12,13,12,13,19,19,19),fill=C,width=2);d.polygon([(10,12),(15,8),(15,16)],fill=G)
 sheet.paste(im,(i*32,0))
sheet.save(ROOT/'build/assets/mechanisms.png');sheet.resize((896,128),Image.Resampling.NEAREST).save(ROOT/'previews/mechanisms.png')

# Portal has a doorway silhouette, separate from either round field effect.
portal=Image.new('RGBA',(20,30));d=ImageDraw.Draw(portal);d.rectangle((1,1,18,29),fill=O);d.rectangle((3,3,16,27),fill='#4d8ccc');d.rectangle((5,5,14,26),fill='#9ce3ee');d.rectangle((7,6,12,25),fill='#315f92');d.rectangle((8,9,11,21),fill='#c1ffff');d.rectangle((0,27,19,29),fill='#aac7df');d.rectangle((3,2,5,5),fill=C);d.rectangle((14,2,16,5),fill=C);portal.save(ROOT/'build/assets/portal.png')
