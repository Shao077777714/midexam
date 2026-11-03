import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {createMouseLook,movementSpeed,EYE_SURGE_MS} from '../public/controls.mjs';
import {newGame,applyAction,opticsStatus,loadGame,SEARCHES} from '../public/engine.mjs';
import {setPhotoMood} from '../public/models.mjs';
import {createWorld} from '../public/scene.mjs';
import {findPath} from '../public/navigation.mjs';

function inputFixture(refuse=false,edgeTurn=false,dragToLook=false){
  const events=new Map(),moves=[];let requests=0,unlocks=0,denied=0;
  const doc={pointerLockElement:null,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),exitPointerLock(){this.pointerLockElement=null;events.get('pointerlockchange')?.();}};
  const canvas={getBoundingClientRect:()=>({left:0,top:0,right:1000,bottom:700}),requestPointerLock(){requests++;if(refuse)return Promise.reject(Error('unsupported'));}};
  const look=createMouseLook({canvas,documentRef:doc,edgeTurn,dragToLook,onLook:(...xy)=>moves.push(xy),onUnlock:()=>unlocks++,onDenied:()=>denied++});
  return {doc,canvas,look,moves,events,get requests(){return requests;},get unlocks(){return unlocks;},get denied(){return denied;}};
}
const action=(s,a)=>{const r=applyAction(s,a);assert.equal(r.ok,true,r.message);return r.state;};
function mirrorState(){const s=newGame();s.level=3;s.levels[3].triggered=true;s.levels[3].flashlight=true;s.levels[3].mirrors=[45,135,135];return s;}
function worldFixture(level,triggered=true){const s=newGame();s.level=level;Object.assign(s.levels[level],{triggered,drawer:true,chair:true,frame:true,searched:[...SEARCHES[level]]});return {s,w:createWorld(null,()=>s,()=>{},{headless:true})};}

test('entering exploration requests mouse lock immediately and free movement needs no mouse button',()=>{
  const f=inputFixture();f.look.enter();assert.equal(f.requests,1);assert.equal(f.look.enabled,true);
  f.look.move({target:f.canvas,clientX:100,clientY:100,buttons:0});f.look.move({target:f.canvas,clientX:125,clientY:90,buttons:0});assert.deepEqual(f.moves,[[25,-10]]);
  f.look.leave();f.look.move({target:f.canvas,clientX:130,clientY:80});assert.equal(f.moves.length,1);
});
test('free exploration can reach HUD controls without locking, and resumes without a camera jump',()=>{
  const f=inputFixture();f.look.enter({lock:false});assert.equal(f.requests,0);
  f.look.move({target:f.canvas,clientX:100,clientY:100});f.look.move({target:f.canvas,clientX:120,clientY:90});
  f.look.leave();f.look.move({target:{},clientX:1000,clientY:50});assert.deepEqual(f.moves,[[20,-10]]);
  f.look.enter({lock:false});f.look.move({target:f.canvas,clientX:900,clientY:150});assert.deepEqual(f.moves,[[20,-10]]);
  f.look.move({target:f.canvas,clientX:910,clientY:152});assert.deepEqual(f.moves,[[20,-10],[10,2]]);assert.equal(f.requests,0);
});

test('free look can keep turning at screen edges and stops immediately while using controls',()=>{
  const f=inputFixture(false,true);f.look.enter({lock:false});f.look.move({target:f.canvas,clientX:999,clientY:350});
  for(let i=0;i<100;i++)f.look.tick(.1);assert.ok(f.moves.reduce((sum,[x])=>sum+x,0)*.0025>Math.PI*2);
  const count=f.moves.length;f.look.leave();f.look.tick(.1);assert.equal(f.moves.length,count);
  f.look.enter({lock:false});f.look.tick(.1);assert.equal(f.moves.length,count);
  f.look.move({target:f.canvas,clientX:500,clientY:350});f.look.tick(.1);assert.equal(f.moves.length,count);
});

