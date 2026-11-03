import * as T from './vendor/three.module.js';
// Small, shared procedural PBR maps. No per-frame texture or canvas allocation.
export const SURFACE_TEXTURES={};
const size=256;
for(const kind of ['wood','plaster','fabric','stone']){
 const rgb=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const hash=((x*73856093)^(y*19349663))>>>0,noise=(hash%101)/100;
  let v=kind==='wood'?.91+.018*Math.sin(x*.27+Math.sin(y*.045)*2)+.009*Math.sin(x*1.4+y*.006):kind==='fabric'?.92+((x%4===0||y%4===0)?-.025:.015):kind==='stone'?.9+.02*Math.sin(x*.11)*Math.sin(y*.09):.94+.007*Math.sin(x*.13+y*.08);
  v+=noise*(kind==='plaster'?.025:.014);const p=(y*size+x)*4,c=Math.min(255,Math.round(v*255));
  for(let k=0;k<3;k++){rgb[p+k]=c;height[p+k]=Math.round((.25+v*.6)*255);}rgb[p+3]=height[p+3]=255;
 }
 for(const [suffix,data]of [['color',rgb],['height',height]]){const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=suffix==='color'?T.SRGBColorSpace:T.NoColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;t.name=`${kind}-${suffix}`;SURFACE_TEXTURES[`${kind}-${suffix}`]=t;}
}
export function surfaceMaterial(kind,color,options={}){
 const textured=!options.map&&!options.transparent&&(options.metalness||0)<.65;
 return new T.MeshStandardMaterial({color,roughness:kind==='fabric'?.97:kind==='wood'?.64:.87,...(textured?{map:SURFACE_TEXTURES[`${kind}-color`],bumpMap:SURFACE_TEXTURES[`${kind}-height`],roughnessMap:SURFACE_TEXTURES[`${kind}-height`],bumpScale:kind==='plaster'?.015:.008}:{}),...Object.fromEntries(Object.entries(options).filter(([,v])=>v!==undefined))});
}
export function roundedBoxGeometry(w,h,d){
 const r=Math.min(.035,w*.08,h*.08,d*.08),shape=new T.Shape();
 shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 const g=new T.ExtrudeGeometry(shape,{depth:Math.max(.001,d-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:0,bevelSegments:2,steps:1,curveSegments:2});g.translate(0,0,-(d-2*r)/2);Object.assign(g.parameters,{width:w,height:h,depth:d});return g;
}
export function buildArchitecturalDetails(root,bounds,level){
 const width=bounds.maxX-bounds.minX,depth=bounds.maxZ-bounds.minZ,center=(bounds.minZ+bounds.maxZ)/2,group=new T.Group();group.userData.architecturalDetails=true;root.add(group);
 const boardW=level===1?.6:.48,boardD=level===1?.6:1.8,nx=Math.ceil((level===1?2.4:width-.24)/boardW),nz=Math.ceil((depth-.2)/boardD),cellD=(depth-.22)/nz,geo=new T.BoxGeometry(boardW-.014,.022,cellD-.018),floor=new T.InstancedMesh(geo,surfaceMaterial(level===1?'stone':'wood',level===3?'#8e8475':'#b9aa91'),nx*nz),dummy=new T.Object3D();
 floor.userData.floorBoards=true;floor.receiveShadow=true;group.add(floor);
 for(let iz=0,n=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++,n++){dummy.position.set((ix-(nx-1)/2)*boardW,-.011,bounds.minZ+.11+(iz+.5)*(depth-.22)/nz);dummy.updateMatrix();floor.setMatrixAt(n,dummy.matrix);floor.setColorAt(n,new T.Color().setScalar(.84+((ix*17+iz*13)%9)*.018));}
 function trim(size,pos,color){const m=new T.Mesh(new T.BoxGeometry(...size),surfaceMaterial('wood',color));m.position.set(...pos);m.receiveShadow=true;m.castShadow=true;group.add(m);return m;}
 // Thin 3D joinery sits on the wall face; it does not project into the walking route.
 for(const normal of [-1,1]){const x=normal<0?bounds.minX+.117:bounds.maxX-.117;trim([.028,.1,depth-.12],[x,.08,center],'#897c6a');trim([.018,.055,depth-.14],[x,1.12,center],'#c1b09c');
  if(normal>0)for(let z=bounds.minZ+.5;z<bounds.maxZ;z+=1.05){trim([.018,.88,.022],[x,.62,z],'#b8a58f');trim([.018,.035,.92],[x,.2,z+.43],'#ad9a83');}}
 for(const z of [bounds.minZ+.117,bounds.maxZ-.117])for(const side of [-1,1]){const length=width/2-1.1;trim([length,.1,.028],[side*(1.1+length/2),.08,z],'#897c6a');trim([length,.055,.018],[side*(1.1+length/2),1.12,z],'#c1b09c');}
 return group;
}
