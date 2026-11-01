import * as T from './vendor/three.module.js';

// Position the actual geometry, rather than assuming that each asset's origin is its base.
export function restOn(object, height = 0) {
  object.updateWorldMatrix(true, true);
  const bounds = new T.Box3().setFromObject(object);
  const delta = height - bounds.min.y;
  object.position.y += delta / (object.parent?.getWorldScale(new T.Vector3()).y || 1);
  object.updateWorldMatrix(true, true);
  object.userData.supportHeight = height;
  return object;
}

export function mountOn(object, axis, surface, normal) {
  object.updateWorldMatrix(true, true);
  const bounds = new T.Box3().setFromObject(object);
  const back = normal > 0 ? bounds.min[axis] : bounds.max[axis];
  object.position[axis] += surface - normal * .003 - back;
  object.updateWorldMatrix(true, true);
  object.userData.mount = {axis, surface, normal};
  return object;
}

export function footprint(object) {
  object.updateWorldMatrix(true, true);
  const b = new T.Box3().setFromObject(object);
  return {x:(b.min.x+b.max.x)/2, z:(b.min.z+b.max.z)/2, w:b.max.x-b.min.x, d:b.max.z-b.min.z};
}

export function circleHits(x, z, block, radius = .3) {
  if(block.active===false)return false;
  const dx = Math.max(Math.abs(x-block.x)-block.w/2, 0);
  const dz = Math.max(Math.abs(z-block.z)-block.d/2, 0);
  return dx*dx+dz*dz < radius*radius;
}

export const SHADOW_FURNITURE = [{x:-3.7,z:3.7,w:2.7,d:3.9},{x:3.8,z:2.5,w:1.1,d:.85}];
export function shadowPlacementFree(index, candidate, shadows) {
  const start=shadows[index],steps=Math.max(1,Math.ceil(Math.hypot(candidate.x-start.x,candidate.z-start.z)/.08));
  for(let n=1;n<=steps;n++){
    const x=start.x+(candidate.x-start.x)*n/steps,z=start.z+(candidate.z-start.z)*n/steps;
    if(SHADOW_FURNITURE.some(b=>circleHits(x,z,b,.49))||shadows.some((v,i)=>i!==index&&Math.hypot(v.x-x,v.z-z)<.98))return false;
  }
  return true;
}
