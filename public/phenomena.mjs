import * as T from './vendor/three.module.js';
import {createModel,part} from './models.mjs';
import {restOn,footprint,mountOn} from './spatial.mjs';

const intersects=(a,b)=>b.active!==false&&Math.abs(a.x-b.x)<(a.w+b.w)/2+.04&&Math.abs(a.z-b.z)<(a.d+b.d)/2+.04;
export function buildPhenomena(root,bounds,level,existingBlocks,textures={}){
  const group=new T.Group();group.visible=false;group.userData.phenomena=true;root.add(group);
  const doll=createModel('wornDoll'),poses=[],dolls=[],blocks=[];
  for(let n=0;n<70&&poses.length<14;n++){
    const x=bounds.maxX-.46-(n%3)*.09,z=bounds.minZ+1.2+(n*.91)%(bounds.maxZ-bounds.minZ-2.4);
    doll.position.set(x,0,z);doll.rotation.set(n%4===0?Math.PI/2:0,n*1.73,n%5===0?.35:0);doll.scale.setScalar(.38+(n%3)*.045);restOn(doll,.012);
    const block=footprint(doll);if([...existingBlocks,...blocks].some(b=>intersects(block,b)))continue;
    poses.push(doll.matrixWorld.clone());dolls.push(new T.Box3().setFromObject(doll).clone());blocks.push({...block,active:true});
  }
  // Repeat the detailed doll in fixed instance batches rather than hundreds of draw calls.
  const inverse=doll.matrixWorld.clone().invert();doll.traverse(o=>{
    if(!o.isMesh)return;const local=inverse.clone().multiply(o.matrixWorld),batch=new T.InstancedMesh(o.geometry,o.material,poses.length);
    for(let i=0;i<poses.length;i++)batch.setMatrixAt(i,poses[i].clone().multiply(local));batch.instanceMatrix.needsUpdate=true;batch.castShadow=false;batch.receiveShadow=true;batch.userData.wornDolls=true;group.add(batch);
  });
  blocks.forEach(b=>b.active=false);
  // Flaked paint sits on an intact, opaque wall; these are surface layers, not holes.
  for(let n=0;n<22;n++){
    const patch=new T.Group();group.add(patch);const shape=new T.Shape();
    for(let k=0;k<9;k++){const a=k/8*Math.PI*2,r=.3+Math.sin(k*2.3+n)*.09,x=Math.cos(a)*r,y=Math.sin(a)*r*1.4;k?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();
    part(patch,new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false}),n%2?'#655d53':'#8d8472');
    const flake=part(patch,new T.PlaneGeometry(.2,.16),'#a9a89a',[.14,.12,.027],{side:T.DoubleSide});flake.rotation.y=-.28;
    patch.position.set(bounds.maxX-.1,1.1+(n%4)*.73,bounds.minZ+.8+(n*1.61)%(bounds.maxZ-bounds.minZ-1.6));patch.rotation.y=-Math.PI/2;mountOn(patch,'x',bounds.maxX-.1,-1);
  }
  const x=level===1?-1.7:3.8,z=level===1?-11:1.8;
  const cabinet=createModel('cabinet',textures);cabinet.rotation.z=Math.PI;cabinet.scale.setScalar(.78);cabinet.position.set(x,0,z);group.add(cabinet);
  cabinet.position.y=4.3-new T.Box3().setFromObject(cabinet).max.y;cabinet.userData.ceilingFixed=true;
  part(group,new T.BoxGeometry(1.3,.1,1.1),'#5c5b51',[x,4.72,z]);
  for(const dx of [-.42,.42])for(const dz of [-.3,.3])part(group,new T.CylinderGeometry(.022,.022,.42,8),'#74746a',[x+dx,4.51,z+dz]);
  return {group,blocks,dolls,dollCount:poses.length,setVisible(value){group.visible=value;blocks.forEach(b=>b.active=value);}};
}
