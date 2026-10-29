import * as T from './vendor/three.module.js';

const material = (color, options={}) => new T.MeshStandardMaterial({color,roughness:.72,...options});
export function part(parent, geometry, color, pos=[0,0,0], options={}) {
  const m = new T.Mesh(geometry,material(color,options)); m.position.set(...pos);
  m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
const cube=(g,size,pos,color,options)=>part(g,new T.BoxGeometry(...size),color,pos,options);
const sphere=(g,r,pos,color,scale=[1,1,1],options)=>{const m=part(g,new T.SphereGeometry(r,24,16),color,pos,options);m.scale.set(...scale);return m;};
const cyl=(g,r1,r2,h,pos,color,options)=>part(g,new T.CylinderGeometry(r1,r2,h,32),color,pos,options);
const ring=(g,r,t,pos,color)=>part(g,new T.TorusGeometry(r,t,8,32),color,pos,{metalness:.65,roughness:.3});

export function emblem(kind, color='#b99b61') {
  const g=new T.Group(); g.userData.emblem=kind;
  if(kind==='moon'){
    const shape=new T.Shape();shape.absarc(0,0,.32,-Math.PI*.5,Math.PI*.5,false);shape.absarc(.14,0,.25,Math.PI*.5,Math.PI*1.5,true);
    part(g,new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:2,steps:1}),color);
  }else if(kind==='wave'){
    for(let i=0;i<5;i++)cube(g,[.045,.15+Math.sin(i*Math.PI/4)*.43,.045],[(i-2)*.1,0,0],color);
  }else if(kind==='frame'||kind==='mirror'){
    cube(g,[.57,.045,.05],[0,.25,0],color);cube(g,[.57,.045,.05],[0,-.25,0],color);
    for(const x of [-.265,.265])cube(g,[.045,.5,.05],[x,0,0],color);
    if(kind==='mirror')cube(g,[.47,.43,.025],[0,0,0],'#a9c7bd',{metalness:.85,roughness:.12});
  }else if(kind==='house'){
    cube(g,[.48,.32,.045],[0,-.08,0],color);const roof=new T.Shape();roof.moveTo(-.32,.08);roof.lineTo(0,.38);roof.lineTo(.32,.08);roof.closePath();
    part(g,new T.ExtrudeGeometry(roof,{depth:.045,bevelEnabled:false}),color);cube(g,[.09,.19,.055],[0,-.145,.025],'#e9dcc5');
  }else if(kind==='envelope'){
    cube(g,[.6,.38,.04],[0,0,0],color);const a=cube(g,[.35,.025,.04],[-.13,.045,.035],'#e5ddc9');a.rotation.z=-.53;const b=cube(g,[.35,.025,.04],[.13,.045,.035],'#e5ddc9');b.rotation.z=.53;
  }else if(kind==='family'){
    for(const [x,y,r] of [[-.19,.1,.09],[.17,.1,.09],[0,-.04,.065]]){sphere(g,r,[x,y,0],color,[1,1,.3]);cube(g,[r*1.5,r*1.8,.045],[x,y-r*1.7,0],color);}
  }else if(kind==='work'){
    cube(g,[.55,.34,.05],[0,-.05,0],color);const h=ring(g,.1,.025,[0,.17,0],color);h.scale.y=.6;
  }else if(kind==='self'){
    sphere(g,.11,[0,.16,0],color,[1,1,.35]);sphere(g,.19,[0,-.12,0],color,[1,.9,.3]);
  }else if(kind==='exit'){
    for(const x of [-.22,.22])cube(g,[.06,.65,.055],[x,0,0],color);cube(g,[.5,.06,.055],[0,.33,0],color);
  }else{const n=Number(kind)||3;for(let i=0;i<n;i++)sphere(g,.035,[(i-(n-1)/2)*.11,0,0],color,[1,1,.4]);}
  return g;
}

function letterTexture() {
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=512;c.height=640;const ctx=c.getContext('2d');
  ctx.fillStyle='#eee3cb';ctx.fillRect(0,0,512,640);ctx.fillStyle='#635247';ctx.font='24px "Microsoft JhengHei",sans-serif';
  ['給那個一直在逃避的自己：','','這一次，','請讓那些未說出口的話，','找到回家的路。','','我願意，重新開始。'].forEach((s,i)=>ctx.fillText(s,50,90+i*55));
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}

