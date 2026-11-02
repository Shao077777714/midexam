import {RECORDINGS,PARTS,PART_NAMES,LAMP_NAMES,circuitStatus,portsAt,lampsReady} from './puzzles.mjs';
export function createPuzzleUI({openPanel,closePanel,getState,dispatch,projectionStart,play,toast}){
  const el=(tag,copy='',cls='')=>{const e=document.createElement(tag);e.textContent=copy;e.className=cls;return e;};
  const button=(copy,fn,cls='secondary')=>{const b=el('button',copy,cls);b.type='button';b.onclick=fn;return b;};
  const row=(host)=>{const r=el('div','','button-row');host.append(r);return r;};
  const say=(host,copy)=>{const e=el('p',copy);host.append(e);return e;};
  function board(){
    const host=openPanel('重建記憶總機','TIMELINE / 把那些日子連起來',true);host.classList.add('mechanism-body');
    const l=()=>getState().levels[3];
    say(host,'找齊三段錄音，依卡片日期由早到晚加入時間線，再接通總機。再次點選已排列的錄音可取回重排。');
    const status=el('p','','mechanism-status');host.append(status);const list=el('div','','recording-list');host.append(list);const feedback=el('p','','mechanism-feedback');feedback.hidden=true;
    const activate=button('接通記憶總機',()=>{const r=dispatch({type:'ACTIVATE_BOARD'});if(r.completedNow)play('all',false);else{refresh();feedback.hidden=false;feedback.textContent=r.message;}},'primary');
    function refresh(){feedback.hidden=true;feedback.textContent='';const found=RECORDINGS.filter(t=>l().collected.includes(t.id)).length;
      status.textContent=`已尋回 ${found} / 3 段錄音。`+(l().recordOrder.length?l().recordOrder.map((i,n)=>`${n+1}. ${RECORDINGS[i].date}`).join(' → '):'時間線還是空白。');
      for(const b of list.querySelectorAll('[data-order]'))b.setAttribute('aria-pressed',String(l().recordOrder.includes(Number(b.dataset.order))));
      activate.disabled=found<3||l().recordOrder.length<3;
    }
    for(const i of [2,0,1]){const tape=RECORDINGS[i],card=el('section','','recording-card');list.append(card);card.append(el('h3',tape.name));
      if(!l().collected.includes(tape.id)){say(card,'尚未尋回 · 探索工作檔案匣、答錄機與鏡旁日記');continue;}
      card.append(el('p',tape.date,'recording-date'),el('p',tape.copy,'transcript'));
      card.append(button(`播放${tape.name}`,()=>play(i,false)));
      const b=button(`排列${tape.name}`,()=>{dispatch({type:'RECORD_ORDER',index:i},{silent:true});refresh();});b.dataset.order=i;card.append(b);
    }
    host.append(feedback,activate);say(host,'日期連起來後，總機會自動接線與調頻。靜音時也能閱讀所有訊息。');refresh();
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
    say(host,'左側電源沿銅片流向右側三盞燈。點選一格再旋轉；選取後點另一格交換。亮起的銅線代表真正接上電源。');
    say(host,'牆面痕跡：電源先進入中央左側的分岔，向上、向右、向下延伸，再分別轉向右邊三個燈具接口。','panel-note');
    let chosen=null;const status=el('p','','mechanism-status'),tools=row(host),rotate=button('↻ 旋轉選取導電片',()=>{if(chosen!==null){dispatch({type:'CIRCUIT_ROTATE',index:chosen},{silent:true});refresh();}}),clear=button('取消選取',()=>{chosen=null;refresh();});tools.append(rotate,clear);host.append(status);
    const layout=el('div','','circuit-layout'),source=el('span','⏻','circuit-source'),grid=el('div','','circuit-grid'),ends=el('div','','circuit-ends');for(const name of LAMP_NAMES)ends.append(el('span',name));layout.append(source,grid,ends);host.append(layout);
    function refresh(){const v=circuitStatus(l());grid.replaceChildren();for(let i=0;i<9;i++){const b=button('',()=>{if(chosen===null||chosen===i){chosen=chosen===i?null:i;refresh();}else{dispatch({type:'CIRCUIT_SWAP',index:chosen,slot:i},{silent:true});chosen=null;refresh();}},'circuit-cell');b.setAttribute('aria-label',`導電片 ${i+1}`);b.setAttribute('aria-pressed',String(chosen===i));b.classList.toggle('powered',v.reached.includes(i));b.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="7"/>${portsAt(l(),i).map(p=>`<path d="M50 50 L${[50,100,50,0][p]} ${[0,50,100,50][p]}"/>`).join('')}</svg>`;grid.append(b);}rotate.disabled=chosen===null;status.textContent=`已通電接口 ${v.lamps.filter(Boolean).length} / 3${v.ready?' · 電路完整，回房間依時間點亮三盞燈。':''}`;[...ends.children].forEach((e,i)=>e.classList.toggle('powered',v.lamps[i]));}refresh();
  }
  function projector(){
    const host=openPanel('記憶投影裝置','DAWN / 當時間重新前進'),l=getState().levels[4];
    say(host,'過去讓我記起，現在讓我承認，未來是願意改變。三盞燈照亮之後，記憶才能重新播放。');
    say(host,`修復燈具 ${l.installed.filter(Boolean).length} / 3 · 電路 ${circuitStatus(l).ready?'接通':'斷開'} · 已亮起 ${l.lampOrder.map(i=>LAMP_NAMES[i]).join(' → ')||'無'}`);
    const b=button('啟動記憶投影',()=>{const r=dispatch({type:'PROJECT'});if(r.ok)projectionStart();},'primary');b.disabled=!lampsReady(l)||l.projectionDone;host.append(b);if(l.projectionDone)say(host,'投影已完成。第二關的信還在背包中，現在可以前往信箱。');
  }
  return {board,lamp,circuit,projector};
}
