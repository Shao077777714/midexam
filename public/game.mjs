import {FINAL_HALL,FINAL_ECHOES,createFinalePlayback} from './finale.mjs';
import {createPuzzleUI} from './puzzle-ui.mjs';
import {RECORDINGS} from './puzzles.mjs';
import * as T from './vendor/three.module.js';
import {newGame,applyAction,saveGame,loadGame,MEMORIES,ITEMS,angleDistance,shadowAligned,SHADOW_TARGETS,PHOTO_IDS,PHOTO_CODES,PHOTO_TRAY} from './engine.mjs';
import {createWorld,createInspector,createInspectorPool,FAMILY_URL,HORROR_FAMILY_URL} from './scene.mjs';
import {walkable,findPath} from './navigation.mjs';
import {createMouseLook,createExploreInput,turnView,movementSpeed,EYE_SURGE_MS,doubleClickPickup,doubleClickAction,cursorRay} from './controls.mjs';
import {watchContext,createThumbnailCache} from './rendering.mjs';
import {inventoryEntries} from './inventory.mjs';
import {chooseVoice} from './voice.mjs';
import {LEVELS,PROJECTION} from './content.mjs';
const $=id=>document.getElementById(id), symbols=['☾','≋','▧','◇','✧'];
const storage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};
let saved=loadGame(storage),state=newGame(),world,mode='title',selected=null,held=null,inspector=null,panelRefresh=null,nearby=null,focusEntity=null,navigation=[],navTarget=null,toastTimer,projectionTime=0,projectionPage=-1,elapsedLast=performance.now(),hintDepth=0,muted=false,lastRender=0,photoController=null,effectsEnabled=true,eyeTimer,mouseLook,inputMode,controlHover=false,cursorAim=null;
const keys=new Set();
const finalePlayback=createFinalePlayback();
const finaleOverlay=document.createElement('aside');finaleOverlay.id='finale-memory';finaleOverlay.hidden=true;finaleOverlay.setAttribute('role','status');finaleOverlay.setAttribute('aria-live','polite');
finaleOverlay.innerHTML='<div class="finale-photo" aria-hidden="true"></div><div class="finale-words"><p class="eyebrow">那些沒有被接住的聲音</p><p class="finale-quote"></p><p class="finale-detail"></p></div><span class="finale-eye first" aria-hidden="true"></span><span class="finale-eye second" aria-hidden="true"></span>';document.body.append(finaleOverlay);
let finaleActive=null;
function resetFinale(){finalePlayback.reset();finaleActive=null;finaleOverlay.hidden=true;}
function updateFinale(dt){
  const running=mode==='explore'&&!controlHover,view=finalePlayback.step({distance:FINAL_HALL.startZ-world.camera.position.z,seen:state.levels[5].echoesSeen,dt,running});
  if(view.trigger!==null){const result=dispatch({type:'FINAL_ECHO',index:view.trigger},{silent:true});if(!result.ok)return;}
  if(view.active!==finaleActive){finaleActive=view.active;if(finaleActive!==null){const echo=FINAL_ECHOES[finaleActive];finaleOverlay.querySelector('.finale-quote').textContent=echo.copy;finaleOverlay.querySelector('.finale-detail').textContent=echo.detail;finaleOverlay.classList.toggle('with-eyes',echo.eyes);}}
  finaleOverlay.hidden=mode!=='explore'||finaleActive===null;
  finaleOverlay.style.opacity=String(Math.min(1,view.remaining/.45));
}

const thumbnails=createThumbnailCache(createInspectorPool({framed:true}),document.createElement('div'));
let renderContext=null,renderFailed=false,renderResumeMode='title';
function renderProblem(error){console.error(error);renderFailed=true;setMode('render-error');document.body.classList.add('render-lost');$('fatal').hidden=false;$('fatal').querySelector('h2').textContent='遊戲畫面暫時中斷';$('fatal-message').textContent='請重新載入畫面，再選擇「繼續上一次的記憶」。已儲存的進度會保留。';}
function monitorRendering(){renderContext=watchContext($('world'),world.renderer,{
  onLost(){renderResumeMode=mode;setMode('recovering');navigation=[];document.body.classList.add('render-lost');$('fatal').hidden=false;$('fatal').querySelector('h2').textContent='正在恢復遊戲畫面';$('fatal-message').textContent='繪圖暫時中斷，正在嘗試恢復。若沒有恢復，可重新載入後繼續原進度。';},
  onWaiting(){$('fatal-message').textContent='瀏覽器尚未恢復繪圖。請重新載入畫面，再選擇「繼續上一次的記憶」。不需要開始新遊戲。';},
  onRestored(){try{world.sync();world.renderer.shadowMap.needsUpdate=true;world.render();renderFailed=false;document.body.classList.remove('render-lost');$('fatal').hidden=true;setMode(renderResumeMode==='explore'?'modal':renderResumeMode);if(renderResumeMode==='explore')pause();}catch(error){renderProblem(error);}}
});}
for(let i=0;i<22;i++){const eye=document.createElement('span');eye.style.setProperty('--eye-x',`${i%2?82+(i%3)*4:1+(i%3)*4}%`);eye.style.setProperty('--eye-y',`${(i*17)%90}%`);eye.style.setProperty('--eye-r',`${(i%5-2)*12}deg`);eye.style.setProperty('--eye-s',`${.7+(i%4)*.23}`);$('eye-overlay').append(eye);}

