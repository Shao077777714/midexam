import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newGame,applyAction,loadGame,MEMORIES,endingReady} from '../public/engine.mjs';
import {createAudioDirector} from '../public/audio-director.mjs';
import {VOICE_CLIPS} from '../public/voice-clips.mjs';
import {PROJECTION,LEVELS} from '../public/content.mjs';
import {action} from './puzzle-helpers.mjs';

function completed(level){const s=newGame();s.level=level;s.unlocked=Math.min(5,level+1);s.completed=s.completed.map((_,i)=>i<=level);s.memories=MEMORIES.slice(0,level+1);s.letter=level>=1;s.inventory=s.letter?['letter']:[];s.levels.forEach((l,i)=>{l.outroHeard=i<level;});if(level===5){s.levels[5].mailed=true;s.levels[4].projectionDone=true;}return s;}
test('all six exits require the entire outro and successful saving; NEXT cannot bypass it',()=>{
 for(let level=0;level<6;level++){
  let s=action(completed(level),{type:'ACK_SAVE'});assert.match(applyAction(s,{type:'OPEN_EXIT'}).message,/播放/);assert.equal(applyAction(s,{type:'NEXT'}).ok,false);
  const injected=structuredClone(s);injected.levels[level].exitOpened=true;assert.equal(applyAction(injected,{type:'NEXT'}).ok,false);
  s=action(s,{type:'OUTRO_END'});assert.equal(s.persisted,false);assert.equal(applyAction(s,{type:'OPEN_EXIT'}).ok,false);
  s=action(s,{type:'ACK_SAVE'});s=action(s,{type:'OPEN_EXIT'});assert.equal(s.levels[level].exitOpened,true);assert.equal(applyAction(s,{type:'OUTRO_END'}).ok,false);
  if(level===5)assert.equal(endingReady(s),true);else{s=action(s,{type:'ACK_SAVE'});assert.equal(action(s,{type:'NEXT'}).level,level+1);}
 }
 assert.equal(applyAction(newGame(),{type:'OUTRO_END'}).ok,false);
});
test('v8 reload preserves heard and unheard outros, rejects forged open doors and malformed flags',()=>{
 let s=completed(2);let r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.equal(r.state.levels[2].outroHeard,false);assert.equal(applyAction(r.state,{type:'OPEN_EXIT'}).ok,false);
 s=action(s,{type:'OUTRO_END'});r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.state.version,8);assert.equal(action(r.state,{type:'OPEN_EXIT'}).levels[2].exitOpened,true);
 for(const mutate of [l=>l.outroHeard='true',l=>delete l.outroHeard,l=>{l.outroHeard=false;l.exitOpened=true;}]){const bad=structuredClone(s);mutate(bad.levels[2]);assert.equal(loadGame({getItem:()=>JSON.stringify(bad)}).state,null);}
});
test('v7 migration keeps earned progress and old endings, but an unopened current door requires listening',()=>{
 for(const opened of [false,true])for(const level of [0,3,5]){const s=completed(level);s.version=7;s.levels[level].exitOpened=opened;for(const l of s.levels)delete l.outroHeard;const r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.equal(r.state.version,8);assert.deepEqual(r.state.completed,s.completed);assert.equal(r.state.letter,s.letter);assert.equal(r.state.levels[level].outroHeard,opened);assert.equal(applyAction(r.state,{type:'OPEN_EXIT'}).ok,false);if(level===5)assert.equal(endingReady(r.state),opened);}
});

