import * as T from './vendor/three.module.js';
import {surfaceMaterial,roundedBoxGeometry} from './surfaces.mjs';
import {createModel} from './models.mjs';
import {restOn,footprint} from './spatial.mjs';
const arrangements=[
 [['trunk',1.6,4.5],['shelf',5.15,-3.7],['plant',-5.35,-6.15],['armchair',3.7,4.5]],
 [['bench',2.55,4.8],['plant',2.75,-.7],['shelf',2.75,-7.8],['plant',-2.85,6.3]],
 [['sofa',-2.65,6.1],['coffee',-.8,3.8],['console',2.85,3.5],['shelf',5.2,-1.1],['plant',-5.4,1.7],['trunk',-2.65,-6.35],['armchair',-2.65,-2.3],['floorlamp',1.15,4.1]],
 [['sofa',-5.1,7.8],['bench',4.7,7.8],['shelf',-6.9,-8.6],['console',-2.4,-8.7],['plant',6.7,6.9],['floorlamp',-7,4]],
 [['sofa',-4.5,5.95],['shelf',5.05,6.1],['console',-4.75,-6.1],['plant',-5.35,1.7]]
];
export function buildDressing({root,bounds,level,blocks,track,entity,activate,textures}){
 const groups=[],interactions=[];
 for(const [kind,x,z]of arrangements[level]||[]){
  const g=new T.Group();g.position.set(x,0,z);g.userData.dressing=kind;root.add(g);
  const box=(size,pos,color,type='wood')=>{const m=new T.Mesh(roundedBoxGeometry(...size),surfaceMaterial(type,color));m.position.set(...pos);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  const sphere=(r,pos,color,scale=[1,1,1])=>{const m=new T.Mesh(new T.SphereGeometry(r,12,8),surfaceMaterial('fabric',color));m.position.set(...pos);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  const item=(id,pos,scale)=>{const m=createModel(id,textures);m.position.set(...pos);m.scale.setScalar(scale);g.add(m);restOn(m,pos[1]);return m;};
  let moving=null,name='留在原地的舊物';
  if(['sofa','armchair','bench'].includes(kind)){
   const w=kind==='sofa'?2.5:kind==='bench'?1.1:.95;
   for(const a of [-1,1])for(const b of [-1,1])box([.09,.22,.09],[a*(w/2-.13),.11,b*.32],'#685e51');
   box([w,.3,.88],[0,.36,0],'#827765');box([w,.75,.14],[0,.72,-.37],'#a09186','fabric');
   for(const a of [-1,1])box([.13,.49,.84],[a*(w/2-.06),.6,0],'#b19da1','fabric');
   for(let n=0;n<(kind==='sofa'?3:1);n++){const cx=(n-(kind==='sofa'?1:0))*(w-.35)/3;box([kind==='sofa'?.65:w-.28,.17,.68],[cx,.59,.02],'#c6b5bd','fabric');}
   moving=sphere(.24,[w*.21,.88,-.19],'#b5bdc7',[1,.95,.36]);moving.rotation.z=-.17;name=kind==='sofa'?'褪色的三人沙發':kind==='bench'?'走廊右側的候椅':'舊布面扶手椅';
  }else if(['shelf','console','trunk'].includes(kind)){
   const w=kind==='console'?1.3:kind==='trunk'?1.1:.8,h=kind==='shelf'?1.55:kind==='console'?.88:.58,d=kind==='shelf'?.55:.65;
   box([w,.1,d],[0,.05,0],'#89785f');box([w,.08,d],[0,h-.04,0],'#af9980');box([w,h-.12,.05],[0,h/2,-d/2+.025],'#786653');
   for(const a of [-1,1])box([.065,h,d],[a*(w-.065)/2,h/2,0],'#9d8970');
   if(kind==='shelf'){for(const y of [.48,.98])box([w-.1,.045,d-.06],[0,y,0],'#b09b80');for(let row=0;row<3;row++){const y=.1+row*.48;for(let n=0;n<3;n++){box([.11,.23+n*.035,.28],[-.23+n*.17,y+.13,0],['#9a929e','#839384','#bdac95'][n],'fabric');}}name='右側的舊書櫃';moving=g.children.at(-1);}
   else if(kind==='console'){box([w-.13,.5,.04],[0,.48,d/2],'#b4a089');for(const a of [-1,1])sphere(.03,[a*.24,.48,d/2+.035],'#ad9369');moving=item('radio',[0,h,0],.48);name='木櫃上的老式收音機';}
   else{box([w-.13,.35,.05],[0,.3,d/2],'#a18e77');box([.23,.06,.04],[0,.38,d/2+.04],'#ad9871');moving=item('book',[0,h,0],.62);name='收在木箱上的相簿';}
  }else if(kind==='coffee'){
   for(const a of [-1,1])for(const b of [-1,1])box([.055,.39,.055],[a*.48,.195,b*.23],'#97816c');box([1.15,.07,.64],[0,.425,0],'#c1a88a');moving=item('musicbox',[0,.46,0],.52);name='茶几上的音樂盒';
  }else if(kind==='floorlamp'){
   box([.45,.06,.45],[0,.03,0],'#9f8d72');box([.035,1.55,.035],[0,.81,0],'#ad9775');const shade=new T.Mesh(new T.CylinderGeometry(.2,.34,.46,24,1,true),surfaceMaterial('fabric','#d6c0b7',{side:T.DoubleSide}));shade.position.y=1.6;shade.castShadow=true;g.add(shade);moving=shade;name='落地燈';
  }else{
   const pot=new T.Mesh(new T.CylinderGeometry(.19,.14,.34,16),surfaceMaterial('stone','#b9a48e'));pot.position.y=.17;pot.castShadow=pot.receiveShadow=true;g.add(pot);sphere(.16,[0,.34,0],'#4e5540',[1,.2,1]);
   for(let n=0;n<9;n++){const angle=n*2.4,stem=new T.Mesh(new T.CylinderGeometry(.012,.016,.62,6),surfaceMaterial('wood','#6c7e54'));stem.position.set(Math.sin(angle)*.1,.6,Math.cos(angle)*.1);g.add(stem);sphere(.13,[Math.sin(angle)*.19,.77+n%3*.1,Math.cos(angle)*.19],'#7e9271',[.55,1.8,.35]);}name='被遺忘的盆栽';moving=g.children.at(-1);
  }
  if(kind==='sofa'||kind==='bench'&&level!==1)g.rotation.y=Math.PI;
  if(kind==='bench'&&level===1||kind==='shelf')g.rotation.y=x>0?-Math.PI/2:Math.PI/2;
  restOn(g,0);const block=footprint(g),overlap=blocks.some(b=>b.active!==false&&Math.abs(block.x-b.x)<(block.w+b.w)/2+.035&&Math.abs(block.z-b.z)<(block.d+b.d)/2+.035);
  if(overlap||block.x-block.w/2<bounds.minX+.1||block.x+block.w/2>bounds.maxX-.1||block.z-block.d/2<bounds.minZ+.2||block.z+block.d/2>bounds.maxZ-.1){root.remove(g);g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});continue;}
  track(g);groups.push(g);let active=false;
  const e=entity(`dressing-${groups.length}`,name,g,()=>{active=!active;if(moving) moving.rotation.z+=active?.065:-.065;activate({type:'DECOR',name,active,copy:active?'你碰了碰舊物，灰塵在光裡散開。這裡像剛有人離開。':'你讓它回到原本的位置。'});});e.decoration=true;interactions.push(e);
 }
 return {groups,interactions};
}
