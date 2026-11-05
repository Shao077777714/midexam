import {VOICE_CLIPS} from './voice-clips.mjs';
export const AUDIO_FILES={dream:'ambience/gone-beyond.mp3',weird:'ambience/weirdcore_loop.wav',void:'ambience/suspense-void-v2.wav',correct:'puzzle/correct.wav',retry:'puzzle/retry.wav',child:'corridor/child_laugh.wav',keys:'corridor/keys.wav',argument:'corridor/argument.wav',call:'corridor/unanswered_call.wav'};
export function ambienceMix({level,triggered,active=true,paused=false,muted=false,overlay=false},speaking=false){
 const scale=(!active||paused||muted)?0:(speaking?.24:1)*(overlay?.68:1);
 return {dream:scale*(level!==5&&!triggered?.22:0),weird:scale*(level!==5&&triggered?.25:0),void:scale*(level===5?.26:0)};
}
export function createAudioDirector({snapshot,onStatus=()=>{},AudioContextClass=globalThis.AudioContext,fetchFn=globalThis.fetch}={}){
 const a={ctx:null,output:null,sfx:null,voiceGain:null,buffers:new Map(),tracks:{},effects:new Set(),voiceSource:null,voiceId:null,pending:null,ready:false,loading:null,lastError:null,muted:false,lastStatus:'',narration:null,deviceBlocked:false,contextSync:null,
  init(){if(this.loading)return this.loading;try{this.ctx=new AudioContextClass();this.output=this.ctx.createGain();this.sfx=this.ctx.createGain();this.voiceGain=this.ctx.createGain();this.output.connect(this.ctx.destination);this.sfx.connect(this.output);this.voiceGain.connect(this.output);this.sfx.gain.value=.62;this.voiceGain.gain.value=.9;this.syncContext();this.loading=this.load();return this.loading;}catch{this.ready=true;this.lastError='目前裝置無法播放音效，字幕仍可閱讀。';this.emit();return Promise.resolve();}},
  async load(){
   const files=[...Object.entries(AUDIO_FILES).map(([id,file])=>[id,'assets/audio/'+file]),...Object.entries(VOICE_CLIPS).map(([id,c])=>[id,c.url])];
   const decode=async url=>{const response=await fetchFn(new URL(url,import.meta.url),{signal:globalThis.AbortSignal?.timeout?.(12000)});if(!response.ok)throw Error('missing');return this.ctx.decodeAudioData(await response.arrayBuffer());};
   await Promise.all(files.map(async([id,url])=>{try{const buffer=await decode(url).catch(error=>{if(id!=='dream')throw error;return decode('assets/audio/ambience/suspense-dream-v2.wav');});this.buffers.set(id,buffer);if(['dream','weird','void'].includes(id))this.startTrack(id);if(this.pending===id)this.playVoice(id);}catch{this.lastError='部分音效未能載入，字幕與解謎仍可使用。';}}));this.ready=true;this.update();
  },
  startTrack(id){if(this.tracks[id])return;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers.get(id);source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.output);source.start();this.tracks[id]={source,gain};this.update();},
  update(){if(!this.ctx)return;const state=snapshot(),now=this.ctx.currentTime;if(state.muted&&!this.muted){if(!this.narration||this.narration.done)this.stopVoice();for(const s of this.effects)try{s.stop();}catch{}this.effects.clear();}this.muted=state.muted;this.output.gain.setTargetAtTime(this.muted?0:1,now,.06);
   const mix=ambienceMix(state,!!this.voiceSource);
   const fadeTime = this.voiceSource || mix.weird > 0 ? .12 : .65;
   for(const [id,track]of Object.entries(this.tracks))track.gain.gain.setTargetAtTime(mix[id],now,fadeTime);
   this.syncContext();if(state.active&&!state.paused&&this.pending&&!this.voiceSource)this.playVoice(this.pending);this.emit();
  },
  speak(id){if(!VOICE_CLIPS[id]||snapshot().muted||this.narration&&!this.narration.done)return;this.stopVoice();this.pending=id;this.playVoice(id);},
  playVoice(id){if(!this.ctx||this.deviceBlocked||!this.buffers.has(id)||snapshot().paused||snapshot().muted&&(!this.narration||this.narration.done))return;this.pending=null;const source=this.ctx.createBufferSource();source.buffer=this.buffers.get(id);source.connect(this.voiceGain);this.voiceSource=source;this.voiceId=id;this.voiceStartedAt=this.ctx.currentTime;if(this.narration&&!this.narration.done)this.narration.started=true;source.onended=()=>{if(this.voiceSource===source){this.voiceSource=null;this.voiceId=null;if(this.narration&&!this.narration.done&&this.narration.segments[this.narration.index].id===id)this.advanceNarration();this.update();}};source.start();this.update();},
  stopVoice(preserveNarration=false){if(!preserveNarration)this.narration=null;this.pending=null;const source=this.voiceSource;this.voiceSource=null;this.voiceId=null;if(source)try{source.stop();}catch{}this.emit();},
  syncContext(){
   if(this.contextSync||!this.ctx||this.deviceBlocked)return this.contextSync;
   const ctx=this.ctx;let requested;
   this.contextSync=(async()=>{
    while(true){
     const state=snapshot(),running=state.active&&!state.paused;requested=running;
     if(running&&ctx.state==='suspended'){await ctx.resume();if(ctx.state!=='running')return;}
     else if(!running&&ctx.state==='running'){await ctx.suspend();if(ctx.state!=='suspended')return;}
     else return;
    }
   })().catch(()=>{this.deviceBlocked=true;this.lastError='裝置未能播放語音，將以完整時長顯示字幕。';this.stopVoice(true);if(this.narration){this.narration.started=false;this.narration.elapsed=0;}this.emit();}).finally(()=>{this.contextSync=null;const state=snapshot();if((state.active&&!state.paused)!==requested)this.syncContext();});
   return this.contextSync;
  },
  narrate(segments){
   this.stopVoice();this.narration={segments:segments.map(s=>({...s,duration:VOICE_CLIPS[s.id].duration})),index:0,elapsed:0,started:false,done:false,fallback:false,resumeWait:0};this.tickNarration(0);return this.narration;
  },
  advanceNarration(){const n=this.narration;if(!n||n.done)return;n.index++;n.elapsed=0;n.started=false;n.fallback=false;n.resumeWait=0;n.done=n.index===n.segments.length;this.tickNarration(0);},
  tickNarration(dt){
   const n=this.narration,state=snapshot();if(!n||n.done||!state.active||state.paused||!this.ready)return this.narrationView();
   const segment=n.segments[n.index];
   // Browsers may leave resume() pending rather than reject an autoplay block.
   if(n.started&&!n.fallback&&this.ctx?.state!=='running'){
    n.resumeWait+=Math.max(0,Math.min(dt,1));
    if(n.resumeWait>=3){this.deviceBlocked=true;this.lastError='裝置未能開始播放，請閱讀完整時長字幕。';this.stopVoice(true);n.started=false;n.elapsed=0;this.emit();}
   }
   if(!n.started){
    n.fallback=!this.ctx||this.deviceBlocked||!this.buffers.has(segment.id);
    if(n.fallback)n.started=true;
    else{this.playVoice(segment.id);return this.narrationView();}
   }
   if(n.fallback){n.elapsed=Math.min(segment.duration,n.elapsed+Math.max(0,Math.min(dt,1)));if(n.elapsed>=segment.duration)this.advanceNarration();}
   else if(this.voiceSource)n.elapsed=Math.max(0,Math.min(segment.duration,this.ctx.currentTime-this.voiceStartedAt));
   return this.narrationView();
  },
  narrationView(){const n=this.narration;if(!n)return null;const segment=n.segments[Math.min(n.index,n.segments.length-1)];return {index:n.index,copy:segment.copy,done:n.done,elapsed:n.done?segment.duration:n.elapsed,duration:segment.duration,waiting:!this.ready,paused:!!snapshot().paused,fallback:n.fallback};},
  play(id,delay=0){if(snapshot().muted||!this.ctx||!this.buffers.has(id))return;const source=this.ctx.createBufferSource();source.buffer=this.buffers.get(id);source.connect(this.sfx);this.effects.add(source);source.onended=()=>this.effects.delete(source);source.start(this.ctx.currentTime+delay);},
  tone(f=440,delay=0){if(snapshot().muted||!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),start=this.ctx.currentTime+delay;o.frequency.value=f;g.gain.setValueAtTime(.035,start);g.gain.exponentialRampToValueAtTime(.001,start+.5);o.connect(g);g.connect(this.sfx);this.effects.add(o);o.onended=()=>{this.effects.delete(o);o.disconnect();g.disconnect();};o.start(start);o.stop(start+.5);},
  emit(){const s=snapshot(),status={ready:this.ready,voice:this.voiceId||'',paused:!!s.paused,muted:!!s.muted,error:this.lastError||'',scene:s.level};const key=JSON.stringify(status);if(key!==this.lastStatus){this.lastStatus=key;onStatus(status);}},
  dispose(){this.stopVoice();for(const t of Object.values(this.tracks))try{t.source.stop();}catch{}for(const s of this.effects)try{s.stop();}catch{}this.effects.clear();this.ctx?.close();}
 };return a;
}
