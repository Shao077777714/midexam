import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../public/vendor/three.module.js';
import {newGame,applyAction,loadGame,SHADOW_TARGETS,MEMORIES,endingReady} from '../public/engine.mjs';
import {initialGuidance,hintTier,tickGuidance,currentGoal} from '../public/guidance.mjs';
import {createWorld} from '../public/scene.mjs';
import {movementSpeed} from '../public/controls.mjs';
import {FAMILY_PHOTOS,FINAL_ECHOES} from '../public/finale.mjs';
import {action} from './puzzle-helpers.mjs';
import {footprint,circleHits} from '../public/spatial.mjs';
const checkpoint=level=>{const s=newGame();s.level=s.unlocked=level;s.completed=s.completed.map((_,i)=>i<level);s.memories=MEMORIES.slice(0,level);s.letter=level>=2;s.inventory=s.letter?['letter']:[];return s;};
test('solving alone cannot advance: explicitly open and acknowledge the door after saving',()=>{
 let s=action(newGame(),{type:'TRIGGER'});for(let index=0;index<3;index++)s=action(s,{type:'SHADOW',index,...SHADOW_TARGETS[index]});assert.equal(s.completed[0],true);
 assert.equal(applyAction(s,{type:'OPEN_EXIT'}).ok,false);s=action(s,{type:'ACK_SAVE'});assert.equal(applyAction(s,{type:'NEXT'}).ok,false);
 s=action(s,{type:'OPEN_EXIT'});assert.equal(s.level,0);assert.equal(s.levels[0].exitOpened,true);assert.equal(applyAction(s,{type:'OPEN_EXIT'}).ok,false);assert.equal(applyAction(s,{type:'NEXT'}).ok,false);
 s=action(s,{type:'ACK_SAVE'});s=action(s,{type:'NEXT'});assert.equal(s.level,1);assert.equal(s.levels[1].exitOpened,false);assert.equal(s.memories.length,1);
});
test('final mailbox saves the letter, but the last physical door still gates the ending',()=>{
 let s=checkpoint(5);s.levels[4].projectionDone=true;assert.equal(applyAction(s,{type:'OPEN_EXIT'}).ok,false);s=action(s,{type:'MAIL'});assert.equal(s.completed[5],true);assert.equal(endingReady(s),false);
 s=action(s,{type:'ACK_SAVE'});s=action(s,{type:'OPEN_EXIT'});assert.equal(endingReady(s),true);assert.equal(s.memories.length,5);
 const r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.equal(endingReady(r.state),true);
});
test('the phone supporting bench remains visible before and after the notification trigger',()=>{
 let s=checkpoint(1);const w=createWorld(null,()=>s,()=>{},{headless:true});let bench;w.scene.traverse(o=>{if(o.userData.supportsPhone)bench=o;});const phone=w.entities.find(e=>e.id==='trigger');
 assert.ok(bench);assert.equal(w.entities.some(e=>e.id==='phone-notices'),false);
 for(const triggered of [false,true]){s.levels[1].triggered=triggered;w.sync();assert.equal(bench.visible,true);const tableTop=new T.Box3().setFromObject(bench).max.y,phoneBase=new T.Box3().setFromObject(phone.group).min.y;assert.ok(Math.abs(tableTop-phoneBase)<.001);assert.equal(phone.group.visible,true);}
 assert.ok(phone.readAction);assert.equal(phone.canRead(),true);
});
test('six chapters have supported hinged exit doors which swing away from the player',()=>{
 for(let level=0;level<6;level++){const s=checkpoint(level),w=createWorld(null,()=>s,()=>{},{headless:true}),exit=w.entities.find(e=>e.id==='exit');assert.ok(exit);assert.equal(exit.group.userData.exitDoor,true);assert.ok(Math.abs(new T.Box3().setFromObject(exit.group).min.y)<.001);
 const before=footprint(exit.group);w.setExitProgress(1);const after=footprint(exit.group);assert.ok(after.w<before.w);assert.ok(exit.group.rotation.y>1.4);assert.equal(circleHits(0,w.bounds.minZ+1.8,after),false);}
});
test('timed guidance starts at 60 seconds then increases every 30 seconds, pauses and caps without repeating',()=>{
 const goal={id:'test',progress:10};let g={...initialGuidance(),goalId:'test',bestProgress:10,seconds:59,tier:0};g=tickGuidance(g,goal,.5,true);assert.equal(g.tier,0);g=tickGuidance(g,goal,.5,true);assert.equal(g.tier,1);
 for(const [seconds,tier]of [[89,2],[119,3],[149,4],[179,5]]){g={...g,seconds,tier:hintTier(seconds)};g=tickGuidance(g,goal,1,true);assert.equal(g.tier,tier);}
 const paused=tickGuidance(g,goal,1,false);assert.deepEqual(paused,g);g={...g,seconds:500,tier:5};assert.equal(tickGuidance(g,goal,1,true).tier,5);
});
test('wrong attempts and backward progress do not postpone hints; a genuinely new milestone resets them',()=>{
 let s=action(newGame(),{type:'TRIGGER'}),goal=currentGoal(s),g={...initialGuidance(),goalId:goal.id,bestProgress:goal.progress,seconds:75,tier:1};
 s=action(s,{type:'SHADOW',index:0,x:-3.7,z:.8,angle:45});g=tickGuidance(g,currentGoal(s),1,true);assert.equal(g.seconds,76);assert.equal(g.tier,1);
 s=action(s,{type:'SHADOW',index:0,...SHADOW_TARGETS[0]});g=tickGuidance(g,currentGoal(s),0,true);assert.equal(g.seconds,0);assert.equal(g.tier,0);
 g={...g,seconds:80,tier:1,bestProgress:90};g=tickGuidance(g,{id:'earlier-phase',progress:60},1,true);assert.equal(g.seconds,81);g=tickGuidance(g,{id:'same-recovered-phase',progress:90},1,true);assert.equal(g.seconds,82);
});
test('each chapter has a live objective and five progressive hints; completed puzzles explicitly ask for the door',()=>{
 for(let level=0;level<6;level++){const s=checkpoint(level);for(const triggered of [false,true]){if(level===5&&!triggered)continue;s.levels[level].triggered=triggered;const g=currentGoal(s);assert.ok(g.copy);assert.equal(g.hints.length,5);assert.equal(new Set(g.hints).size,5);assert.ok(g.hints.every(h=>typeof h==='string'&&h.length));}s.completed[level]=true;assert.match(currentGoal(s).copy,/門/);assert.equal(currentGoal(s).progress,1000);}
});
test('a real corridor milestone resets guidance even when collected out of the suggested order',()=>{
 let s=action(checkpoint(1),{type:'TRIGGER'}),goal=currentGoal(s),g={...initialGuidance(),goalId:goal.id,bestProgress:goal.progress,seconds:75,tier:1};
 s=action(s,{type:'CHAIR'});g=tickGuidance(g,currentGoal(s),0,true);assert.equal(g.seconds,0);assert.match(currentGoal(s).copy,/座鐘/);
 g={...g,seconds:75,tier:1};s=action(s,{type:'COLLECT',id:'drawing'});g=tickGuidance(g,currentGoal(s),0,true);assert.equal(g.seconds,0);
});
test('v6 saves preserve already-seen endings while unfinished exits and timed help migrate safely to v7',()=>{
 for(const ended of [false,true]){const s=checkpoint(ended?5:1);s.version=6;if(ended){s.completed[5]=true;s.levels[5].mailed=true;s.memories=[...MEMORIES];s.levels[4].projectionDone=true;}else{s.completed[1]=true;s.unlocked=2;s.letter=true;s.inventory=['letter'];s.memories=MEMORIES.slice(0,2);}
 for(const l of s.levels){delete l.exitOpened;delete l.guidance;}const r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.equal(r.state.version,7);assert.deepEqual(r.state.completed,s.completed);assert.equal(r.state.levels[s.level].exitOpened,ended);assert.equal(endingReady(r.state),ended);assert.deepEqual(r.state.levels[0].guidance,initialGuidance());}
});
test('modern timer and door checkpoints survive reload and reject inconsistent or malformed values',()=>{
 const s=newGame();s.levels[0].guidance={goalId:'0:trigger',seconds:93,tier:2,bestProgress:0};const r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.deepEqual(r.state.levels[0].guidance,s.levels[0].guidance);
 for(const corrupt of [l=>l.exitOpened=true,l=>l.guidance.seconds=-1,l=>l.guidance.tier=5,l=>l.guidance.bestProgress=Infinity,l=>delete l.guidance]){const bad=structuredClone(s);corrupt(bad.levels[0]);assert.equal(loadGame({getItem:()=>JSON.stringify(bad)}).state,null);}
});
test('new identity-referenced photos are deployed with original PNG hashes and used across the room and finale models',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/assets/dreamcore/manifest.json',import.meta.url),'utf8')),entries=manifest.assets||manifest.files,used=new Set();
 for(const photo of Object.values(FAMILY_PHOTOS)){const bytes=await readFile(new URL('../public/'+photo.url,import.meta.url)),entry=entries.find(e=>e.file===photo.url.split('/').at(-1));assert.ok(entry);assert.equal(bytes.readUInt32BE(16),1254);assert.equal(bytes.readUInt32BE(20),1254);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.equal(entry.prompts,'PROMPTS-v4.json');}
 for(let level=0;level<5;level++){const s=checkpoint(level),w=createWorld(null,()=>s,()=>{},{headless:true}),e=w.entities.find(e=>e.id==='memory-photo');assert.ok(e.group.userData.mount);used.add(e.group.userData.memoryPhoto);}
 assert.equal(used.size,3);for(const echo of FINAL_ECHOES)assert.ok(FAMILY_PHOTOS[echo.photo]);assert.equal(movementSpeed(),2.7);assert.equal(movementSpeed(true),3.2);
});
