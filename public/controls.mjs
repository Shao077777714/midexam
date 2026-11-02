export const WATER_SPEED_FACTOR=.55;
export const EYE_SURGE_MS=160;
// Trigger, reading and pickup eligibility remain independent of the name-only label.
export function doubleClickAction(target){
  if(target?.triggerAction)return target.canTrigger?.()===false?null:target.triggerAction;
  if(target?.readAction)return target.canRead?.()===false?null:target.readAction;
  if(target?.pickupAction){if(target.canPickup?.()!==false)return target.pickupAction;return target.interactAction&&target.canInteract?.()!==false?target.interactAction:null;}
  return target?.action||null;
}
// Only the fresh visible ray hit can be used; UI events and stale navigation focus never interact.
export function cursorRay(event,canvas){
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;
  const x=(event.clientX-r.left)/r.width*2-1,y=1-(event.clientY-r.top)/r.height*2;
  return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=1&&Math.abs(y)<=1?{x,y}:null;
}
export function doubleClickPickup(event,{mode,canvas,world,aim='reticle'}){
  if(mode!=='explore'||event.button!==0||event.target!==canvas)return false;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return false;
  const point=aim==='cursor'?cursorRay(event,canvas):{x:0,y:0};if(!point)return false;
  const action=doubleClickAction(world.target(point.x,point.y));if(!action)return false;
  action();return true;
}
export function movementSpeed(inWater,navigation=false){return (navigation?3.2:2.7)*(inWater?WATER_SPEED_FACTOR:1);}

// Keep free mouse look usable when a browser refuses Pointer Lock.
export function createMouseLook({canvas,documentRef,onLook,onUnlock=()=>{},onDenied=()=>{},edgeTurn=false,dragToLook=false,onDragChange=()=>{}}){
  let enabled=false,last=null,wasLocked=false,ignoredUnlocks=0,dragging=false,dragDistance=0,blockUntil=0;
  const stopDrag=(event={})=>{if(dragging){if(dragDistance>6)blockUntil=(event.timeStamp||0)+350;dragging=false;onDragChange(false);}last=null;};
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
    enter({lock=!dragToLook}={}){enabled=true;stopDrag();if(lock)this.lock();},
    leave(){enabled=false;stopDrag();if(documentRef.pointerLockElement===canvas){ignoredUnlocks++;documentRef.exitPointerLock();}},
    down(event){
      if(!dragToLook||!enabled||event.button!==0||event.target!==canvas)return false;
      dragging=true;dragDistance=0;last=[event.clientX,event.clientY];onDragChange(true);
      try{if(event.pointerId!==undefined)canvas.setPointerCapture?.(event.pointerId);}catch{}return true;
    },
    up(event){stopDrag(event);},
    canDoubleClick(event){return !dragging&&(event.timeStamp||0)>=blockUntil;},
    lock(){
      if(!enabled||documentRef.pointerLockElement===canvas)return;
      try{const result=canvas.requestPointerLock();result?.catch(()=>{if(enabled)onDenied();});}catch{onDenied();}
    },
    move(event){
      if(!enabled)return false;
      if(dragToLook&&(!dragging||(event.buttons&1)===0)){stopDrag(event);return false;}
      const locked=documentRef.pointerLockElement===canvas;
      if(!locked&&event.target!==canvas){last=null;return false;}
      let dx,dy;
      if(locked){dx=event.movementX||0;dy=event.movementY||0;}
      else{const current=[event.clientX,event.clientY];if(!last){last=current;return false;}dx=current[0]-last[0];dy=current[1]-last[1];last=current;}
      if(!Number.isFinite(dx)||!Number.isFinite(dy)||(!dx&&!dy))return false;
      if(dragToLook)dragDistance+=Math.hypot(dx,dy);
      onLook(dx,dy);return true;
    },
    tick(dt){
      if(!edgeTurn||!enabled||!last||(dragToLook&&!dragging)||documentRef.pointerLockElement===canvas)return;
      const r=canvas.getBoundingClientRect(),margin=24;
      const edge=(v,min,max)=>v<min+margin?-Math.min(1,(min+margin-v)/margin):v>max-margin?Math.min(1,(v-max+margin)/margin):0;
      const x=edge(last[0],r.left,r.right),y=edge(last[1],r.top,r.bottom);
      if(x||y)onLook(x*450*Math.min(dt,.1),y*450*Math.min(dt,.1));
    },
    dispose(){this.leave();documentRef.removeEventListener('pointerlockchange',change);},
    get enabled(){return enabled;},get dragging(){return dragging;},get locked(){return documentRef.pointerLockElement===canvas;}
  };
}
