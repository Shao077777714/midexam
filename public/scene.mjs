import * as T from './vendor/three.module.js';
import {SHADOW_TARGETS,shadowAligned,MIRROR_POINTS,traceMirrors,PHOTO_IDS,opticsStatus,SPECTRA,RECEIVER_FILTERS} from './engine.mjs';
import {createModel,emblem,setPhotoMood} from './models.mjs';
import {restOn,mountOn,footprint,circleHits} from './spatial.mjs';
import {buildPhenomena} from './phenomena.mjs';
import {buildExterior,buildEyes,buildFlood} from './atmosphere.mjs';
const loader=new T.TextureLoader(),textures={};
if(typeof document!=='undefined')for(const [k,f] of Object.entries({grass:'grass-dreamcore-v1.png',siding:'siding-tintable-v1.png',road:'asphalt-dreamcore-v1.png',eyes:'sky-eyes-nightmare-v1.png',family:'family-aged-v2.png',corrupt:'family-distorted-v2.png',organic:'organic-eye-v2.png'})){
  const tex=loader.load(`assets/dreamcore/${f}`);tex.colorSpace=T.SRGBColorSpace;
  if(['grass','siding','road'].includes(k)){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(k==='grass'?8:3,k==='grass'?8:3);}
  textures[k]=tex;
}
export const FAMILY_URL='assets/dreamcore/family-aged-v2.png';
export const HORROR_FAMILY_URL='assets/dreamcore/family-distorted-v2.png';
let photoCorrupted=false;
export const mat=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.8,...Object.fromEntries(Object.entries(options).filter(([,v])=>v!==undefined))});
function mesh(geometry,material,parent,pos=[0,0,0]){const m=new T.Mesh(geometry,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function box(parent,size,pos,color,options={}){return mesh(new T.BoxGeometry(...size),mat(color,options),parent,pos);}
function ball(parent,r,pos,color,scale=[1,1,1]){const m=mesh(new T.SphereGeometry(r,16,12),mat(color),parent,pos);m.scale.set(...scale);return m;}
function cylinder(parent,r1,r2,h,pos,color){return mesh(new T.CylinderGeometry(r1,r2,h,24),mat(color),parent,pos);}
function sign(parent,text,pos,w=2,h=.65){
  const g=new T.Group();parent.add(g);g.position.set(...pos);g.userData.wallSign=true;
  box(g,[w,h,.035],[0,0,0],'#c6bda9');
  const kind=({'出　口':'exit','房　子':'house','家庭回憶':'family','信　件':'envelope','工作':'work','家庭':'family','自己':'self','☾':'moon','≋':'wave','▧':'frame','◇':'mirror'})[text]||(/^0?[1-4]$/.test(text)?String(Number(text)):'moon');
  const icon=emblem(kind,'#766b61');icon.scale.setScalar(Math.min(w,h)*.9);icon.position.z=.035;g.add(icon);return g;
}
export function model(kind){const g=createModel(kind,textures);setPhotoMood(g,photoCorrupted);return g;}
export function createWorld(canvas,getState,onActivate,{headless=false}={}){
  const width=globalThis.innerWidth||1366,height=globalThis.innerHeight||768;
  const renderer=headless?{shadowMap:{},setPixelRatio(){},setSize(){},render(){}}:new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(width,height);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;
  const scene=new T.Scene();scene.background=new T.Color('#cbdbe0');scene.fog=new T.Fog('#e3d3d1',45,180);
  const camera=new T.PerspectiveCamera(62,width/height,.055,350);camera.rotation.order='YXZ';
  const hemi=new T.HemisphereLight('#fce6da','#899c89',2.5);scene.add(hemi);
  const sun=new T.DirectionalLight('#fff0d9',3);sun.position.set(-9,12,4);sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.5,far:45});sun.shadow.bias=-.0004;scene.add(sun);
  const spot=new T.SpotLight('#fff2c6',95,30,Math.PI*.4,.3,1);spot.position.set(0,2.6,4.8);spot.target.position.set(0,2,-7);spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.00015;scene.add(spot,spot.target);
  let root=new T.Group(),entities=[],blocks=[],bounds,door,shadowModels=[],ghosts=[],mirrorModels=[],beamRoot,clockHand,ghostEye,curtain=[],plates=[],mirrorVeil,shadowSupports=[],colliderSources=[],wallEyes,decor=[],sensors=[],opticalHeight=1.65,flood,effectsEnabled=true,searchObjects=[],phenomena;scene.add(root);
  const nearbyLight=new T.PointLight('#c2d8d4',0,3.1,2);scene.add(nearbyLight);
  const ray=new T.Raycaster();
  const entity=(id,name,group,action,visible=()=>true)=>{group.userData.entity=id;group.traverse(m=>{m.userData.entity=id;});const e={id,name,group,action,visible};entities.push(e);return e;};
  const collision=(x,z,w,d)=>blocks.push({x,z,w,d});
  function track(object){const block=footprint(object);blocks.push(block);colliderSources.push({object,block});return block;}
  function refreshColliders(){for(const {object,block} of colliderSources){Object.assign(block,footprint(object));block.active=shown(object);}}
  function supported(kind,pos,scale=1){const g=model(kind);root.add(g);g.scale.setScalar(scale);g.position.set(...pos);restOn(g,pos[1]);return g;}
  function mounted(g,axis,surface,normal){return mountOn(g,axis,surface,normal);}

  function table(x,z,w=2,d=1){const g=new T.Group();root.add(g);g.position.set(x,0,z);box(g,[w,.15,d],[0,1,0],'#b7a08c');box(g,[w-.1,.25,d-.1],[0,.83,0],'#b39b88');for(const a of [-1,1])for(const b of [-1,1]){box(g,[.08,.95,.08],[a*(w/2-.15),.475,b*(d/2-.1)],'#a89685');cylinder(g,.065,.065,.07,[a*(w/2-.15),.035,b*(d/2-.1)],'#978870');}track(g);return g;}
  function chair(x,z){const g=new T.Group();root.add(g);g.position.set(x,0,z);box(g,[.75,.12,.75],[0,.58,0],'#b8cabe');box(g,[.75,.8,.1],[0,1.02,-.33],'#a5bfae');for(const a of [-1,1])for(const b of [-1,1])box(g,[.07,.56,.07],[a*.28,.28,b*.28],'#8ba38f');const block=track(g);g.userData.block=block;return g;}
  function drawer(x,z,name='抽屜',id='drawer'){
    const g=new T.Group();root.add(g);g.position.set(x,0,z);
    for(const sx of [-.5,.5])box(g,[.1,1.1,.85],[sx,.55,0],'#cab9a5');
    box(g,[.9,1.1,.08],[0,.55,-.385],'#b49e89');box(g,[1.1,.07,.85],[0,1.065,0],'#cab9a5');box(g,[1.1,.07,.85],[0,.035,0],'#cab9a5');box(g,[.9,.48,.08],[0,.28,.425],'#b4b7a1');
    const front=new T.Group();g.add(front);front.position.set(0,.73,.47);box(front,[.95,.38,.1],[0,0,0],'#b4c5b4');ball(front,.045,[0,0,.08],'#ba9a62');
    box(front,[.92,.035,.67],[0,-.185,-.29],'#aa977e');
    for(const sx of [-.445,.445])box(front,[.045,.29,.67],[sx,-.055,-.29],'#b6a38a');
    box(front,[.93,.29,.045],[0,-.055,-.615],'#a38e72');
    box(g,[.94,.05,.77],[0,.525,-.005],'#a49379');
    box(g,[.94,.53,.06],[0,.795,-.375],'#9e8a71');
    g.userData.closedCavity=true;front.userData.closedTray=true;track(g);
    entity(id,name,g,()=>onActivate({type:'DRAWER'}));g.userData.front=front;return g;
  }
  function item(id,name,kind,pos,action,visible=()=>true,scale=1){const g=supported(kind,pos,scale);return entity(id,name,g,action||(()=>onActivate({type:'COLLECT',id})),visible);}
  function addDecorations(level){
    const placements=[[3.8,5.7,2.7],[-2.2,-7.3,1.55],[3.9,5.4,3],[-4.3,5.4,2.7],[-3.8,3.5,2.7]];
    const [x,z,w]=placements[level];table(x,z,w,.82);
    const kinds=level===2?['crt','musicbox','lamp']:level===3?['crt','book','lamp']:level===1?['radio','book','musicbox']:['book','musicbox','lamp'];
    const names={book:'布面相簿',musicbox:'木製音樂盒',lamp:'百褶檯燈',radio:'老收音機',crt:'映像管電視'};
    kinds.forEach((kind,n)=>{const g=supported(kind,[x+(n-1)*w*.31,1.075,z],level===1?.64:.9);let active=false;let light;
      if(kind==='lamp'){light=new T.PointLight('#eecb98',0,3);light.position.set(0,.5,0);g.add(light);}
      const e=entity(`decor-${n}`,names[kind],g,()=>{active=!active;const lid=g.getObjectByName('lid');if(lid){if(kind==='book')lid.rotation.z=active?1.55:0;else lid.rotation.x=active?-1.4:0;}
        if(light){light.intensity=active?7:0;g.getObjectByName('bulb').material.emissive.set(active?'#e7bf75':'#000000');}
        g.traverse(o=>{if(o.name==='knob')o.rotation.y+=Math.PI/3;if(o.name==='screen'){o.material.color.set(active?'#a9b5bd':'#81958a');o.material.emissiveIntensity=active?.9:.25;}});
        refreshColliders();renderer.shadowMap.needsUpdate=true;onActivate({type:'DECOR',name:names[kind],active,copy:kind==='book'?(active?'相簿攤開了。幾頁褪色的紙張，沒有留下答案。':'你把相簿輕輕闔上。'):kind==='musicbox'?(active?'盒蓋打開，一小段旋律響起。':'旋律隨著盒蓋合上而停止。'):kind==='lamp'?(active?'暖光照亮了桌面。':'檯燈熄滅，房間又靜了下來。'):(active?'你轉動旋鈕。沙沙的雜訊裡，似乎藏著遙遠的日常。':'頻道換了，還是沒有人的聲音。')});
      });e.decoration=true;decor.push(e);track(g);
    });
  }
  function searchStation(id,name,kind,x,z,{piece=null,record=null,scale=.85}={}){
    const cabinet=kind==='cabinet';if(!cabinet)table(x,z,1.35,.95);
    const surface=cabinet?0:1.075,g=supported(kind,[x,surface,z],scale);if(cabinet)g.rotation.y=-Math.PI/2;
    const e=entity(`search-${id}`,name,g,()=>onActivate({type:'SEARCH',id}));
    const entry={id,g,kind};searchObjects.push(entry);track(g);
    if(id==='television'){
      const tray=new T.Group();root.add(tray);tray.position.set(x,1.19,z+.47);box(tray,[.66,.045,.48],[0,0,0],'#9c8f76');
      for(const dx of [-.23,.23])box(tray,[.045,.18,.045],[dx,-.095,-.17],'#8f8677');tray.visible=false;entry.tray=tray;track(tray);
      const screen=g.getObjectByName('screen');screen.material.dispose();screen.material=new T.MeshBasicMaterial({color:'#fff'});screen.userData.photoMaps={};
      for(const [key,t]of [['aged',textures.family],['horror',textures.corrupt]]){const map=t?.clone();if(map){map.repeat.set(1/3,1/3);map.offset.set(2/3,0);map.needsUpdate=true;}screen.userData.photoMaps[key]=map||null;}entry.screen=screen;
      g.traverse(o=>{if(o.geometry?.parameters?.width===.61)o.visible=false;});
      const light=new T.PointLight('#e6ddd0',0,2.4);light.position.set(x,1.7,z+.85);root.add(light);entry.light=light;
    }
    const y=cabinet?.855*scale:surface+(kind==='cushion'?.18:kind==='book'?.18:kind==='radio'?.4:kind==='clock'?.555:.72)*scale;
    // Papers are revealed on solid shelves / page blocks / device decks, not suspended in cavities.
    if(piece)item(piece,({radio:'收音機夾層的照片碎片',book:'書頁間的照片碎片',cushion:'軟墊下的照片碎片',cabinet:'餐具櫃內的照片碎片',television:'電視托架上的照片碎片'})[id],piece,[x-(cabinet?.24:0),id==='television'?1.2125:y,z+(id==='television'?.49:0)],null,()=>getState().levels[getState().level].searched.includes(id),id==='television'?.7:.55);
    if(record)item(`record-${record}`,{work:'工作缺勤通知',family:'家人留下的訊息',self:'私人日記'}[record],record==='family'?'letter':'consult',[x-(cabinet?.24:0),y,z],()=>onActivate({type:'RECORD_UI',id:record}),()=>getState().levels[3].searched.includes(id),.55);
    return e;
  }
  function addUncannyFurniture(level){
    const anchors=[[5,-5.4],[-2.45,-12.8],[-4.8,-2.7],[4.9,-.8],[-4.8,.1]], [x,z]=anchors[level];
    const cabinet=supported('cabinet',[x,0,z],.92);track(cabinet);let open=false;
    const c=entity('decor-cabinet','斑駁木櫥櫃',cabinet,()=>{if(!canApply({type:'CABINET',open:!open})){onActivate({type:'DECOR',copy:'請先退後，留出櫃門轉動的空間。'});return;}open=!open;cabinet.getObjectByName('hatch').rotation.y=open?-1.35:0;refreshColliders();onActivate({type:'DECOR',name:'斑駁木櫥櫃',active:open,copy:open?'木門緩慢轉開。層板、背板都在，卻像少了原本住在這裡的人。':'你重新闔上櫃門。'});});c.decoration=true;decor.push(c);
    // A ceiling-fixed inverted arrangement, deliberately repeated differently in each room.
    const inverted=new T.Group();root.add(inverted);inverted.userData.ceilingFixed=true;
    const ix=level===1?1.9:-2.8,iz=level===1?-8:level===0?-4.5:2.8;
    box(inverted,[2.05,.1,1.2],[ix,4.72,iz],'#746e68');
    for(const dx of [-.8,.8])for(const dz of [-.4,.4])cylinder(inverted,.022,.022,.42,[ix+dx,4.51,iz+dz],'#6f6f64');
    const upside=model(level===0?'rabbit':level===1?'crt':level===2?'cup':level===3?'photo':'clock');upside.rotation.z=Math.PI;upside.scale.setScalar(level===1?.8:1.15);inverted.add(upside);upside.position.set(ix,0,iz);const b=new T.Box3().setFromObject(upside);upside.position.y=4.32-b.max.y;
    // A closed shelf bank with repetitive CRTs / cups: anchored against the wall, clear of the route.
    const bx=level===1?-2.65:4.9,bz=level===1?-4.8:level===0?-.2:level===2?-5.8:level===3?5.7:-.8;
    const bank=new T.Group();root.add(bank);bank.position.set(bx,0,bz);
    box(bank,[1.18,.08,.74],[0,.04,0],'#817a68');box(bank,[1.18,.08,.74],[0,1.22,0],'#aca18c');
    for(const dx of [-.55,.55])box(bank,[.08,1.2,.74],[dx,.62,0],'#8e8572');box(bank,[1.1,1.2,.06],[0,.62,-.34],'#807869');
    for(let n=0;n<3;n++){const kind=level===2?'cup':'crt',height=n===0?.08:n===1?.44:.8,g=createModel(kind,textures);g.scale.setScalar(level===2?.8:.44);g.position.set(0,height,.08);bank.add(g);restOn(g,height);box(bank,[1.1,.025,.68],[0,height-.012,0],'#9c9079');}
    track(bank);
  }
  function balloon(x,z,y,color){const g=new T.Group();root.add(g);g.position.set(x,0,z);const b=ball(g,.2,[0,y,0],color,[.85,1.1,.85]);b.material.roughness=.32;
    cylinder(g,.006,.006,y-.3,[0,(y-.3)/2+.1,0],'#b8b4a6');cylinder(g,.1,.12,.1,[0,.05,0],'#9e9a89');track(g);return g;
  }
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
      const rod=cylinder(root,.025,.025,3.4,[bounds.minX+.18,4.18,z+1.72],'#b7a17f');rod.rotation.x=Math.PI/2;
      for(const side of [0,1]){const geo=new T.PlaneGeometry(.68,3.52,12,16),p=geo.attributes.position;for(let n=0;n<p.count;n++)p.setZ(n,Math.sin(p.getX(n)*38)*.055);geo.computeVertexNormals();const c=mesh(geo,mat(side?'#d8d3e4':'#efdcdf',{side:T.DoubleSide}),root,[bounds.minX+.22,2.34,z+.4+side*2.75]);c.rotation.y=Math.PI/2;curtain.push(c);}
    }
    box(root,[w+.3,.15,d+.2],[0,4.85,cz],'#dfdcd3');
    for(const x of [bounds.minX+.12,bounds.maxX-.12])box(root,[.12,.15,d],[x,.13,cz],'#f1e8d7');
    door=box(root,[1.57,3.2,.14],[0,1.6,bounds.minZ+.07],'#9bab99');
    for(const x of [-.84,.84])box(root,[.1,3.3,.24],[x,1.65,bounds.minZ+.09],'#cbbfa9');box(root,[1.78,.1,.24],[0,3.26,bounds.minZ+.09],'#cbbfa9');ball(door,.045,[.55,-.16,.11],'#b6a078');
    sign(root,'出　口',[0,3.47,bounds.minZ+.13],.75,.27);
    entity('exit','出口',door,()=>onActivate({type:'EXIT'}));
    for(let z=bounds.minZ+2;z<bounds.maxZ;z+=4){box(root,[1.8,.035,.3],[0,4.72,z],'#f6eed8',{emissive:'#f6e6c5',emissiveIntensity:2});}
    buildExterior(root,textures);
    const sky=mesh(new T.SphereGeometry(280,32,16),new T.MeshBasicMaterial({map:textures.eyes||null,side:T.BackSide,transparent:true,opacity:0,depthWrite:false,fog:false}),root);sky.castShadow=false;sky.receiveShadow=false;sky.userData.nonOccluding=true;ghostEye=sky;
    wallEyes=buildEyes(root,bounds,textures);flood=buildFlood(root,bounds,level);
    const flowerGeo=new T.SphereGeometry(.065,6,4),flowerMat=mat('#c3b2dc'),flowers=new T.InstancedMesh(flowerGeo,flowerMat,level===1?160:45),dummy=new T.Object3D();
    const stems=new T.InstancedMesh(new T.CylinderGeometry(.008,.008,.16,5),mat('#7e9466'),flowers.count);
    for(let i=0;i<flowers.count;i++){const x=level===1?Math.sin(i*25.43)*2.9:bounds.minX+.2+Math.abs(Math.sin(i*12.1))*.4,z=bounds.minZ+.3+Math.abs(Math.cos(i*4.73))*(d-.6);dummy.position.set(x,.16,z);dummy.scale.set(1.5,.35,1.5);dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);dummy.position.y=.08;dummy.scale.set(1,1,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);}root.add(flowers,stems);
  }
  function photo(pos,scale=1){const g=model('photo');if(getState().level===0){const veil=mesh(new T.PlaneGeometry(.42,.42),new T.MeshBasicMaterial({color:'#d9d4cf',transparent:true,opacity:.91}),g,[.43,1.05,.086]);veil.castShadow=false;}g.scale.setScalar(scale);g.position.set(...pos);root.add(g);return g;}
  function build(){
    scene.remove(root);root.traverse(o=>{o.geometry?.dispose();if(o.userData.photoMaps)for(const map of Object.values(o.userData.photoMaps))if(map&&!Object.values(textures).includes(map))map.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map&&!Object.values(textures).includes(m.map))m.map.dispose();m.dispose();}});root=new T.Group();scene.add(root);entities=[];blocks=[];shadowModels=[];ghosts=[];mirrorModels=[];curtain=[];plates=[];mirrorVeil=null;clockHand=null;shadowSupports=[];colliderSources=[];decor=[];sensors=[];searchObjects=[];
    const s=getState(),i=s.level;photoCorrupted=s.levels[i].triggered;room(i);beamRoot=new T.Group();beamRoot.userData.nonOccluding=true;root.add(beamRoot);
    camera.position.set(i===1?0:0,1.65,i===1?5:5.9);camera.rotation.set(-.03,0,0);
    if(i===0){
      // A real modelled bedroom, with a bedside drawer, fabric, toys and three shadow stations.
      const bed=new T.Group();root.add(bed);bed.position.set(-3.7,0,3.7);box(bed,[2.6,.5,3.8],[0,.4,0],'#c5aa9a');box(bed,[2.7,1.5,.14],[0,1.1,-1.95],'#e5c4cd');box(bed,[2.55,.3,3.65],[0,.8,0],'#eee2d7');box(bed,[2.6,.18,2.6],[0,1,.5],'#c7d1df');for(const x of [-.65,.65])box(bed,[1.1,.22,.65],[x,1.05,-1.1],'#e9d6dc');collision(-3.7,3.7,2.7,3.9);
      // Visible bed feet and layered, rounded fabric cushions.
      for(const x of [-4.7,-2.7])for(const z of [2.2,5.2])cylinder(root,.07,.07,.2,[x,.1,z],'#a28c7e');
      for(let n=0;n<4;n++){const p=ball(root,.5,[-4.6+(n%2)*1.2,1.22,3.2+Math.floor(n/2)*1.05],['#d6bad2','#c7cfdf','#d7c6be','#becac1'][n],[1,.27,.7]);p.rotation.y=n*.25;}
      drawer(3.8,2.5,'床邊抽屜');item('trigger','被揉皺的回診提醒','notice',[3.8,.56,3],()=>onActivate({type:'TRIGGER'}),()=>getState().levels[0].drawer,.48);
      const p=photo([5.83,1.4,-2],.8);p.rotation.y=-Math.PI/2;mounted(p,'x',bounds.maxX-.1,-1);entity('family','模糊的家庭照片',p,()=>onActivate({type:'READ',id:'family'}));
      const clockGroup=new T.Group();root.add(clockGroup);clockGroup.position.set(2.3,3.4,bounds.minZ+.1);const clock=cylinder(clockGroup,.45,.45,.085,[0,0,0],'#c5bba1');clock.rotation.x=Math.PI/2;clockHand=box(clockGroup,[.025,.32,.025],[0,.1,.06],'#535d59');for(let n=0;n<12;n++){const tick=box(clockGroup,[.02,.045,.012],[Math.sin(n*Math.PI/6)*.35,Math.cos(n*Math.PI/6)*.35,.049],'#7f8176');tick.rotation.z=-n*Math.PI/6;}mounted(clockGroup,'z',bounds.minZ+.1,1);
      ['moon','rabbit','vase'].forEach((kind,n)=>{const v=s.levels[0].shadow[n],g=supported(kind,[v.x,1.4,v.z],.85);g.rotation.y=v.angle*Math.PI/180;entity(`shadow${n}`,['月亮燈','兔子玩偶','花瓶'][n],g,()=>onActivate({type:'MANIPULATE',index:n}));shadowModels.push(g);
        const support=new T.Group();root.add(support);support.position.set(v.x,0,v.z);cylinder(support,.43,.43,.09,[0,1.355,0],'#cabaa5');cylinder(support,.18,.23,1.22,[0,.7,0],'#d7c5b4');cylinder(support,.4,.4,.09,[0,.045,0],'#9fae9f');shadowSupports.push(support);track(support);
        const target=SHADOW_TARGETS[n];const circle=mesh(new T.RingGeometry(.47,.5,40),new T.MeshBasicMaterial({color:'#b99e79',side:T.DoubleSide}),root,[target.x,.013,target.z]);circle.rotation.x=-Math.PI/2;
        const ghost=model(kind);ghost.scale.setScalar(.85);ghost.position.set(target.x,1.4,target.z);ghost.rotation.y=target.angle*Math.PI/180;restOn(ghost,1.4);ghost.updateMatrixWorld(true);
        // Project the target silhouette onto the very wall receiving the real spotlight shadow.
        const L=new T.Vector3(0,2.6,4.8),planeZ=-7.04;
        ghost.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const arr=geo.attributes.position;
          for(let k=0;k<arr.count;k++){const p=new T.Vector3().fromBufferAttribute(arr,k);const t=(planeZ-L.z)/(p.z-L.z);arr.setXYZ(k,L.x+(p.x-L.x)*t,L.y+(p.y-L.y)*t,planeZ+.012);}geo.computeVertexNormals();const silhouette=mesh(geo,new T.MeshBasicMaterial({color:'#716b84',transparent:true,opacity:.23,side:T.DoubleSide,depthWrite:false}),root);silhouette.castShadow=false;ghosts.push(silhouette);
        });
      });
      sign(root,'☾',[-4.6,3.15,-7.05],.7,.5);
      for(let n=0;n<3;n++)balloon(-1.4+n*.55,6.5,3.2+n*.2,['#d5b0bb','#bdcbb5','#d8c792'][n]);
    } else if(i===1){
      const bench=table(-2.2,3,1.4,.75);item('trigger','不斷響起的手機','phone',[-2.2,1.075,3],()=>onActivate({type:'TRIGGER'}));drawer(-2.2,.8,'長椅旁抽屜');searchStation('clock','長椅旁的座鐘','clock',-2.25,-1.2);item('key','舊家鑰匙','key',[-2.25,1.54675,-1.2],null,()=>getState().levels[1].searched.includes('clock'),.6);
      const c=chair(2,-4);entity('chair','擋住門後的椅子',c,()=>onActivate({type:'CHAIR'}));c.userData.movable=true;
      item('drawing','孩子的畫','drawing',[2.45,.012,-4.3],null,()=>getState().levels[1].chair);
      table(1.7,-10.5,1.5,1);item('letter','未寄出的信','letter',[1.7,1.075,-10.5]);
      for(let n=0;n<4;n++){const doorSide=box(root,[.1,2.9,1.3],[3.25,1.45,1-n*3.5],n%2?'#c1cbbd':'#d1bcba');const plaque=sign(root,`0${n+1}`,[3.15,2.6,1-n*3.5],.4,.3);plaque.rotation.y=-Math.PI/2;mounted(plaque,'x',3.2,-1);}
      ['key','drawing','letter'].forEach((id,n)=>{const g=sign(root,['房　子','家庭回憶','信　件'][n],[3.2,1.7,-10.6-n*1.55],.95,.8);g.rotation.y=-Math.PI/2;mounted(g,'x',bounds.maxX-.1,-1);entity(`slot-${id}`,['房子凹槽','家庭回憶凹槽','信件凹槽'][n],g,()=>onActivate({type:'SLOT_UI',slot:id}));});
    } else if(i===2){
      table(0,0,3.6,2.1);for(const [x,z] of [[-1.25,.5],[1.25,.5],[0,-.6]]){const plate=cylinder(root,.31,.33,.04,[x,1.095,z],'#e9e6ce');plates.push(plate);const cup=supported('cup',[x+.3,1.075,z-.45],.7);for(const dx of [-.4,.42])box(root,[.022,.01,.25],[x+dx,1.081,z],'#b9b3a3',{metalness:.7});}
      const c=chair(1.6,1.8);c.userData.movable=true;entity('chair','餐桌旁的椅子',c,()=>onActivate({type:'CHAIR'}));chair(-1.6,1.8);chair(0,-1.7);
      const p=photo([-2.6,1.45,-7.02]);mounted(p,'z',bounds.minZ+.1,1);entity('trigger','牆上的家庭照片',p,()=>onActivate({type:'TRIGGER'}));const frame=box(root,[2.6,1.65,.15],[3.4,2.1,-7.02],'#987961');mounted(frame,'z',bounds.minZ+.1,1);entity('puzzle','照片相框',frame,()=>onActivate({type:'PHOTO_UI'}),()=>getState().levels[2].triggered);
      drawer(4.4,1.2,'餐桌抽屜');table(4.8,-3,1.3,.8);const f=photo([4.8,1.075,-3],.55);restOn(f,1.075);const easel=box(root,[.08,.65,.5],[4.8,1.4,-3.03],'#9e876d');entity('frame','櫃子上的相框',f,()=>onActivate({type:'FRAME'}));
      item('p0','餐桌下的照片碎片','p0',[-.5,.012,.94]);item('p1','椅子後的照片碎片','p1',[1.7,.012,1.5],null,()=>getState().levels[2].chair);item('p2','相框後的照片碎片','p2',[4.8,1.075,-2.7],null,()=>getState().levels[2].frame);item('p3','抽屜內的照片碎片','p3',[4.4,.56,1.7],null,()=>getState().levels[2].drawer,.6);
      searchStation('radio','沙沙作響的收音機','radio',-4.6,-5,{piece:'p4'});
      searchStation('book','厚重的舊書','book',-4.5,.1,{piece:'p5'});
      searchStation('cushion','空椅上的軟墊','cushion',-3.6,3.3,{piece:'p6'});
      searchStation('cabinet','低矮的餐具櫃','cabinet',4.9,3.4,{piece:'p7'});
      searchStation('television','只剩雜訊的電視','crt',1.4,-4.8,{piece:'p8'});
      for(let n=0;n<4;n++)balloon(-4.8+n*.65,4.8,3.2+(n%2)*.35,['#b5c5a4','#d2a4b4','#d7c08c'][n%3]);
    } else if(i===3){
      table(4.5,3.1,1.7,1);item('trigger','成癮諮詢紀錄','consult',[4.5,1.075,3.1],()=>onActivate({type:'TRIGGER'}));table(-3,3,1.1,.75);const torch=item('flashlight','手電筒','flashlight',[-3,1.075,3],()=>onActivate({type:'FLASHLIGHT'}));opticalHeight=torch.group.getObjectByName('lens').getWorldPosition(new T.Vector3()).y;
      MIRROR_POINTS.forEach(([x,z],n)=>{const g=new T.Group();root.add(g);g.position.set(x,0,z);box(g,[.12,2.2,2],[0,1.7,0],'#988575');box(g,[.13,2,1.8],[0,1.7,0],'#a6c1b8',{metalness:.93,roughness:.1});cylinder(g,.28,.34,.15,[0,.075,0],'#707b72');box(g,[.08,.9,.08],[0,.5,0],'#7c897a');for(let p=0;p<n+1;p++)box(g,[.15,.025,.06],[0,2.5-p*.09,.88],'#b7a978');entity(`mirror${n}`,`第${n+1}面立鏡`,g,()=>onActivate({type:'MIRROR_UI',index:n}));const filter=box(g,[.145,.26,.32],[0,1.7,.3],'#f1e6bb',{metalness:.25,roughness:.25,emissive:'#252925',emissiveIntensity:.3});filter.name='filter-glass';mirrorModels.push(g);track(g);});
      const central=box(root,[3,2.7,.12],[-3.2,2,-7.02],'#b9c5bd',{metalness:.98,roughness:.18});mounted(central,'z',bounds.minZ+.1,1);
      const portrait=textures.family?.clone();if(portrait){portrait.repeat.set(.36,.7);portrait.offset.set(.62,.23);portrait.needsUpdate=true;}mesh(new T.PlaneGeometry(1.3,2.2),new T.MeshBasicMaterial({map:portrait||null}),root,[-3.2,2,bounds.minZ+.223]);mirrorVeil=box(root,[1.34,2.24,.015],[-3.2,2,bounds.minZ+.24],'#93a9a3',{transparent:true,opacity:.96});
      drawer(3.9,-4,'隱藏抽屜');
      searchStation('work-panel','工作桌下的文件櫃','cabinet',4.8,-5.6,{record:'work'});
      searchStation('family-phone','失聯的答錄機','radio',-4.5,-4.6,{record:'family'});
      searchStation('mirror-recess','鏡旁的合頁日記','book',1.8,4.2,{record:'self'});
      [[-1.5,-2],[0,-.5],[2,1]].forEach(([x,z],n)=>{const g=new T.Group();root.add(g);g.position.set(x,0,z);cylinder(g,.11,.14,.08,[0,.04,0],'#8a9185');const h=opticalHeight-.18;cylinder(g,.022,.022,h,[0,.08+h/2,0],'#a79c7c');sign(g,['工作','家庭','自己'][n],[0,opticalHeight*.64,.03],.4,.35);const sensor=ball(g,.1,[0,opticalHeight,0],'#8fa797');const rim=new T.Mesh(new T.TorusGeometry(.14,.025,8,24),mat(SPECTRA[RECEIVER_FILTERS[n]].color,{emissive:SPECTRA[RECEIVER_FILTERS[n]].color,emissiveIntensity:.35}));rim.position.set(0,opticalHeight,0);g.add(rim);sensor.name='light-receiver';sensors.push({g,sensor});track(g);});
    } else {
      box(root,[5.8,.025,13.9],[3,.027,-.05],'#708780');
      box(root,[.04,4.5,13.9],[5.87,2.25,-.05],'#7d8f8b');
      const cold=new T.PointLight('#a9c5e3',12,10);cold.position.set(4,3,-2);root.add(cold);
      const warm=new T.PointLight('#ffdca5',12,10);warm.position.set(-4,3,-2);root.add(warm);
      table(3.8,2.8,1.8,1);item('trigger','寫給自己的求助信','help',[3.8,1.075,2.8],()=>onActivate({type:'TRIGGER'}));
      const device=box(root,[3.8,.8,2],[0,.4,-1.5],'#9aa99e');track(device);entity('device','記憶投影裝置',device,()=>onActivate({type:'MEMORY_UI'}));
      for(let n=0;n<4;n++){const g=supported(`memory${n}`,[-1.35+n*.9,.8,-1.5]);root.add(g);ghosts.push(g);const socket=cylinder(root,.31,.31,.02,[-1.35+n*.9,.81,-1.5],'#6b8275');}
      const mailbox=new T.Group();root.add(mailbox);mailbox.position.set(3,0,-5.9);box(mailbox,[1.1,1.3,.55],[0,1.2,0],'#b38e9c');box(mailbox,[.6,.06,.06],[0,1.5,.29],'#625d60');cylinder(mailbox,.12,.19,.55,[0,.275,0],'#8f9b8d');cylinder(mailbox,.3,.32,.06,[0,.03,0],'#a5ad9e');track(mailbox);entity('mailbox','出口旁的信箱',mailbox,()=>onActivate({type:'MAIL_UI'}));
      table(-4.5,-3.5,1.8,.9);const p=photo([-4.5,1.075,-3.5]);p.rotation.y=.2;restOn(p,1.075);const broken=box(root,[.12,2.7,2.5],[5.82,1.8,-3.5],'#a9c1b8',{metalness:.9,roughness:.1});mounted(broken,'x',bounds.maxX-.1,-1);
    }
    addDecorations(i);addUncannyFurniture(i);phenomena=buildPhenomena(root,bounds,i,blocks,textures);blocks.push(...phenomena.blocks);
    // Attach every remaining wall plaque after its orientation has been established.
    root.traverse(g=>{if(!g.userData.wallSign||g.userData.mount||g.parent!==root)return;const p=g.position;if(Math.abs(p.x-bounds.maxX)<.6)mounted(g,'x',bounds.maxX-.1,-1);else if(Math.abs(p.z-bounds.minZ)<.5)mounted(g,'z',bounds.minZ+.1,1);});
    sync();
  }
  function sync(){const s=getState(),l=s.levels[s.level],weird=l.triggered;
    scene.background.set(weird?'#10191b':'#cbdee5');scene.fog.color.set(weird?'#263738':'#e7d9cf');scene.fog.near=weird?16:45;scene.fog.far=weird?90:180;
    hemi.color.set(weird?'#a7c2bd':'#fae6d6');hemi.groundColor.set(weird?'#494354':'#a2ad90');hemi.intensity=weird?.48:1.65;sun.intensity=weird?.17:2.1;sun.color.set(weird?'#bbc6e0':'#fff0d7');spot.intensity=s.level===0?(weird?75:45):0;ghostEye.material.opacity=weird?.85:0;wallEyes.group.visible=weird;
    photoCorrupted=weird;setPhotoMood(root,weird);phenomena.setVisible(weird);nearbyLight.intensity=weird?.9:0;flood.group.visible=weird&&[1,3,4].includes(s.level);
    for(const {id,g,kind,tray,screen,light} of searchObjects){const open=l.searched.includes(id),lid=g.getObjectByName('lid'),hatch=g.getObjectByName('hatch');if(lid)lid.rotation[kind==='book'?'z':'x']=open?(kind==='book'?1.6:-1.65):0;if(hatch)hatch.rotation.y=open?-1.45:0;if(tray){const available=open&&!l.collected.includes('p8');tray.visible=open;const map=available?screen.userData.photoMaps[weird?'horror':'aged']:null;if(screen.material.map!==map){screen.material.map=map;screen.material.needsUpdate=true;}screen.material.color.set(available?'#fff':'#3c514c');light.intensity=available?4:0;}}
    door.material.color.set(s.completed[s.level]?'#ddcf9f':weird?'#5d766b':'#9bab99');door.material.emissive.set(s.completed[s.level]?'#665431':'#000000');
    entities.forEach(e=>{e.group.visible=e.visible()&&(!e.id.startsWith('p')||!l.collected.includes(e.id))&&(!['key','drawing','letter'].includes(e.id)||!l.collected.includes(e.id));if(['key','drawing','letter',...PHOTO_IDS,'mirror0','mirror1','mirror2','flashlight'].includes(e.id)&&!weird)e.group.visible=false;
      if(e.group.userData.front)e.group.userData.front.position.z=l.drawer?.7:.47;
      if(e.group.userData.movable){e.group.position.x=(s.level===1?2:1.6)+(l.chair?-1.25:0);e.group.userData.block.x=e.group.position.x;}
    });
    if(s.level===0){shadowModels.forEach((g,n)=>{const v=l.shadow[n];g.position.set(v.x,1.4,v.z);g.rotation.y=v.angle*Math.PI/180;restOn(g,1.4);shadowSupports[n].position.set(v.x,0,v.z);g.traverse(o=>{if(o.material?.emissive)o.material.emissive.set(shadowAligned(v,SHADOW_TARGETS[n])?'#163321':'#000000');});});ghosts.forEach(g=>g.visible=weird);}
    if(s.level===2&&s.completed[2])plates[2].visible=false;
    if(s.level===3){if(mirrorVeil)mirrorVeil.material.opacity=l.records.length===3?0:.9-l.records.length*.2;mirrorModels.forEach((g,n)=>{g.rotation.y=-(l.mirrors[n]*Math.PI/180);g.getObjectByName('filter-glass').material.color.set(SPECTRA[l.mirrorFilters[n]].color);});const torch=entities.find(e=>e.id==='flashlight');torch.group.rotation.y=-l.torchAngle*Math.PI/180;beamRoot.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});beamRoot.clear();if(l.flashlight){const status=opticsStatus(l),result=status.trace;for(const [segment,[a,b]] of result.segments.entries()){const points=[new T.Vector3(a[0],opticalHeight,a[1]),new T.Vector3(b[0],opticalHeight,b[1])];const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:SPECTRA[status.segmentFilters[segment]].color}));beamRoot.add(line);}
      sensors.forEach(({sensor},n)=>{sensor.material.color.set(result.marks.includes(n)?SPECTRA[status.received[n]??0].color:'#495f59');sensor.material.emissive.set(status.matched[n]?SPECTRA[RECEIVER_FILTERS[n]].color:'#000');});}sensors.forEach(({g})=>g.visible=weird);}
    if(s.level===4)ghosts.forEach((g,n)=>{g.visible=l.sequence.includes(n);g.rotation.y=n*.7;});refreshColliders();renderer.shadowMap.needsUpdate=true;scene.updateMatrixWorld(true);
  }
  function tick(time){nearbyLight.position.copy(camera.position);nearbyLight.position.y+=.1;const reduced=!effectsEnabled||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;flood.tick(time,reduced);wallEyes.tick(camera,time,reduced);if(!reduced)curtain.forEach((m,i)=>m.rotation.y=Math.PI/2+Math.sin(time*.5+i)*.012);if(clockHand)clockHand.rotation.z=getState().completed[0]?-time*.2:0;}
  function shown(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
  function solid(o){if(!o.isMesh)return false;for(let p=o;p;p=p.parent)if(p.userData.nonOccluding)return false;return true;}
  function rayObjects(){return root.children.filter(o=>!o.userData.exterior&&!o.userData.nonOccluding&&!o.isInstancedMesh&&o!==ghostEye);}
  function target(){ray.setFromCamera(new T.Vector2(0,0),camera);const hits=ray.intersectObjects(rayObjects(),true);for(const hit of hits){if(!shown(hit.object)||!solid(hit.object))continue;if(hit.distance>3.2)break;const e=entities.find(e=>e.id===hit.object.userData.entity&&e.group.visible);if(e)return e;if(hit.object.material?.transparent&&hit.object.material.opacity<.4)continue;if(!hit.object.userData.entity)return null;}return null;}
  function visibleEntities(){return entities.filter(e=>e.group.visible&&e.id!=='exit'||e.id==='exit'&&getState().completed[getState().level]);}
  function focusPoint(e,from=camera.position){
    if(!e.group.visible)return null;
    const b=new T.Box3().setFromObject(e.group),center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3());
    if(Math.hypot(center.x-from.x,center.z-from.z)>3.1)return null;
    const samples=[center];if(e.id==='search-television'){const screen=e.group.getObjectByName('screen');samples.unshift(screen.getWorldPosition(new T.Vector3()));}for(const axis of ['x','y','z'])for(const side of [-1,1]){const p=center.clone();p[axis]+=size[axis]*.42*side;samples.push(p);}
    for(const sample of samples){const to=sample.clone().sub(from),distance=to.length();ray.set(from,to.normalize());
      for(const hit of ray.intersectObjects(rayObjects(),true)){
        if(!shown(hit.object)||!solid(hit.object)||hit.object.material?.transparent&&hit.object.material.opacity<.4)continue;
        if(hit.distance>distance+.03)break;
        if(hit.object.userData.entity===e.id)return hit.point.clone();break;
      }
    }
    return null;
  }
  function near(e,from=camera.position){return focusPoint(e,from)!==null;}
  function canApply(action,from=camera.position){let obj,change;
    if(action.type==='MIRROR'){obj=mirrorModels[action.index];change=()=>obj.rotation.y=-action.angle*Math.PI/180;}
    if(action.type==='CHAIR'){obj=entities.find(e=>e.id==='chair')?.group;change=()=>obj.position.x=(getState().level===1?2:1.6)+(getState().levels[getState().level].chair?0:-1.25);}
    if(action.type==='DRAWER'){obj=entities.find(e=>e.id==='drawer')?.group;change=()=>obj.userData.front.position.z=getState().levels[getState().level].drawer?.47:.7;}
    if(action.type==='SEARCH'){const entry=searchObjects.find(e=>e.id===action.id);if(entry?.kind==='cabinet'){obj=entry.g;change=()=>obj.getObjectByName('hatch').rotation.y=-1.45;}else if(entry?.tray&&!getState().levels[getState().level].searched.includes(entry.id)){obj=entry.tray;change=()=>{};}}
    if(action.type==='CABINET'){obj=entities.find(e=>e.id==='decor-cabinet')?.group;change=()=>obj.getObjectByName('hatch').rotation.y=action.open?-1.35:0;}
    if(action.type==='SHADOW'){
      obj=shadowSupports[action.index];if(!obj||![action.x,action.z].every(Number.isFinite))return false;
      const own=colliderSources.find(v=>v.object===obj)?.block,dx=action.x-obj.position.x,dz=action.z-obj.position.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
      for(let k=1;k<=steps;k++)for(const block of blocks)if(block!==own&&circleHits(obj.position.x+dx*k/steps,obj.position.z+dz*k/steps,block,.49))return false;
      change=()=>obj.position.set(action.x,0,action.z);
    }
    if(!obj)return true;const position=obj.position.clone(),rotation=obj.rotation.clone(),front=obj.userData.front?.position.clone(),hatch=obj.getObjectByName('hatch'),hatchRotation=hatch?.rotation.clone();change();const occupied=circleHits(from.x,from.z,footprint(obj),.3);obj.position.copy(position);obj.rotation.copy(rotation);if(front)obj.userData.front.position.copy(front);if(hatch)hatch.rotation.copy(hatchRotation);obj.updateWorldMatrix(true,true);return !occupied;
  }
  function approachable(e,from){if(!near(e,from))return false;if(e.id==='search-television'||e.id==='p8'){const tv=searchObjects.find(v=>v.id==='television');if(from.z<tv.g.position.z+.95||Math.abs(from.x-tv.g.position.x)>1)return false;}if(/^shadow[0-2]$/.test(e.id)){const target=SHADOW_TARGETS[Number(e.id.slice(-1))];return Math.abs(from.x-e.group.position.x)>.95&&Math.abs(from.x-target.x)>.95;}if(e.id==='chair')return canApply({type:'CHAIR'},from);if(e.id==='drawer')return canApply({type:'DRAWER'},from);if(e.id==='decor-cabinet')return canApply({type:'CABINET',open:true},from);if(e.id.startsWith('search-'))return canApply({type:'SEARCH',id:e.id.slice(7)},from);if(e.id.startsWith('mirror'))return Math.hypot(from.x-e.group.position.x,from.z-e.group.position.z)>1.5;return true;}
  build();
  if(!headless)addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  return {renderer,scene,camera,build,sync,tick,target,near,focusPoint,canApply,approachable,visibleEntities,get bounds(){return bounds},get blocks(){return blocks},get entities(){return entities},get decorations(){return decor},get colliderSources(){return colliderSources},get eyes(){return wallEyes},get flood(){return flood},get phenomena(){return phenomena},wadingAt(x,z){return flood.group.visible&&x>bounds.minX+.11&&x<bounds.maxX-.11&&z>bounds.minZ+.11&&z<bounds.maxZ-.11;},setEffects(enabled){effectsEnabled=enabled;},render(){renderer.render(scene,camera);}};
}
export function createInspector(canvas,kind){const r=new T.WebGLRenderer({canvas,antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setSize(canvas.clientWidth||350,220,false);r.outputColorSpace=T.SRGBColorSpace;const scene=new T.Scene();scene.add(new T.HemisphereLight('#fff1e4','#9baf9c',2.2));const light=new T.DirectionalLight('#fff',2);light.position.set(3,5,4);scene.add(light);const g=model(kind);scene.add(g);if(['letter','notice','consult','help','drawing','key',...PHOTO_IDS,'phone'].includes(kind))g.rotation.x=.7;const bounds=new T.Box3().setFromObject(g),center=bounds.getCenter(new T.Vector3());g.position.sub(center);const camera=new T.PerspectiveCamera(40,(canvas.clientWidth||350)/220,.05,30);const size=bounds.getSize(new T.Vector3());camera.position.set(0,.3,Math.max(size.x*2,size.y*2,2));camera.lookAt(0,0,0);return {group:g,render(){r.render(scene,camera)},dispose(){scene.traverse(o=>{o.geometry?.dispose();if(o.userData.photoMaps)for(const map of Object.values(o.userData.photoMaps))if(map&&!Object.values(textures).includes(map))map.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map&&!Object.values(textures).includes(m.map))m.map.dispose();m.dispose();}});r.dispose();}};}
