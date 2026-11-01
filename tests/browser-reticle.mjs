// Explicit local-only regression fixture. Does not change the camera, game state, or save.
if(location.hostname!=='localhost')throw Error('Use the isolated localhost origin');
const probe=document.createElement('button');
probe.textContent='測試：在左下方送出雙擊';
probe.style.cssText='position:fixed;left:20px;top:190px;z-index:60;padding:14px;background:#fff;color:#172b22;cursor:pointer!important';
probe.addEventListener('click',()=>{
  const canvas=document.getElementById('world'),rect=canvas.getBoundingClientRect();
  if(!document.body.classList.contains('exploring')||document.getElementById('interact').hidden){probe.textContent='請先正常走近抽屜，讓準星出現提示';return;}
  canvas.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,button:0,detail:2,clientX:rect.left+rect.width*.12,clientY:rect.top+rect.height*.75}));
});
document.body.append(probe);
