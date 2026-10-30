export const WATER_SPEED_FACTOR=.55;
export const EYE_SURGE_MS=160;
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
