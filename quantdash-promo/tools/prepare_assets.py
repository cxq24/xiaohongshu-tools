"""Deterministic original score/SFX and local font subsets; no network calls."""
from pathlib import Path
import json,hashlib,wave,shutil,sys
import numpy as np

R=Path(__file__).resolve().parents[1];RATE=48000;DURATION=30;TOTAL=RATE*DURATION
rng=np.random.default_rng(20261124)
music=np.zeros((TOTAL,2));sfx=np.zeros((TOTAL,2));events=[]
def add(track,signal,at,volume=1,pan=0):
 start=int(at*RATE)
 if start<0:signal=signal[-start:];start=0
 length=min(len(signal),TOTAL-start)
 if length<=0:return
 track[start:start+length,0]+=signal[:length]*volume*np.sqrt((1-pan)/2)
 track[start:start+length,1]+=signal[:length]*volume*np.sqrt((1+pan)/2)
def hz(m):return 440*2**((m-69)/12)
def pluck(m,d=.8):
 t=np.arange(int(d*RATE))/RATE;f=hz(m)
 return (np.sin(2*np.pi*f*t)+.2*np.sin(2*np.pi*f*2*t)+.05*np.sin(2*np.pi*f*3*t))*np.exp(-t*6)*(1-np.exp(-t*120))
def tone(m,d):
 t=np.arange(int(d*RATE))/RATE
 env=np.minimum(1,t/.5)*np.minimum(1,(d-t)/.8)
 return (np.sin(2*np.pi*hz(m)*t)+.18*np.sin(2*np.pi*hz(m)*1.002*t))*env
chords=[[50,57,62,65,69],[46,53,58,62,65],[41,48,53,57,60],[48,55,60,64,67]]
for bar in range(8):
 chord=chords[bar%4];at=bar*4
 for j,note in enumerate(chord[1:4]):add(music,tone(note,4.3),at,.025,(j-1)*.45)
 for k in range(16):
  t0=at+k*.25
  if t0>=29:continue
  note=chord[[2,3,4,3,2,1,3,4][k%8]]+(12 if k%8==7 else 0)
  add(music,pluck(note),t0,.085 if k%2==0 else .045,(-1 if k%2 else 1)*.28)
for beat in range(60):
 t0=beat*.5
 if beat>2:
  t=np.arange(int(.22*RATE))/RATE
  kick=np.sin(2*np.pi*(43*t+48*.018*(1-np.exp(-t/.018))))*np.exp(-t*24)*(1-np.exp(-t*800))
  add(music,kick,t0,.13)
 if beat>7:
  t=np.arange(int(.075*RATE))/RATE;n=rng.normal(0,1,len(t));n=np.r_[0,np.diff(n)]
  add(music,n*np.exp(-t*85),t0+.25,.016,(-1 if beat%2 else 1)*.4)
 if beat>7 and beat%4 in [1,3]:
  t=np.arange(int(.15*RATE))/RATE;n=rng.normal(0,1,len(t));n=np.convolve(n,np.ones(8)/8,'same')
  add(music,n*np.exp(-t*34),t0,.042,.1)

# Sounds represent abstract data travel and code reveal, not a real recorded UI.
def cue(name,at,kind,volume=.08,pan=0):
 if kind=='air':
  t=np.arange(int(.65*RATE))/RATE;n=rng.normal(0,1,len(t));n=np.convolve(n,np.ones(16)/16,'same');sig=n*np.sin(np.pi*t/.65)**2
 elif kind=='tick':
  t=np.arange(int(.055*RATE))/RATE;sig=(rng.normal(0,1,len(t))*.4+np.sin(2*np.pi*1700*t)*.2)*np.exp(-t*100)*(1-np.exp(-t*900))
 elif kind=='settle':sig=pluck(50,.7)+.5*pluck(62,.7)
 else:sig=pluck({'data':81,'finish':74}.get(kind,76),.8)
 add(sfx,sig,at,volume,pan);events.append({'name':name,'at_seconds':at,'frame':round(at*30),'kind':kind,'gain':volume})