class Node {constructor(){this.gain={value:0,setTargetAtTime:v=>this.gain.value=v};}connect(){}disconnect(){}start(){this.started=true;}stop(){this.stopped=true;this.onended?.();}}
class Context {currentTime=0;state='running';destination={};createGain(){return new Node();}createBufferSource(){return new Node();}async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){}async decodeAudioData(){return{duration:1};}}
const fetched=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
const projection=()=>PROJECTION.map((copy,i)=>({id:`projection-${i}`,copy}));
async function player(options={}){const state={level:4,active:true,paused:false,muted:false};const audio=createAudioDirector({snapshot:()=>state,AudioContextClass:Context,fetchFn:fetched,...options});await audio.init();if(options.settleContext!==false)await audio.contextSync;return {audio,state};}
test('projection captions stay on the corresponding audio until its natural end, never equal time slices',async()=>{
 const {audio}=await player();audio.narrate(projection());
 for(let i=0;i<4;i++){const source=audio.voiceSource;assert.equal(audio.voiceId,`projection-${i}`);audio.ctx.currentTime+=100;const view=audio.tickNarration(1);assert.equal(view.index,i);assert.equal(view.copy,PROJECTION[i]);assert.equal(view.done,false);assert.equal(audio.voiceSource,source);source.onended();}
 assert.equal(audio.narrationView().done,true);assert.equal(audio.voiceSource,null);audio.dispose();
});
test('pause freezes audio and caption progress, and resume continues the same source',async()=>{
 const {audio,state}=await player();audio.narrate(projection());const source=audio.voiceSource;audio.ctx.currentTime=2;const before=audio.tickNarration(.1);state.paused=true;audio.update();await audio.contextSync;assert.equal(audio.ctx.state,'suspended');for(let i=0;i<60;i++)audio.tickNarration(1);assert.equal(audio.narrationView().elapsed,before.elapsed);assert.equal(audio.narrationView().index,0);state.paused=false;audio.update();await audio.contextSync;assert.equal(audio.ctx.state,'running');assert.equal(audio.voiceSource,source);assert.notEqual(source.stopped,true);audio.dispose();
});
test('muting required narration keeps its clock and door gate, while other speech cannot interrupt',async()=>{
 const {audio,state}=await player();audio.narrate([{id:'memory-4',copy:LEVELS[4].story}]);const source=audio.voiceSource;state.muted=true;audio.update();assert.equal(audio.voiceSource,source);assert.notEqual(source.stopped,true);assert.equal(audio.output.gain.value,0);audio.speak('record-all');assert.equal(audio.voiceSource,source);assert.equal(audio.narrationView().done,false);source.onended();assert.equal(audio.narrationView().done,true);audio.dispose();
});
test('loading waits without advancing captions or completing the narration',async()=>{
 const state={level:4,active:true},audio=createAudioDirector({snapshot:()=>state,AudioContextClass:Context,fetchFn:fetched});const loading=audio.init();audio.narrate(projection());assert.equal(audio.tickNarration(1).waiting,true);assert.equal(audio.narrationView().elapsed,0);await loading;audio.tickNarration(0);assert.equal(audio.voiceId,'projection-0');const source=audio.voiceSource;audio.tickNarration(1);assert.equal(audio.voiceSource,source);audio.dispose();
});
test('missing clips and unavailable devices require full active subtitle time, never an instant unlock',async()=>{
 for(const options of [{fetchFn:async()=>({ok:false})},{AudioContextClass:class{constructor(){throw Error('unavailable');}}}]){const {audio,state}=await player(options);audio.narrate([{id:'memory-5',copy:LEVELS[5].story}]);let view=audio.tickNarration(0);assert.equal(view.fallback,true);assert.equal(view.done,false);state.paused=true;for(let i=0;i<40;i++)audio.tickNarration(1);assert.equal(audio.narrationView().elapsed,0);state.paused=false;const duration=VOICE_CLIPS['memory-5'].duration;for(let i=0;i<Math.floor(duration);i++)audio.tickNarration(1);assert.equal(audio.narrationView().done,false);audio.tickNarration(duration%1+.00001);assert.equal(audio.narrationView().done,true);audio.dispose();}
});
test('a denied audio resume switches to timed subtitles and cancelled sources cannot complete a new narration',async()=>{
 class Blocked extends Context {state='suspended';async resume(){throw Error('denied');}}
 const {audio}=await player({AudioContextClass:Blocked});await Promise.resolve();audio.narrate(projection());assert.equal(audio.tickNarration(1).fallback,true);assert.equal(audio.narrationView().done,false);audio.dispose();
 const {audio:normal}=await player();normal.narrate(projection());const old=normal.voiceSource;normal.stopVoice();normal.narrate([{id:'memory-4',copy:LEVELS[4].story}]);old.onended();assert.equal(normal.narrationView().done,false);assert.equal(normal.voiceId,'memory-4');normal.dispose();
});
test('an autoplay resume promise left pending falls back after active waiting without skipping the subtitle',async()=>{
 class Pending extends Context {state='suspended';resume(){return new Promise(()=>{});}}
 const {audio}=await player({AudioContextClass:Pending,settleContext:false});audio.narrate([{id:'memory-5',copy:LEVELS[5].story}]);const source=audio.voiceSource;
 audio.tickNarration(1);audio.tickNarration(1);assert.equal(audio.narrationView().fallback,false);audio.tickNarration(1);
 assert.equal(source.stopped,true);assert.equal(audio.narrationView().fallback,true);assert.equal(audio.narrationView().done,false);assert.ok(audio.narrationView().elapsed<VOICE_CLIPS['memory-5'].duration);audio.dispose();
});
test('a resume requested while suspension is still pending wins after the context operation settles',async()=>{
 class Delayed extends Context {suspend(){return new Promise(resolve=>{this.finishSuspend=()=>{this.state='suspended';resolve();};});}}
 const {audio,state}=await player({AudioContextClass:Delayed});audio.narrate(projection());await audio.contextSync;state.paused=true;audio.update();state.paused=false;audio.update();audio.ctx.finishSuspend();
 await Promise.resolve();await Promise.resolve();await audio.contextSync;assert.equal(audio.ctx.state,'running');assert.equal(audio.deviceBlocked,false);assert.equal(audio.narrationView().fallback,false);audio.dispose();
});
test('the four generated projection segments and six outros exactly match the displayed script',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/assets/audio/voice-v2/manifest.json',import.meta.url),'utf8'));for(const [i,copy]of PROJECTION.entries()){const clip=manifest.clips.find(c=>c.id===`projection-${i}`);assert.equal(clip.text,copy);assert.ok(clip.duration>0);}
 for(const [i,l]of LEVELS.entries())assert.equal(manifest.clips.find(c=>c.id===`memory-${i}`).text,l.story);
});