export function setPhotoMood(root,corrupted=false){
  root.traverse(o=>{if(o.userData.photoMaps)o.material.map=o.userData.photoMaps[corrupted?'horror':'aged'];});
}
function photoMaps(mesh,textures,n=null){
  const maps={};for(const [key,source] of [['aged',textures.family],['horror',textures.corrupt||textures.family]]){
    const t=n===null?source:source?.clone();if(t&&n!==null){t.repeat.set(1/3,1/3);t.offset.set((n%3)/3,(2-Math.floor(n/3))/3);t.needsUpdate=true;}maps[key]=t||null;
  }mesh.userData.photoMaps=maps;mesh.material.map=maps.aged;return mesh;
}
export function createModel(kind, textures={}) {
  const g=new T.Group();g.userData.kind=kind;
  if(kind==='moon'){
    cyl(g,.24,.28,.1,[0,.05,0],'#bba275',{metalness:.7});const moon=emblem('moon','#efd490');moon.scale.setScalar(1.65);moon.position.set(-.06,.65,0);g.add(moon);
    cyl(g,.025,.025,.32,[0,.25,0],'#a28f6d');
  }else if(kind==='rabbit'){
    sphere(g,.29,[0,.39,0],'#ead4d6',[.92,1.15,.8]);sphere(g,.25,[0,.82,.015],'#f0deda');
    for(const x of [-.12,.12]){sphere(g,.11,[x,1.1,0],'#efdcda',[.7,2.15,.8]);sphere(g,.07,[x,1.1,.076],'#cf9fba',[.5,2.3,.35]);sphere(g,.13,[x,.11,.1],'#ead4d6',[.9,.85,1.45]);}
    for(const x of [-.09,.09]){sphere(g,.025,[x,.86,.245],'#3e3541',[1,1,.4]);sphere(g,.008,[x-.006,.87,.258],'#fff');}
    sphere(g,.026,[0,.78,.26],'#b07d8d',[1,.7,.6]);sphere(g,.1,[0,.37,-.24],'#efe4db');
    const bow1=sphere(g,.09,[-.09,.62,.22],'#b7bbc9',[1,.55,.35]);const bow2=sphere(g,.09,[.09,.62,.22],'#b7bbc9',[1,.55,.35]);sphere(g,.035,[0,.62,.24],'#aaa7bf');
    for(const x of [-.29,.29])sphere(g,.1,[x,.44,.03],'#e8cfd2',[.7,1.25,.7]);
  }else if(kind==='vase'){
    const points=[[0,0],[.18,0],[.27,.08],[.3,.27],[.22,.48],[.12,.6],[.12,.73],[.16,.76]].map(([x,y])=>new T.Vector2(x,y));
    part(g,new T.LatheGeometry(points,32),'#abc3b6');const lip=ring(g,.145,.018,[0,.76,0],'#d6c6a2');lip.rotation.x=Math.PI/2;
    for(let i=0;i<5;i++){const a=i*2.4,x=Math.sin(a)*.18,z=Math.cos(a)*.16;const stem=cyl(g,.009,.009,.5,[x*.5,.92,z*.5],'#718b67');stem.rotation.z=-x*.8;
      for(let p=0;p<5;p++)sphere(g,.046,[x+Math.sin(p*1.256)*.065,1.18+Math.cos(p*1.256)*.065,z],i%2?'#b5a4d2':'#e7b7c9',[1,1,.7]);sphere(g,.032,[x,1.18,z+.02],'#d4b776');}
  }else if(kind==='key'){
    const r=ring(g,.14,.027,[0,.034,-.18],'#b99555');r.rotation.x=Math.PI/2;
    cube(g,[.045,.045,.38],[0,.034,.08],'#c4a163',{metalness:.8});cube(g,[.12,.045,.04],[.04,.034,.23],'#bd9955',{metalness:.8});cube(g,[.09,.045,.04],[.03,.034,.13],'#bd9955',{metalness:.8});
  }else if(kind==='phone'){
    cube(g,[.32,.065,.61],[0,.033,0],'#44464c',{roughness:.3});cube(g,[.278,.009,.48],[0,.071,-.015],'#627f80',{roughness:.2,emissive:'#24404a',emissiveIntensity:.35});
    cube(g,[.07,.009,.012],[0,.073,-.27],'#272f34');cyl(g,.015,.015,.006,[0,.075,.26],'#879491');
    for(let i=0;i<3;i++){const r=ring(g,.03+i*.025,.008,[0,.08,0],'#d7e1d6');r.rotation.x=Math.PI/2;}
  }else if(kind==='flashlight'){
    const b=cyl(g,.085,.085,.43,[0,.12,0],'#6d7972',{metalness:.5,roughness:.4});b.rotation.x=Math.PI/2;
    const lens=cyl(g,.13,.1,.11,[0,.12,-.25],'#c8bea5',{metalness:.7});lens.rotation.x=Math.PI/2;
    const glass=cyl(g,.105,.105,.014,[0,.12,-.313],'#e7e4c8',{emissive:'#e7dfa5',emissiveIntensity:.4});glass.rotation.x=Math.PI/2;glass.name='lens';
    for(const z of [-.1,-.02,.06,.14]){const r=ring(g,.087,.008,[0,.12,z],'#a6afa7');}cube(g,[.05,.028,.08],[0,.216,.1],'#c1a478');
  }else if(kind.startsWith('memory')){
    cyl(g,.23,.27,.09,[0,.045,0],'#b4a08a',{metalness:.6});const gem=part(g,new T.IcosahedronGeometry(.17,0),'#d4dbc3',[0,.23,0],{metalness:.35,roughness:.14});
    const icon=emblem(['moon','wave','frame','mirror'][Number(kind.slice(6))||0],'#667b71');icon.scale.setScalar(.45);icon.position.set(0,.23,.16);g.add(icon);
  }else if(/^p[0-8]$/.test(kind)){
    const n=Number(kind[1]);cube(g,[.54,.022,.54],[0,.011,0],'#b4a18a');
    const m=photoMaps(part(g,new T.PlaneGeometry(.53,.53),'#fff',[0,.024,0]),textures,n);m.rotation.x=-Math.PI/2;
  }else if(kind==='drawing'){
    cube(g,[.66,.012,.77],[0,.006,0],'#e7dfc0');const art=new T.Group();art.rotation.x=-Math.PI/2;art.position.set(0,.015,0);g.add(art);
    const house=emblem('house','#bf8f84');house.scale.setScalar(.52);house.position.set(-.08,-.07,0);art.add(house);sphere(art,.055,[.21,.25,.015],'#d8b56c',[1,1,.08]);
    const family=emblem('family','#8ea9b4');family.scale.setScalar(.4);family.position.set(.12,-.17,.015);art.add(family);
  }else if(kind==='photo'){
    cube(g,[1.55,1.4,.1],[0,.7,0],'#7d604e');cube(g,[1.4,1.25,.025],[0,.7,.061],'#d9c6a1',{metalness:.55});
    photoMaps(part(g,new T.PlaneGeometry(1.3,1.14),'#fff',[0,.7,.078],{roughness:.65}),textures);cube(g,[1.35,1.2,.018],[0,.7,-.059],'#8f7866');
  }else if(['letter','notice','consult','help'].includes(kind)){
    cube(g,[.53,.018,.72],[0,.009,0],'#e5d8ba');const page=part(g,new T.PlaneGeometry(.5,.69),'#eee3cb',[0,.02,0],{map:['letter','help'].includes(kind)?letterTexture():null});page.rotation.x=-Math.PI/2;
    if(['letter','help'].includes(kind))page.userData.surfaceText='letter';
    else{const icon=emblem(kind==='consult'?'self':'envelope','#9eafa4');icon.scale.setScalar(.3);icon.rotation.x=-Math.PI/2;icon.position.set(0,.024,0);g.add(icon);}
  }else if(kind==='lamp'){
    cyl(g,.2,.24,.06,[0,.03,0],'#a79572',{metalness:.7});cyl(g,.025,.025,.5,[0,.3,0],'#9d8964',{metalness:.8});
    cyl(g,.18,.33,.36,[0,.65,0],'#e8c7cf',{side:T.DoubleSide});const bulb=sphere(g,.07,[0,.55,0],'#f1deaf');bulb.name='bulb';
  }else if(kind==='book'){
    cube(g,[.6,.16,.43],[0,.1,0],'#e6dbc5');cube(g,[.64,.025,.46],[0,.018,0],'#9aada0');
    const lid=new T.Group();lid.position.set(-.32,.19,0);g.add(lid);cube(lid,[.64,.025,.46],[.32,0,0],'#8c9c92');lid.name='lid';cube(g,[.04,.2,.46],[-.31,.1,0],'#7b8d80');
  }else if(kind==='musicbox'){
    cube(g,[.56,.24,.43],[0,.12,0],'#a88e7c');cube(g,[.5,.04,.37],[0,.24,0],'#d7c49f',{metalness:.35});
    const lid=new T.Group();lid.position.set(0,.27,-.22);g.add(lid);cube(lid,[.57,.045,.44],[0,0,.22],'#b5a3b1');lid.name='lid';
    cyl(g,.035,.035,.025,[0,.275,0],'#aa926b');
  }else if(kind==='radio'||kind==='crt'){
    const crt=kind==='crt',size=crt?[.95,.72,.65]:[.68,.4,.25];cube(g,size,[0,size[1]/2,0],crt?'#7e8f81':'#a59079');
    if(crt){cube(g,[.65,.49,.045],[-.06,.4,.35],'#839c94',{roughness:.22,emissive:'#526f63',emissiveIntensity:.4}).name='screen';for(let i=0;i<12;i++)cube(g,[.61,.009,.008],[-.06,.2+i*.034,.38],i%3?'#70887e':'#afbcaa');}
    else{for(let i=0;i<9;i++)cube(g,[.3,.009,.008],[-.1,.09+i*.026,.13],'#625b52');cube(g,[.46,.02,.01],[0,.35,.13],'#ccb991');}
    const hatch=new T.Group();hatch.position.set(0,size[1],-size[2]/2);g.add(hatch);cube(hatch,[size[0]+.02,.025,size[2]+.02],[0,.015,size[2]/2],'#b7aa91');hatch.name='lid';
    for(const y of [size[1]*.3,size[1]*.65]){const knob=cyl(g,.042,.042,.035,[size[0]*.37,y,size[2]/2+.025],'#c0ae8a',{metalness:.5});knob.rotation.x=Math.PI/2;knob.name='knob';}
  }else if(kind==='cabinet'){
    // A real lined cavity: six thick faces and an overlapping hinged door.
    cube(g,[1.2,.09,.78],[0,.045,0],'#756b59');cube(g,[1.2,.09,.78],[0,1.66,0],'#b6aa91');
    for(const x of [-.56,.56])cube(g,[.08,1.6,.78],[x,.85,0],'#a3957e');
    cube(g,[1.12,1.6,.08],[0,.85,-.35],'#81745e');cube(g,[1.06,.07,.7],[0,.82,0],'#b1a087');
    const lid=new T.Group();lid.position.set(-.57,1.63,.405);g.add(lid);cube(lid,[1.16,1.58,.07],[.57,-.79,0],'#a3b4a4');sphere(lid,.045,[1,-.85,.06],'#ad946b');lid.name='hatch';
    g.userData.closedCavity=true;
  }else if(kind==='clock'){
    cube(g,[.72,.55,.28],[0,.28,0],'#a69277');const face=cyl(g,.23,.23,.028,[0,.29,.155],'#d5ceb5');face.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){const tick=cube(g,[.012,.035,.01],[Math.sin(i*Math.PI/6)*.185,.29+Math.cos(i*Math.PI/6)*.185,.177],'#6b7164');tick.rotation.z=-i*Math.PI/6;}
    cube(g,[.012,.16,.012],[0,.36,.184],'#514f46');const lid=new T.Group();lid.position.set(0,.56,-.15);g.add(lid);cube(lid,[.74,.035,.32],[0,0,.15],'#b29e7f');lid.name='lid';
  }else if(kind==='cushion'){
    cube(g,[.83,.18,.7],[0,.09,0],'#9d8d7a');const lid=new T.Group();lid.position.set(0,.19,-.34);g.add(lid);sphere(lid,.44,[0,.04,.34],'#c5aebf',[1,.28,.79]);lid.name='lid';
    for(const x of [-.3,.3])sphere(lid,.015,[x,.15,.34],'#a78da3');
  }else if(kind==='cup'){
    cyl(g,.11,.085,.2,[0,.1,0],'#d1b2ba');const handle=ring(g,.075,.018,[.11,.11,0],'#c29ca7');handle.scale.x=.8;cyl(g,.18,.18,.025,[0,.012,0],'#dec9c5');
  }
  return g;
}
