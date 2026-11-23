from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];prices=[40,80,160,260,420,650,1000,1600]
# Each tuple is (stable ID, name, art key, description); groups are equal-price choices.
roles=[
 [('dragon-berry','莓果阿噗','berry','奶油厨师帽 · 莓果围裙'),('dragon-sky','海盐阿噗','sky','海盐雨帽 · 条纹雨衣'),('outfit-0','阿噗的航海服',0,'三角航海帽 · 海军领巾')],
 [('outfit-1','阿噗的雪帽',1,'绒边雪帽 · 长围巾'),('outfit-7','阿噗的野餐背带装',7,'麦草帽 · 格纹背带裤'),('outfit-8','阿噗的邮差制服',8,'信使帽 · 斜挎邮包')],
 [('outfit-2','阿噗的学徒披风',2,'尖顶法帽 · 星纹披风'),('outfit-9','阿噗的蘑菇斗篷',9,'宽檐菌帽 · 孢子斗篷'),('outfit-10','阿噗的林地游侠装',10,'羽饰兜帽 · 林地披肩')],
 [('outfit-3','阿噗的工匠围裙',3,'护目镜 · 工具腰带'),('outfit-11','阿噗的深潜装',11,'圆舷潜水盔 · 铜色潜水服'),('outfit-12','阿噗的飞行夹克',12,'飞行皮帽 · 防风护镜')],
 [('outfit-4','阿噗的霓虹外套',4,'荧光耳机 · 霓虹外套'),('outfit-13','阿噗的庆典礼服',13,'高顶礼帽 · 金扣燕尾服'),('outfit-14','阿噗的糖甲武者装',14,'弦月头盔 · 分层糖甲')],
 [('outfit-5','阿噗的星轨领航服',5,'领航制服 · 星轨肩章 · 星屑'),('outfit-15','阿噗的星际宇航服',15,'透明星盔 · 背负火箭'),('outfit-16','阿噗的龙骑士铠甲',16,'龙翼肩甲 · 宝石胸铠')],
 [('outfit-17','阿噗的月影法袍',17,'弯月冠 · 夜幕法袍 · 月尘'),('outfit-18','阿噗的焰羽战衣',18,'焰羽冠 · 凤凰披翼 · 火星'),('outfit-19','阿噗的全息战衣',19,'天线头环 · 全息战甲 · 光点')],
 [('outfit-6','阿噗的星冕王袍',6,'星冕王冠 · 金边王袍 · 星光'),('outfit-20','阿噗的星砂祭司装',20,'日轮光冠 · 星砂祭袍 · 星屑'),('outfit-21','阿噗的梦境礼装',21,'花晶头冠 · 梦蝶礼装 · 梦尘')]
]
cannons=[
 [('log','树桩发射器','树纹炮身 · 分叉树根'),('bamboo','竹节发射器','双节竹管 · 竹叶装饰'),('acorn','松果发射器','松果轮廓 · 层叠鳞片')],
 [('candy','糖果发射器','透明糖罐 · 条纹糖管'),('cookie','饼干发射器','曲奇底座 · 威化炮管'),('teapot','茶壶发射器','茶壶炮身 · 弯柄与壶盖')],
 [('ice','冰晶发射器','晶簇轮廓 · 冰核脉动'),('snowman','雪人发射器','雪人机座 · 冰围巾'),('penguin','企鹅发射器','企鹅炮身 · 冰棱炮管')],
 [('mushroom','蘑菇发射器','宽檐菌盖 · 孢子气室'),('lantern','灯笼发射器','纸灯笼腔 · 顶部灯芯'),('flower','花苞发射器','花瓣炮口 · 叶片机座')],
 [('steam','蒸汽发射器','压力锅炉 · 侧置阀门'),('clockwork','钟表发射器','齿轮炮身 · 钟盘核心'),('rail','列车发射器','车头机座 · 烟囱炮管')],
 [('neon','霓虹发射器','双侧线圈 · 交替霓虹'),('hologram','全息发射器','立方投影 · 悬浮光芯'),('drone','浮游发射器','浮游双翼 · 能量环')],
 [('cosmic','星云发射器','悬浮星环 · 星核闪耀'),('lunar','弯月发射器','月牙炮身 · 月晶炮口'),('comet','彗星发射器','彗晶炮芯 · 星尾机翼')],
 [('crown','王冠发射器','王冠基座 · 星钻炮管'),('phoenix','焰羽发射器','焰羽双翼 · 日核炮口'),('cathedral','梦堡发射器','双塔机座 · 梦晶主炮')]
]
bubbles=[
 [('bubble-world-0','糖果森林泡泡',0,0,'花瓣与新叶'),('bubble-leaf','新叶泡泡','leaf',0,'锯齿叶缘 · 叶脉光芯'),('bubble-droplet','晨露泡泡','droplet',0,'露珠轮廓 · 清透水光')],
 [('bubble-world-1','泡泡海湾泡泡',1,1,'贝壳与珍珠'),('bubble-fish','河豚泡泡','fish',1,'鼓鼓河豚 · 小尾鳍'),('bubble-jellyfish','水母泡泡','jellyfish',1,'水母伞盖 · 发光触须')],
 [('bubble-world-2','冰晶雪原泡泡',2,2,'六角雪晶'),('bubble-crystal','棱冰泡泡','crystal',2,'六棱冰钻 · 明暗切面'),('bubble-snowflake','霜花泡泡','snowflake',2,'八向霜枝 · 冰蓝光核')],
 [('bubble-world-3','蘑菇秘境泡泡',3,3,'月光蘑菇'),('bubble-lantern','萤灯泡泡','lantern',3,'萤灯轮廓 · 暖光核心'),('bubble-butterfly','幻蝶泡泡','butterfly',3,'双翼蝶纹 · 光点翅脉')],
 [('bubble-world-4','齿轮工厂泡泡',4,4,'机械齿轮'),('bubble-world-5','沙漠遗迹泡泡',5,5,'太阳纹章'),('bubble-battery','电池泡泡','battery',4,'方形电池 · 闪电光芯')],
 [('bubble-world-6','星光天文台泡泡',6,6,'土星光环'),('bubble-world-7','霓虹都市泡泡',7,7,'全息方块'),('bubble-comet','彗尾泡泡','comet',6,'彗星轮廓 · 碎光星尾')],
 [('bubble-world-8','云端群岛泡泡',8,8,'浮云双翼'),('bubble-star','星光泡泡','star',8,'五角星轮廓 · 星芯闪动'),('bubble-moon','弯月泡泡','moon',8,'新月轮廓 · 三颗伴星')],
 [('bubble-world-9','梦境城堡泡泡',9,9,'梦晶莲冠'),('bubble-rainbow','彩虹泡泡','rainbow',9,'彩虹棱晶 · 流彩光芒'),('bubble-phoenix','焰羽泡泡','phoenix',9,'凤凰双翼 · 金色日核')]
]
items=[]
def add(slot,id,name,texture,desc,tier,art,world=None):
 item=dict(id=id,slot=slot,name=name,texture=texture,price=prices[tier],description=desc,collectionTier=tier,art=art)
 if world is not None:item['world']=world
 items.append(item)
