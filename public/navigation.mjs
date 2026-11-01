import {circleHits} from './spatial.mjs';
export function walkable(x,z,bounds,blocks,radius=.3){return x>bounds.minX+radius+.1&&x<bounds.maxX-radius-.1&&z>bounds.minZ+radius+.1&&z<bounds.maxZ-radius-.1&&!blocks.some(b=>circleHits(x,z,b,radius));}
export function findPath(start,target,bounds,blocks,canArrive=()=>true){
  const step=.4, nx=Math.ceil((bounds.maxX-bounds.minX)/step),nz=Math.ceil((bounds.maxZ-bounds.minZ)/step);
  const grid=p=>[Math.round((p[0]-bounds.minX)/step),Math.round((p[1]-bounds.minZ)/step)];
  const world=([x,z])=>[bounds.minX+x*step,bounds.minZ+z*step],key=p=>p.join(',');
  const from=grid(start), queue=[from],prev=new Map([[key(from),null]]); let goal=null;
  for(let i=0;i<queue.length;i++){
    const p=queue[i],w=world(p);
    if(Math.hypot(w[0]-target[0],w[1]-target[1])<1.65&&walkable(...w,bounds,blocks)&&canArrive(w)){goal=p;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dz];if(n[0]<0||n[0]>nx||n[1]<0||n[1]>nz||prev.has(key(n))||!walkable(...world(n),bounds,blocks))continue;prev.set(key(n),p);queue.push(n);}
  }
  if(!goal)return [];
  const path=[];for(let p=goal;prev.get(key(p));p=prev.get(key(p)))path.push(world(p));return path.reverse();
}
