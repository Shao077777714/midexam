import {VOICE_CLIPS} from './voice-clips.mjs';
export const AUDIO_FILES={dream:'ambience/suspense-dream-v2.wav',weird:'ambience/suspense-weird-v2.wav',void:'ambience/suspense-void-v2.wav',correct:'puzzle/correct.wav',retry:'puzzle/retry.wav',child:'corridor/child_laugh.wav',keys:'corridor/keys.wav',argument:'corridor/argument.wav',call:'corridor/unanswered_call.wav'};
export function ambienceMix({level,triggered,active=true,paused=false,muted=false,overlay=false},speaking=false){
 const scale=(!active||paused||muted)?0:(speaking?.24:1)*(overlay?.68:1);
 return {dream:scale*(level===5?0:level===4?.08:triggered?0:.22),weird:scale*(level===5?0:level===4?.19:triggered?.25:0),void:scale*(level===5?.26:0)};
}
export function createAudioDirector({snapshot,onStatus=()=>{},AudioContextClass=globalThis.AudioContext,fetchFn=globalThis.fetch}={}){
 const a={ctx:null,output:null,sfx:null,voiceGain:null,buffers:new Map(),tracks:{},effects:new Set(),voiceSource:null,voiceId:null,pending:null,ready:false,loading:null,lastError:null,muted:false,lastStatus:'',
  init(){if(this.loading)return this.loading;try{this.ctx=new AudioContextClass();this.output=this.ctx.createGain();this.sfx=this.ctx.createGain();this.voiceGain=this.ctx.createGain();this.output.connect(this.ctx.destination);this.sfx.connect(this.output);this.voiceGain.connect(this.output);this.sfx.gain.value=.62;this.voiceGain.gain.value=.9;this.ctx.resume().catch(()=>{});this.loading=this.load();return this.loading;}catch{this.ready=true;this.lastError='目前裝置無法播放音效，字幕仍可閱讀。';this.emit();return Promise.resolve();}},
  async load(){
   const files=[...Object.entries(AUDIO_FILES).map(([id,file])=>[id,'assets/audio/'+file]),...Object.entries(VOICE_CLIPS).map(([id,c])=>[id,c.url])];
   await Promise.all(files.map(async([id,url])=>{try{const response=await fetchFn(new URL(url,import.meta.url));if(!response.ok)throw Error('missing');const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());this.buffers.set(id,buffer);if(['dream','weird','void'].includes(id))this.startTrack(id);if(this.pending===id)this.playVoice(id);}catch{this.lastError='部分音效未能載入，字幕與解謎仍可使用。';}}));this.ready=true;this.update();
  },
  startTrack(id){if(this.tracks[id])return;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers.get(id);source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.output);source.start();this.tracks[id]={source,gain};this.update();},
  update(){if(!this.ctx)return;const state=snapshot(),now=this.ctx.currentTime;if(state.muted&&!this.muted){this.stopVoice();for(const s of this.effects)try{s.stop();}catch{}this.effects.clear();}this.muted=state.muted;this.output.gain.setTargetAtTime(this.muted?0:1,now,.06);const mix=ambienceMix(state,!!this.voiceSource);for(const [id,track]of Object.entries(this.tracks))track.gain.gain.setTargetAtTime(mix[id],now,this.voiceSource?.12:.65);
   if(!state.active||state.paused){if(this.ctx.state==='running')this.ctx.suspend().catch(()=>{});}else{if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});if(this.pending&&!this.voiceSource)this.playVoice(this.pending);}this.emit();
  },
  speak(id){if(!VOICE_CLIPS[id]||snapshot().muted)return;this.stopVoice();this.pending=id;this.playVoice(id);},
  playVoice(id){if(!this.ctx||!this.buffers.has(id)||snapshot().paused||snapshot().muted)return;this.pending=null;const source=this.ctx.createBufferSource();source.buffer=this.buffers.get(id);source.connect(this.voiceGain);this.voiceSource=source;this.voiceId=id;source.onended=()=>{if(this.voiceSource===source){this.voiceSource=null;this.voiceId=null;this.update();}};source.start();this.update();},
  stopVoice(){this.pending=null;const source=this.voiceSource;this.voiceSource=null;this.voiceId=null;if(source)try{source.stop();}catch{}this.emit();},
  play(id,delay=0){if(snapshot().muted||!this.ctx||!this.buffers.has(id))return;const source=this.ctx.createBufferSource();source.buffer=this.buffers.get(id);source.connect(this.sfx);this.effects.add(source);source.onended=()=>this.effects.delete(source);source.start(this.ctx.currentTime+delay);},
  tone(f=440,delay=0){if(snapshot().muted||!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),start=this.ctx.currentTime+delay;o.frequency.value=f;g.gain.setValueAtTime(.035,start);g.gain.exponentialRampToValueAtTime(.001,start+.5);o.connect(g);g.connect(this.sfx);this.effects.add(o);o.onended=()=>{this.effects.delete(o);o.disconnect();g.disconnect();};o.start(start);o.stop(start+.5);},
  emit(){const s=snapshot(),status={ready:this.ready,voice:this.voiceId||'',paused:!!s.paused,muted:!!s.muted,error:this.lastError||'',scene:s.level};const key=JSON.stringify(status);if(key!==this.lastStatus){this.lastStatus=key;onStatus(status);}},
  dispose(){this.stopVoice();for(const t of Object.values(this.tracks))try{t.source.stop();}catch{}for(const s of this.effects)try{s.stop();}catch{}this.effects.clear();this.ctx?.close();}
 };return a;
}
