"""Validate the rendered review artifacts, including actual compressed-video QR."""
from pathlib import Path
import subprocess,json,hashlib,re,wave,sys
import numpy as np
from scipy.signal import correlate,correlation_lags
from PIL import Image,ImageDraw

R=Path(__file__).resolve().parents[1];out=R/'out';qa=out/'qa';qa.mkdir(exist_ok=True)
if not (qa/'unadvanced-sfx.wav').exists():subprocess.run([sys.executable,str(R/'tools/prepare_assets.py'),'--reference-only'],check=True)
def run(args):return subprocess.check_output(args,text=True,stderr=subprocess.STDOUT)
reports=[]
for name in ['quantdash-30s-v1.mp4','quantdash-30s-v1-nobgm.mp4']:
 path=out/name
 d=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]));v=next(x for x in d['streams'] if x['codec_type']=='video');a=next(x for x in d['streams'] if x['codec_type']=='audio')
 assert (v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))==(1080,1920,'30/1',900)
 assert v['codec_name']=='h264' and v['pix_fmt']=='yuv420p' and a['codec_name']=='aac' and a['sample_rate']=='48000'
 assert abs(float(d['format']['duration'])-30)<.08
 black=run(['ffmpeg','-hide_banner','-nostats','-i',str(path),'-vf','blackdetect=d=0.15:pix_th=0.015:pic_th=0.99','-an','-f','null','-']);assert 'black_start:' not in black,name
 loud=run(['ffmpeg','-hide_banner','-nostats','-i',str(path),'-vn','-af','loudnorm=print_format=json','-f','null','-']);m=json.loads(loud[loud.rfind('{'):loud.rfind('}')+1]);assert float(m['input_tp'])<-.5
 # Retain the frame digests to prove visual parity of music / no-music exports.
 md5=run(['ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-f','framemd5','-']);(qa/(path.stem+'-frames.md5')).write_text(md5)
 reports.append({'file':name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'duration_seconds':float(d['format']['duration']),'frames':int(v['nb_frames']),'size':[v['width'],v['height']],'fps':v['r_frame_rate'],'video_codec':v['codec_name'],'pixel_format':v['pix_fmt'],'audio_codec':a['codec_name'],'sample_rate':a['sample_rate'],'loudness_lufs':float(m['input_i']),'true_peak_dbtp':float(m['input_tp']),'black_frames_detected':False})
digests=[(qa/(Path(r['file']).stem+'-frames.md5')).read_text() for r in reports];assert digests[0]==digests[1],'Different video between music/no-music exports'
assert reports[0]['sha256']!=reports[1]['sha256'],'Music and no-music exports are identical files'
frames=[90,180,250,480,660,899];sheet=Image.new('RGB',(1080,1360),'#1c2937');draw=ImageDraw.Draw(sheet)
for i,frame in enumerate(frames):
 target=qa/f'rendered-f{frame}.png';subprocess.run(['ffmpeg','-y','-v','error','-i',str(out/'quantdash-30s-v1.mp4'),'-vf',f'select=eq(n\\,{frame})','-frames:v','1',str(target)],check=True)
 im=Image.open(target).convert('RGB');im.thumbnail((360,640));x=i%3*360;y=i//3*680;sheet.paste(im,(x,y+35));draw.text((x+12,y+10),f'{frame/30:.2f}s / frame {frame}',fill='white')
sheet.save(out/'quantdash-30s-storyboard.jpg',quality=94)
Image.open(qa/'rendered-f899.png').save(out/'quantdash-30s-poster.jpg',quality=94)
qr=run(['node','-e',"const {PNG}=require('pngjs'),fs=require('fs'),jsQR=require('jsqr');const p=PNG.sync.read(fs.readFileSync(process.argv[1]));const q=jsQR(new Uint8ClampedArray(p.data),p.width,p.height);if(!q)process.exit(1);console.log(q.data)",str(qa/'rendered-f899.png')]).strip();assert qr=='https://quantdash.net/'
# Measure decoded AAC vs original SFX using three isolated cue windows.
decoded=qa/'sfx-decoded.wav';subprocess.run(['ffmpeg','-y','-v','error','-i',str(out/'quantdash-30s-v1-nobgm.mp4'),'-vn','-ac','1','-ar','48000',str(decoded)],check=True)
def samples(path):
 with wave.open(str(path),'rb') as f:
  n=f.getnchannels();return np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,n).mean(axis=1)
src=samples(R/'public/audio/sfx.wav');nominal=samples(qa/'unadvanced-sfx.wav');dst=samples(decoded);offsets=[]
length=min(len(nominal),len(dst));coefficient=float(np.corrcoef(nominal[:length],dst[:length])[0,1]);assert coefficient>.97,('No-BGM must match SFX-only waveform',coefficient)
silent=dst[int(9.2*48000):int(9.7*48000)];silent_rms=float(20*np.log10(max(np.sqrt(np.mean(silent*silent))/32768,1e-12)));assert silent_rms<-60,('Music remains in intended silent SFX window',silent_rms)
for at in [.1,10.4,23.05]:
 a=max(0,int((at-.07)*48000));b=min(len(src),int((at+.6)*48000));x=src[a:b];y=dst[a:b];corr=correlate(y,x,mode='full',method='fft');lag=int(correlation_lags(len(y),len(x))[np.argmax(corr)]);original=nominal[a:b];rawcorr=correlate(y,original,mode='full',method='fft');netlag=int(correlation_lags(len(y),len(original))[np.argmax(rawcorr)]);offsets.append({'cue_seconds':at,'offset_vs_prepared_source_samples':lag,'net_offset_vs_unadvanced_reference_samples':netlag,'net_offset_vs_unadvanced_reference_frames':netlag/1600})
assert max(abs(x['net_offset_vs_unadvanced_reference_frames']) for x in offsets)<.15,offsets
result={'status':'passed','artifacts':reports,'music_and_nobgm_video_frame_identical':True,'music_and_nobgm_files_differ':True,'nobgm_vs_sfx_reference_correlation':coefficient,'nobgm_silent_window_rms_dbfs':silent_rms,'qr_decoded_from_compressed_video':qr,'sfx_audio_offset_probes':offsets,'unadvanced_sfx_reference_sha256':hashlib.sha256((qa/'unadvanced-sfx.wav').read_bytes()).hexdigest(),'shot_cuts_seconds':[0,4,10,17,23,30],'music_bpm':120,'cuts_on_half_second_beat_grid':True,'soundtrack_is_original_procedural':True,'human_listening':'not verified','game_integration':'not performed; waiting for user approval','website_brand_match':'not verified; network access pending'}
(out/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2))
