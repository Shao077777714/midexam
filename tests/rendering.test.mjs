import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {createInspectorPool} from '../public/scene.mjs';
import {disposeObjects,watchContext} from '../public/rendering.mjs';

function poolFixture(){
  const renderers=[],source=new T.Texture();let disposed=0;
  const pool=createInspectorPool({makeCanvas:()=>({clientWidth:400,style:{},addEventListener(){},removeEventListener(){},setAttribute(){},remove(){}}),sharedTextures:()=>[source],
    makeModel(){const g=new T.Group(),geometry=new T.BoxGeometry(1,1,1);geometry.addEventListener('dispose',()=>disposed++);g.add(new T.Mesh(geometry,new T.MeshBasicMaterial({map:source})));return g;},
    makeRenderer(canvas){const r={domElement:canvas,lost:false,renders:0,releases:0,disposed:0,setPixelRatio(){},setSize(){},getContext(){return {isContextLost:()=>r.lost,getExtension:()=>null};},render(){r.renders++;},clear(){},dispose(){r.disposed++;},forceContextLoss(){r.releases++;}};renderers.push(r);return r;}});
  return {pool,renderers,host:{append(){}},source,get disposed(){return disposed;}};
}

test('fifty item previews reuse one context and release every old model without disposing source textures',()=>{
  const f=poolFixture();let sourceDisposals=0;f.source.addEventListener('dispose',()=>sourceDisposals++);
  for(let i=0;i<50;i++){const p=f.pool.open(f.host,i%2?'letter':'photo');p.render();p.dispose();p.dispose();}
  assert.equal(f.renderers.length,1);assert.equal(f.renderers[0].renders,50);assert.equal(f.disposed,50);assert.equal(sourceDisposals,0);
  f.pool.dispose();f.pool.dispose();assert.equal(f.renderers[0].disposed,1);assert.equal(f.renderers[0].releases,1);
});

test('replacing a preview invalidates the old view and recreates only a lost preview context',()=>{
  const f=poolFixture(),first=f.pool.open(f.host,'letter'),next=f.pool.open(f.host,'photo');first.render();next.render();assert.equal(f.renderers[0].renders,1);assert.equal(f.disposed,1);
  f.renderers[0].lost=true;const recovered=f.pool.open(f.host,'letter');assert.equal(f.renderers.length,2);assert.equal(f.renderers[0].disposed,1);assert.equal(f.renderers[0].releases,0);recovered.render();assert.equal(f.renderers[1].renders,1);f.pool.dispose();
});

test('shared instance geometry, material and owned maps are disposed once, shared source maps survive',()=>{
  const root=new T.Group(),geometry=new T.BoxGeometry(1,1,1),source=new T.Texture(),owned=new T.Texture(),material=new T.MeshBasicMaterial({map:owned});let gd=0,md=0,td=0,sd=0;
  geometry.addEventListener('dispose',()=>gd++);material.addEventListener('dispose',()=>md++);owned.addEventListener('dispose',()=>td++);source.addEventListener('dispose',()=>sd++);
  for(let i=0;i<3;i++){const mesh=new T.Mesh(geometry,material);mesh.userData.photoMaps={aged:source,horror:owned};root.add(mesh);}
  const instances=new T.InstancedMesh(geometry,material,5);let id=0;instances.addEventListener('dispose',()=>id++);root.add(instances);
  disposeObjects(root,[source]);assert.deepEqual([gd,md,td,sd,id],[1,1,1,0,1]);
});

function contextFixture(){
  const events=new Map(),timers=new Map();let seq=0,lost=0,restored=0,waiting=0,attempts=0,prevented=0;
  const canvas={addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  const extension={restoreContext(){attempts++;}},renderer={getContext(){return {getExtension(){return lost?null:extension;}};}};
  const monitor=watchContext(canvas,renderer,{onLost(){lost++;},onRestored(){restored++;},onWaiting(){waiting++;},schedule(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id;},cancel:id=>timers.delete(id)});
  return {events,timers,monitor,lose(){events.get('webglcontextlost')({preventDefault(){prevented++;}});},restore(){events.get('webglcontextrestored')();},run(ms){for(const [id,t]of [...timers])if(t.ms===ms){timers.delete(id);t.fn();}},get counters(){return {lost,restored,waiting,attempts,prevented};}};
}

test('context interruption is recoverable once, stops the pending warning and accepts another interruption',()=>{
  const f=contextFixture();f.lose();f.lose();assert.equal(f.monitor.lost,true);assert.equal(f.counters.lost,1);assert.equal(f.counters.prevented,2);
  f.run(500);assert.equal(f.counters.attempts,1);f.restore();assert.equal(f.monitor.lost,false);assert.equal(f.timers.size,0);f.run(5000);assert.equal(f.counters.waiting,0);
  f.restore();assert.equal(f.counters.restored,1);f.lose();f.restore();assert.equal(f.counters.restored,2);
});

test('unavailable graphics show a waiting state and teardown cancels scheduled recovery',()=>{
  const f=contextFixture();f.lose();f.run(5000);assert.equal(f.counters.waiting,1);
  f.monitor.dispose();assert.equal(f.timers.size,0);assert.equal(f.events.size,0);f.run(500);assert.equal(f.counters.attempts,0);
});
