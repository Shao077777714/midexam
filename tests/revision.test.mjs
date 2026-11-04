import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {newGame,applyAction,loadGame,SHADOW_TARGETS,MEMORIES} from '../public/engine.mjs';
import {createWorld} from '../public/scene.mjs';
import {createExploreInput,doubleClickAction} from '../public/controls.mjs';
import {action,repaired,corridorPrepared} from './puzzle-helpers.mjs';
import {findPath} from '../public/navigation.mjs';
const checkpoint=level=>{const s=newGame();s.level=s.unlocked=level;s.completed=s.completed.map((_,i)=>i<level);s.memories=MEMORIES.slice(0,level);s.letter=level>=2;s.inventory=s.letter?['letter']:[];return s;};
test('Alt toggles exploration independently of panels and restores look only on returning to explore',()=>{
 let running=false;const modes=[],look={enter(){running=true;},leave(){running=false;}};const input=createExploreInput({look,onChange:s=>modes.push(s)});
 input.setMode('explore');assert.equal(running,true);assert.equal(input.active,true);input.toggle();assert.equal(running,false);assert.equal(input.cursor,true);
 input.setMode('panel');assert.equal(input.toggle(),false);assert.equal(running,false);input.setMode('explore');assert.equal(running,true);
 input.toggle();input.toggle();assert.equal(running,true);input.blur();assert.equal(running,false);assert.deepEqual(modes.at(-1),{active:false,cursor:true});
});
test('each aligned shadow reports one success and remains immutable before the whole stage completes and after reload',()=>{
 let s=action(newGame(),{type:'TRIGGER'});let r=applyAction(s,{type:'SHADOW',index:0,...SHADOW_TARGETS[0]});assert.equal(r.shadowSolvedNow,0);assert.equal(r.completedNow,false);s=r.state;
 const w=createWorld(null,()=>s,()=>{},{headless:true});assert.equal(doubleClickAction(w.entities.find(e=>e.id==='shadow0')),null);
 for(const state of [s,loadGame({getItem:()=>JSON.stringify(s)}).state]){const result=applyAction(state,{type:'SHADOW',index:0,x:-2.8,z:0,angle:90});assert.equal(result.ok,false);assert.deepEqual(result.state.levels[0].shadow[0],s.levels[0].shadow[0]);}
});
test('shadow sweep rejects the solid player at its midpoint as well as its destination',()=>{
 const s=newGame(),w=createWorld(null,()=>s,()=>{},{headless:true}),a={type:'SHADOW',index:0,x:-1.7,z:1,angle:0};
 assert.equal(w.canApply(a,new T.Vector3(0,1.65,5.9)),true);
 for(const [x,z]of [[-2.7,1],[-1.7,1]])assert.equal(w.canApply(a,new T.Vector3(x,1.65,z)),false);
});
test('corridor clock and symbol seal reject wrong time, missing clues and wrong order; progress survives reload',()=>{
 let s=action(checkpoint(1),{type:'TRIGGER'});assert.equal(applyAction(s,{type:'SEARCH',id:'clock'}).ok,false);
 s=action(s,{type:'CLOCK_SET',hour:8,minute:15});assert.equal(applyAction(s,{type:'SEARCH',id:'clock'}).ok,false);
 for(const [index,value]of [1,0,2].entries())s=action(s,{type:'SEAL_SET',index,value});assert.equal(applyAction(s,{type:'SEARCH',id:'letterbox'}).ok,false);
 s=action(s,{type:'CLOCK_SET',hour:8,minute:10});s=action(s,{type:'SEARCH',id:'clock'});s=action(s,{type:'COLLECT',id:'key'});assert.equal(applyAction(s,{type:'SEARCH',id:'letterbox'}).ok,false);
 s=action(s,{type:'CHAIR'});s=action(s,{type:'COLLECT',id:'drawing'});s=action(s,{type:'SEAL_SET',index:0,value:0});assert.equal(applyAction(s,{type:'SEARCH',id:'letterbox'}).ok,false);assert.equal(applyAction(s,{type:'COLLECT',id:'letter'}).ok,false);
 s=action(s,{type:'SEAL_SET',index:0,value:1});s=loadGame({getItem:()=>JSON.stringify(s)}).state;assert.ok(s);s=action(s,{type:'SEARCH',id:'letterbox'});s=action(s,{type:'COLLECT',id:'letter'});assert.equal(s.completed[1],false);for(const id of ['key','drawing','letter'])s=action(s,{type:'SLOT',id,slot:id});assert.equal(s.completed[1],true);
});
test('fourth room has a closed cabinet for a required tape and no substitute protagonist portraits or mirrors',()=>{
 const s=checkpoint(3);s.levels[3].triggered=true;s.levels[3].searched=['mirror-recess'];const w=createWorld(null,()=>s,()=>{},{headless:true});
 const cabinet=w.entities.find(e=>e.id==='search-mirror-recess');assert.equal(cabinet.group.userData.closedCavity,true);assert.ok(cabinet.group.getObjectByName('hatch').rotation.y<0);
 const tape=w.entities.find(e=>e.id==='tape-self');assert.equal(tape.group.visible,true);assert.ok(Math.abs(new T.Box3().setFromObject(tape.group).min.y-.855)<.001);
 const portraits=[];w.scene.traverse(o=>{if(o.userData.portrait)portraits.push(o);});assert.equal(portraits.length,0);assert.equal(w.entities.some(e=>e.id.startsWith('mirror')),false);
});
test('circuit rotates only one cell, allows explicit swaps, and projection unlocks a separate final scene',()=>{
 let s=action(checkpoint(4),{type:'TRIGGER'});const old=structuredClone(s.levels[4]);assert.equal(applyAction(s,{type:'CIRCUIT_SWAP',index:0,slot:1}).ok,true);s=action(s,{type:'CIRCUIT_ROTATE',index:2});assert.deepEqual(s.levels[4].circuit,old.circuit);for(let i=0;i<9;i++)if(i!==2)assert.equal(s.levels[4].circuitAngles[i],old.circuitAngles[i]);
 s=repaired(checkpoint(4));s=action(s,{type:'PROJECT'});s=action(s,{type:'PROJECTION_END'});assert.equal(s.completed[4],true);assert.equal(s.completed[5],false);assert.deepEqual(s.memories,MEMORIES);assert.equal(applyAction(s,{type:'MAIL'}).ok,false);s=action(s,{type:'OUTRO_END'});s=action(s,{type:'ACK_SAVE'});s=action(s,{type:'OPEN_EXIT'});s=action(action(s,{type:'ACK_SAVE'}),{type:'NEXT'});assert.equal(s.level,5);s=action(s,{type:'MAIL'});assert.ok(s.completed.every(Boolean));assert.equal(s.memories.length,5);assert.equal(applyAction(s,{type:'MAIL'}).ok,false);assert.equal(loadGame({getItem:()=>JSON.stringify(s)}).state.completed[5],true);
});
test('sixth scene contains only a reachable supported mailbox, black background and no water',()=>{
 const s=checkpoint(5);s.levels[4].projectionDone=true;const w=createWorld(null,()=>s,()=>{},{headless:true});assert.deepEqual(w.entities.map(e=>e.id),['mailbox','exit']);assert.equal(w.scene.background.getHex(),0);assert.equal('flood' in w,false);
 const e=w.entities[0],b=new T.Box3().setFromObject(e.group);assert.ok(Math.abs(b.min.y)<.001);const path=findPath([0,7],[0,-45],w.bounds,w.blocks,p=>w.approachable(e,new T.Vector3(p[0],1.65,p[1])));assert.ok(path.length);w.tick(3600);assert.equal(w.entities.length,2);
 for(const alter of [x=>x.letter=false,x=>x.completed[4]=false]){const broken=structuredClone(s);alter(broken);assert.equal(applyAction(broken,{type:'MAIL'}).ok,false);}
});
test('v4 saves preserve all earned progress, normalize fixed circuits and map prior mail to the sixth scene',()=>{
 for(const finished of [false,true]){const s=checkpoint(4);s.version=4;s.levels=s.levels.slice(0,5);s.completed=s.completed.slice(0,5);s.levels[4].circuit=[1,0,2,3,4,6,5,7,8];if(finished){s.completed[4]=true;s.memories=[...MEMORIES];Object.assign(s.levels[4],{triggered:true,projectionDone:true,mailed:true,installed:[true,true,true],lampOrder:[0,1,2]});}
 const r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.equal(r.state.version,8);assert.equal(r.state.levels.length,6);assert.equal(r.state.completed[5],finished);assert.equal(r.state.level,finished?5:4);assert.deepEqual(r.state.levels[4].circuit,[0,1,2,3,4,5,6,7,8]);assert.equal(r.state.letter,true);assert.deepEqual(r.state.memories,s.memories);}
});