test('denied Pointer Lock retains free mouse look and gives the fallback notification',async()=>{
  const f=inputFixture(true);f.look.enter();await Promise.resolve();assert.equal(f.denied,1);assert.equal(f.look.enabled,true);
  f.look.move({target:f.canvas,clientX:10,clientY:20});f.look.move({target:f.canvas,clientX:15,clientY:17});assert.deepEqual(f.moves,[[5,-3]]);
});
test('menu unlocks are deliberate, Escape unlocks pause, and late lock acquisition releases itself',()=>{
  const f=inputFixture();f.look.enter();f.doc.pointerLockElement=f.canvas;f.events.get('pointerlockchange')();
  f.look.move({target:null,movementX:8,movementY:-3});assert.deepEqual(f.moves,[[8,-3]]);f.look.leave();assert.equal(f.unlocks,0);
  f.look.enter();f.doc.pointerLockElement=f.canvas;f.events.get('pointerlockchange')();f.doc.exitPointerLock();assert.equal(f.unlocks,1);
  f.look.leave();f.doc.pointerLockElement=f.canvas;f.events.get('pointerlockchange')();assert.equal(f.doc.pointerLockElement,null);
});
test('drag look rotates only while the left button is held and restores the cursor on release',()=>{
  const f=inputFixture(false,false,true);f.look.enter();assert.equal(f.requests,0);
  f.look.move({target:f.canvas,clientX:100,clientY:100,buttons:0});f.look.move({target:f.canvas,clientX:120,clientY:120,buttons:0});assert.deepEqual(f.moves,[]);
  assert.equal(f.look.down({target:{},button:0}),false);assert.equal(f.look.down({target:f.canvas,button:2}),false);
  f.look.down({target:f.canvas,button:0,clientX:120,clientY:120});f.look.move({target:f.canvas,clientX:150,clientY:130,buttons:1});assert.deepEqual(f.moves,[[30,10]]);assert.equal(f.look.dragging,true);
  f.look.up({timeStamp:1000});f.look.move({target:f.canvas,clientX:500,clientY:350,buttons:0});assert.equal(f.look.dragging,false);assert.equal(f.moves.length,1);assert.equal(f.look.canDoubleClick({timeStamp:1100}),false);assert.equal(f.look.canDoubleClick({timeStamp:1400}),true);
});

test('drag look cancels on menus or lost buttons, with no jump or edge rotation after release',()=>{
  const f=inputFixture(false,true,true);f.look.enter();f.look.down({target:f.canvas,button:0,clientX:999,clientY:350});f.look.leave();f.look.tick(.1);assert.equal(f.look.dragging,false);assert.deepEqual(f.moves,[]);
  f.look.enter();f.look.move({target:f.canvas,clientX:900,clientY:500,buttons:1});assert.deepEqual(f.moves,[]);
  f.look.down({target:f.canvas,button:0,clientX:900,clientY:500});f.look.move({target:f.canvas,clientX:910,clientY:502,buttons:1});assert.deepEqual(f.moves,[[10,2]]);
  f.look.move({target:f.canvas,clientX:999,clientY:502,buttons:0,timeStamp:2000});f.look.tick(.1);assert.equal(f.look.dragging,false);assert.equal(f.moves.length,1);
  f.look.down({target:f.canvas,button:0,clientX:500,clientY:350});f.look.up({timeStamp:2500});assert.equal(f.look.canDoubleClick({timeStamp:2501}),true);
});

