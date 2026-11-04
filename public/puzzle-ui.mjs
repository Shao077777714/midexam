import {RECORDINGS,PARTS,PART_NAMES,LAMP_NAMES,circuitStatus,portsAt,lampsReady} from './puzzles.mjs';
export function createPuzzleUI({openPanel,closePanel,getState,dispatch,projectionStart,toast}){
  const el=(tag,copy='',cls='')=>{const e=document.createElement(tag);e.textContent=copy;e.className=cls;return e;};
  const button=(copy,fn,cls='secondary')=>{const b=el('button',copy,cls);b.type='button';b.onclick=fn;return b;};
  const row=(host)=>{const r=el('div','','button-row');host.append(r);return r;};
  const say=(host,copy)=>{const e=el('p',copy);host.append(e);return e;};
  function board(){
    const host=openPanel('重建記憶總機','TIMELINE / 爸爸錯過的那些日子',true);host.classList.add('mechanism-body');
    const l=()=>getState().levels[3];let chosen=0;
    say(host,'找齊五段錄音。選一段閱讀，依日期由早到晚加入時間線，再接通總機。已排列的錄音可取回重排。');
    const status=el('p','','mechanism-status');host.append(status);
    const workspace=el('div','','recording-workspace'),list=el('div','','recording-index'),detail=el('section','','recording-card');workspace.append(list,detail);host.append(workspace);
    const feedback=el('p','','mechanism-feedback');feedback.hidden=true;
    const activate=button('接通記憶總機',()=>{const r=dispatch({type:'ACTIVATE_BOARD'});if(!r.completedNow){refresh();feedback.hidden=false;feedback.textContent=r.message;}},'primary');
    function refresh(){
      feedback.hidden=true;feedback.textContent='';const found=RECORDINGS.filter(t=>l().collected.includes(t.id)).length;
      status.textContent=`已尋回 ${found} / 5 段錄音 · 時間線：`+(l().recordOrder.length?l().recordOrder.map(i=>RECORDINGS[i].date.split(' · ')[0]).join(' → '):'尚未排列');
      list.replaceChildren();
      for(const i of [3,1,4,0,2]){const t=RECORDINGS[i],owned=l().collected.includes(t.id),order=l().recordOrder.indexOf(i);
        const b=button('',()=>{chosen=i;refresh();},'recording-index-item');b.setAttribute('aria-label',`查看${t.name}`);b.setAttribute('aria-pressed',String(chosen===i));
        b.append(el('strong',t.date),el('span',owned?`${t.name}${order>=0?` · 第${order+1}段`:''}`:'尚未尋回'));list.append(b);
      }
      const t=RECORDINGS[chosen];detail.replaceChildren(el('h3',t.name),el('p',t.date,'recording-date'));
      if(l().collected.includes(t.id)){
        detail.append(el('p',t.copy,'transcript'));
        const arrange=button(`排列${t.name}`,()=>{dispatch({type:'RECORD_ORDER',index:chosen},{silent:true});refresh();});arrange.dataset.order=chosen;arrange.setAttribute('aria-pressed',String(l().recordOrder.includes(chosen)));detail.append(arrange);
      }else say(detail,'探索檔案匣、答錄機、木櫃、孩子的留言匣與角落矮櫃。');
      activate.disabled=found<5||l().recordOrder.length<5;
    }
    host.append(feedback,activate);refresh();
  }
  function lamp(index){
    const host=openPanel(`${LAMP_NAMES[index]}的燈`,'LIGHT / 修復與點亮'),l=()=>getState().levels[4];
    const status=say(host,l().installed[index]?'燈具完整。':`燈具缺少${PART_NAMES[index]}。`);
    const install=button(`裝上${PART_NAMES[index]}`,()=>{const r=dispatch({type:'INSTALL',index,id:PARTS[index]});if(r.ok)refresh();});host.append(install);
    const turn=button(`點亮${LAMP_NAMES[index]}的燈`,()=>{const r=dispatch({type:'LAMP',index});if(r.ok)refresh();},'primary');host.append(turn);
    function refresh(){install.disabled=l().installed[index]||!l().collected.includes(PARTS[index]);turn.disabled=!l().triggered||l().lampOrder.includes(index);status.textContent=`${l().installed[index]?'燈具已修復':`還需要${PART_NAMES[index]}`} · ${l().lampOrder.includes(index)?'亮著':'尚未亮起'}`;}refresh();
  }
  function circuit(){
    const host=openPanel('修復配電箱','CIRCUIT / 讓清晨重新亮起',true),l=()=>getState().levels[4];host.classList.add('mechanism-body','circuit-body');
    say(host,'左側電源沿銅片流向右側三盞燈。點一下導電片旋轉90°；按住並拖到另一格才交換位置。放到格外或原格會取消。');
    say(host,'牆面痕跡：電源先進入中央左側的分岔，向上、向右、向下延伸，再分別轉向右邊三個燈具接口。');
    const status=el('p','','mechanism-status');host.append(status);
    const layout=el('div','','circuit-layout'),source=el('span','⏻','circuit-source'),grid=el('div','','circuit-grid'),ends=el('div','','circuit-ends');for(const name of LAMP_NAMES)ends.append(el('span',name));layout.append(source,grid,ends);host.append(layout);
    let gesture=null,suppressClickUntil=0;
    function refresh(){
      const v=circuitStatus(l()),locked=l().projecting||l().projectionDone;grid.replaceChildren();
      for(let i=0;i<9;i++){
        const b=button('',()=>{if(locked||performance.now()<suppressClickUntil)return;dispatch({type:'CIRCUIT_ROTATE',index:i},{silent:true});refresh();},'circuit-cell');
        b.disabled=locked;b.draggable=false;b.setAttribute('aria-label',`導電片 ${i+1}`);b.setAttribute('title','單擊旋轉；按住拖移交換');b.dataset.piece=l().circuit[i];b.dataset.angle=l().circuitAngles[i];b.classList.toggle('powered',v.reached.includes(i));
        const hitCell=e=>{const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.circuit-cell');return [...grid.children].indexOf(target);};
        const clearPaint=()=>{for(const cell of grid.children)cell.classList.remove('dragging','drop-target');};
        b.onpointerdown=e=>{if(locked||e.button!==0)return;gesture={index:i,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture?.(e.pointerId);};
        b.onpointermove=e=>{if(!gesture)return;gesture.moved ||= Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8;if(!gesture.moved)return;e.preventDefault();clearPaint();b.classList.add('dragging');const target=grid.children[hitCell(e)];target?.classList.add('drop-target');};
        b.onpointerup=e=>{const g=gesture;gesture=null;if(!g)return;const moved=g.moved||Math.hypot(e.clientX-g.x,e.clientY-g.y)>8;if(!moved)return;e.preventDefault();suppressClickUntil=performance.now()+350;const slot=hitCell(e);clearPaint();if(!locked&&slot>=0&&slot!==g.index)dispatch({type:'CIRCUIT_SWAP',index:g.index,slot},{silent:true});refresh();};
        b.onpointercancel=b.onlostpointercapture=()=>{if(gesture?.moved)suppressClickUntil=performance.now()+350;gesture=null;clearPaint();};
        b.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="7"/>${portsAt(l(),i).map(p=>`<path d="M50 50 L${[50,100,50,0][p]} ${[0,50,100,50][p]}"/>`).join('')}</svg>`;grid.append(b);
      }
      status.textContent=`已通電接口 ${v.lamps.filter(Boolean).length} / 3${v.ready?' · 電路完整，回房間依時間點亮三盞燈。':''}`;
      [...ends.children].forEach((e,i)=>e.classList.toggle('powered',v.lamps[i]));
    }refresh();
  }

  function projector(){
    const host=openPanel('記憶投影裝置','DAWN / 當時間重新前進'),l=getState().levels[4];
    say(host,'過去讓我記起，現在讓我承認，未來是願意改變。三盞燈照亮之後，記憶才能重新播放。');
    say(host,`修復燈具 ${l.installed.filter(Boolean).length} / 3 · 電路 ${circuitStatus(l).ready?'接通':'斷開'} · 已亮起 ${l.lampOrder.map(i=>LAMP_NAMES[i]).join(' → ')||'無'}`);
    const b=button('啟動記憶投影',()=>{const r=dispatch({type:'PROJECT'});if(r.ok)projectionStart();},'primary');b.disabled=!lampsReady(l)||l.projectionDone;host.append(b);if(l.projectionDone)say(host,'投影已完成。第二關的信還在背包中，現在可以前往信箱。');
  }
  return {board,lamp,circuit,projector};
}
