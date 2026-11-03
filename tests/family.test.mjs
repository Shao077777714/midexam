import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,applyAction,loadGame,MEMORIES} from '../public/engine.mjs';
import {RECORDINGS,HIDES} from '../public/puzzles.mjs';
import {FINAL_HALL,FINAL_ECHOES,echoCheckpoint,nextEcho,createFinalePlayback} from '../public/finale.mjs';
import {inventoryEntries} from '../public/inventory.mjs';
import {createWorld} from '../public/scene.mjs';
import {action,boardPrepared} from './puzzle-helpers.mjs';
const checkpoint=level=>{const s=newGame();s.level=s.unlocked=level;s.completed=s.completed.map((_,i)=>i<level);s.memories=MEMORIES.slice(0,level);s.letter=level>=2;s.inventory=s.letter?['letter']:[];return s;};
test('all five distinct recording hides are required; removing any one prevents completion',()=>{
 const ready=boardPrepared(checkpoint(3));assert.equal(RECORDINGS.length,5);assert.equal(new Set(RECORDINGS.map(t=>HIDES[t.id])).size,5);
 for(const t of RECORDINGS){const s=structuredClone(ready);s.levels[3].collected=s.levels[3].collected.filter(id=>id!==t.id);assert.equal(applyAction(s,{type:'ACTIVATE_BOARD'}).ok,false);}
 assert.equal(applyAction(ready,{type:'ACTIVATE_BOARD'}).completedNow,true);
});
test('v5 partial three recordings remain available, finished fourth rooms keep all earned progress',()=>{
 for(const finished of [false,true]){
  const s=checkpoint(finished?4:3);s.version=5;const l=s.levels[3];l.triggered=true;l.collected=RECORDINGS.slice(0,3).map(t=>t.id);l.searched=['work-panel','family-phone','mirror-recess'];l.recordOrder=[0,1,2];l.switchboardOn=finished;s.inventory.push(...l.collected);for(const v of s.levels)delete v.echoesSeen;
  const r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.equal(r.state.version,6);assert.deepEqual(r.state.completed,s.completed);assert.deepEqual(r.state.memories,s.memories);assert.equal(r.state.letter,true);
  if(finished){assert.deepEqual(r.state.levels[3].recordOrder,[0,1,2,3,4]);assert.equal(r.state.levels[3].collected.length,5);}else{assert.deepEqual(r.state.levels[3].recordOrder,[0,1,2]);assert.equal(applyAction(r.state,{type:'ACTIVATE_BOARD'}).ok,false);assert.equal(inventoryEntries(r.state).length,3);}
 }
});
test('finale walk has five sequential distance triggers without repeats or progress during menus',()=>{
 const player=createFinalePlayback(),seen=[];let view=player.step({distance:0,seen,dt:1,running:true});assert.equal(view.trigger,null);
 view=player.step({distance:8,seen,dt:1,running:true});assert.equal(view.trigger,0);seen.push(0);
 const paused=player.step({distance:40,seen,dt:100,running:false});assert.equal(paused.remaining,view.remaining);assert.equal(paused.trigger,null);
 for(let n=0;n<3;n++)player.step({distance:0,seen,dt:1,running:true});assert.equal(nextEcho(0,seen),null);
 for(let index=1;index<5;index++){view=player.step({distance:FINAL_ECHOES[index].distance,seen,dt:1,running:true});assert.equal(view.trigger,index);seen.push(index);for(let n=0;n<3;n++)player.step({distance:0,seen,dt:1,running:true});}
 assert.equal(nextEcho(1000,seen),null);assert.equal(echoCheckpoint(seen),46);assert.ok(FINAL_HALL.startZ-FINAL_HALL.mailboxZ>=50);assert.equal(FINAL_ECHOES.filter(e=>e.eyes).length,3);
});
test('finale checkpoints persist ordered echoes and resume the solid hall at the last memory',()=>{
 let s=checkpoint(5);s.levels[4].projectionDone=true;assert.equal(applyAction(s,{type:'FINAL_ECHO',index:2}).ok,false);
 for(let index=0;index<3;index++)s=action(s,{type:'FINAL_ECHO',index});assert.equal(applyAction(s,{type:'FINAL_ECHO',index:2}).ok,false);
 const restored=loadGame({getItem:()=>JSON.stringify(s)}).state;assert.deepEqual(restored.levels[5].echoesSeen,[0,1,2]);const world=createWorld(null,()=>restored,()=>{},{headless:true});assert.equal(world.camera.position.z,FINAL_HALL.startZ-27);assert.equal(world.entities[0].group.position.z,FINAL_HALL.mailboxZ);
 const broken=structuredClone(restored);broken.levels[5].echoesSeen=[0,2];assert.equal(loadGame({getItem:()=>JSON.stringify(broken)}).state,null);
 assert.equal(applyAction(restored,{type:'MAIL'}).completedNow,true);assert.equal(restored.memories.length,5);
});

test('placed corridor drawing stays visible after reload and cannot be used twice',()=>{
 let s=checkpoint(1);s=action(s,{type:'TRIGGER'});s=action(s,{type:'CHAIR'});s=action(s,{type:'COLLECT',id:'drawing'});s=action(s,{type:'SLOT',id:'drawing',slot:'drawing'});
 const restored=loadGame({getItem:()=>JSON.stringify(s)}).state;const entry=inventoryEntries(restored).find(e=>e.id==='drawing');assert.equal(entry.name,'孩子的畫');assert.equal(entry.kind,'drawing');assert.equal(entry.used,true);assert.equal(entry.note,'已放置');assert.equal(applyAction(restored,{type:'SLOT',id:'drawing',slot:'drawing'}).ok,false);
});