cue('opening-reveal',.1,'air',.15)
for i in range(4):cue('market-connect-'+str(i),4.615+i*(.04*160/30),'data',.07-i*.006,(i-1.5)*.2)
cue('data-converge',7.55,'air',.18);cue('converge-land',7.93,'settle',.13)
cue('python-window',10.4,'air',.12)
for i in range(9):
 if i!=1:cue('code-row-'+str(i),10+(35+i*7)/30,'tick',.08-(i%3)*.009)
for i in range(3):cue('feature-card-'+str(i),17+(39+i*19)/30-.025,'settle',.07)
cue('brand-contract',23.05,'air',.15);cue('brand-land',24.22,'settle',.2);cue('wordmark-finish',26.3,'finish',.14)
clock=np.arange(TOTAL)/RATE
fade=np.minimum(1,clock/.4)*np.minimum(1,(30-clock)/1.25)
music*=fade[:,None]*2.8;sfx*=np.minimum(1,(30-clock)/.5)[:,None]*1.5
# Keep a separate, unadvanced reference against the nominal cue table for QA.
reference=R/'out/qa/unadvanced-sfx.wav'
reference.parent.mkdir(exist_ok=True,parents=True)
with wave.open(str(reference),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((np.clip(sfx,-1,1)*32767).astype('<i2').tobytes())
if '--reference-only' in sys.argv:
 print('Generated unadvanced reference from nominal cue table:',hashlib.sha256(reference.read_bytes()).hexdigest());raise SystemExit(0)
# Measured Remotion 4.0.484 / AAC48k / H264 MP4 priming = 2048 samples.
ADVANCE=2048
music=np.pad(music[ADVANCE:],((0,ADVANCE),(0,0)))
sfx=np.pad(sfx[ADVANCE:],((0,ADVANCE),(0,0)))
def save(name,data):
 path=R/'public/audio'/name
 with wave.open(str(path),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
 return {'file':name,'seconds':30,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sample_peak_dbfs':float(20*np.log10(max(np.max(np.abs(data)),1e-12))),'rms_dbfs':float(20*np.log10(max(np.sqrt(np.mean(data*data)),1e-12)))}
audio=[save('music.wav',music),save('sfx.wav',sfx)]
(R/'research/audio.json').write_text(json.dumps({'origin':'Original procedural music and abstract data SFX created for this project. No stock music, samples or voice cloning.','bpm':120,'output_priming_advance_samples':ADVANCE,'output_priming_pipeline':'Remotion 4.0.484, AAC 48kHz, H264 MP4, measured 2026-11-24 against three decoded SFX probes','seed':20261124,'freesound_attempt':'Blocked by environment destination policy (403); no downloaded sound claimed. Abstract data-flow tones are an intentional visual metaphor.','listening':'No human listening verification; numerical checks and soundtrack files supplied for review.','files':audio,'cues':events},ensure_ascii=False,indent=2)+'\n')

from fontTools.ttLib import TTFont
from fontTools import subset
text=''.join(p.read_text() for p in [R/'src/Promo.tsx',R/'DESIGN.md'])+''.join(chr(i) for i in range(32,127))
for filename,source,index in [('qd-sans.otf','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',2),('qd-bold.otf','/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',2),('qd-mono.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',None)]:
 font=TTFont(source,fontNumber=index) if index is not None else TTFont(source)
 options=subset.Options();options.layout_features=['*'];worker=subset.Subsetter(options);worker.populate(text=text);worker.subset(font);font.flavor=None;font.save(R/'public/fonts'/filename)
shutil.copy('/usr/share/doc/fonts-noto-cjk/copyright',R/'research/NOTO-FONT-LICENSE.txt')
(R/'research/DEJAVU-FONT-LICENSE.txt').write_text('\n'.join(line.rstrip() for line in Path('/usr/share/doc/fonts-dejavu-core/copyright').read_text().splitlines())+'\n')
print('Prepared local fonts and deterministic 120 BPM soundtrack:',json.dumps(audio))
