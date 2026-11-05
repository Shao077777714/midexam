import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../public/vendor/three.module.js';
import {newGame,MEMORIES,applyAction,loadGame} from '../public/engine.mjs';
import {createWorld} from '../public/scene.mjs';
import {SURFACE_TEXTURES} from '../public/surfaces.mjs';
import {walkable,findPath} from '../public/navigation.mjs';
import {createFinaleLayouts} from '../public/finale-layout.mjs';
import {createFinalePlayback} from '../public/finale.mjs';
import {createAudioDirector,ambienceMix,AUDIO_FILES} from '../public/audio-director.mjs';
import {VOICE_CLIPS} from '../public/voice-clips.mjs';
import {repaired,action} from './puzzle-helpers.mjs';
const checkpoint=level=>{const s=newGame();s.level=s.unlocked=level;s.completed=s.completed.map((_,i)=>i<level);s.memories=MEMORIES.slice(0,level);s.letter=level>=2;s.inventory=s.letter?['letter']:[];return s;};
test('all six worlds contain no flood geometry, including loaded triggered saves',()=>{
 for(let level=0;level<6;level++){const s=checkpoint(level);s.levels[level].triggered=true;const loaded=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(loaded.error,null);const w=createWorld(null,()=>loaded.state,()=>{},{headless:true});w.tick(100);w.scene.traverse(o=>assert.equal(o.userData.flood,undefined));assert.equal('flood' in w,false);}
});
test('each main room gains supported solid set dressing and the third room has eight furniture clusters',()=>{
 for(let level=0;level<5;level++){const s=checkpoint(level),w=createWorld(null,()=>s,()=>{},{headless:true}),groups=[];w.scene.traverse(o=>{if(o.userData.dressing)groups.push(o);});assert.ok(groups.length>=4);if(level===2){assert.equal(groups.length,8);assert.ok(groups.some(g=>g.userData.dressing==='sofa'));assert.ok(groups.some(g=>g.userData.dressing==='coffee'));}
 for(const g of groups){assert.ok(Math.abs(new T.Box3().setFromObject(g).min.y)<.001);assert.equal(walkable(g.position.x,g.position.z,w.bounds,w.blocks),false);}}
});
test('right corridor furniture is interactive and does not consume clues or change the puzzle state',()=>{
 const s=checkpoint(1),signals=[],w=createWorld(null,()=>s,a=>signals.push(a),{headless:true}),items=w.entities.filter(e=>e.id.startsWith('dressing-')&&e.group.position.x>1.5),before=JSON.stringify(s);assert.ok(items.length>=3);
 for(const e of items){assert.ok(findPath([0,5],[e.group.position.x,e.group.position.z],w.bounds,w.blocks,p=>w.approachable(e,new T.Vector3(p[0],1.65,p[1]))).length);e.action();e.action();}assert.equal(JSON.stringify(s),before);assert.ok(signals.every(a=>a.type==='DECOR'));
});
test('floors have actual instanced board gaps and walls have shared color and bump materials',()=>{
 const s=newGame(),w=createWorld(null,()=>s,()=>{},{headless:true});let floor=null,plaster=0;w.scene.traverse(o=>{if(o.userData.floorBoards)floor=o;if(o.material?.bumpMap?.name==='plaster-height')plaster++;});assert.ok(floor?.isInstancedMesh);assert.ok(floor.count>100);assert.ok(floor.material.map&&floor.material.bumpMap);assert.ok(plaster>=5);const rows=new Set(),matrix=new T.Matrix4();for(let i=0;i<floor.count;i++){floor.getMatrixAt(i,matrix);rows.add(Number(matrix.elements[14].toFixed(4)));}const zs=[...rows].sort((a,b)=>a-b);for(let i=1;i<zs.length;i++)assert.ok(zs[i]-zs[i-1]>floor.geometry.parameters.depth+.017,'floor boards must retain actual row gaps');
 const hashes=Object.values(SURFACE_TEXTURES).map(t=>createHash('sha256').update(t.image.data).digest('hex'));assert.equal(new Set(hashes).size,8);
});
test('shared procedural material textures survive rebuilding the main renderer scene',()=>{
 const s=newGame(),w=createWorld(null,()=>s,()=>{},{headless:true});let disposed=0;const listeners=Object.values(SURFACE_TEXTURES).map(t=>{const f=()=>disposed++;t.addEventListener('dispose',f);return[t,f];});w.build();w.build();for(const [t,f]of listeners)t.removeEventListener('dispose',f);assert.equal(disposed,0);
});
test('the fifth platform carries a real projector and two speaker cones, with powered pilot feedback',()=>{
 let s=checkpoint(4);const signals=[],w=createWorld(null,()=>s,a=>signals.push(a),{headless:true}),e=w.entities.find(e=>e.id==='device');assert.equal(e.group.userData.projectorPlatform,true);let machine;w.scene.traverse(o=>{if(o.userData.playbackHardware)machine=o;});assert.ok(machine);assert.ok(Math.abs(new T.Box3().setFromObject(machine).min.y-.8)<.001);assert.equal(machine.getObjectByName('projector-pilot').material.emissiveIntensity,.08);
 s=repaired(s);w.sync();assert.ok(machine.getObjectByName('projector-pilot').material.emissiveIntensity>1);e.action();assert.deepEqual(signals.at(-1),{type:'MEMORY_UI'});
});
test('the complete last door and its light only appear after mail, including reload',()=>{
 let s=checkpoint(5);s.levels[4].projectionDone=true;let w=createWorld(null,()=>s,()=>{},{headless:true}),exit=w.entities.find(e=>e.id==='exit'),assembly=exit.group.parent;assert.equal(assembly.userData.exitAssembly,true);assert.equal(assembly.visible,false);assert.ok(assembly.children.some(o=>o.isLight));assert.equal(w.visibleEntities().some(e=>e.id==='exit'),false);
 s=action(s,{type:'MAIL'});w.sync();assert.equal(assembly.visible,false);assert.equal(w.visibleEntities().some(e=>e.id==='exit'),false);s=action(s,{type:'ACK_SAVE'});w.sync();assert.equal(assembly.visible,true);assert.equal(w.visibleEntities().some(e=>e.id==='exit'),true);s=loadGame({getItem:()=>JSON.stringify(s)}).state;w=createWorld(null,()=>s,()=>{},{headless:true});assert.equal(w.entities.find(e=>e.id==='exit').group.parent.visible,true);
});
test('each hall run uses five distinct stable arrangements with all three photos, and reset changes the first layout',()=>{
 const random=()=>.34,p=createFinalePlayback({random}),first=p.arrangement(0);const plan=Array.from({length:5},(_,i)=>p.arrangement(i));assert.equal(new Set(plan.map(v=>v.id)).size,5);assert.equal(new Set(plan.map(v=>v.photo)).size,3);assert.equal(p.arrangement(0),first);p.reset();assert.notEqual(p.arrangement(0).id,first.id);
 for(const l of createFinaleLayouts(random)){assert.ok(l.top>=10&&l.top<=21);assert.ok(l.photoTop>=48&&l.photoTop<=59);assert.ok(['left','right'].includes(l.side));}
});
test('suspense stays present in all six scenes and ducks for voice, pause and mute',()=>{
 assert.equal(AUDIO_FILES.dream,'ambience/gone-beyond.mp3');
 assert.equal(AUDIO_FILES.weird,'ambience/weirdcore_loop.wav');
 for(let level=0;level<6;level++)for(const triggered of [false,true]){
   const state={level,triggered},mix=ambienceMix(state);
   const track=level===5?'void':triggered?'weird':'dream';
   assert.deepEqual(Object.keys(mix).filter(id=>mix[id]>0),[track]);
   assert.equal(ambienceMix(state,true)[track],mix[track]*.24);
   for(const flag of ['paused','muted'])assert.ok(Object.values(ambienceMix({...state,[flag]:true})).every(v=>v===0));
 }
});
class FakeNode{constructor(){this.gain={value:0,setTargetAtTime:v=>this.gain.value=v,setValueAtTime(){},exponentialRampToValueAtTime(){}};this.frequency={value:0};}connect(){}disconnect(){}start(){this.started=true;}stop(){this.stopped=true;this.onended?.();}}
class FakeContext{state='running';currentTime=0;destination={};createGain(){return new FakeNode();}createBufferSource(){return new FakeNode();}createOscillator(){return new FakeNode();}async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}async decodeAudioData(){return{duration:1};}}
const fakeFetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
test('external audio plays one complete clip, pauses the context, resumes it and stops voices on mute',async()=>{
 const state={level:3,triggered:true,active:true,paused:false,muted:false},a=createAudioDirector({snapshot:()=>state,AudioContextClass:FakeContext,fetchFn:fakeFetch});await a.init();assert.equal(Object.keys(a.tracks).length,3);a.speak('record-2');const first=a.voiceSource;assert.ok(first.started);a.update();assert.equal(a.voiceSource,first);state.paused=true;a.update();await a.contextSync;assert.equal(a.ctx.state,'suspended');assert.equal(first.stopped,undefined);state.paused=false;a.update();await a.contextSync;assert.equal(a.ctx.state,'running');a.speak('record-3');assert.equal(first.stopped,true);const second=a.voiceSource;state.muted=true;a.update();assert.equal(second.stopped,true);assert.equal(a.voiceSource,null);a.dispose();
});
test('a voice queued before loading plays once, failure leaves the game playable, and no fallback TTS is used',async()=>{
 const state={level:4,active:true,triggered:true},a=createAudioDirector({snapshot:()=>state,AudioContextClass:FakeContext,fetchFn:fakeFetch});const ready=a.init();a.speak('projection');await ready;assert.equal(a.voiceId,'projection');const source=a.voiceSource;source.onended();assert.equal(a.voiceSource,null);a.dispose();const fail=createAudioDirector({snapshot:()=>state,AudioContextClass:FakeContext,fetchFn:async()=>({ok:false})});await fail.init();fail.speak('projection');assert.equal(fail.voiceSource,null);assert.ok(fail.lastError);fail.dispose();const runtime=await readFile(new URL('../public/game.mjs',import.meta.url),'utf8');assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(runtime));
});
test('all twenty generated voice files retain scripts, durations and SHA-256 provenance',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/assets/audio/voice-v2/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.voice,'zh-TW-YunJheNeural');assert.equal(manifest.clips.length,20);for(const c of manifest.clips){const bytes=await readFile(new URL('../public/'+c.url,import.meta.url));assert.ok(c.text.length>10&&c.duration>3&&bytes.length>1000);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);assert.equal(VOICE_CLIPS[c.id].duration,c.duration);}assert.ok(VOICE_CLIPS.projection.duration>20);
});
test('an unavailable audio device completes initialization so subtitle-only projection cannot wait forever',async()=>{
 const a=createAudioDirector({snapshot:()=>({level:4,active:true}),AudioContextClass:class{constructor(){throw Error('no audio device');}}});await a.init();a.speak('projection');assert.equal(a.ready,true);assert.equal(a.voiceSource,null);assert.ok(a.lastError);
});
test('three original suspense loops are valid 24 second PCM with quiet seam samples and fixed hashes',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/assets/audio/ambience/manifest-v2.json',import.meta.url),'utf8'));for(const c of manifest){const bytes=await readFile(new URL('../public/assets/audio/ambience/'+c.file,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt32LE(24),22050);assert.equal((bytes.length-44)/2/22050,24);assert.ok(Math.abs(bytes.readInt16LE(44))<10);assert.ok(Math.abs(bytes.readInt16LE(bytes.length-2))<10);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);}for(const file of Object.values(AUDIO_FILES))await readFile(new URL('../public/assets/audio/'+file,import.meta.url));
});
