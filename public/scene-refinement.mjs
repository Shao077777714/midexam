import * as T from './vendor/three.module.js';
import {surfaceMaterial} from './surfaces.mjs';

// Presentation only: no entities, colliders, lights, timers or puzzle state.
// Small details share instanced geometry; they never cast onto the shadow puzzle.
const themes=[
  {name:'childhood-bedroom',wood:'#b79583',trim:'#e4d0bd',cloth:'#b69ba9',metal:'#b69a68'},
  {name:'remembered-corridor',wood:'#93a795',trim:'#d8dbbd',cloth:'#9aaea2',metal:'#b9a275'},
  {name:'family-dining-room',wood:'#92735e',trim:'#dfc5a3',cloth:'#a77578',metal:'#b99b66'},
  {name:'fathers-empty-room',wood:'#877b6b',trim:'#bcb8a3',cloth:'#89938b',metal:'#aa9670'},
  {name:'room-before-dawn',wood:'#a69c84',trim:'#d8d5be',cloth:'#b6afa3',metal:'#bfa779'}
];

export function buildSceneRefinement({root,bounds,level,entities,eyes=[]}){
  if(level===5)return {group:null,sync(){}};
  const theme=themes[level],group=new T.Group();
  group.name='scene-refinement';group.userData.refinement=theme.name;group.userData.nonOccluding=true;root.add(group);
  root.updateMatrixWorld(true);
  const reserved=entities.filter(e=>!e.id.startsWith('dressing-')).map(e=>new T.Box3().setFromObject(e.group).expandByScalar(.085));
  root.traverse(o=>{if(o.userData.shadowTarget)reserved.push(new T.Box3().setFromObject(o).expandByScalar(.04));});
  for(const {eye}of eyes)reserved.push(new T.Box3().setFromObject(eye).expandByScalar(.04));
  const batches=new Map(),dummy=new T.Object3D();
  function box(kind,size,pos,color,{clear=true,rotation=0}={}){
    const boxBounds=new T.Box3(new T.Vector3(...pos).addScaledVector(new T.Vector3(...size),-.5),new T.Vector3(...pos).addScaledVector(new T.Vector3(...size),.5));
    if(clear&&reserved.some(r=>r.intersectsBox(boxBounds)))return;
    if(!batches.has(kind))batches.set(kind,[]);
    batches.get(kind).push({size,pos,color,rotation});
  }
  const w=bounds.maxX-bounds.minX,d=bounds.maxZ-bounds.minZ,cz=(bounds.maxZ+bounds.minZ)/2;
  // Layered cornices and recessed ceiling strips stay above all traversable space.
  for(const side of [-1,1]){
    const x=side<0?bounds.minX:bounds.maxX;
    for(const [offset,y,h,tint]of [[.16,4.62,.075,theme.wood],[.19,4.7,.09,theme.trim],[.25,4.765,.035,'#eee3ce']])
      box('wood',[.09,h,d-.18],[x-side*offset,y,cz],tint,{clear:false});
  }
  for(const z of [bounds.minZ+.19,bounds.maxZ-.19]){
    box('wood',[w-.34,.09,.095],[0,4.7,z],theme.trim,{clear:false});
    box('metal',[w-.48,.012,.018],[0,4.635,z+.055],theme.metal,{clear:false});
  }
  // Repeating joinery on the solid side; mounted clues and eyes get clear margins.
  const panelWidth=level===1?1.45:1.15;
  for(let z=bounds.minZ+.8;z<bounds.maxZ-.5;z+=panelWidth){
    const x=bounds.maxX-.13;
    box('wood',[.025,.64,panelWidth-.2],[x,.63,z],theme.wood);
    for(const y of [.31,.95])box('metal',[.012,.015,panelWidth-.29],[x-.017,y,z],theme.metal);
    for(const edge of [-1,1])box('wood',[.035,.7,.035],[x-.012,.63,z+edge*(panelWidth-.2)/2],theme.trim);
  }
  // Each ceiling fixture has a backing, visible housing and louvres, without extra lights.
  for(let z=bounds.minZ+2;z<bounds.maxZ;z+=4){
    box('metal',[1.94,.045,.44],[0,4.75,z],theme.metal,{clear:false});
    for(const side of [-1,1])box('wood',[1.9,.065,.035],[0,4.69,z+side*.19],theme.trim,{clear:false});
    for(let x=-.72;x<=.73;x+=.24)box('metal',[.014,.026,.32],[x,4.682,z],'#9f9b83',{clear:false});
  }
  // Thin rugs are part of the floor finish. They stay below ground-level task props.
  function rug(cx,cz,rw,rd,color){
    box('fabric',[rw,.004,rd],[cx,.002,cz],color,{clear:false});
    for(const edge of [-1,1]){
      box('fabric',[.045,.001,rd-.14],[cx+edge*(rw/2-.09),.0046,cz],theme.trim,{clear:false});
      box('fabric',[rw-.14,.001,.045],[cx,.0046,cz+edge*(rd/2-.09)],theme.trim,{clear:false});
    }
    // Woven hem, not a clue, label, loose object or additional interaction.
    for(let x=cx-rw/2+.14;x<cx+rw/2-.1;x+=.11)for(const edge of [-1,1])
      box('fabric',[.013,.001,.045],[x,.0047,cz+edge*(rd/2-.04)],theme.trim,{clear:false});
  }
  if(level===0)rug(-3.35,3.5,3.7,4.4,theme.cloth);
  if(level===2)rug(0,.1,4.3,3.4,theme.cloth);
  if(level===3)rug(-5.1,7.75,3.1,1.45,theme.cloth);
  if(level===4)rug(3.8,2.8,2.25,1.5,theme.cloth);
  if(level===0){
    // Quilt stitching lies on the existing duvet, inside the bed's solid footprint.
    for(const side of [-1,1])box('fabric',[.014,.007,2.35],[-3.7+side*1.18,1.094,4.2],'#e5d0c6',{clear:false});
    for(let z=3.15;z<5.3;z+=.28)box('fabric',[2.34,.006,.009],[-3.7,1.093,z],'#ded2d4',{clear:false});
    for(let x=-4.75;x<-2.6;x+=.3)box('fabric',[.009,.006,2.3],[x,1.093,4.2],'#a7b6c7',{clear:false});
  }
  if(level===2){
    // All three places remain set. The missing person is carried by the story,
    // rather than adding another puzzle object or hiding an existing photo piece.
    for(const [x,z]of [[-1.25,.5],[1.25,.5],[0,-.6]]){
      box('fabric',[.78,.004,.68],[x,1.077,z],'#cbb09a',{clear:false});
      for(const side of [-1,1])box('fabric',[.012,.001,.61],[x+side*.35,1.0795,z],'#eee0bd',{clear:false});
      box('fabric',[.14,.025,.22],[x+.44,1.088,z+.12],'#c3c7b5',{clear:false});
      box('fabric',[.11,.009,.19],[x+.44,1.104,z+.12],'#e0dbbd',{clear:false});
    }
  }
  if(level===4){
    // Brushed trim and ventilation stay on the existing projector plinth.
    for(const y of [.12,.68])box('metal',[3.65,.018,.012],[0,y,-.494],theme.metal,{clear:false});
    for(let x=-1.65;x<1.7;x+=.12)box('wood',[.032,.13,.006],[x,.31,-.495],'#505950',{clear:false});
    for(const side of [-1,1])box('metal',[.012,.59,1.86],[side*1.893,.4,-1.5],theme.metal,{clear:false});
  }
  if(level===1){
    // Door surrounds repeat into the vanishing point, with bevel-like inset layers.
    for(let n=0;n<4;n++){
      const z=1-n*3.5;
      for(const edge of [-1,1]){
        box('wood',[.045,3.04,.065],[3.175,1.52,z+edge*.72],theme.trim);
        box('metal',[.012,2.8,.014],[3.145,1.53,z+edge*.65],theme.metal);
      }
      box('wood',[.055,.09,1.52],[3.17,3.08,z],theme.trim);
    }
  }
  // Refine existing furniture within its original footprint. Nothing new occupies a route.
  for(const e of entities.filter(e=>e.id.startsWith('dressing-'))){
    const g=e.group,kind=g.userData.dressing,local=new T.Object3D();
    function detail(size,pos,color,material='metal'){
      g.updateWorldMatrix(true,false);local.position.set(...pos);local.updateMatrix();const m=g.matrixWorld.clone().multiply(local.matrix),worldPos=new T.Vector3().setFromMatrixPosition(m);
      const sizeWorld=Math.abs(g.rotation.y)>.5?[size[2],size[1],size[0]]:size;
      box(material,sizeWorld,worldPos.toArray(),color,{clear:false});
    }
    if(['sofa','armchair','bench'].includes(kind)){
      const fw=kind==='sofa'?2.5:kind==='bench'?1.1:.95;
      for(const z of [-.28,.31])detail([fw-.36,.009,.009],[0,.677,z],theme.trim,'fabric');
      for(let x=-fw/2+.2;x<fw/2-.18;x+=.1)detail([.024,.009,.008],[x,.678,.315],theme.trim,'fabric');
      for(const side of [-1,1])detail([.045,.18,.04],[side*(fw/2-.13),.115,.32],theme.metal);
    }
    if(['console','trunk','shelf'].includes(kind)){
      const fw=kind==='console'?1.3:kind==='trunk'?1.1:.8,fh=kind==='shelf'?1.55:kind==='console'?.88:.58;
      for(const side of [-1,1])detail([.018,fh-.17,.012],[side*(fw/2-.09),fh/2,kind==='shelf'?.265:.32],theme.metal);
      for(const y of [.12,fh-.12])detail([fw-.2,.015,.014],[0,y,kind==='shelf'?.265:.32],theme.trim,'wood');
    }
  }
  for(const [kind,parts]of batches){
    const material=surfaceMaterial(kind==='metal'?'wood':kind,'#ffffff',{roughness:kind==='metal'?.36:.92,metalness:kind==='metal'?.7:0});
    const batch=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,parts.length);
    batch.name=`refinement-${kind}`;batch.userData.refinementBatch=true;batch.castShadow=false;batch.receiveShadow=true;group.add(batch);
    for(let i=0;i<parts.length;i++){const p=parts[i];dummy.position.set(...p.pos);dummy.rotation.set(0,p.rotation,0);dummy.scale.set(...p.size);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);batch.setColorAt(i,new T.Color(p.color));}
    batch.computeBoundingBox();batch.computeBoundingSphere();
  }
  group.userData.detailCount=[...batches.values()].reduce((n,a)=>n+a.length,0);
  // Static material tint changes once on world switches; no per-frame scene allocation.
  return {group,sync(weird){group.traverse(o=>{if(o.isInstancedMesh)o.material.color.set(weird?'#b5c6bd':'#ffffff');});}};
}