const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
const btn=(label,fn,cls='secondary')=>{const b=text('button',label,cls);b.type='button';b.addEventListener('click',fn);return b;};
const add=(parent,...children)=>children.forEach(c=>parent.append(c));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const audio={
  ctx:null,output:null,ambience:null,sfx:null,buffers:new Map(),tracks:{},cueSource:null,
  files:{dream:'ambience/dreamcore_loop.wav',weird:'ambience/weirdcore_loop.wav',correct:'puzzle/correct.wav',retry:'puzzle/retry.wav',child:'corridor/child_laugh.wav',keys:'corridor/keys.wav',argument:'corridor/argument.wav',call:'corridor/unanswered_call.wav'},
  init(){try{if(!this.ctx){this.ctx=new AudioContext();this.output=this.ctx.createGain();this.output.gain.value=muted?0:1;this.output.connect(this.ctx.destination);this.ambience=this.ctx.createGain();this.ambience.gain.value=.22;this.ambience.connect(this.output);this.sfx=this.ctx.createGain();this.sfx.gain.value=.7;this.sfx.connect(this.output);this.load();}this.ctx.resume().catch(()=>{});}catch{}},
  async load(){await Promise.all(Object.entries(this.files).map(async([key,path])=>{try{const response=await fetch(new URL(`./assets/audio/${path}`,import.meta.url));if(!response.ok)throw new Error(`Audio ${response.status}`);this.buffers.set(key,await this.ctx.decodeAudioData(await response.arrayBuffer()));if(key==='dream'||key==='weird')this.startTrack(key);}catch(error){console.warn(`音效載入失敗：${path}`,error);}}));this.update();},
  startTrack(key){if(this.tracks[key]||!this.ctx||!this.buffers.has(key))return;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers.get(key);source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.ambience);source.start();this.tracks[key]={source,gain};this.update();},
  update(){if(!this.ctx||!this.output)return;const now=this.ctx.currentTime;this.output.gain.setTargetAtTime(muted?0:1,now,.04);const active=state.level!==5&&!['title','render-error','recovering'].includes(mode),overlay=['modal','panel','projection'].includes(mode),final=state.level===4,weird=!!state.levels[state.level]?.triggered;for(const [key,track] of Object.entries(this.tracks)){const selected=final ? .5 :(key==='weird'?weird:!weird);track.gain.gain.setTargetAtTime(active?(selected?(overlay ? .45 :1):0):0,now,.7);}if(this.ambience)this.ambience.gain.setTargetAtTime(.22,now,.2);},
  play(key,delay=0){if(muted||!this.ctx||!this.sfx)return;const buffer=this.buffers.get(key);if(!buffer)return;const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.sfx);if(['child','keys','argument','call'].includes(key)){this.cueSource?.stop();this.cueSource=source;source.onended=()=>{if(this.cueSource===source)this.cueSource=null;};}source.start(this.ctx.currentTime+delay);},
  tone(f=440,delay=0){if(muted||!this.ctx||!this.sfx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),start=this.ctx.currentTime+delay;o.frequency.value=f;g.gain.setValueAtTime(.07,start);g.gain.exponentialRampToValueAtTime(.001,start+.6);o.connect(g);g.connect(this.sfx);o.start(start);o.stop(start+.6);},
  speak(copy){if(muted||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(copy);const voice=chooseVoice(speechSynthesis.getVoices());if(!voice)return;u.voice=voice;u.lang=voice.lang;u.rate=.82;u.pitch=.74;u.volume=.65;speechSynthesis.speak(u);}
};
function toast(copy){if(!copy)return;$('toast').textContent=copy;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
function setMode(next){mode=next;if(next!=='explore')finaleOverlay.hidden=true;keys.clear();document.body.classList.toggle('exploring',next==='explore');document.body.classList.toggle('interface-open',next==='panel');$('inventory-button').setAttribute('aria-expanded','false');inputMode?.setMode(next);$('crosshair').hidden=next!=='explore';$('interact').hidden=next!=='explore';audio.update();}
function syncInput({active,cursor}){controlHover=!active;document.body.classList.toggle('cursor-mode',mode==='explore'&&cursor);$('quick-controls').inert=mode==='explore'&&!cursor||mode!=='explore'&&mode!=='panel';keys.clear();cursorAim=null;if(!active){navigation=[];navTarget=null;}}
function closePanel(){inspector?.dispose();inspector=null;panelRefresh=null;photoController=null;$('panel').classList.remove('puzzle-panel','optics-panel','inventory-panel');$('panel').hidden=true;setMode('explore');$('world').focus();}
function openPanel(title,kicker='MEMORY / 物件操作'){
  inspector?.dispose();inspector=null;panelRefresh=null;photoController=null;$('panel').classList.remove('puzzle-panel','optics-panel','inventory-panel');setMode('panel');$('panel').setAttribute('aria-modal','true');navigation=[];$('modal').hidden=true;$('panel').hidden=false;$('panel-title').textContent=title;$('panel-kicker').textContent=kicker;$('panel-body').replaceChildren();$('panel-body').className='';$('panel').scrollTop=0;$('panel-close').focus();return $('panel-body');
}
function modal(title,body,actions,kicker='DREAM GAP',className=''){
  inspector?.dispose();inspector=null;panelRefresh=null;photoController=null;$('panel').classList.remove('puzzle-panel','optics-panel','inventory-panel');setMode('modal');navigation=[];$('panel').hidden=true;$('modal').hidden=false;$('modal-title').textContent=title;$('modal-kicker').textContent=kicker;const target=$('modal-body');target.replaceChildren();if(typeof body==='string')target.innerHTML=body;else target.append(body);$('modal').querySelector('article').className=`modal ${className}`;$('modal-actions').replaceChildren(...actions.map(([label,fn,cls])=>btn(label,fn,cls||'primary')));$('modal-actions').querySelector('button')?.focus();
}
function resume(){$('modal').hidden=true;setMode('explore');toast('直接移動滑鼠環視 · Alt 切換游標 · E／準星雙擊互動');}
function updateHUD(){updateInventoryHUD();const meta=LEVELS[state.level];$('chapter-no').textContent=`場景 0${state.level+1} / 06`;$('chapter-name').textContent=meta.name;document.body.classList.toggle('void-scene',state.level===5);$('world-state').textContent=state.level===5?'THE UNSENT LETTER · 最後一封信':state.level===4?'BETWEEN WORLDS · 夢與真實':state.levels[state.level].triggered?'WEIRDCORE · 怪核':'DREAMCORE · 夢核';document.body.classList.toggle('weird',state.levels[state.level].triggered);$('memory-icons').innerHTML=MEMORIES.map((m,i)=>`<span class="memory ${state.completed[i]?'found':''}"><i>${symbols[i]}</i>${m}</span>`).join('');}
function persist(){const result=saveGame(storage,state);if(result.ok){state=applyAction(state,{type:'ACK_SAVE'}).state;$('save-status').textContent='✓ 進度已儲存於此瀏覽器';$('save-status').classList.remove('save-error');}else{$('save-status').textContent='儲存失敗 · 請重試';$('save-status').classList.add('save-error');toast(result.message);}return result.ok;}
function complete(){audio.play('correct');const good=persist(),meta=LEVELS[state.level];if(state.level===5){if(good)ending(0);else modal('信件尚未保存','<p>請重試儲存，信件不會遺失。</p>',[['重試儲存',complete]]);return;}const actions=good?[[state.level===4?'走向最後一封信':'前往下一段記憶',nextLevel]]:[['重試儲存',complete]];modal(`找回「${meta.memory}」`,`<p>${esc(meta.story)}</p><p class="muted">${good?'✓ 本關進度已自動儲存，可關閉後再繼續。':'進度尚未儲存，請重試。'}</p>`,actions,`MEMORY ${state.level+1} / 5`);}
function dispatch(a,{silent=false}={}){
  if(!world.canApply(a)){const result={ok:false,message:'物件的移動空間被你或家具擋住了。請讓出空間，或調整位置。'};toast(result.message);return result;}
  const result=applyAction(state,a);if(!result.ok){toast(result.message);audio.play('retry');return result;}state=result.state;world.sync();updateHUD();audio.update();if(!silent)toast(result.message);if(a.type==='TRIGGER'){document.body.classList.add('eyes-surge');clearTimeout(eyeTimer);eyeTimer=setTimeout(()=>document.body.classList.remove('eyes-surge'),EYE_SURGE_MS);document.body.classList.add('flash');setTimeout(()=>document.body.classList.remove('flash'),850);audio.tone(90);}
  if(result.completedNow)complete();else{persist();if(result.shadowSolvedNow!==null&&result.shadowSolvedNow!==undefined){held=null;selected=null;modal('影子與記憶重合了',`<p>${['月亮燈','兔子玩偶','花瓶'][result.shadowSolvedNow]}回到了原本的位置。</p>`,[['繼續探索',resume]],'ALIGNED / 已保存');}}return result;
}
function nextLevel(){resetFinale();const result=applyAction(state,{type:'NEXT'});if(!result.ok)return toast(result.message);setMode('modal');$('transition').classList.add('active');$('modal').hidden=true;setTimeout(()=>{state=result.state;held=null;selected=null;nearby=null;focusEntity=null;world.build();updateHUD();audio.update();persist();$('transition').classList.remove('active');modal(LEVELS[state.level].name,`<p>${esc(LEVELS[state.level].objective)}</p>`,[['繼續探索',resume]],LEVELS[state.level].tag);},700);}
function showTitle(){resetFinale();saved=loadGame(storage);state=newGame();held=null;selected=null;nearby=null;focusEntity=null;world.build();updateHUD();$('modal').hidden=true;$('title-screen').hidden=false;['hud','memory-hud','control-bar'].forEach(id=>$(id).hidden=true);$('continue-game').hidden=!saved.state;setMode('title');}
function ending(page){const pages=[
  ['清晨','你在現實中醒來。\n\n窗外，不再是停留不動的黃昏。\n手機裡有幾封未讀訊息。\n\n這一次，你沒有再把它翻面。'],
  ['改變，是開始','你決定聯絡可信任的人，尋求專業協助。\n\n家人不會因此立刻回到身邊。\n過去造成的傷害，也不會瞬間消失。\n\n但你終於願意，為自己的生活踏出第一步。'],
  ['醒來之前','醒來，不代表一切都能立刻回到從前；\n而是你終於願意面對明天。']
];const [title,copy]=pages[page];audio.speak(copy);modal(title,`<p class="${page===2?'quote':''}">${esc(copy)}</p>${page===2?`<p class="muted">五片記憶已找回 · 本次探索 ${Math.floor(state.elapsed/60)} 分 ${Math.floor(state.elapsed%60)} 秒<br>《夢隙：醒來之前》</p>`:''}`,page<2?[['繼續',()=>ending(page+1)]]:[['回到主畫面',showTitle]],'THE END / 夢隙','ending');}
function start(continuing=false){
  if(!continuing&&saved.state){modal('開始新的記憶？','<p>新的旅程會取代這個瀏覽器中的遊戲進度。</p>',[['開始新旅程',()=>{saved={state:null};begin(false)}],['返回',()=>{$('modal').hidden=true;setMode('title')} ,'secondary']]);return;}
  begin(continuing);
}
function begin(continuing){resetFinale();state=continuing&&saved.state?structuredClone(saved.state):newGame();audio.init();held=null;selected=null;nearby=null;focusEntity=null;world.build();updateHUD();$('title-screen').hidden=true;['hud','memory-hud','control-bar'].forEach(id=>$(id).hidden=false);if(state.completed[state.level]){complete();return;}if(!continuing)persist();
  const body=document.createElement('div');body.innerHTML=`<p>你在陌生的房間睜開眼睛。窗外停留在黃昏，時鐘不再走動。紙條上寫著：</p><p class="quote">找到五個記憶碎片，<br>就能回到現實。</p><div class="tutorial-grid"><span><kbd>WASD</kbd> 移動，滑鼠直接環視</span><span><kbd>左鍵雙擊</kbd> 準星對準物件互動</span><span><kbd>R</kbd> 檢視 · 拖曳旋轉</span><span><kbd>G</kbd> 放下手持物件</span><span><kbd>Tab</kbd> 開關右側背包</span><span><kbd>H</kbd> 任務提示</span><span><kbd>Esc</kbd> 退出介面／暫停</span><span><kbd>N</kbd> 探索導覽</span></div><p class="muted">平常隱藏游標，直接移動滑鼠環視。對準附近物件按 E 或雙擊操作；按一下 Alt 顯示游標，再按一下恢復。背包與解謎會自動顯示游標。</p>`;
  modal(continuing?'記憶還在這裡':'你醒來了',continuing?`<p>${esc(LEVELS[state.level].objective)}</p>`:body,[[continuing?'繼續探索':'走進房間',resume]],continuing?LEVELS[state.level].tag:'PROLOGUE / 序章');
}
function preview(body,kind,onRotate){
  const p=createInspector(body,kind),canvas=p.canvas;inspector=p;let last=null;
  canvas.onpointerdown=e=>{last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!last||inspector!==p)return;p.group.rotation.y+=(e.clientX-last[0])*.014;p.group.rotation.x=Math.max(-.7,Math.min(.7,p.group.rotation.x+(e.clientY-last[1])*.008));last=[e.clientX,e.clientY];onRotate?.(p.group.rotation.y);};
  canvas.onpointerup=canvas.onpointercancel=()=>last=null;return p;
}
function itemPicture(entry){const wrap=text('span','','inventory-picture');try{const image=document.createElement('img');image.src=thumbnails.get(entry.kind);image.alt=entry.name;image.draggable=false;wrap.append(image);}catch(error){console.warn('物品縮圖暫時無法顯示',entry.id,error);wrap.append(text('span','◇'));}return wrap;}
function updateInventoryHUD(){
  const entries=inventoryEntries(state,held);
  if(held&&(ITEMS[held]||/^memory[0-4]$/.test(held)||['moon','rabbit','vase','flashlight'].includes(held))&&!entries.some(e=>e.id===held)){held=null;selected=null;}
}
function toggleInventory(){if(mode==='panel'&&$('panel').classList.contains('inventory-panel'))closePanel();else showInventory();}
function showInventory(){
  if(['title','projection','recovering','render-error'].includes(mode))return;
  const body=openPanel('隨身物品','BACKPACK / 已收集的物品');$('panel').classList.add('inventory-panel');$('panel').setAttribute('aria-modal','false');$('inventory-button').setAttribute('aria-expanded','true');$('quick-controls').inert=false;
  const entries=inventoryEntries(state,held),grid=text('div','','inventory-grid');body.append(grid);
  const status=text('p','','inventory-selection');status.setAttribute('aria-live','polite');
  function refreshSelection(){for(const tile of grid.querySelectorAll('button')){const active=tile.dataset.itemId===held;tile.classList.toggle('selected',active);tile.setAttribute('aria-pressed',String(active));}const active=entries.find(e=>e.id===held);status.textContent=active?`已選取：${active.name} · ${active.note}`:'點選物品即可裝備';}
  for(const entry of entries){const tile=btn('',()=>{selected=entry.id;held=entry.id;updateInventoryHUD();refreshSelection();},'inventory-card');tile.dataset.itemId=entry.id;tile.setAttribute('aria-label',`選取${entry.name}`);add(tile,itemPicture(entry),text('strong',entry.name),text('small',entry.note));tile.classList.toggle('used',!!entry.used);grid.append(tile);}
  if(!entries.length)grid.append(text('p','本關尚未取得物品。探索找到後會顯示在這裡。','inventory-empty'));
  body.append(status,text('p','Tab / Esc 收起 · 關閉後按 R 檢視','inventory-help'));refreshSelection();
}
function showHints(){const body=openPanel('留給自己的提示','HINT / H');const meta=LEVELS[state.level];add(body,text('p',state.levels[state.level].triggered?meta.hint:meta.objective));add(body,btn('多想起一點',()=>{if(body.querySelector('.hint-copy'))return;hintDepth++;const p=text('p',meta.deepHint,'hint-copy');body.append(p);},'secondary'));add(body,text('p','先觀察，再嘗試。錯放的物件可以取回，沒有強制倒數。','panel-note'));}
function showNavigation(){const body=openPanel('環顧這個地方','EXPLORE / 輔助探索');$('panel').classList.add('optics-panel');body.classList.add('navigation-body');add(body,text('p','選擇目前可見的物件，沿通路走近，再以準星雙擊或 E 操作。WASD 可取消導覽。','panel-note'));
  const list=world.visibleEntities();for(const e of list){const center=new T.Box3().setFromObject(e.group).getCenter(new T.Vector3()),distance=Math.hypot(center.x-world.camera.position.x,center.z-world.camera.position.z);const b=btn(e.name,()=>{const start=[world.camera.position.x,world.camera.position.z];const path=findPath(start,[center.x,center.z],world.bounds,world.blocks,p=>world.approachable(e,new T.Vector3(p[0],1.65,p[1])));closePanel();if(!path.length&&!world.near(e))return toast('路線被家具擋住了，試著從另一側靠近。');navigation=path;navTarget=e;if(!path.length)arrive();else toast(`正在走向：${e.name}`);},'nav-item');b.append(text('span',`${distance.toFixed(1)} m →`));body.append(b);}}
