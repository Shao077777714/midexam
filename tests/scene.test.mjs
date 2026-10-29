import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {createModel} from '../public/models.mjs';
import {restOn,footprint,shadowPlacementFree} from '../public/spatial.mjs';
import {newGame,SHADOW_TARGETS,applyAction} from '../public/engine.mjs';
import {createWorld} from '../public/scene.mjs';
import {findPath,walkable} from '../public/navigation.mjs';
import {EXTERIOR} from '../public/atmosphere.mjs';

function fixture(level=0,triggered=true){
  const state=newGame();state.level=level;
  Object.assign(state.levels[level],{triggered,drawer:true,chair:true,frame:true});
  const signals=[],world=createWorld(null,()=>state,a=>signals.push(a),{headless:true});
  return {state,world,signals};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<.004,`${a} != ${b}`);

test('every portable model rests on its actual geometry at different rotations and scales',()=>{
  for(const kind of ['moon','rabbit','vase','key','phone','flashlight','memory0','memory3','drawing','p0','photo','book','musicbox','lamp','crt']){
    const root=new T.Group(),g=createModel(kind);root.add(g);g.scale.setScalar(.65);g.rotation.set(.2,.8,0);g.position.set(1,4,-2);restOn(g,1.075);
    near(new T.Box3().setFromObject(g).min.y,1.075);
  }
});

test('all five spawn points are outside physical furniture and room walls',()=>{
  for(let level=0;level<5;level++){const {world}=fixture(level);assert.ok(walkable(world.camera.position.x,world.camera.position.z,world.bounds,world.blocks),`spawn ${level}`);}
});

test('all portable scene entities have a visible support height without floating gaps',()=>{
  for(let level=0;level<5;level++){const {world}=fixture(level);for(const e of world.entities){const height=e.group.userData.supportHeight;if(height!==undefined)near(new T.Box3().setFromObject(e.group).min.y,height);}}
});

test('shadow objects and their grounded supports move together to the solved positions',()=>{
  const {state,world}=fixture();state.levels[0].shadow=structuredClone(SHADOW_TARGETS);world.sync();
  for(let i=0;i<3;i++){const e=world.entities.find(e=>e.id===`shadow${i}`);near(e.group.position.x,SHADOW_TARGETS[i].x);near(e.group.position.z,SHADOW_TARGETS[i].z);near(new T.Box3().setFromObject(e.group).min.y,1.4);assert.ok(!walkable(e.group.position.x,e.group.position.z,world.bounds,world.blocks));}
});

test('shadow placement cannot clip the bed, cabinet, or another movable pedestal',()=>{
  const s=newGame();s.levels[0].triggered=true;
  for(const [x,z] of [[-3.7,2.5],[3.8,2.5],[s.levels[0].shadow[1].x,s.levels[0].shadow[1].z]])assert.equal(applyAction(s,{type:'SHADOW',index:0,x,z,angle:0}).ok,false);
  assert.ok(SHADOW_TARGETS.every((v,i)=>shadowPlacementFree(i,v,SHADOW_TARGETS)));
});

test('rotating mirrors updates their physical bounds and prevents clipping the player',()=>{
  const {state,world}=fixture(3),e=world.entities.find(e=>e.id==='mirror0');
  const initial=footprint(e.group);state.levels[3].mirrors[0]=45;world.sync();const rotated=footprint(e.group);
  assert.ok(rotated.w>initial.w+.4);assert.ok(!walkable(-3,-2,world.bounds,world.blocks));
  world.camera.position.set(-2.3,1.65,-2);assert.equal(world.canApply({type:'MIRROR',index:0,angle:90}),false);
});

test('moving chairs and opening drawers updates collisions including the protruding tray',()=>{
  const {state,world}=fixture(1);state.levels[1].chair=false;world.sync();assert.ok(!walkable(2,-4,world.bounds,world.blocks));state.levels[1].chair=true;world.sync();assert.ok(walkable(2,-4,world.bounds,world.blocks));assert.ok(!walkable(.75,-4,world.bounds,world.blocks));
  const drawer=world.entities.find(e=>e.id==='drawer').group;state.levels[1].drawer=false;world.sync();const closed=footprint(drawer);state.levels[1].drawer=true;world.sync();assert.ok(footprint(drawer).d>closed.d+.15);
});

test('wall attachments embed their opaque backs into their supporting wall',()=>{
  let count=0;
  for(let level=0;level<5;level++){const {world}=fixture(level);world.scene.traverse(g=>{const m=g.userData.mount;if(!m)return;count++;const b=new T.Box3().setFromObject(g),back=m.normal>0?b.min[m.axis]:b.max[m.axis];near(back,m.surface-m.normal*.003);let opaque=false;g.traverse(o=>{if(o.isMesh&&!o.material.transparent&&o.material.depthTest&&o.material.depthWrite)opaque=true;});assert.ok(opaque);});}
  assert.ok(count>40);
});

