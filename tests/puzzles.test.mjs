import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,applyAction,loadGame,MEMORIES} from '../public/engine.mjs';
import {puzzleState,circuitStatus,diagramReady,BOARD_ITEMS,SOCKETS,RECORDINGS,PARTS} from '../public/puzzles.mjs';
import {inventoryEntries} from '../public/inventory.mjs';
import {action,boardPrepared,repaired} from './puzzle-helpers.mjs';
function checkpoint(level){const s=newGame();s.level=s.unlocked=level;s.completed=s.completed.map((_,i)=>i<level);s.memories=MEMORIES.slice(0,level);s.letter=level>=2;s.inventory=s.letter?['letter']:[];return s;}
test('new quest parts cannot be collected before trigger or before opening the correct hiding place',()=>{
  for(const [level,id,hide] of [[3,'tape-work','work-panel'],[4,'bulb','lamp-crate']]){let s=checkpoint(level);assert.equal(applyAction(s,{type:'COLLECT',id}).ok,false);s=action(s,{type:'TRIGGER'});assert.equal(applyAction(s,{type:'COLLECT',id}).ok,false);s=action(s,{type:'SEARCH',id:hide});s=action(s,{type:'COLLECT',id});assert.equal(applyAction(s,{type:'COLLECT',id}).ok,false);assert.ok(s.inventory.includes(id));}
});
test('sorting, diagram orientation, every wire and every signal independently gate activation',()=>{
  const ready=boardPrepared(checkpoint(3));assert.equal(ready.completed[3],false);
  const cases=[{type:'RECORD_ORDER',index:0},{type:'DIAGRAM_ROTATE',index:2,delta:90},...SOCKETS.map((v,index)=>({type:'CONNECT',index,socket:(v+1)%3})),...RECORDINGS.map((v,index)=>({type:'SIGNAL',index,value:1}))];
  for(const a of cases){const s=action(ready,a),r=applyAction(s,{type:'ACTIVATE_BOARD'});assert.equal(r.ok,false,JSON.stringify(a));assert.equal(r.state.completed[3],false);if(a.type==='SIGNAL')assert.equal(r.distorted,a.index);}
  const r=applyAction(ready,{type:'ACTIVATE_BOARD'});assert.equal(r.completedNow,true);assert.equal(applyAction(r.state,{type:'ACTIVATE_BOARD'}).ok,false);assert.equal(r.state.memories.filter(m=>m==='承認').length,1);
});
test('diagram swaps preserve all pieces, and rewiring takes the occupied plug back rather than duplicating',()=>{
  let s=boardPrepared(checkpoint(3));s=action(s,{type:'DIAGRAM',index:0,slot:1});assert.deepEqual(s.levels[3].diagram,[1,0,2,3]);assert.equal(diagramReady(s.levels[3]),false);assert.equal(applyAction(s,{type:'CONNECT',index:0,socket:2}).ok,false);
  s=action(s,{type:'DIAGRAM',index:0,slot:0});s=action(s,{type:'CONNECT',index:0,socket:0});assert.deepEqual(s.levels[3].wires,[0,null,1]);assert.ok(inventoryEntries(s).some(e=>e.id==='plug1'));assert.equal(new Set(s.inventory).size,s.inventory.length);
});
test('malformed indices, angles, signal values and uncollected recordings are rejected without changing progress',()=>{
  let s=action(checkpoint(3),{type:'TRIGGER'});
  for(const a of [{type:'RECORD_ORDER',index:0},{type:'DIAGRAM',index:NaN,slot:0},{type:'DIAGRAM_ROTATE',index:0,delta:45},{type:'SIGNAL',index:0,value:Infinity},{type:'SIGNAL',index:9,value:2},{type:'CONNECT',index:0,socket:3}]){const before=JSON.stringify(s);assert.equal(applyAction(s,a).ok,false);assert.equal(JSON.stringify(s),before);}
});
test('connectivity uses reciprocal neighbouring ports and the source, not an arrangement flag or count',()=>{
  const l=puzzleState();assert.equal(circuitStatus(l).ready,false);l.circuit=[0,1,2,3,4,5,6,7,8];l.circuitAngles=[90,0,0,0,0,0,0,0,0];assert.deepEqual(circuitStatus(l).lamps,[true,true,true]);
  l.circuitAngles[1]=90;assert.deepEqual(circuitStatus(l).lamps,[false,true,true]);l.circuitAngles[1]=0;l.circuitAngles[4]=90;assert.deepEqual(circuitStatus(l).lamps,[true,false,true]);l.circuitAngles[4]=0;l.circuitAngles[7]=90;assert.deepEqual(circuitStatus(l).lamps,[true,true,false]);
  l.circuitAngles[3]=90;assert.equal(circuitStatus(l).ready,false);
});
test('lamp repairs require matching collected parts; disconnected wires prevent illumination',()=>{
  let s=action(checkpoint(4),{type:'TRIGGER'});assert.equal(applyAction(s,{type:'INSTALL',index:0,id:'bulb'}).ok,false);s=action(s,{type:'SEARCH',id:'lamp-crate'});s=action(s,{type:'COLLECT',id:'bulb'});assert.equal(applyAction(s,{type:'INSTALL',index:1,id:'bulb'}).ok,false);s=action(s,{type:'INSTALL',index:0,id:'bulb'});assert.equal(applyAction(s,{type:'LAMP',index:0}).ok,false);assert.equal(applyAction(s,{type:'PROJECT'}).ok,false);
  s=repaired(checkpoint(4));s=action(s,{type:'CIRCUIT_ROTATE',index:1});assert.equal(s.levels[4].lampOrder.length,0);assert.equal(applyAction(s,{type:'LAMP',index:0}).ok,false);
});
test('wrong lamp order resets safely and power changes invalidate lights; projection locks circuitry',()=>{
  let s=repaired(checkpoint(4));s=action(s,{type:'CIRCUIT_ROTATE',index:3});s=action(s,{type:'LAMP',index:1});assert.deepEqual(s.levels[4].lampOrder,[]);assert.equal(s.completed[4],false);
  for(let index=0;index<3;index++)s=action(s,{type:'LAMP',index});s=action(s,{type:'PROJECT'});assert.equal(applyAction(s,{type:'CIRCUIT_ROTATE',index:0}).ok,false);assert.equal(applyAction(s,{type:'MAIL'}).ok,false);s=action(s,{type:'PROJECTION_END'});s=action(s,{type:'MAIL'});assert.ok(s.completed.every(Boolean));assert.equal(s.letter,true);
});
test('new partially solved mechanism state survives serialization with unused items and letter intact',()=>{
  let s=boardPrepared(checkpoint(3));s=action(s,{type:'SIGNAL',index:2,value:1});let r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.deepEqual(r.state.levels[3],s.levels[3]);
  s=repaired(checkpoint(4));r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.deepEqual(r.state.levels[4],s.levels[4]);assert.deepEqual(inventoryEntries(r.state).map(e=>e.id),['letter']);assert.ok(PARTS.every(id=>r.state.inventory.includes(id)));
});
function oldSave(s){s.version=3;for(const l of s.levels)for(const key of Object.keys(puzzleState()))delete l[key];return s;}
test('v3 saves retain all earned stages, memories, letter and completed projection; unfinished puzzles restart fairly',()=>{
  for(const level of [0,2,3,4]){const s=oldSave(checkpoint(level));if(level===4)s.levels[4].projectionDone=true;const r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.equal(r.state.version,4);assert.deepEqual(r.state.completed,s.completed);assert.deepEqual(r.state.memories,s.memories);assert.equal(r.state.letter,s.letter);if(level===3)assert.equal(r.state.levels[3].switchboardOn,false);if(level===4){assert.equal(r.state.levels[3].switchboardOn,true);assert.equal(circuitStatus(r.state.levels[4]).ready,true);assert.equal(r.state.levels[4].projectionDone,true);}}
});
test('v4 corrupted puzzle saves cannot inject duplicate tiles, plugs or malformed state',()=>{
  for(const alter of [l=>l.diagram=[0,0,null,null],l=>l.circuit=[0,0,2,3,4,5,6,7,8],l=>l.circuitAngles[0]=45,l=>l.wires=[1,1,null],l=>l.signals=[0,2,3],l=>l.recordOrder=[2,2],l=>l.lampOrder=[1],l=>delete l.installed]){const s=checkpoint(3);alter(s.levels[3]);assert.equal(loadGame({getItem:()=>JSON.stringify(s)}).state,null);}
});
