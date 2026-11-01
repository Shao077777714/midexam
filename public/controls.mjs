export const WATER_SPEED_FACTOR=.55;
export const EYE_SURGE_MS=160;
export function interactionHint(target){
  if(target?.triggerAction)return target.canTrigger?.()===false?'已觸發':'';
  if(target?.readAction)return target.canRead?.()===false?'已閱讀':'雙擊閱讀';
  if(target?.pickupAction)return target.canPickup?.()!==false?'雙擊拿取':'';
  return '';
}
// Use the same eligibility as the prompt; triggering and reading never promise a pickup.
export function doubleClickAction(target){
  if(target?.triggerAction)return target.canTrigger?.()===false?null:target.triggerAction;
  if(target?.readAction)return target.canRead?.()===false?null:target.readAction;
  if(target?.pickupAction){if(target.canPickup?.()!==false)return target.pickupAction;return target.interactAction&&target.canInteract?.()!==false?target.interactAction:null;}
  return target?.action||null;
}
// Only the fresh visible ray hit can be used; UI events and stale navigation focus never interact.
export function doubleClickPickup(event,{mode,canvas,world}){
  if(mode!=='explore'||event.button!==0||event.target!==canvas)return false;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return false;
  // Exploration hides the cursor: the visible reticle, not its invisible position, is the aim.
  const action=doubleClickAction(world.target(0,0));if(!action)return false;
  action();return true;
}
export function movementSpeed(inWater,navigation=false){return (navigation?3.2:2.7)*(inWater?WATER_SPEED_FACTOR:1);}

// Keep free mouse look usable when a browser refuses Pointer Lock.
export function createMouseLook({canvas,documentRef,onLook,onUnlock=()=>{},onDenied=()=>{},edgeTurn=false}){
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
    enter({lock=true}={}){enabled=true;last=null;if(lock)this.lock();},
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
    tick(dt){
      if(!edgeTurn||!enabled||!last||documentRef.pointerLockElement===canvas)return;
      const r=canvas.getBoundingClientRect(),margin=24;
      const edge=(v,min,max)=>v<min+margin?-Math.min(1,(min+margin-v)/margin):v>max-margin?Math.min(1,(v-max+margin)/margin):0;
      const x=edge(last[0],r.left,r.right),y=edge(last[1],r.top,r.bottom);
      if(x||y)onLook(x*450*Math.min(dt,.1),y*450*Math.min(dt,.1));
    },
    dispose(){this.leave();documentRef.removeEventListener('pointerlockchange',change);},
    get enabled(){return enabled;},get locked(){return documentRef.pointerLockElement===canvas;}
  };
}
