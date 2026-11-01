export const WATER_SPEED_FACTOR=.55;
export const EYE_SURGE_MS=160;
export function interactionHint(target){
  if(target?.triggerAction)return target.canTrigger?.()===false?'已觸發':'雙擊觸發';
  if(target?.readAction)return target.canRead?.()===false?'已閱讀':'雙擊閱讀';
  return target?.pickupAction&&target.canPickup?.()!==false?'雙擊拿取':'';
}
// Use the same eligibility as the prompt; triggering and reading never promise a pickup.
export function doubleClickAction(target){
  if(target?.triggerAction)return target.canTrigger?.()===false?null:target.triggerAction;
  if(target?.readAction)return target.canRead?.()===false?null:target.readAction;
  return target?.pickupAction&&target.canPickup?.()!==false?target.pickupAction:null;
}
// Only the fresh visible ray hit can be used; UI events and stale navigation focus never interact.
export function doubleClickPickup(event,{mode,canvas,locked,world}){
  if(mode!=='explore'||event.button!==0||event.target!==canvas)return false;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return false;
  const x=locked?0:(event.clientX-r.left)/r.width*2-1,y=locked?0:1-(event.clientY-r.top)/r.height*2;
  const action=doubleClickAction(world.target(x,y));if(!action)return false;
  action();return true;
}
export function movementSpeed(inWater,navigation=false){return (navigation?3.2:2.7)*(inWater?WATER_SPEED_FACTOR:1);}

// Keep free mouse look usable when a browser refuses Pointer Lock.
export function createMouseLook({canvas,documentRef,onLook,onUnlock=()=>{},onDenied=()=>{}}){
  let enabled=false,last=null,wasLocked=false,ignoredUnlocks=0;
  const change=()=>{
    const locked=documentRef.pointerLockElement===canvas;
    if(locked&&!enabled){ignoredUnlocks++;documentRef.exitPointerLock();return;}
    if(locked){wasLocked=true;last=null;ignoredUnlocks=0;return;}
    const unexpected=wasLocked&&enabled&&ignoredUnlocks===0;
    wasLocked=false;last=null;if(ignoredUnlocks>0)ignoredUnlocks--;
    if(unexpected)onUnlock();
  };
  documentRef.addEventListener('pointerlockchange',change);
  return {
    enter(){enabled=true;last=null;this.lock();},
    leave(){enabled=false;last=null;if(documentRef.pointerLockElement===canvas){ignoredUnlocks++;documentRef.exitPointerLock();}},
    lock(){
      if(!enabled||documentRef.pointerLockElement===canvas)return;
      try{const result=canvas.requestPointerLock();result?.catch(()=>{if(enabled)onDenied();});}catch{onDenied();}
    },
    move(event){
      if(!enabled)return false;
      const locked=documentRef.pointerLockElement===canvas;
      if(!locked&&event.target!==canvas){last=null;return false;}
      let dx,dy;
      if(locked){dx=event.movementX||0;dy=event.movementY||0;}
      else{const current=[event.clientX,event.clientY];if(!last){last=current;return false;}dx=current[0]-last[0];dy=current[1]-last[1];last=current;}
      if(!Number.isFinite(dx)||!Number.isFinite(dy)||(!dx&&!dy))return false;
      onLook(dx,dy);return true;
    },
    dispose(){this.leave();documentRef.removeEventListener('pointerlockchange',change);},
    get enabled(){return enabled;},get locked(){return documentRef.pointerLockElement===canvas;}
  };
}
