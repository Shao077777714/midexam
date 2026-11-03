"""Development-time external neural voice generation; no API keys or service at runtime."""
import asyncio,json,hashlib
from pathlib import Path
import edge_tts
from mutagen.mp3 import MP3

async def main():
    root=Path('public/assets/audio/voice-v2');spec=json.loads((root/'scripts.json').read_text(encoding='utf-8'))
    gate=asyncio.Semaphore(2)
    async def generate(c):
        async with gate:
            file=root/(c['id']+'.mp3')
            if not file.exists() or file.stat().st_size<1000:
                for attempt in range(3):
                    try:
                        await edge_tts.Communicate(c['text'],spec['voice'],rate=spec['rate'],pitch=spec['pitch']).save(str(file));break
                    except Exception:
                        if attempt==2:raise
                        await asyncio.sleep(2)
            raw=file.read_bytes();seconds=MP3(file).info.length
            print(c['id'],round(seconds,2),'seconds',flush=True)
            return {**c,'url':'assets/audio/voice-v2/'+file.name,'duration':round(seconds,3),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
    clips=await asyncio.gather(*(generate(c) for c in spec['clips']))
    manifest={**{k:v for k,v in spec.items() if k!='clips'},'generatedOn':'2026-11-03','source':'https://github.com/rany2/edge-tts','clips':clips}
    (root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    Path('public/voice-clips.mjs').write_text('export const VOICE_CLIPS='+json.dumps({c['id']:{'url':c['url'],'duration':c['duration']} for c in clips},ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
asyncio.run(main())
