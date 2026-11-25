"""Full-frame 16:9 trailer made exclusively from the original gameplay recording."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib,json,subprocess

ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'gameplay-recording-60s-720x1280.mp4'
TARGET=ROOT/'gameplay-fullscreen-30s-1920x1080.mp4'
SHOTS=[
 {'name':'游戏首页','start':0,'duration':1.5,'y_start':152,'y_end':152},
 {'name':'瞄准与发射','start':4,'duration':2.5,'y_start':740,'y_end':740},
 {'name':'泡泡命中与连锁','start':6.5,'duration':7,'y_start':240,'y_end':430},
 {'name':'软糖溪谷战斗','start':20,'duration':8.5,'y_start':250,'y_end':470},
 {'name':'爆米花营地战斗','start':51.5,'duration':7.7,'y_start':250,'y_end':440},
 {'name':'实际通关结算','start':15.7,'duration':2.8,'y_start':340,'y_end':340},
]
def probe(path):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_aspect_ratio,display_aspect_ratio,pix_fmt,sample_rate,channels','-of','json',str(path)],text=True))
def build_trailer():
 source_sha=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
 previous=json.loads((ROOT/'gameplay-recording-validation.json').read_text())
 assert previous['sha256']==source_sha,'Gameplay recording changed'
 assert sum(round(s['duration']*30) for s in SHOTS)==900
 with TemporaryDirectory() as temp:
  temp=Path(temp);listing=[]
  for index,shot in enumerate(SHOTS):
   clip=temp/f'clip-{index}.mkv';duration=shot['duration']
   # Every output pixel is a uniformly scaled region of the original game frame.
   # No external image, padding, overlay, title card, inset or duplicated background.
   y=f"2*floor(({shot['y_start']}+({shot['y_end']}-{shot['y_start']})*min(t/{duration},1))/2)"
   vf=f"crop=608:342:56:'{y}':exact=1,scale=1920:1080:flags=neighbor,fps=30,setsar=1,format=yuv420p"
   af=f'afade=t=in:d=0.03,afade=t=out:st={duration-.04}:d=0.04'
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(shot['start']),'-i',str(SOURCE),'-t',str(duration),'-vf',vf,'-af',af,'-c:v','libx264','-profile:v','high','-level:v','4.0','-preset','fast','-crf','19','-c:a','pcm_s16le','-ar','48000',str(clip)],check=True)
   listing.extend([f"file '{clip.as_posix()}'",f'duration {duration}'])
  (temp/'clips.txt').write_text('\n'.join(listing)+'\n')
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(temp/'clips.txt'),'-t','30','-c:v','copy','-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart',str(TARGET)],check=True)
 result=probe(TARGET)
 video=next(s for s in result['streams'] if s['codec_type']=='video')
 audio=next(s for s in result['streams'] if s['codec_type']=='audio')
 assert (video['width'],video['height'])==(1920,1080) and video['codec_name']=='h264'
 assert video['display_aspect_ratio']=='16:9' and video['sample_aspect_ratio']=='1:1'
 assert video['r_frame_rate']=='30/1' and video['pix_fmt']=='yuv420p' and audio['codec_name']=='aac'
 assert abs(float(result['format']['duration'])-30)<.05 and TARGET.stat().st_size<5*1024**3
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(TARGET),'-f','null','-'],check=True)
 report={'date':'2026-11-25','requirements_source':'User relayed TapTap home recommendation review: full-frame game footage; no non-game picture-in-picture layout','file':TARGET.name,'sha256':hashlib.sha256(TARGET.read_bytes()).hexdigest(),'source':SOURCE.name,'source_sha256':source_sha,'shots':SHOTS,'frame_selection':{'width':608,'height':342,'x':56,'aspect_ratio':'16:9','uniform_scale':True},'only_original_game_pixels':True,'external_visual_inputs':0,'picture_in_picture':False,'external_background':False,'marketing_text_overlay':False,'original_portrait_gameplay_recording_unchanged':True,'audio':'Original live game music and effects from matching source intervals; short fades at shot cuts','full_decode':'passed','video':result,'platform_recommendation_review_performed':False}
 (ROOT/'fullscreen-trailer-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(f'PASS: {TARGET.name}; 30 seconds, full-frame 16:9, H.264 + AAC, original game pixels only.')
 return report
if __name__=='__main__':build_trailer()
