"""Original suspense score, deterministic synthesis, 24-second seamless breathing beds."""
import math,random,wave,array,json,hashlib
from pathlib import Path
rate=22050;duration=24;count=rate*duration;root=Path('public/assets/audio/ambience');root.mkdir(parents=True,exist_ok=True)
entries=[]
for name,seed,base in [('dream',31,55),('weird',71,41),('void',113,36)]:
 rng=random.Random(seed);samples=array.array('h');noise=0
 for n in range(count):
  t=n/rate;noise=.994*noise+.006*rng.uniform(-1,1)
  breathing=.66+.22*math.sin(math.tau*t/8)+.08*math.cos(math.tau*t/12)
  drone=math.sin(math.tau*base*t)+.38*math.sin(math.tau*(base+1/3)*t)+.23*math.sin(math.tau*(base*1.5+.125)*t)
  metallic=.05*math.sin(math.tau*(base*4+.25)*t)*(.5+.5*math.cos(math.tau*t/6))**6
  pulse=(math.sin(math.tau*t/(4 if name=='dream' else 3))*.5+.5)**18*.07*math.sin(math.tau*(base*.5)*t)
  # Long breathing fade avoids a hard waveform discontinuity at either end of a loop.
  envelope=min(1,t/.5,(duration-t)/.5)
  value=(drone*.19*breathing+metallic+pulse+noise*.8)*envelope
  samples.append(round(max(-.8,min(.8,value))*32767))
 file=root/f'suspense-{name}-v2.wav'
 with wave.open(str(file),'wb')as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(samples.tobytes())
 raw=file.read_bytes();entries.append({'file':file.name,'seconds':duration,'sampleRate':rate,'sha256':hashlib.sha256(raw).hexdigest(),'source':'original procedural synthesis; scripts/generate-soundscapes.py'})
 print(file.name,len(raw),flush=True)
(root/'manifest-v2.json').write_text(json.dumps(entries,indent=2)+'\n',encoding='utf-8')