test('each scene has three reversible decoration interactions without changing puzzle progress',()=>{
  for(let level=0;level<5;level++){const {state,world,signals}=fixture(level),before=JSON.stringify(state);assert.ok(world.decorations.length>=3);for(const e of world.decorations){e.action();e.action();}assert.equal(signals.length,world.decorations.length*2);assert.ok(signals.every(a=>a.type==='DECOR'));assert.equal(JSON.stringify(state),before);}
});

test('eyes are hidden before the designated trigger and track the camera from the wall afterwards',()=>{
  const {state,world}=fixture(0,false);assert.equal(world.eyes.group.visible,false);state.levels[0].triggered=true;world.sync();assert.equal(world.eyes.group.visible,true);const iris=world.eyes.pupils[0].iris;world.camera.position.x=-3;world.tick(1);const x=iris.position.x;world.camera.position.z=-5;world.tick(2);assert.ok(Number.isFinite(iris.position.x));assert.ok(Math.abs(iris.position.x)<=.12);assert.ok(Math.abs(iris.position.y)<=.075);assert.ok(world.eyes.pupils.every(({eye})=>eye.userData.mount));
});

test('world surface text is limited to letters, never labels on other props',()=>{
  for(let level=0;level<5;level++){const {world}=fixture(level);world.scene.traverse(g=>{if(!g.userData.surfaceText)return;let parent=g;while(parent&&!parent.userData.kind)parent=parent.parent;assert.ok(['letter','help'].includes(parent?.userData.kind));});}
});

test('instanced buildings and terrain extend beyond the fog with a fixed model count',()=>{
  const {world}=fixture(0);const instances=[];world.scene.traverse(o=>{if(o.isInstancedMesh&&o.count===EXTERIOR.rows*EXTERIOR.columns)instances.push(o);});assert.equal(instances.length,6);assert.ok(EXTERIOR.groundSize/2>world.scene.fog.far*3);assert.ok(EXTERIOR.columns*EXTERIOR.spacing/2>world.scene.fog.far*2);for(let i=0;i<20;i++)world.tick(i);assert.ok(instances.every(o=>o.count===EXTERIOR.rows*EXTERIOR.columns));
});

test('every revealed interactive entity remains reachable along an unobstructed route',()=>{
  for(let level=0;level<5;level++){
    const {world}=fixture(level);const start=[world.camera.position.x,world.camera.position.z];
    for(const e of world.visibleEntities()){
      const p=new T.Box3().setFromObject(e.group).getCenter(new T.Vector3());
      const path=findPath(start,[p.x,p.z],world.bounds,world.blocks,a=>world.approachable(e,new T.Vector3(a[0],1.65,a[1])));
      assert.ok(path.length||world.near(e),`level ${level+1}: ${e.id} ${e.name} is unreachable`);
      assert.ok(path.every(a=>walkable(...a,world.bounds,world.blocks)));
    }
  }
});

test('small drawer items have a visible physical focus point and cannot be selected through a wall',()=>{
  const {world}=fixture(1),e=world.entities.find(e=>e.id==='key'),p=new T.Box3().setFromObject(e.group).getCenter(new T.Vector3());
  const path=findPath([0,5],[p.x,p.z],world.bounds,world.blocks,a=>world.near(e,new T.Vector3(a[0],1.65,a[1])));
  assert.ok(path.length);const end=path.at(-1),focus=world.focusPoint(e,new T.Vector3(end[0],1.65,end[1]));assert.ok(focus);assert.ok(new T.Box3().setFromObject(e.group).expandByScalar(.002).containsPoint(focus));
  const trigger=world.entities.find(e=>e.id==='trigger');assert.equal(world.near(trigger,new T.Vector3(-3.8,1.65,3)),false);
});

test('a long shadow drag cannot jump across another pedestal even with a free destination',()=>{
  const shadows=[{x:-2,z:0,angle:0},{x:0,z:0,angle:0},{x:3,z:-2,angle:0}];
  assert.equal(shadowPlacementFree(0,{x:2,z:0,angle:0},shadows),false);
});

test('chair navigation leaves room for the chair to move instead of parking the player in its destination',()=>{
  const {state,world}=fixture(2);state.levels[2].chair=false;world.sync();const e=world.entities.find(e=>e.id==='chair'),p=e.group.position;
  const path=findPath([0,5.9],[p.x,p.z],world.bounds,world.blocks,a=>world.approachable(e,new T.Vector3(a[0],1.65,a[1])));assert.ok(path.length);const end=path.at(-1);assert.equal(world.canApply({type:'CHAIR'},new T.Vector3(end[0],1.65,end[1])),true);
});

test('optical beams and grounded receivers align with the actual flashlight lens height',()=>{
  const {state,world}=fixture(3);state.levels[3].flashlight=true;state.levels[3].mirrors=[45,135,135];world.sync();const lens=world.entities.find(e=>e.id==='flashlight').group.getObjectByName('lens'),height=lens.getWorldPosition(new T.Vector3()).y;
  let beams=0,receivers=0;world.scene.traverse(o=>{if(o.isLine){beams++;near(o.geometry.attributes.position.getY(0),height);}if(o.name==='light-receiver'){receivers++;near(o.getWorldPosition(new T.Vector3()).y,height);}});assert.equal(beams,4);assert.equal(receivers,3);
});