test('manual and assisted speeds are fixed independently of the water visual',()=>{
  assert.equal(movementSpeed(),2.7);assert.equal(movementSpeed(true),3.2);
  assert.equal(movementSpeed(false),2.7);assert.ok(EYE_SURGE_MS<=200);
});
test('wading follows the visible water and returns to normal in dry scenes',()=>{
  for(let level=0;level<5;level++){const {s,w}=worldFixture(level,false);assert.equal(w.wadingAt(0,0),false);s.levels[level].triggered=true;w.sync();assert.equal(w.wadingAt(0,0),[1,3,4].includes(level));assert.equal(w.wadingAt(100,100),false);}
});
test('new anomalies stay hidden before triggering, with grounded instanced dolls and fixed counts',()=>{
  for(let level=0;level<5;level++){const {s,w}=worldFixture(level,false);assert.equal(w.phenomena.group.visible,false);assert.ok(w.phenomena.dollCount>=8);assert.ok(w.phenomena.dolls.every(b=>Math.abs(b.min.y-.012)<.004));assert.ok(w.phenomena.blocks.every(b=>!b.active));
    s.levels[level].triggered=true;w.sync();assert.ok(w.phenomena.blocks.every(b=>b.active));assert.ok(w.eyes.pupils.length>=25);let count=0;w.scene.traverse(()=>count++);w.tick(30);let after=0;w.scene.traverse(()=>after++);assert.equal(after,count);
  }
});
test('opened television presents a photo on a visible supported tray below eye height',()=>{
  const {s,w}=worldFixture(2),e=w.entities.find(e=>e.id==='p8'),b=new T.Box3().setFromObject(e.group);assert.ok(b.max.y<1.65);assert.ok(Math.abs(b.min.y-1.2125)<.004);
  const p=b.getCenter(new T.Vector3()),path=findPath([0,5.9],[p.x,p.z],w.bounds,w.blocks,v=>w.near(e,new T.Vector3(v[0],1.65,v[1])));assert.ok(path.length);
  const screen=w.entities.find(e=>e.id==='search-television').group.getObjectByName('screen');assert.equal(screen.material.isMeshBasicMaterial,true);
  s.levels[2].collected.push('p8');w.sync();assert.equal(e.group.visible,false);assert.equal(screen.material.map,null);
});
test('legacy optical calibration cannot finish the new switchboard puzzle',()=>{let s=mirrorState();for(let index=0;index<3;index++)s=action(s,{type:'MIRROR_FILTER',index,filter:index+1});s=action(s,{type:'CALIBRATE'});assert.equal(s.completed[3],false);assert.equal(s.levels[3].switchboardOn,false);assert.equal(applyAction(s,{type:'ACTIVATE_BOARD'}).ok,false);});
test('received light colors use the actual reflection segment and match displayed beam colors',()=>{
  const s=mirrorState(),l=s.levels[3];l.mirrorFilters=[1,2,3];const status=opticsStatus(l);assert.deepEqual(status.segmentFilters,[0,1,2,3]);assert.deepEqual(status.received,[1,2,3]);l.mirrorFilters[1]=3;assert.equal(opticsStatus(l).ready,false);l.mirrors[0]=0;assert.equal(opticsStatus(l).trace.solved,false);
});
test('v2 mirror saves keep unlocked progress while unfinished mirrors receive the new controls',()=>{
  for(const unlocked of [false,true]){const s=newGame();s.version=2;s.levels=s.levels.slice(0,5);s.completed=s.completed.slice(0,5);s.levels[3].opticsUnlocked=unlocked;for(const l of s.levels)delete l.mirrorFilters;const r=loadGame({getItem:()=>JSON.stringify(s)});assert.equal(r.error,null);assert.equal(r.state.version,7);assert.equal(r.state.levels[3].opticsUnlocked,unlocked);assert.deepEqual(r.state.levels[3].mirrorFilters,unlocked?[1,2,3]:[0,0,0]);}
});
test('invalid mirror filter input and malformed modern saves are rejected',()=>{
  const s=mirrorState();for(const filter of [-1,4,1.2,NaN])assert.equal(applyAction(s,{type:'MIRROR_FILTER',index:0,filter}).ok,false);
  const bad=newGame();bad.levels[3].mirrorFilters=[0,0];assert.equal(loadGame({getItem:()=>JSON.stringify(bad)}).state,null);
});

test('switching a blank CRT to a photograph invalidates its shader variant',()=>{const mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial()),texture=new T.Texture();mesh.userData.photoMaps={aged:null,horror:texture};const before=mesh.material.version;setPhotoMood(mesh,true);assert.equal(mesh.material.map,texture);assert.ok(mesh.material.version>before);const after=mesh.material.version;setPhotoMood(mesh,false);assert.equal(mesh.material.map,null);assert.ok(mesh.material.version>after);});