for t,group in enumerate(roles):
 for id,name,art,desc in group:
  texture={'dragon-berry':'dragonBerry','dragon-sky':'dragonSky'}.get(id,id);add('dragon',id,name,texture,desc,t,art,None if t<5 else [6,8,9][t-5])
for t,group in enumerate(cannons):
 for art,name,desc in group:add('turret','turret-'+art,name,'turret-'+art,desc,t,art,None if t<5 else [6,8,9][t-5])
for t,group in enumerate(bubbles):
 for id,name,art,world,desc in group:
  texture=f'w{world}-bubble' if id.startswith('bubble-world-') else {'bubble-star':'bubbleStar','bubble-rainbow':'bubbleRainbow'}.get(id,id)
  add('bubble',id,name,texture,desc+' · 四帧闪光'+(' · 星屑拖尾' if t>=5 else ''),t,art,world)
(root/'tools/cosmetic-catalog.json').write_text(json.dumps({'prices':prices,'items':items},ensure_ascii=False,indent=2)+'\n')
# Emit frozen artwork descriptions as a runtime catalog. No runtime network.
(root/'build/cosmetics.js').write_text('/* Original cosmetic collection; eight price tiers and three choices per tier. */\n(function(root){const items='+json.dumps(items,ensure_ascii=False,separators=(',',':'))+';if(typeof module!=="undefined"&&module.exports)module.exports=items;else root.CANDY_COSMETICS=items;})(typeof window==="undefined"?globalThis:window);\n')
print('Authored 72 paid cosmetic choices: 8 price tiers × 3 variants × 3 categories.')
