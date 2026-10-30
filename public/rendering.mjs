// Dispose owned resources once; keep source textures shared by the world and previews.
export function disposeObjects(root,sharedTextures=[]){
  const shared=new Set(sharedTextures),geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{
    if(o.isInstancedMesh)o.dispose();
    if(o.geometry)geometries.add(o.geometry);
    for(const map of Object.values(o.userData?.photoMaps||{}))if(map&&!shared.has(map))textures.add(map);
    for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){
      materials.add(material);
      for(const value of Object.values(material))if(value?.isTexture&&!shared.has(value))textures.add(value);
    }
  });
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
}

// A lost main context must pause input, retain state and offer recovery, never stay blank.
export function watchContext(canvas,renderer,{onLost=()=>{},onRestored=()=>{},onWaiting=()=>{},schedule=setTimeout,cancel=clearTimeout}={}){
  // getExtension may return null after loss: keep the restore handle while GL is healthy.
  const extension=renderer.getContext()?.getExtension('WEBGL_lose_context');
  let lost=false,waiting=null,restore=null,disposed=false;
  const clear=()=>{if(waiting!==null)cancel(waiting);if(restore!==null)cancel(restore);waiting=restore=null;};
  const fail=event=>{
    event.preventDefault();if(disposed||lost)return;lost=true;onLost();
    restore=schedule(()=>{restore=null;if(lost&&!disposed)try{extension?.restoreContext();}catch{}},500);
    waiting=schedule(()=>{waiting=null;if(lost&&!disposed)onWaiting();},5000);
  };
  const recover=()=>{if(disposed||!lost)return;lost=false;clear();onRestored();};
  canvas.addEventListener('webglcontextlost',fail);canvas.addEventListener('webglcontextrestored',recover);
  return {get lost(){return lost;},dispose(){disposed=true;clear();canvas.removeEventListener('webglcontextlost',fail);canvas.removeEventListener('webglcontextrestored',recover);}};
}
