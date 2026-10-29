import * as T from './vendor/three.module.js';
import {SHADOW_TARGETS,shadowAligned,MIRROR_POINTS,traceMirrors} from './engine.mjs';
const loader=new T.TextureLoader(),textures={};
for(const [k,f] of Object.entries({grass:'grass-dreamcore-v1.png',siding:'siding-tintable-v1.png',road:'asphalt-dreamcore-v1.png',eyes:'sky-eyes-nightmare-v1.png',family:'family-memory-v1.png'})){
  const tex=loader.load(`assets/dreamcore/${f}`);tex.colorSpace=T.SRGBColorSpace;
  if(['grass','siding','road'].includes(k)){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(k==='grass'?8:3,k==='grass'?8:3);}
  textures[k]=tex;
}
export const FAMILY_URL='assets/dreamcore/family-memory-v1.png';
export const mat=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.8,...options});
function mesh(geometry,material,parent,pos=[0,0,0]){const m=new T.Mesh(geometry,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function box(parent,size,pos,color,options={}){return mesh(new T.BoxGeometry(...size),mat(color,options),parent,pos);}
function ball(parent,r,pos,color,scale=[1,1,1]){const m=mesh(new T.SphereGeometry(r,16,12),mat(color),parent,pos);m.scale.set(...scale);return m;}
function cylinder(parent,r1,r2,h,pos,color){return mesh(new T.CylinderGeometry(r1,r2,h,24),mat(color),parent,pos);}
export function textTexture(text,{bg='#e9dfce',fg='#3c4942',size=38,width=768,height=512}={}){
  const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,width,height);x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.font=`${size}px "Microsoft JhengHei", sans-serif`;
  const lines=text.split('\n');lines.forEach((line,i)=>x.fillText(line,width/2,height/2+(i-(lines.length-1)/2)*size*1.65));const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
function sign(parent,text,pos,w=2,h=.65,options={}){return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:textTexture(text,options),side:T.DoubleSide}),parent,pos);}
function paper(parent,pos,text='回診提醒'){const g=new T.Group();parent.add(g);g.position.set(...pos);box(g,[.55,.012,.76],[0,0,0],'#e6dac0');const p=sign(g,text,[0,.009,0],.5,.7,{size:42});p.rotation.x=-Math.PI/2;return g;}
export function model(kind){const g=new T.Group();
  if(kind==='moon'){
    const shape=new T.Shape();shape.absarc(0,.62,.57,-Math.PI*.5,Math.PI*.5,false);shape.absarc(.24,.62,.45,Math.PI*.5,Math.PI*1.5,true);
    const m=mesh(new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2,steps:1}),mat('#f5d480',{emissive:'#d6b266',emissiveIntensity:.2}),g);m.position.x=-.1;cylinder(g,.29,.34,.14,[0,.07,0],'#f1d6b3');
  } else if(kind==='rabbit'){
    ball(g,.36,[0,.42,0],'#f0d7dc',[.85,1.2,.8]);ball(g,.29,[0,.9,0],'#f4e0dd');ball(g,.15,[-.15,1.3,0],'#edd1d8',[.65,2.1,.65]);ball(g,.15,[.15,1.3,0],'#edd1d8',[.65,2.1,.65]);ball(g,.04,[-.1,.95,.25],'#4e4c53');ball(g,.04,[.1,.95,.25],'#4e4c53');ball(g,.035,[0,.85,.29],'#b18d95');ball(g,.13,[0,.38,-.26],'#f5e9df');
  } else if(kind==='vase'){
    cylinder(g,.18,.3,.57,[0,.3,0],'#b4cec0');cylinder(g,.12,.18,.25,[0,.69,0],'#bfd5c7');for(let i=0;i<5;i++){const a=i*1.8;const stem=cylinder(g,.018,.018,.6,[Math.sin(a)*.16,1.01,Math.cos(a)*.13],'#6c8c65');stem.rotation.z=Math.sin(a)*.22;ball(g,.1,[Math.sin(a)*.22,1.3,Math.cos(a)*.2],i%2?'#c6b6db':'#f4d9dd');}
  } else if(kind==='key'){const ring=mesh(new T.TorusGeometry(.14,.045,8,24),mat('#c6aa6d',{metalness:.7}),g,[0,.22,0]);box(g,[.055,.4,.06],[0,-.04,0],'#c6aa6d');box(g,[.16,.055,.06],[.05,-.2,0],'#c6aa6d');ring.rotation.z=.3;
  } else if(kind==='phone'){box(g,[.34,.075,.65],[0,.04,0],'#55585b');const p=sign(g,'12 通\n未接來電',[0,.084,0],.29,.48,{bg:'#a8c1bd',size:70});p.rotation.x=-Math.PI/2;
  } else if(kind==='flashlight'){const body=cylinder(g,.11,.11,.55,[0,.3,0],'#b8a477');body.rotation.z=Math.PI/2;const lens=cylinder(g,.15,.12,.12,[-.3,.3,0],'#eee2a6');lens.rotation.z=Math.PI/2;
  } else if(kind==='memory'){mesh(new T.OctahedronGeometry(.32),mat('#d7deb4',{emissive:'#c8d7ad',emissiveIntensity:.35,metalness:.2,roughness:.2}),g,[0,.5,0]);
  } else if(kind.startsWith('p')){const i=Number(kind[1]),tex=textures.family.clone();tex.repeat.set(.5,.5);tex.offset.set(i%2*.5,i<2?.5:0);tex.needsUpdate=true;mesh(new T.BoxGeometry(.54,.54,.04),mat('#fff',{map:tex}),g,[0,.3,0]);
  } else if(kind==='drawing'){const p=sign(g,'☀\n家　你　我\n一起回家',[0,.4,0],.65,.75,{bg:'#eee1ba',fg:'#a08a6c',size:70});
  } else if(kind==='photo'){
    box(g,[1.55,1.4,.1],[0,.7,0],'#8c6c58');mesh(new T.PlaneGeometry(1.35,1.2),new T.MeshBasicMaterial({map:textures.family}),g,[0,.7,.056]);const back=sign(g,'我們曾經等過你很多次。\n這次，\n我帶孩子先離開了。',[0,.7,-.056],1.35,1.2,{size:35});back.rotation.y=Math.PI;
  } else {box(g,[.55,.7,.035],[0,.4,0],'#eadac0');sign(g,({letter:'未寄出的信',notice:'回診提醒',consult:'成癮諮詢紀錄',help:'寫給自己的信'})[kind]||'一段記憶',[0,.4,.023],.5,.63,{size:48});}
  return g;
}
export function createWorld(canvas,getState,onActivate){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene();scene.background=new T.Color('#cbdbe0');scene.fog=new T.FogExp2('#e3d3d1',.018);
  const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.08,200);camera.rotation.order='YXZ';
  const hemi=new T.HemisphereLight('#fce6da','#899c89',2.5);scene.add(hemi);
  const sun=new T.DirectionalLight('#fff0d9',3);sun.position.set(-9,12,4);sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.5,far:45});sun.shadow.bias=-.0004;scene.add(sun);
  const spot=new T.SpotLight('#fff2c6',95,30,Math.PI*.4,.3,1);spot.position.set(0,2.6,4.8);spot.target.position.set(0,2,-7);spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.00015;scene.add(spot,spot.target);
  let root=new T.Group(),entities=[],blocks=[],bounds,door,shadowModels=[],ghosts=[],mirrorModels=[],beamRoot,clockHand,ghostEye,curtain=[],plates=[],mirrorVeil;scene.add(root);
  const ray=new T.Raycaster();
  const entity=(id,name,group,action,visible=()=>true)=>{group.userData.entity=id;group.traverse(m=>{m.userData.entity=id;});const e={id,name,group,action,visible};entities.push(e);return e;};
  const collision=(x,z,w,d)=>blocks.push({x,z,w,d});
  function table(x,z,w=2,d=1){const g=new T.Group();root.add(g);g.position.set(x,0,z);box(g,[w,.15,d],[0,1,0],'#b7a08c');for(const a of [-1,1])for(const b of [-1,1])box(g,[.08,.95,.08],[a*(w/2-.15),.48,b*(d/2-.1)],'#a89685');collision(x,z,w,d);return g;}
  function chair(x,z){const g=new T.Group();root.add(g);g.position.set(x,0,z);box(g,[.75,.12,.75],[0,.58,0],'#b8cabe');box(g,[.75,.8,.1],[0,1.02,-.33],'#a5bfae');for(const a of [-1,1])for(const b of [-1,1])box(g,[.07,.56,.07],[a*.28,.28,b*.28],'#8ba38f');const block={x,z,w:.7,d:.7};blocks.push(block);g.userData.block=block;return g;}
  function drawer(x,z,name='抽屜',id='drawer'){
    const g=new T.Group();root.add(g);g.position.set(x,0,z);box(g,[1.1,1.1,.85],[0,.55,0],'#cab9a5');const front=box(g,[.95,.38,.1],[0,.7,.47],'#b4c5b4');ball(g,.045,[0,.7,.54],'#ba9a62');collision(x,z,1.1,.85);
    entity(id,name,g,()=>onActivate({type:'DRAWER'}));g.userData.front=front;return g;
  }
  function item(id,name,kind,pos,action,visible=()=>true){const g=model(kind);root.add(g);g.position.set(...pos);return entity(id,name,g,action||(()=>onActivate({type:'COLLECT',id})),visible);}
  function room(level){
    bounds=level===1?{minX:-3.4,maxX:3.4,minZ:-15,maxZ:7}:{minX:-6,maxX:6,minZ:-7.2,maxZ:7};
    const w=bounds.maxX-bounds.minX,d=bounds.maxZ-bounds.minZ,cz=(bounds.minZ+bounds.maxZ)/2;
    box(root,[w+.3,.22,d+.3],[0,-.12,cz],level===1?'#9aae8f':'#b9b2a5',level===1?{map:textures.grass}:{});
    if(level!==1){for(let x=-5.7;x<6;x+=.6)box(root,[.014,.008,14],[x,.004,0],'#8c7d6a');}
    box(root,[.2,4.8,d],[bounds.maxX,2.4,cz],level===3?'#9aaea4':'#e7dbd1');
    box(root,[w,4.8,.2],[0,2.4,bounds.maxZ],'#e3d6ca');
    box(root,[(w-1.55)/2,4.8,.2],[-(w+1.55)/4,2.4,bounds.minZ],level===1?'#d3dfdc':'#e6d6d2');
    box(root,[(w-1.55)/2,4.8,.2],[(w+1.55)/4,2.4,bounds.minZ],level===1?'#d3dfdc':'#e6d6d2');
    box(root,[1.6,1.6,.2],[0,4,bounds.minZ],'#e8ddd1');
    box(root,[.2,1.05,d],[bounds.minX,.52,cz],'#e5ded0');box(root,[.2,.65,d],[bounds.minX,4.47,cz],'#e8e2da');
    for(let z=bounds.minZ;z<bounds.maxZ;z+=3.5){box(root,[.22,4.2,.16],[bounds.minX,2.1,z],'#eee7da');
      const glass=box(root,[.04,2.9,3.28],[bounds.minX,2.55,z+1.73],'#d9eced',{transparent:true,opacity:.12,metalness:.2,roughness:.1});glass.castShadow=false;
      for(const side of [0,1]){const c=box(root,[.15,3.6,.45],[bounds.minX+.12,2.3,z+.4+side*2.85],'#f3e2e4',{transparent:true,opacity:.78,side:T.DoubleSide});curtain.push(c);}
    }
    box(root,[w+.3,.15,d+.2],[0,4.85,cz],'#dfdcd3');
    for(const x of [bounds.minX+.12,bounds.maxX-.12])box(root,[.12,.15,d],[x,.13,cz],'#f1e8d7');
    door=box(root,[1.4,2.8,.14],[0,1.4,bounds.minZ+.07],'#9bab99');
    sign(root,'出　口',[0,3.06,bounds.minZ+.13],1,.3,{size:60,bg:'#d5d3bf'});
    entity('exit','出口',door,()=>onActivate({type:'EXIT'}));
    for(let z=bounds.minZ+2;z<bounds.maxZ;z+=4){box(root,[1.8,.035,.3],[0,4.72,z],'#f6eed8',{emissive:'#f6e6c5',emissiveIntensity:2});}
    const grass=box(root,[80,.2,100],[-48,-.2,0],'#b1c598',{map:textures.grass});
    for(let z=-35;z<35;z+=8){const g=new T.Group();root.add(g);g.position.set(-17,0,z);box(g,[4.5,4,4.8],[0,2,0],['#d8b1a9','#c2d4b2','#e1d2a9'][Math.abs(z)%3],{map:textures.siding});const roof=mesh(new T.ConeGeometry(3.9,2,4),mat('#9f998e'),g,[0,5,0]);roof.rotation.y=Math.PI/4;box(g,[1.1,1.8,.1],[0,1,-2.45],'#ece5d3');}
    const road=box(root,[5,.05,100],[-11,.005,0],'#aca2b5',{map:textures.road});
    const sky=mesh(new T.SphereGeometry(90,32,16),new T.MeshBasicMaterial({map:textures.eyes,side:T.BackSide,transparent:true,opacity:0,depthWrite:false}),root);sky.castShadow=false;sky.receiveShadow=false;ghostEye=sky;
    const flowerGeo=new T.SphereGeometry(.065,6,4),flowerMat=mat('#c3b2dc'),flowers=new T.InstancedMesh(flowerGeo,flowerMat,level===1?160:45),dummy=new T.Object3D();
    for(let i=0;i<flowers.count;i++){const x=level===1?Math.sin(i*25.43)*2.9:bounds.minX+Math.abs(Math.sin(i*12.1))*.6,z=bounds.minZ+Math.abs(Math.cos(i*4.73))*(d-.4);dummy.position.set(x,.08+Math.abs(Math.sin(i*7))*.07,z);dummy.scale.set(1.5,.65,1.5);dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);}root.add(flowers);
  }
  function photo(pos,scale=1){const g=model('photo');if(getState().level===0){const veil=mesh(new T.PlaneGeometry(.42,.42),new T.MeshBasicMaterial({color:'#d9d4cf',transparent:true,opacity:.91}),g,[.43,1.05,.061]);veil.castShadow=false;}g.scale.setScalar(scale);g.position.set(...pos);root.add(g);return g;}
  function build(){
    scene.remove(root);root.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});root=new T.Group();scene.add(root);entities=[];blocks=[];shadowModels=[];ghosts=[];mirrorModels=[];curtain=[];plates=[];mirrorVeil=null;clockHand=null;
    const s=getState(),i=s.level;room(i);beamRoot=new T.Group();beamRoot.userData.nonOccluding=true;root.add(beamRoot);
    camera.position.set(i===1?0:0,1.65,i===1?5:5.9);camera.rotation.set(-.03,0,0);
    if(i===0){
      // A real modelled bedroom, with a bedside drawer, fabric, toys and three shadow stations.
      const bed=new T.Group();root.add(bed);bed.position.set(-3.7,0,3.7);box(bed,[2.6,.5,3.8],[0,.4,0],'#c5aa9a');box(bed,[2.7,1.5,.14],[0,1.1,-1.95],'#e5c4cd');box(bed,[2.55,.3,3.65],[0,.8,0],'#eee2d7');box(bed,[2.6,.18,2.6],[0,1,.5],'#c7d1df');for(const x of [-.65,.65])box(bed,[1.1,.22,.65],[x,1.05,-1.1],'#e9d6dc');collision(-3.7,3.7,2.7,3.9);
      drawer(3.8,2.5,'床邊抽屜');item('trigger','被揉皺的回診提醒','notice',[3.8,1.14,2.5],()=>onActivate({type:'TRIGGER'}),()=>getState().levels[0].drawer);
      const p=photo([5.83,1.4,-2],.8);p.rotation.y=-Math.PI/2;entity('family','模糊的家庭照片',p,()=>onActivate({type:'READ',id:'family'}));
      const clock=cylinder(root,.5,.5,.1,[2.3,3.4,-7.06],'#e8e2c8');clock.rotation.x=Math.PI/2;clockHand=box(root,[.025,.32,.035],[2.3,3.5,-6.99],'#535d59');
      ['moon','rabbit','vase'].forEach((kind,n)=>{const v=s.levels[0].shadow[n],g=model(kind);g.position.set(v.x,1.4,v.z);g.rotation.y=v.angle*Math.PI/180;root.add(g);entity(`shadow${n}`,['月亮燈','兔子玩偶','花瓶'][n],g,()=>onActivate({type:'MANIPULATE',index:n}));shadowModels.push(g);
        const target=SHADOW_TARGETS[n];cylinder(root,.48,.48,1.39,[target.x,.695,target.z],'#d9ccba');collision(target.x,target.z,.9,.9);const circle=mesh(new T.RingGeometry(.5,.54,40),new T.MeshBasicMaterial({color:'#e5dcac',side:T.DoubleSide}),root,[target.x,1.405,target.z]);circle.rotation.x=-Math.PI/2;
        const ghost=model(kind);ghost.position.set(target.x,1.4,target.z);ghost.rotation.y=target.angle*Math.PI/180;ghost.updateMatrixWorld(true);
        // Project the target silhouette onto the very wall receiving the real spotlight shadow.
        const L=new T.Vector3(0,2.6,4.8),planeZ=-7.04;
        ghost.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const arr=geo.attributes.position;
          for(let k=0;k<arr.count;k++){const p=new T.Vector3().fromBufferAttribute(arr,k);const t=(planeZ-L.z)/(p.z-L.z);arr.setXYZ(k,L.x+(p.x-L.x)*t,L.y+(p.y-L.y)*t,planeZ+.012);}geo.computeVertexNormals();const silhouette=mesh(geo,new T.MeshBasicMaterial({color:'#716b84',transparent:true,opacity:.23,side:T.DoubleSide,depthWrite:false}),root);silhouette.castShadow=false;ghosts.push(silhouette);
        });
      });
      sign(root,'讓記憶回到原本的位置',[0,3.75,-7.05],4.8,.6,{bg:'#e6d6d2',size:42});
      for(let n=0;n<6;n++){const b=ball(root,.19,[-2+n*.7,3.5+Math.sin(n)*.25,4.9],['#dbb3bb','#b9cfbf','#e3d9b0'][n%3],[.85,1.1,.85]);}
    } else if(i===1){
      const bench=table(-2.2,3,1.4,.75);item('trigger','不斷響起的手機','phone',[-2.2,1.15,3],()=>onActivate({type:'TRIGGER'}));drawer(-2.2,.8,'長椅旁抽屜');item('key','舊家鑰匙','key',[-2.2,1.15,.8],null,()=>getState().levels[1].drawer);
      const c=chair(2,-4);entity('chair','擋住門後的椅子',c,()=>onActivate({type:'CHAIR'}));c.userData.movable=true;
      item('drawing','孩子的畫','drawing',[2.7,.7,-4.2],null,()=>getState().levels[1].chair);
      table(1.7,-10.5,1.5,1);item('letter','未寄出的信','letter',[1.7,1.15,-10.5]);
      for(let n=0;n<4;n++){const doorSide=box(root,[.1,2.9,1.3],[3.25,1.45,1-n*3.5],n%2?'#c1cbbd':'#d1bcba');sign(root,`0${n+1}`,[3.15,2.6,1-n*3.5],.4,.3).rotation.y=-Math.PI/2;}
      ['key','drawing','letter'].forEach((id,n)=>{const g=box(root,[1.2,.8,.15],[-1.9+n*1.9,1.55,-13.65],'#d4c9b7');sign(root,['房　子','家庭回憶','信　件'][n],[-1.9+n*1.9,2.15,-13.54],1.2,.35,{size:60});entity(`slot-${id}`,['房子凹槽','家庭回憶凹槽','信件凹槽'][n],g,()=>onActivate({type:'SLOT_UI',slot:id}));});
    } else if(i===2){
      table(0,0,3.6,2.1);for(const [x,z] of [[-1.4,.6],[1.4,.6],[0,-.65]]){const plate=cylinder(root,.31,.33,.04,[x,1.11,z],'#e9e6ce');plates.push(plate);cylinder(root,.08,.08,.17,[x+.45,1.18,z],'#ddd4bf');}
      const c=chair(1.6,1.8);c.userData.movable=true;entity('chair','餐桌旁的椅子',c,()=>onActivate({type:'CHAIR'}));chair(-1.6,1.8);chair(0,-1.7);
      const p=photo([0,1.45,-7.02]);entity('trigger','牆上的家庭照片',p,()=>onActivate({type:'TRIGGER'}));entity('puzzle','照片相框',box(root,[2.6,1.65,.15],[3.4,2.1,-7.02],'#987961'),()=>onActivate({type:'PHOTO_UI'}),()=>getState().levels[2].triggered);
      drawer(4.4,1.2,'餐桌抽屜');const f=photo([4.8,1.2,-3],.55);entity('frame','櫃子上的相框',f,()=>onActivate({type:'FRAME'}));table(4.8,-3,1.3,.8);
      item('p0','餐桌下的照片碎片','p0',[-.5,.14,.8]);item('p1','椅子後的照片碎片','p1',[1.7,.15,1.5],null,()=>getState().levels[2].chair);item('p2','相框後的照片碎片','p2',[4.8,1.16,-3],null,()=>getState().levels[2].frame);item('p3','抽屜內的照片碎片','p3',[4.4,1.15,1.2],null,()=>getState().levels[2].drawer);
      for(let n=0;n<10;n++)ball(root,.19,[Math.sin(n*3)*4,3.3+Math.cos(n)*.3,Math.cos(n*4)*3],['#c0cda7','#e3b9c0','#dcce8e'][n%3],[.8,1,.8]);
    } else if(i===3){
      table(4.5,3.1,1.7,1);item('trigger','成癮諮詢紀錄','consult',[4.5,1.15,3.1],()=>onActivate({type:'TRIGGER'}));item('flashlight','手電筒','flashlight',[-3,1.1,3],()=>onActivate({type:'FLASHLIGHT'}));
      MIRROR_POINTS.forEach(([x,z],n)=>{const g=new T.Group();root.add(g);g.position.set(x,0,z);box(g,[.08,2.2,2],[0,1.7,0],'#988575');box(g,[.09,2,1.8],[0,1.7,0],'#bbd4cf',{metalness:.93,roughness:.1});cylinder(g,.28,.34,.15,[0,.08,0],'#707b72');box(g,[.08,.9,.08],[0,.5,0],'#7c897a');entity(`mirror${n}`,`第${n+1}面立鏡`,g,()=>onActivate({type:'MIRROR_UI',index:n}));mirrorModels.push(g);sign(root,`${n+1}`, [x,2.95,z],.35,.35,{bg:'#cbd1bd',size:90});});
      const central=box(root,[3,2.7,.12],[0,2,-7.02],'#b9c5bd',{metalness:.98,roughness:.18});
      const portrait=textures.family.clone();portrait.repeat.set(.36,.7);portrait.offset.set(.62,.23);portrait.needsUpdate=true;mesh(new T.PlaneGeometry(1.3,2.2),new T.MeshBasicMaterial({map:portrait}),root,[0,2,-6.94]);mirrorVeil=box(root,[1.34,2.24,.015],[0,2,-6.92],'#93a9a3',{transparent:true,opacity:.96});
      const d=drawer(3.9,-4,'隱藏抽屜');['work','family','self'].forEach((id,n)=>{item(`record-${id}`,['工作缺勤通知','家人留下的訊息','私人日記'][n],'letter',[3.2+n*.65,1.16,-4],()=>onActivate({type:'RECORD_UI',id}),()=>getState().levels[3].drawer);});
    } else {
      box(root,[5.8,.025,13.9],[3,.027,-.05],'#708780');
      box(root,[.04,4.5,13.9],[5.87,2.25,-.05],'#7d8f8b');
      const cold=new T.PointLight('#a9c5e3',12,10);cold.position.set(4,3,-2);root.add(cold);
      const warm=new T.PointLight('#ffdca5',12,10);warm.position.set(-4,3,-2);root.add(warm);
      table(3.8,2.8,1.8,1);item('trigger','寫給自己的求助信','help',[3.8,1.15,2.8],()=>onActivate({type:'TRIGGER'}));
      const device=box(root,[3.8,.8,2],[0,.4,-1.5],'#9aa99e');entity('device','記憶投影裝置',device,()=>onActivate({type:'MEMORY_UI'}));
      for(let n=0;n<4;n++){const g=model('memory');g.position.set(-1.35+n*.9,.8,-1.5);sign(g,['☾','≋','▧','◇'][n],[0,1.1,.15],.35,.35,{bg:'#ced4b9',fg:'#506553',size:110});root.add(g);ghosts.push(g);}
      sign(root,'先記起過去，再聽見他人\n看見失去的一切，最後才能承認自己',[0,3,-6.99],5,1,{size:38});
      const mailbox=box(root,[1.1,1.3,.55],[3,1.1,-5.9],'#bc9b9b');box(root,[.6,.06,.06],[3,1.5,-5.59],'#625d60');entity('mailbox','出口旁的信箱',mailbox,()=>onActivate({type:'MAIL_UI'}));
      const p=photo([-4.8,1.2,-3.5]);p.rotation.y=Math.PI/4;const broken=box(root,[.1,2.7,2.5],[-5.8,1.8,-3.5],'#c2d6d3',{metalness:.9,roughness:.1});
    }
    sync();
  }
  function sync(){const s=getState(),l=s.levels[s.level],weird=l.triggered;
    scene.background.set(weird?'#263c3a':'#cbdee5');scene.fog.color.set(weird?'#66776e':'#e7d9cf');scene.fog.density=weird?.035:.016;
    hemi.color.set(weird?'#a7c2bd':'#fae6d6');hemi.groundColor.set(weird?'#494354':'#a2ad90');hemi.intensity=weird?1.25:2.5;sun.intensity=weird?.45:3;sun.color.set(weird?'#bbc6e0':'#fff0d7');spot.intensity=s.level===0?(weird?115:45):0;ghostEye.material.opacity=weird?.9:0;
    door.material.color.set(s.completed[s.level]?'#ddcf9f':weird?'#5d766b':'#9bab99');door.material.emissive.set(s.completed[s.level]?'#665431':'#000000');
    entities.forEach(e=>{e.group.visible=e.visible()&&(!e.id.startsWith('p')||!l.collected.includes(e.id))&&(!['key','drawing','letter'].includes(e.id)||!l.collected.includes(e.id));if(['key','drawing','letter','p0','p1','p2','p3','mirror0','mirror1','mirror2','flashlight'].includes(e.id)&&!weird)e.group.visible=false;
      if(e.group.userData.front)e.group.userData.front.position.z=l.drawer?.7:.47;
      if(e.group.userData.movable){e.group.position.x=(s.level===1?2:1.6)+(l.chair?-1.25:0);e.group.userData.block.x=e.group.position.x;}
    });
    if(s.level===0){shadowModels.forEach((g,n)=>{const v=l.shadow[n];g.position.set(v.x,1.4,v.z);g.rotation.y=v.angle*Math.PI/180;g.traverse(o=>{if(o.material?.emissive&&shadowAligned(v,SHADOW_TARGETS[n]))o.material.emissive.set('#1d3520');});});ghosts.forEach(g=>g.visible=weird);}
    if(s.level===2&&s.completed[2])plates[2].visible=false;
    if(s.level===3){if(mirrorVeil)mirrorVeil.material.opacity=l.records.length===3?0:.9-l.records.length*.2;mirrorModels.forEach((g,n)=>g.rotation.y=-(l.mirrors[n]*Math.PI/180));beamRoot.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});beamRoot.clear();if(l.flashlight){const result=traceMirrors(l.mirrors,l.torchAngle);for(const [a,b] of result.segments){const points=[new T.Vector3(a[0],1.65,a[1]),new T.Vector3(b[0],1.65,b[1])];const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#fff5a1'}));beamRoot.add(line);}
      [[-1.5,-2],[0,-.5],[2,1]].forEach(([x,z],n)=>{const mark=ball(beamRoot,.13,[x,1.65,z],result.marks.includes(n)?'#ffe9a5':'#687d70');mark.material.emissive.set(result.marks.includes(n)?'#e3bb61':'#000');sign(beamRoot,['工作','家庭','自己'][n],[x,2.05,z],.7,.3,{size:65,bg:'#536961',fg:'#f0e6be'});});}}
    if(s.level===4)ghosts.forEach((g,n)=>{g.visible=l.sequence.includes(n);g.rotation.y=n*.7;});renderer.shadowMap.needsUpdate=true;scene.updateMatrixWorld(true);
  }
  function tick(time){curtain.forEach((m,i)=>m.rotation.y=Math.sin(time*.5+i)*.025);if(clockHand)clockHand.rotation.z=getState().completed[0]?-time*.2:Math.sin(time)*.01;}
  function shown(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
  function solid(o){if(!o.isMesh)return false;for(let p=o;p;p=p.parent)if(p.userData.nonOccluding)return false;return true;}
  function target(){ray.setFromCamera(new T.Vector2(0,0),camera);const hits=ray.intersectObjects(root.children,true);for(const hit of hits){if(!shown(hit.object)||!solid(hit.object))continue;if(hit.distance>3.2)break;const e=entities.find(e=>e.id===hit.object.userData.entity&&e.group.visible);if(e)return e;if(hit.object.material?.transparent&&hit.object.material.opacity<.4)continue;if(!hit.object.userData.entity)return null;}return null;}
  function visibleEntities(){return entities.filter(e=>e.group.visible&&e.id!=='exit'||e.id==='exit'&&getState().completed[getState().level]);}
  function near(e,from=camera.position){const p=new T.Box3().setFromObject(e.group).getCenter(new T.Vector3());if(Math.hypot(p.x-from.x,p.z-from.z)>3.1)return false;const to=p.clone().sub(from);const distance=to.length();ray.set(from,to.normalize());for(const hit of ray.intersectObjects(root.children,true)){if(!shown(hit.object)||!solid(hit.object))continue;if(hit.distance>distance-.2)return true;if(hit.object.userData.entity===e.id)return true;if(hit.object.material?.transparent)continue;return false;}return true;}
  build();
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  return {renderer,scene,camera,build,sync,tick,target,near,visibleEntities,get bounds(){return bounds},get blocks(){return blocks},get entities(){return entities},render(){renderer.render(scene,camera);}};
}
export function createInspector(canvas,kind){const r=new T.WebGLRenderer({canvas,antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setSize(canvas.clientWidth||350,185,false);r.outputColorSpace=T.SRGBColorSpace;const scene=new T.Scene();scene.add(new T.HemisphereLight('#fff1e4','#9baf9c',3));const light=new T.DirectionalLight('#fff',3);light.position.set(3,5,4);scene.add(light);const g=model(kind);scene.add(g);const camera=new T.PerspectiveCamera(42,(canvas.clientWidth||350)/185,.05,30);camera.position.set(0,.9,3.1);camera.lookAt(0,.7,0);return {group:g,render(){r.render(scene,camera)},dispose(){scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});r.dispose();}};}
