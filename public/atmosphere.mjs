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

export function buildEyes(root,bounds,textures={}) {
  const group=new T.Group(),pupils=[];root.add(group);group.visible=false;
  const locations=[];
  for(let i=0;i<5;i++)locations.push({axis:'x',surface:bounds.maxX-.1,normal:-1,pos:[bounds.maxX-.1,3.65+(i%2)*.22,bounds.minZ+1.3+i*(bounds.maxZ-bounds.minZ-2.6)/4]});
  for(const x of [-4.4,-2.4,0,2.4,4.4].filter(x=>Math.abs(x)<bounds.maxX-.3))locations.push({axis:'z',surface:bounds.minZ+.1,normal:1,pos:[x,4.05,bounds.minZ+.1]});
  for(let i=0;i<12;i++)locations.push({axis:'x',surface:bounds.maxX-.1,normal:-1,pos:[bounds.maxX-.1,1.55+(i%2)*1.05,bounds.minZ+1.2+i*(bounds.maxZ-bounds.minZ-2.4)/11],small:true});
  for(let i=0;i<5;i++)locations.push({axis:'z',surface:bounds.maxZ-.1,normal:-1,pos:[(i-2)*(bounds.maxX>4?2.15:1.15),3.05,bounds.maxZ-.1],small:true});
  locations.forEach(({axis,surface,normal,pos,small},i)=>{
    const eye=new T.Group();group.add(eye);eye.position.set(...pos);if(axis==='x')eye.rotation.y=-Math.PI/2;else if(normal<0)eye.rotation.y=Math.PI;
    const tissue=part(eye,new T.SphereGeometry(.46,24,16),'#96766e',[0,0,.015],{roughness:.28});tissue.scale.set(1.5,.62,.23);
    part(eye,new T.BoxGeometry(.85,.24,.025),'#6a514b',[0,0,-.09]);
    const membrane=part(eye,new T.PlaneGeometry(1.9,1.9),'#fff',[0,0,.14],{map:textures.organic||null,emissiveMap:textures.organic||null,emissive:'#ffffff',emissiveIntensity:.2,transparent:true,alphaTest:.12,roughness:.18,depthWrite:true});
    membrane.userData.organicEye=true;membrane.castShadow=false;
    for(let k=0;k<7;k++){
      const points=Array.from({length:9},(_,n)=>new T.Vector3(-.58+n*.145,Math.sin(n*.8+k)*.018+(k-3)*.055,.113));
      part(eye,new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.0035,4,false),'#763b3d',[0,0,0],{roughness:.25});
    }
    const iris=new T.Group();iris.position.z=.148;eye.add(iris);
    const disk=part(iris,new T.CylinderGeometry(.14,.14,.008,32),'#403e26',[0,0,0],{roughness:.35});disk.rotation.x=Math.PI/2;
    const pupil=part(iris,new T.SphereGeometry(.105,20,12),'#111b1b',[0,0,.024],{roughness:.15});pupil.scale.z=.35;
    const glint=part(iris,new T.SphereGeometry(.023,10,6),'#dce5d3',[-.04,.05,.063]);glint.castShadow=false;
    eye.scale.setScalar(small?.43+(i%3)*.08:.9+(i%3)*.23);mountOn(eye,axis,surface,normal);pupils.push({eye,iris});
  });
  return {group,pupils,tick(camera,time,reducedMotion=false){
    if(!group.visible)return;
    for(const {eye,iris} of pupils){const p=eye.worldToLocal(camera.position.clone());iris.position.x=T.MathUtils.clamp(p.x*.022,-.12,.12);iris.position.y=T.MathUtils.clamp(p.y*.025,-.075,.075);if(!reducedMotion)iris.scale.y=.94+Math.sin(time*.7)*.06;}
  }};
}


export function buildFlood(root,bounds,level){
  const group=new T.Group();group.userData.nonOccluding=true;group.userData.flood=true;root.add(group);group.visible=false;
  const width=bounds.maxX-bounds.minX-.22,depth=bounds.maxZ-bounds.minZ-.22,height=level===1?.34:.43;
  const geo=new T.PlaneGeometry(width,depth,28,48);geo.rotateX(-Math.PI/2);
  const water=new T.Mesh(geo,new T.MeshPhysicalMaterial({color:'#82aaa6',emissive:'#315f65',emissiveIntensity:.42,metalness:.08,roughness:.12,transparent:true,opacity:.7,clearcoat:1,clearcoatRoughness:.09,depthWrite:false,side:T.DoubleSide}));
  water.position.set(0,height,(bounds.minZ+bounds.maxZ)/2);water.receiveShadow=true;group.add(water);
  // A visible tide line and thin highlights make the rise readable without hiding the clues.
  for(const x of [bounds.minX+.11,bounds.maxX-.11])part(group,new T.BoxGeometry(.018,.035,depth),'#9eafa0',[x,height,(bounds.minZ+bounds.maxZ)/2],{transparent:true,opacity:.7});
  for(let z=bounds.minZ+2;z<bounds.maxZ;z+=4)for(let line=0;line<3;line++){
    const points=Array.from({length:12},(_,n)=>new T.Vector3(-.72+n*.13,height+.014,z+line*.065+Math.sin(n*.9+line)*.035));
    const gleam=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.009,4,false),new T.MeshBasicMaterial({color:'#d4dfc8',transparent:true,opacity:.3,depthWrite:false}));group.add(gleam);
  }
  const highlights=[];for(let i=0;i<16;i++){
    const ring=new T.Mesh(new T.RingGeometry(.25+i%3*.12,.26+i%3*.12,40),new T.MeshBasicMaterial({color:'#c1cfc3',transparent:true,opacity:.2,side:T.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.set(Math.sin(i*4.3)*(width/2-.5),height+.013,bounds.minZ+.5+(i*.7%1)*(depth-1));group.add(ring);highlights.push(ring);
  }
  return {group,water,height,tick(time,reduced=false){if(!group.visible)return;const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,reduced?0:Math.sin(p.getX(i)*2.1+time*.8)*.013+Math.cos(p.getZ(i)*1.4-time*.5)*.009);p.needsUpdate=true;if(!reduced)highlights.forEach((r,i)=>r.scale.setScalar(1+Math.sin(time*.5+i)*.18));}};
}
