// Explicit synthetic-input fixture. Never reads or changes game state/camera/save flags.
if(location.hostname!=='localhost'||location.port!=='4182')throw Error('Use isolated localhost:4182');
const tools=document.createElement('aside');tools.setAttribute('aria-label','合成輸入測試工具');
Object.assign(tools.style,{position:'fixed',left:'12px',top:'185px',zIndex:100,display:'grid',gap:'4px',maxWidth:'150px'});
const key=(down)=>window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code:'AltLeft',key:'Alt',bubbles:true,cancelable:true}));
function motion(dx,dy){const c=document.getElementById('world'),r=c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent('pointermove',{clientX:r.width/2,clientY:r.height/2,movementX:0,movementY:0,bubbles:true}));
  c.dispatchEvent(new PointerEvent('pointermove',{clientX:r.width/2+dx,clientY:r.height/2+dy,movementX:dx,movementY:dy,bubbles:true}));
}
for(const [label,fn]of [['測試：按住Alt',()=>key(true)],['測試：放開Alt',()=>key(false)],['測試：低頭',()=>motion(0,650)],['測試：向上環視',()=>motion(0,-150)],['測試：向左環視',()=>motion(-300,0)]]){
  const b=document.createElement('button');b.textContent=label;b.onclick=fn;b.style.fontSize='12px';b.style.minHeight='36px';tools.append(b);
}
document.body.append(tools);
