import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {createMouseLook,turnView,PITCH_LIMIT} from '../public/controls.mjs';
import {newGame,loadGame,MEMORIES} from '../public/engine.mjs';
import {createWorld} from '../public/scene.mjs';

test('downward mouse motion reaches 85 degrees down; upward motion reaches 85 up without flipping',()=>{
  const rotation=new T.Euler(0,0,0,'YXZ');turnView(rotation,0,10000);assert.equal(rotation.x,-PITCH_LIMIT);
  const camera=new T.PerspectiveCamera();camera.rotation.copy(rotation);assert.ok(camera.getWorldDirection(new T.Vector3()).y<-.99);
  turnView(rotation,0,-10000);assert.equal(rotation.x,PITCH_LIMIT);camera.rotation.copy(rotation);assert.ok(camera.getWorldDirection(new T.Vector3()).y>.99);
});

test('held drag reaches the new main pitch limit and a panel stops it without requiring pointer lock',()=>{
  const rotation={x:0,y:0},documentRef={pointerLockElement:null,addEventListener(){},removeEventListener(){}};
  const canvas={requestPointerLock(){assert.fail('drag look must not request pointer lock');}};
  const look=createMouseLook({canvas,documentRef,dragToLook:true,onLook:(x,y)=>turnView(rotation,x,y)});
  look.enter();look.down({target:canvas,button:0,clientX:0,clientY:0});
  look.move({target:canvas,buttons:1,clientX:0,clientY:10000});assert.equal(rotation.x,-PITCH_LIMIT);
  look.leave();const previous={...rotation};look.move({target:canvas,buttons:1,clientX:0,clientY:0});assert.deepEqual(rotation,previous);
  look.enter();look.move({target:canvas,buttons:0,clientX:0,clientY:0});assert.deepEqual(rotation,previous);look.dispose();
});

test('window eyes stay visible across long ticks, disabled effects, resync, reload and dawn, then hide in dreamcore',()=>{
  for(let level=0;level<5;level++){
    let state=newGame();state.level=state.unlocked=level;state.completed=state.completed.map((_,i)=>i<level);state.memories=MEMORIES.slice(0,level);state.letter=level>=2;const w=createWorld(null,()=>state,()=>{},{headless:true});
    assert.equal(w.windowEyes.group.visible,false);state.levels[level].triggered=true;w.sync();assert.equal(w.windowEyes.group.visible,true);
    const count=w.windowEyes.group.children.length;w.setEffects(false);for(const t of [0,1,10,200,3600]){w.tick(t);w.sync();assert.equal(w.windowEyes.group.visible,true);}
    assert.equal(w.windowEyes.group.children.length,count);
    for(const facade of w.windowEyes.group.children){const box=new T.Box3().setFromObject(facade);assert.ok(Math.abs(box.min.y)<.001);const eye=facade.children.find(o=>o.material?.isMeshBasicMaterial);assert.ok(eye.material.depthTest);assert.equal(eye.material.fog,false);assert.equal(eye.visible,true);}
    if(level===4){state.levels[level].projectionDone=true;w.sync();assert.equal(w.windowEyes.group.visible,true);}
    state=loadGame({getItem:()=>JSON.stringify(state)}).state;assert.ok(state);w.build(level);assert.equal(w.windowEyes.group.visible,true);
    state.levels[level].triggered=false;w.sync();assert.equal(w.windowEyes.group.visible,false);
  }
});

test('wall eyes have equal sizes and spacing on solid walls, stay outside exit and below window glazing',()=>{
  for(let level=0;level<5;level++){
    const s=newGame();s.level=level;const w=createWorld(null,()=>s,()=>{},{headless:true});
    const walls=new Map();
    for(const {eye} of w.eyes.pupils){const m=eye.userData.mount,key=`${m.axis}:${m.normal}:${eye.position.y}`;if(!walls.has(key))walls.set(key,[]);walls.get(key).push(eye);
      if(m.axis==='x'&&m.normal===1){assert.ok(new T.Box3().setFromObject(eye).max.y<1.05);assert.ok(eye.rotation.y>0);}else assert.equal(eye.scale.x,.62);
      if(m.axis==='z'&&m.normal===1)assert.ok(Math.abs(eye.position.x)>1.1);
    }
    assert.ok(walls.size>=7);
    for(const e of w.entities.filter(e=>e.group.userData.mount)){
      const clue=new T.Box3().setFromObject(e.group).expandByScalar(.1);
      for(const {eye}of w.eyes.pupils)assert.equal(clue.intersectsBox(new T.Box3().setFromObject(eye)),false,`level ${level+1}: eye covers ${e.name}`);
    }
    for(const eyes of walls.values()){
      const axis=eyes[0].userData.mount.axis==='x'?'z':'x',positions=eyes.map(e=>e.position[axis]).sort((a,b)=>a-b);
      const deltas=positions.slice(1).map((p,i)=>p-positions[i]);if(deltas.length>1){const m=eyes[0].userData.mount,span=axis==='z'?w.bounds.maxZ-w.bounds.minZ:w.bounds.maxX-w.bounds.minX;const base=span/(m.axis==='x'&&m.normal===1?Math.ceil(span/3.5):Math.max(3,Math.ceil(span/1.9)));assert.ok(deltas.every(v=>Math.abs(v/base-Math.round(v/base))<.001));}
    }
  }
});

test('fourth room exposes exactly three cassette props and no obsolete map or connector pickups',()=>{
  const state=newGame();state.level=3;state.levels[3].triggered=true;state.levels[3].searched=['work-panel','family-phone','mirror-recess'];
  const w=createWorld(null,()=>state,()=>{},{headless:true});
  assert.deepEqual(w.visibleEntities().filter(e=>e.id.startsWith('tape-')).map(e=>e.id).sort(),['tape-family','tape-self','tape-work']);
  assert.equal(w.entities.some(e=>/^(map|plug)[0-3]$/.test(e.id)),false);
});