function arrive(){navigation=[];if(navTarget){const p=world.focusPoint(navTarget)||new T.Box3().setFromObject(navTarget.group).getCenter(new T.Vector3());world.camera.lookAt(p);world.camera.rotation.order='YXZ';nearby=world.near(navTarget)?navTarget:null;focusEntity=nearby;if(!nearby)toast('前方仍有遮擋。請調整位置，或先移開家具。');else toast(navTarget.name);}navTarget=null;}
function showInspection(kind,label){const body=openPanel(label,'INSPECT / 拖曳旋轉');held=kind;updateInventoryHUD();const p=preview(body,kind);add(body,text('p','按住上方物件拖曳，從不同角度查看；R 或 Esc 離開。','panel-note'));const row=document.createElement('div');row.className='button-row';add(row,btn('向左轉 90°',()=>p.group.rotation.y-=Math.PI/2),btn('向右轉 90°',()=>p.group.rotation.y+=Math.PI/2));body.append(row);}
function showShadow(index){if(state.completed[0]||shadowAligned(state.levels[0].shadow[index],SHADOW_TARGETS[index]))return toast('這件物品已固定在記憶裡。');const body=openPanel(['月亮燈','兔子玩偶','花瓶'][index],'OBJECT');held=['moon','rabbit','vase'][index];updateInventoryHUD();preview(body,held);const v=state.levels[0].shadow[index], inputs={};
  for(const [key,label,min,max,step,value] of [['x','左右位置',-4.4,4.4,.1,v.x],['z','前後位置',-3,2.5,.1,v.z],['angle','旋轉角度',0,315,45,v.angle]]){const l=text('label',`${label}　`),out=text('span',String(value)),input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;input.setAttribute('aria-label',label);inputs[key]=input;l.append(out,input);body.append(l);input.addEventListener('input',()=>{out.textContent=input.value;const result=dispatch({type:'SHADOW',index,x:Number(inputs.x.value),z:Number(inputs.z.value),angle:Number(inputs.angle.value)},{silent:true});if(!result.ok){const current=state.levels[0].shadow[index];for(const key of ['x','z','angle'])inputs[key].value=current[key];out.textContent=input.value;}if(mode==='panel')refresh();});}
  function refresh(){if(inspector)inspector.group.rotation.y=state.levels[0].shadow[index].angle*Math.PI/180;}
  panelRefresh=refresh;refresh();add(body,btn('放下',closePanel,'primary'));
}
function showSlot(slot){const body=openPanel({key:'房子凹槽',drawing:'家庭回憶凹槽',letter:'信件凹槽'}[slot],'PLACE / 選擇道具');add(body,text('p','凹槽上的圖案，對應一件你曾經擁有的東西。'));const usable=inventoryEntries(state).filter(e=>['key','drawing','letter'].includes(e.id)&&!e.used);for(const {id} of usable){body.append(btn(`放入：${ITEMS[id]}`,()=>{const r=dispatch({type:'SLOT',slot,id});if(r.ok&&!r.completedNow)closePanel();},'item-tile'));}if(!usable.length)body.append(text('p','還沒有尚待放入的物品。'));}
function showPhoto(){
  const body=openPanel('把那一天拼回來','MEMORY STUDY / 照片修復');$('panel').classList.add('puzzle-panel');
  const l=()=>state.levels[2];let chosen=null;
  add(body,text('p','點選照片讓邊框亮起，再旋轉、拖放或交換；點空格放下，Q / E 也可旋轉。','puzzle-intro'));
  const toolbar=document.createElement('div');toolbar.className='photo-toolbar';const status=text('p','尚未選取碎片');status.setAttribute('aria-live','polite');
  const left=btn('↶ 左轉 90°',()=>rotate(-90)),right=btn('右轉 90° ↷',()=>rotate(90)),remove=btn('取回這一片',()=>{if(chosen){dispatch({type:'REMOVE_PHOTO',id:chosen},{silent:true});refresh();}});
  add(toolbar,status,left,right,remove);body.append(toolbar);
  const work=document.createElement('div');work.className='photo-workspace';const grid=document.createElement('div');grid.className='photo-grid';grid.setAttribute('aria-label','九片照片相框');const tray=document.createElement('div');tray.className='piece-tray';add(work,grid,tray);body.append(work);
  const progress=text('p','','puzzle-progress');body.append(progress);const inspect=btn('拿下照片，看看另一面',showCompletePhoto,'primary');body.append(inspect);
  function rotate(delta){if(!chosen)return;dispatch({type:'ROTATE_PHOTO',id:chosen,delta},{silent:true});refresh();}
  function choose(id){chosen=id;refresh();}
  function place(slot){if(!chosen)return toast('先點選一片照片，讓邊框亮起。');dispatch({type:'PHOTO',slot,id:chosen,angle:l().pieceAngles[Number(chosen[1])]},{silent:true});refresh();}
  function highlight(){body.querySelectorAll('[data-piece]').forEach(b=>{b.classList.toggle('piece-selected',b.dataset.piece===chosen);b.setAttribute('aria-pressed',String(b.dataset.piece===chosen));});left.disabled=right.disabled=!chosen;remove.disabled=!l().photos.some(v=>v?.id===chosen);status.textContent=chosen?`正在操作 ${ITEMS[chosen]} · ${l().pieceAngles[Number(chosen[1])]}°`:'尚未選取碎片 · 點一下照片';}
  function tile(id,slot=null){const v=slot===null?null:l().photos[slot],b=btn('',()=>id?choose(id):place(slot),slot===null?'piece-tile':`photo-slot ${id?'':'empty'}`);
    b.setAttribute('aria-label',slot===null?`選取${ITEMS[id]}`:`相框格 ${slot+1}${id?' · '+ITEMS[id]:' · 空位'}`);
    if(id){b.dataset.piece=id;b.draggable=true;const img=text('span','','piece-image'),n=Number(id[1]);img.style.backgroundImage=`url('${state.levels[2].triggered?HORROR_FAMILY_URL:FAMILY_URL}')`;img.style.backgroundPosition=`${n%3*50}% ${Math.floor(n/3)*50}%`;img.style.transform=`rotate(${v?.angle??l().pieceAngles[n]}deg)`;b.append(img);if(slot===null)b.append(text('span',PHOTO_CODES[n],'piece-code'));
      b.addEventListener('dragstart',e=>{chosen=id;highlight();e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';});
    }else b.append(text('span','+'));
    if(slot!==null){b.addEventListener('dragover',e=>{e.preventDefault();b.classList.add('drop-target');});b.addEventListener('dragleave',()=>b.classList.remove('drop-target'));b.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(PHOTO_IDS.includes(id)&&state.inventory.includes(id)){chosen=id;place(slot);}});}
    return b;
  }
  function refresh(){grid.replaceChildren();for(let i=0;i<9;i++)grid.append(tile(l().photos[i]?.id||null,i));tray.replaceChildren(text('p','手邊的碎片','tray-label'));for(const id of PHOTO_TRAY.filter(id=>state.inventory.includes(id)&&!l().photos.some(v=>v?.id===id)))tray.append(tile(id));
    const count=l().collected.filter(id=>PHOTO_IDS.includes(id)).length;progress.textContent=`已尋回 ${count} / 9 片 · 依人物、色彩與裂痕接起畫面。`;
    inspect.disabled=!l().photos.every((v,i)=>v?.id===`p${i}`&&angleDistance(v.angle,0)<1);highlight();
  }
  photoController={rotate};refresh();
}
function showCompletePhoto(){const body=openPanel('照片的另一面','INSPECT / 翻面查看');let facing=false;const copy=text('p','相片背面似乎有字。拖曳旋轉照片，或按下方按鈕翻面。','read-text');const read=btn('讀取背面訊息',()=>dispatch({type:'PHOTO_READ'}),'primary');read.disabled=true;const update=y=>{facing=Math.cos(y)<-.7;copy.textContent=facing?'我們曾經等過你很多次。\n這次，我帶孩子先離開了。':'相片背面似乎有字。拖曳旋轉照片，或按下方按鈕翻面。';read.disabled=!facing;};const p=preview(body,'photo',update);body.append(btn('翻到照片背面',()=>{p.group.rotation.y=Math.PI;update(Math.PI);}));add(body,copy,read);}
function projectionStart(){inspector?.dispose();inspector=null;$('panel').hidden=true;projectionTime=0;projectionPage=-1;setMode('projection');modal('記憶正在連結','<div id="projection-copy" class="projection"></div>',[],'MEMORY PROJECTION');mode='projection';audio.update();}
function activate(e){if(!e||mode!=='explore')return;const aimed=world.target();if(!world.near(e)&&aimed?.id!==e.id)return toast('請再靠近一些，或從另一側避開遮擋。');navigation=[];focusEntity=null;doubleClickAction(e)?.();}
const puzzleUI=createPuzzleUI({openPanel(title,kicker,wide=false){const host=openPanel(title,kicker);if(wide)$('panel').classList.add('optics-panel');return host;},closePanel,getState:()=>state,dispatch,projectionStart,toast,play(index,distorted){if(index==='all'){audio.speak(RECORDINGS.map(t=>t.date+'。'+t.copy).join('。'));return;}const tape=RECORDINGS[index];if(!state.levels[3].collected.includes(tape.id)&&!state.completed[3])return toast('先找到這段錄音。');for(let n=0;n<tape.beats;n++)audio.tone(distorted?90+index*13:330+index*80,n*.34);audio.speak((distorted?'失真的訊號。':'')+tape.date+'。'+tape.copy);}});
function handle(a){if(a.type==='CLOCK_UI')return showClock();if(a.type==='SEAL_UI')return showSeal();if(a.type==='PHONE_NOTE')return modal('未接來電','<p>08:10，孩子打來第一通電話。<br>座鐘停在另一個時刻。<br><br>17:40：你說今晚會回家。<br>21:05：活動已經結束。<br>23:55：無人接聽。</p>',[['收好手機',resume]],'MISSED CALLS');if(a.type==='BOARD_UI')return puzzleUI.board();if(a.type==='LAMP_UI')return puzzleUI.lamp(a.index);if(a.type==='CIRCUIT_UI'){if(!state.levels[4].triggered)return toast('先讀桌上的求助信，配電箱還沒有回應。');return puzzleUI.circuit();}if(a.type==='SOUND_CUE'){if(state.level!==1||!state.levels[1].triggered)return toast('先拿起手機，才能聽見走廊裡的回憶。');const cue=['child','keys','argument','call'][a.index];audio.play(cue);toast(['門後傳來孩子的笑聲。','門後傳來鑰匙碰撞聲。','門後傳來爭吵聲。','門後傳來無人接聽的電話聲。'][a.index]);return;}if(a.type==='DECOR'){if(a.name==='木製音樂盒'&&a.active)[523,659,784,659,587,523].forEach((note,i)=>audio.tone(note,i*.24));else audio.tone(220);toast(a.copy);return;}if(a.type==='MANIPULATE')return showShadow(a.index);if(a.type==='SLOT_UI')return showSlot(a.slot);if(a.type==='PHOTO_UI')return showPhoto();if(a.type==='MEMORY_UI')return puzzleUI.projector();
  if(a.type==='MAIL_UI'){const body=openPanel('寄出那封信','MAIL / 最後的選擇');body.append(text('p',state.levels[4].projectionDone?'這次，你想把那些從未說出口的話，送到另一個人手裡。':'先修復電路、依序點亮三盞燈，再完成中央裝置的投影。','read-text'));body.append(btn('投入第二關未寄出的信',()=>dispatch({type:'MAIL'}),'primary'));return;}
  if(a.type==='READ'){const body=openPanel('家庭照片','A FADED MEMORY');preview(body,'photo');body.append(text('p',state.completed[0]?'家人的輪廓逐漸清晰，但你的臉仍然模糊。':'你覺得自己應該認識照片裡的人，卻想不起名字。'));return;}
  if(a.type==='EXIT'){if(state.completed[state.level])complete();else toast('出口仍然關著。這段記憶還沒有完整。');return;}
  const r=dispatch(a);if(r.ok&&a.type==='FLASHLIGHT')held='flashlight';if(r.ok&&a.type==='COLLECT')held=a.id;if(r.ok&&a.type==='TAKE_SHADOW')held=['moon','rabbit','vase'][a.index];updateInventoryHUD();if(r.ok&&a.type==='TAKE_SHADOW')showShadow(a.index);if(r.ok&&a.type==='TRIGGER'&&state.level===4)modal('寫給自己的求助信','<p>我一直想逃離自己的問題，卻沒有發現，逃避並沒有讓一切變好。<br><br>如果我還想重新開始，就必須承認發生過的事情，面對自己造成的影響，並願意接受幫助。</p>',[['收好信，繼續探索',resume]],'TO MYSELF');
}
function updateSettings(){
  for(const [id,off,label,tip] of [['sound-button',muted,muted?'開啟聲音':'關閉聲音',muted?'聲音已關閉 · 點擊開啟':'聲音開啟 · 點擊關閉'],['effects-button',!effectsEnabled,effectsEnabled?'關閉眼睛與水面動態特效':'開啟眼睛與水面動態特效',effectsEnabled?'動態特效開啟 · 點擊關閉':'動態特效已關閉 · 點擊開啟']]){const b=$(id);b.setAttribute('aria-pressed',String(off));b.setAttribute('aria-label',label);b.dataset.tip=tip;}
  document.body.classList.toggle('low-effects',!effectsEnabled);world.setEffects(effectsEnabled);
}
function toggleSound(){muted=!muted;if(muted&&'speechSynthesis'in window)speechSynthesis.cancel();audio.update();updateSettings();toast(muted?'聲音已關閉':'聲音已開啟');}
function toggleEffects(){effectsEnabled=!effectsEnabled;updateSettings();toast(effectsEnabled?'眼睛與水面動態已開啟':'眼睛與水面動態已關閉');}
function showClock(){const body=openPanel('停住的座鐘','TIME / 來電發生的時刻');const l=()=>state.levels[1];body.append(text('p','手機記得孩子第一通來電的時刻。讓座鐘也記起它。'));const face=text('div','','clock-face');body.append(face);const values={};
  for(const [key,label,max]of [['hour','時針',11],['minute','分針',59]]){const wrap=text('label',label),input=document.createElement('input');input.type='range';input.min=0;input.max=max;input.step=key==='minute'?5:1;input.value=key==='hour'?l().clockHour:l().clockMinute;input.setAttribute('aria-label',label);values[key]=input;wrap.append(input);body.append(wrap);input.oninput=()=>{dispatch({type:'CLOCK_SET',hour:Number(values.hour.value),minute:Number(values.minute.value)},{silent:true});refresh();};}
  function refresh(){face.replaceChildren();for(const [cls,angle]of [['hour',(l().clockHour+l().clockMinute/60)*30],['minute',l().clockMinute*6]]){const hand=text('span','',cls+'-hand');hand.style.transform=`rotate(${angle}deg)`;face.append(hand);}face.setAttribute('aria-label',`${l().clockHour}:${String(l().clockMinute).padStart(2,'0')}`);}
  body.append(btn('試著打開上蓋',()=>{const r=dispatch({type:'SEARCH',id:'clock'});if(r.ok)closePanel();},'primary'));refresh();}
