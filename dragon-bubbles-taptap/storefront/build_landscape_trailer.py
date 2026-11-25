"""Validate the direct-rendered complete landscape recording for material packaging."""
from pathlib import Path
import hashlib,json,subprocess

ROOT=Path(__file__).resolve().parent
TARGET=ROOT/'gameplay-landscape-complete-40s-1920x1080.mp4'
def build_trailer():
 report=json.loads((ROOT/'landscape-demo/validation.json').read_text())
 assert report['file']==TARGET.name
 assert hashlib.sha256(TARGET.read_bytes()).hexdigest()==report['sha256']
 assert report['direct_game_rendering'] and report['camera_fixed']
 assert not report['crop'] and not report['padding'] and not report['picture_in_picture']
 assert report['all_game_actors_and_controls_inside_viewport']
 result=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_aspect_ratio,display_aspect_ratio,pix_fmt,sample_rate,channels','-of','json',str(TARGET)],text=True))
 v=next(s for s in result['streams'] if s['codec_type']=='video')
 a=next(s for s in result['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'])==(1920,1080) and v['display_aspect_ratio']=='16:9'
 assert v['sample_aspect_ratio']=='1:1' and v['codec_name']=='h264' and v['r_frame_rate']=='30/1'
 assert a['codec_name']=='aac' and float(result['format']['duration'])==40
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(TARGET),'-f','null','-'],check=True)
 report['video']=result;report['full_decode']='passed'
 return report
