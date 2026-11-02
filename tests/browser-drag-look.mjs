// Local-only synthetic pointer regression; never changes the camera or save directly.
if(location.hostname!=='localhost')throw Error('Use an isolated localhost origin');
const box=document.createElement('aside');box.style.cssText='position:fixed;top:190px;left:20px;z-index:60;background:#fff;color:#17352a;padding:12px';
const output=document.createElement('p');box.append(output);
const canvas=document.getElementById('world');
function send(type,buttons,x){const r=canvas.getBoundingClientRect();canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,button:0,buttons,clientX:r.left+r.width/2+x,clientY:r.top+r.height/2,pointerId:91}));}
function report(){output.textContent=`looking=${document.body.classList.contains('looking')} / cursor=${getComputedStyle(canvas).cursor}`;}
for(const [name,run] of [['未按左鍵移動',()=>{send('pointermove',0,0);send('pointermove',0,100);}],['按住左鍵拖曳',()=>{send('pointerdown',1,0);send('pointermove',1,120);}],['放開左鍵',()=>send('pointerup',0,120)]]){const button=document.createElement('button');button.textContent=name;button.onclick=()=>{run();report();};box.append(button);}
document.body.append(box);report();