function showSeal(){const body=openPanel('三個圖形的信匣','A CHILD’S MEMORY');body.append(text('p','舊鑰匙吻合鎖孔，三個轉盤卻還沒鬆開。孩子的畫裡，由左到右留下了什麼？'));const l=()=>state.levels[1],row=text('div','','seal-dials'),icons=['⌂','♧','☾'];body.append(row);function refresh(){row.replaceChildren();l().seal.forEach((value,index)=>{const b=btn(icons[value],()=>{dispatch({type:'SEAL_SET',index,value:(value+1)%3},{silent:true});refresh();});b.setAttribute('aria-label',`圖形轉盤 ${index+1}：${icons[value]}`);row.append(b);});}body.append(btn('用鑰匙打開信匣',()=>{const r=dispatch({type:'SEARCH',id:'letterbox'});if(r.ok)closePanel();},'primary'));refresh();}
function showControls(page=0){const pages=[['探索與互動','WASD 移動。滑鼠直接環視，平常隱藏游標。按一下 Alt 顯示游標並停止環視，再按一下恢復。上下可看至85度。','準星對準附近物件，按 E 或左鍵連點兩下互動；牆壁與距離會阻擋操作。'],['背包與物品','Tab 開關右側背包，或先按 Alt 再點右上角背包。點縮圖選物；叉叉、Tab、Esc 收起。','R 檢視選取物品，拖曳旋轉；R／Esc 離開。G 放下。解謎介面自動顯示游標，滑鼠不帶動視角。'],['右上角功能','先按 Alt 顯示游標。燈泡開啟提示，喇叭切換全部聲音，星芒切換眼睛與水面動態。','H 查看提示，N 開啟探索導覽。水中行動較慢，WASD 可取消導覽。'],['提示與暫停','探索中按 Esc 暫停；介面中先關閉目前面板。失焦時暫停，回來可繼續原進度。','每件影子對齊後固定。第五關完成投影後，走進第六關黑暗中的信箱，投入信件結束。']];const body=openPanel('操作說明',`HOW TO PLAY / ${page+1} OF 4`);const [title,...copy]=pages[page];body.append(text('h3',title),...copy.map(v=>text('p',v)));const row=text('div','','button-row');if(page>0)row.append(btn('上一頁',()=>showControls(page-1)));if(page<3)row.append(btn('下一頁',()=>showControls(page+1),'primary'));body.append(row);}
function pause(){modal('把時間停在這裡','<p>記憶不會催促你。準備好了，就繼續走。</p>',[['繼續探索',resume],['操作說明',()=>showControls(),'secondary'],['回到主畫面',showTitle,'secondary']],'PAUSE');}
function move(dx,dz){const p=world.camera.position,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));for(let i=0;i<n;i++){if(walkable(p.x+dx/n,p.z,world.bounds,world.blocks))p.x+=dx/n;if(walkable(p.x,p.z+dz/n,world.bounds,world.blocks))p.z+=dz/n;}}
function frame(now){requestAnimationFrame(frame);if(document.hidden||renderFailed||renderContext?.lost){elapsedLast=now;return;}try{const dt=Math.min((now-elapsedLast)/1000,1);elapsedLast=now;
  if(mode==='explore'||mode==='panel'||mode==='projection')state.elapsed+=dt;
  if(mode==='explore'&&!controlHover){
    mouseLook.tick(dt);const speed=movementSpeed(world.wadingAt(world.camera.position.x,world.camera.position.z));$('movement-state').textContent=world.wadingAt(world.camera.position.x,world.camera.position.z)?'水淹區 · 行動變慢':'';
    let x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);if(x||z){navigation=[];navTarget=null;focusEntity=null;const n=Math.hypot(x,z);x/=n;z/=n;const yaw=world.camera.rotation.y;move((x*Math.cos(yaw)+z*Math.sin(yaw))*dt*speed,(-x*Math.sin(yaw)+z*Math.cos(yaw))*dt*speed);}
    else if(navigation.length){let budget=dt*movementSpeed(world.wadingAt(world.camera.position.x,world.camera.position.z),true);while(navigation.length&&budget>0){const p=navigation[0],dx=p[0]-world.camera.position.x,dz=p[1]-world.camera.position.z,dist=Math.hypot(dx,dz);if(dist<.001){navigation.shift();continue;}const step=Math.min(dist,budget);move(dx/dist*step,dz/dist*step);world.camera.rotation.y=Math.atan2(-dx,-dz);world.camera.rotation.x=0;budget-=step;if(step<.001)break;}if(!navigation.length)arrive();}
    const target=world.target();$('crosshair').hidden=false;if(focusEntity&&(!focusEntity.group.visible||!world.near(focusEntity)))focusEntity=null;nearby=focusEntity||target;$('interact').hidden=!nearby;$('interact-name').textContent=nearby?.name||'';
  }else $('interact').hidden=true;
  if(mode==='projection'){projectionTime+=dt;const page=Math.min(3,Math.floor(projectionTime/5));if(page!==projectionPage){projectionPage=page;const el=$('projection-copy');if(el)el.textContent=PROJECTION[page];audio.speak(PROJECTION[page]);}if(projectionTime>=20){$('modal').hidden=true;dispatch({type:'PROJECTION_END'});}}
  if(state.level===5)updateFinale(dt);else finaleOverlay.hidden=true;
  world.tick(now*.001);if(mode==='title'){world.camera.position.set(1.5+Math.sin(now*.00008)*.15,2.1,5.5);world.camera.lookAt(-1,1,-1.4);}if(now-lastRender>33){world.render();inspector?.render();lastRender=now;}}catch(error){renderProblem(error);}
}
try{
  world=createWorld($('world'),()=>state,handle);mouseLook=createMouseLook({edgeTurn:true,canvas:$('world'),documentRef:document,onLook(dx,dy){navigation=[];navTarget=null;focusEntity=null;turnView(world.camera.rotation,dx,dy);},onUnlock(){if(mode==='explore')pause();},onDenied(){}});inputMode=createExploreInput({look:mouseLook,onChange:syncInput});$('new-game').disabled=false;$('new-game').textContent='睜開眼睛　→';$('continue-game').hidden=!saved.state;if(saved.error)$('load-message').textContent=saved.error;
  monitorRendering();$('new-game').onclick=()=>start(false);$('continue-game').onclick=()=>start(true);$('panel-close').onclick=closePanel;$('hint-button').onclick=showHints;$('inventory-button').onclick=event=>{if(event.detail<2)toggleInventory();};$('inventory-button').ondblclick=()=>{if(!($('panel').classList.contains('inventory-panel')&&!$('panel').hidden))showInventory();};$('pause-button').onclick=pause;$('interact').onclick=event=>{if(event.detail<2)activate(nearby);};$('sound-button').onclick=toggleSound;$('effects-button').onclick=toggleEffects;updateSettings();
  $('world').tabIndex=0;

  addEventListener('keydown',e=>{if(e.code==='AltLeft'||e.code==='AltRight'){e.preventDefault();if(!e.repeat&&inputMode.toggle())toast(inputMode.cursor?'游標已顯示 · 再按 Alt 恢復環視':'直接移動滑鼠環視');return;}if(['Tab','Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyG','KeyR','KeyH','KeyN','Escape'].includes(e.code)&&mode!=='title'&&!(e.code==='Space'&&e.target.closest?.('#quick-controls')))e.preventDefault();if(e.repeat)return;if(controlHover&&mode==='explore'&&['KeyW','KeyA','KeyS','KeyD'].includes(e.code))return;if(mode==='panel'&&photoController){if(['KeyQ','KeyE'].includes(e.code)){e.preventDefault();photoController.rotate(e.code==='KeyQ'?-90:90);return;}if(e.code==='Tab')return;}
    if(e.code==='Escape'){if(mode==='panel')closePanel();else if(mode==='explore')pause();return;}
    if(['title','modal','projection','recovering','render-error'].includes(mode))return;
    if(e.code==='Tab'){mode==='panel'?closePanel():showInventory();return;}
    if(e.code==='KeyR'){if(mode==='panel')closePanel();else if(state.level===0&&['moon','rabbit','vase'].includes(held))showShadow(['moon','rabbit','vase'].indexOf(held));else if(held)showInspection(held,inventoryEntries(state,held).find(e=>e.id===held)?.name||ITEMS[held]||'手持物件');else toast('先拿起一件可以檢視的物品。');return;}
    if(mode!=='explore')return;keys.add(e.code);if(e.code==='KeyE')activate(nearby);if(e.code==='KeyH')showHints();if(e.code==='KeyN')showNavigation();if(e.code==='KeyG'){held=null;selected=null;updateInventoryHUD();toast('你放下了手持物件。已收集的任務物品仍保存在物品欄。');}
  });
  $('world').addEventListener('dblclick',event=>{if(inputMode.active&&mouseLook.canDoubleClick(event)&&doubleClickPickup(event,{mode,canvas:$('world'),aim:'reticle',world})){event.preventDefault();navigation=[];navTarget=null;focusEntity=null;}});
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{inputMode.blur();keys.clear();navigation=[];if(mode==='explore')pause();});
  $('world').addEventListener('pointerdown',event=>mouseLook.down(event));
  addEventListener('pointerup',event=>mouseLook.up(event));addEventListener('pointercancel',event=>mouseLook.up(event));$('world').addEventListener('lostpointercapture',event=>mouseLook.up(event));
  addEventListener('pointermove',event=>{if(mode==='explore'&&event.target===$('world')){cursorAim=cursorRay(event,$('world'));if(!mouseLook.dragging)focusEntity=null;}mouseLook.move(event);});
  requestAnimationFrame(frame);
}catch(error){console.error(error);$('fatal').hidden=false;$('fatal-message').textContent='請確認瀏覽器已啟用硬體加速與 WebGL，並透過 README 的本機網址開啟遊戲。'+error.message;}
