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
    assert.equal(w.windowEyes.group.children.length,1);assert.equal(w.windowEyes.group.userData.cameraCentered,true);
    const sky=w.windowEyes.sky;assert.ok(sky.material.depthTest);assert.equal(sky.material.fog,false);assert.equal(sky.material.transparent,false);assert.equal(sky.material.side,T.BackSide);
    for(const x of [-5.8,0,5.8]){w.camera.position.set(x,1.65,-3);w.tick(2);assert.deepEqual(w.windowEyes.group.position.toArray(),w.camera.position.toArray());}
    if(level===4){state.levels[level].projectionDone=true;w.sync();assert.equal(w.windowEyes.group.visible,true);}
    state=loadGame({getItem:()=>JSON.stringify(state)}).state;assert.ok(state);w.build(level);assert.equal(w.windowEyes.group.visible,true);
    state.levels[level].triggered=false;w.sync();assert.equal(w.windowEyes.group.visible,false);
  }
});

test('wall eyes vary in size, height and roll while staying mounted and clear of clues',()=>{
  for(let level=0;level<5;level++){
    const s=newGame();s.level=level;const w=createWorld(null,()=>s,()=>{},{headless:true});
    assert.ok(new Set(w.eyes.pupils.map(v=>v.eye.scale.x.toFixed(3))).size>4);
    assert.ok(new Set(w.eyes.pupils.map(v=>v.eye.rotation.z.toFixed(3))).size>4);
    const walls=new Set();for(const {eye}of w.eyes.pupils){const m=eye.userData.mount;walls.add(m.axis+':'+m.normal);if(m.axis==='x'&&m.normal===1)assert.ok(new T.Box3().setFromObject(eye).max.y<1.05);}
    assert.equal(walls.size,4);
    for(const e of w.entities.filter(e=>e.group.userData.mount))for(const {eye}of w.eyes.pupils)assert.equal(new T.Box3().setFromObject(e.group).expandByScalar(.1).intersectsBox(new T.Box3().setFromObject(eye)),false);
  }
});

test('fourth room exposes exactly five cassette props and no obsolete map or connector pickups',()=>{
  const state=newGame();state.level=3;state.levels[3].triggered=true;state.levels[3].searched=['work-panel','family-phone','mirror-recess','child-message','desk-recess'];
  const w=createWorld(null,()=>state,()=>{},{headless:true});
  assert.deepEqual(w.visibleEntities().filter(e=>e.id.startsWith('tape-')).map(e=>e.id).sort(),['tape-child','tape-family','tape-promise','tape-self','tape-work']);
  assert.equal(w.entities.some(e=>/^(map|plug)[0-3]$/.test(e.id)),false);
});
