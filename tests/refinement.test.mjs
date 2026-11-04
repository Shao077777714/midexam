import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {newGame,MEMORIES,SEARCHES,RECORD_HIDES} from '../public/engine.mjs';
import {createWorld} from '../public/scene.mjs';
import {findPath} from '../public/navigation.mjs';

function checkpoint(level,triggered){
  const s=newGame();s.level=s.unlocked=level;s.completed=s.completed.map((_,i)=>i<level);s.memories=MEMORIES.slice(0,level);s.letter=level>=2;s.inventory=s.letter?['letter']:[];
  Object.assign(s.levels[level],{triggered,drawer:true,chair:true,frame:true,searched:[...(SEARCHES[level]||[]),...Object.values(RECORD_HIDES),'lamp-crate','linen-box','power-radio','letterbox']});
  return s;
}
const bounds=o=>new T.Box3().setFromObject(o).toJSON?.()||new T.Box3().setFromObject(o);
const snapshot=w=>JSON.stringify({bounds:w.bounds,blocks:w.blocks,entities:w.entities.map(e=>({id:e.id,name:e.name,visible:e.group.visible,bounds:bounds(e.group),pickup:!!e.pickupAction,trigger:!!e.triggerAction}))});

test('refinement preserves all six rooms, entity bounds, collisions and task interaction rays in both worlds',()=>{
  for(let level=0;level<6;level++)for(const triggered of [false,true]){
    const s=checkpoint(level,triggered),before=JSON.stringify(s),baseline=createWorld(null,()=>s,()=>{},{headless:true,refine:false}),refined=createWorld(null,()=>s,()=>{},{headless:true});
    assert.equal(snapshot(refined),snapshot(baseline),`scene ${level+1}, weird=${triggered}`);
    const start=[baseline.camera.position.x,baseline.camera.position.z];
    for(const e of baseline.visibleEntities()){
      const c=new T.Box3().setFromObject(e.group).getCenter(new T.Vector3());
      const path=findPath(start,[c.x,c.z],baseline.bounds,baseline.blocks,p=>baseline.approachable(e,new T.Vector3(p[0],1.65,p[1])));
      if(!path.length)continue;
      const end=path.at(-1);
      for(const w of [baseline,refined]){w.camera.position.set(end[0],1.65,end[1]);w.camera.lookAt(c);w.camera.updateMatrixWorld(true);w.scene.updateMatrixWorld(true);}
      for(const [x,y]of [[0,0],[.08,0],[-.08,0],[0,.08],[0,-.08]])assert.equal(refined.target(x,y)?.id,baseline.target(x,y)?.id,`ray changed at ${level}:${e.id}`);
    }
    baseline.tick(200);refined.tick(200);assert.equal(JSON.stringify(s),before,'visuals must not write puzzle/save state');
  }
});

test('visual batches have fixed resource counts, keep real depth and add no lights or shadow casters',()=>{
  for(let level=0;level<6;level++){
    const s=checkpoint(level,true),w=createWorld(null,()=>s,()=>{},{headless:true}),a=createWorld(null,()=>s,()=>{},{headless:true,refine:false});
    const counts=world=>{let lights=0,casters=0,parts=0;world.scene.traverse(o=>{if(o.isLight)lights++;if(o.isMesh&&o.castShadow)casters++;if(o.userData.refinementBatch){parts++;assert.equal(o.material.depthTest,true);assert.equal(o.castShadow,false);}});return {lights,casters,parts};};
    const original=counts(a),first=counts(w);assert.equal(first.lights,original.lights);assert.equal(first.casters,original.casters);
    if(level===5)assert.equal(first.parts,0,'the final hall must retain its black empty space');else {assert.ok(first.parts>0&&first.parts<=3);assert.ok(w.scene.getObjectByName('scene-refinement').userData.detailCount>100);}
    for(const t of [0,1,3600])w.tick(t);assert.deepEqual(counts(w),first);w.build();assert.deepEqual(counts(w),first);
  }
});
