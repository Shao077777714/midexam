import * as T from './vendor/three.module.js';
import {part} from './models.mjs';
import {mountOn} from './spatial.mjs';

export const EXTERIOR = {rows:6, columns:128, spacing:9, groundSize:2400, fogEnd:180};

export function buildExterior(root, textures={}) {
  const group=new T.Group();group.userData.exterior=true;root.add(group);
  const ground=part(group,new T.BoxGeometry(EXTERIOR.groundSize,.1,EXTERIOR.groundSize),'#b0c19a',[-400,-.08,0],{map:textures.grass||null});ground.castShadow=false;
  for(const [x,w,color,map] of [[-12,5.5,'#a496b0',textures.road],[-8.6,1.15,'#dfd6c4',null],[-15.4,1.15,'#dfd6c4',null]]){
    const m=part(group,new T.BoxGeometry(w,.035,EXTERIOR.groundSize),color,[x,.012,0],{map:map||null});m.castShadow=false;
  }
  const roofShape=new T.Shape();roofShape.moveTo(-2.4,0);roofShape.lineTo(0,1.7);roofShape.lineTo(2.4,0);roofShape.closePath();
  const count=EXTERIOR.rows*EXTERIOR.columns, palette=['#d3a4b5','#b6c9a6','#d9c38f','#abbfc8','#d8af96'];
  const specs=[
    [new T.BoxGeometry(4.6,3.9,4.8),new T.MeshStandardMaterial({color:'#ffffff',map:textures.siding||null,roughness:.9}),[0,1.95,0]],
    [new T.ExtrudeGeometry(roofShape,{depth:5.15,bevelEnabled:false}),new T.MeshStandardMaterial({color:'#8d8793',roughness:.9}),[0,3.9,-2.575]],
    [new T.BoxGeometry(.95,1.9,.1),new T.MeshStandardMaterial({color:'#f1e3d0'}),[0,.95,2.43]],
    [new T.BoxGeometry(.85,1.1,.12),new T.MeshStandardMaterial({color:'#cbdad6',roughness:.24}),[-1.35,2.25,2.44]],
    [new T.BoxGeometry(.85,1.1,.12),new T.MeshStandardMaterial({color:'#cbdad6',roughness:.24}),[1.35,2.25,2.44]],
    [new T.BoxGeometry(.55,1.2,.55),new T.MeshStandardMaterial({color:'#aeb0a7'}),[1.25,4.8,-.8]]
  ];
  const dummy=new T.Object3D(),color=new T.Color();
  specs.forEach(([geometry,material,offset],partIndex)=>{
    const instances=new T.InstancedMesh(geometry,material,count);instances.castShadow=false;instances.receiveShadow=true;
    for(let row=0;row<EXTERIOR.rows;row++)for(let column=0;column<EXTERIOR.columns;column++){
      const i=row*EXTERIOR.columns+column;
      // Facades face the street; repeated rows continue far beyond the camera and fog.
      dummy.position.set(-21-row*10+offset[2],offset[1],(column-EXTERIOR.columns/2)*EXTERIOR.spacing+(row%2)*4-offset[0]);
      dummy.rotation.set(0,Math.PI/2,0);dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);
      if(partIndex===0)instances.setColorAt(i,color.set(palette[(column+row)%palette.length]));
    }
    instances.instanceMatrix.needsUpdate=true;group.add(instances);
  });
  return group;
}

export function buildEyes(root,bounds) {
  const group=new T.Group(),pupils=[];root.add(group);group.visible=false;
  const locations=[];
  for(let i=0;i<5;i++)locations.push({axis:'x',surface:bounds.maxX-.1,normal:-1,pos:[bounds.maxX-.1,3.65+(i%2)*.22,bounds.minZ+1.3+i*(bounds.maxZ-bounds.minZ-2.6)/4]});
  for(const x of [-4.4,-2.4,0,2.4,4.4].filter(x=>Math.abs(x)<bounds.maxX-.3))locations.push({axis:'z',surface:bounds.minZ+.1,normal:1,pos:[x,4.05,bounds.minZ+.1]});
  locations.forEach(({axis,surface,normal,pos},i)=>{
    const eye=new T.Group();group.add(eye);eye.position.set(...pos);if(axis==='x')eye.rotation.y=-Math.PI/2;
    const white=part(eye,new T.SphereGeometry(.46,24,12),'#d4d6c5',[0,0,.015],{roughness:.65});white.scale.set(1.3,.54,.22);
    // The flattened globe is embedded into the wall, with an opaque back and depth-tested pupil.
    part(eye,new T.BoxGeometry(.85,.24,.025),'#b2bbad',[0,0,-.08]);
    const iris=new T.Group();iris.position.z=.115;eye.add(iris);
    const disk=part(iris,new T.CylinderGeometry(.17,.17,.018,32),'#697b72',[0,0,0],{roughness:.35});disk.rotation.x=Math.PI/2;
    const pupil=part(iris,new T.SphereGeometry(.112,20,12),'#111b1b',[0,0,.024],{roughness:.15});pupil.scale.z=.35;
    const glint=part(iris,new T.SphereGeometry(.023,10,6),'#dce5d3',[-.04,.05,.063]);glint.castShadow=false;
    eye.scale.setScalar(.72+(i%3)*.17);mountOn(eye,axis,surface,normal);pupils.push({eye,iris});
  });
  return {group,pupils,tick(camera,time,reducedMotion=false){
    if(!group.visible)return;
    for(const {eye,iris} of pupils){const p=eye.worldToLocal(camera.position.clone());iris.position.x=T.MathUtils.clamp(p.x*.022,-.12,.12);iris.position.y=T.MathUtils.clamp(p.y*.025,-.075,.075);if(!reducedMotion)iris.scale.y=.94+Math.sin(time*.7)*.06;}
  }};
}
