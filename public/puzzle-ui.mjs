import {RECORDINGS,LINE_NAMES,LINE_ICONS,PARTS,PART_NAMES,LAMP_NAMES,diagramReady,switchboardStatus,circuitStatus,portsAt,lampsReady} from './puzzles.mjs';
const SOCKET_ICONS=['△','○','◇'];
const paths='<g fill="none" stroke-width="4"><path stroke="#d6aa75" d="M15 30 H130 V170 H185"/><path stroke="#94c9af" d="M15 100 H60 V30 H185"/><path stroke="#bba6dc" d="M15 170 H100 V100 H185"/></g><g fill="#eee1c3" font-size="17" text-anchor="middle"><text x="15" y="25">▣</text><text x="15" y="95">⌂</text><text x="15" y="165">◉</text><text x="185" y="25">△</text><text x="185" y="95">○</text><text x="185" y="165">◇</text></g>';
export function createPuzzleUI({openPanel,closePanel,getState,dispatch,projectionStart,play,toast}){
  const el=(tag,copy='',cls='')=>{const e=document.createElement(tag);e.textContent=copy;e.className=cls;return e;};
  const button=(copy,fn,cls='secondary')=>{const b=el('button',copy,cls);b.type='button';b.onclick=fn;return b;};
  const row=(host)=>{const r=el('div','','button-row');host.append(r);return r;};
  const say=(host,copy)=>{const e=el('p',copy);host.append(e);return e;};
  function board(tab=0){
    const host=openPanel('重建記憶總機','SIGNAL / 那些未接的來電',true);host.classList.add('mechanism-body');
    const l=()=>getState().levels[3],tabs=row(host);
    ['錄音時間線','線路圖','接線面板','訊號旋鈕'].forEach((name,i)=>{const b=button(name,()=>board(i));b.setAttribute('aria-pressed',String(tab===i));tabs.append(b);});
    if(tab===0){
      say(host,'聽聽錄音裡留下的日期與敲擊聲。依發生時間點選錄音加入時間線，再次點選可取回。');
      const status=el('p','','mechanism-status');host.append(status);const list=el('div','','recording-list');host.append(list);
      const refresh=()=>{status.textContent=l().recordOrder.length?l().recordOrder.map(i=>RECORDINGS[i].name).join(' → '):'時間線還是空白。';for(const b of list.querySelectorAll('[data-order]'))b.setAttribute('aria-pressed',String(l().recordOrder.includes(Number(b.dataset.order))));};
      for(const i of [2,0,1]){const tape=RECORDINGS[i],card=el('section','','recording-card');list.append(card);card.append(el('h3',tape.name));
        if(!l().collected.includes(tape.id)){say(card,'尚未尋回 · 探索房間中的夾層');continue;}
        const copy=el('p','按播放查看逐字稿與節奏。','transcript');card.append(copy);
        card.append(button(`播放${tape.name}`,()=>{copy.textContent=`${tape.date}\n${tape.copy}\n敲擊節奏：${'●　'.repeat(tape.beats)}（${tape.beats} 拍）`;play(i,false);}));
        const b=button(`排列${tape.name}`,()=>{dispatch({type:'RECORD_ORDER',index:i},{silent:true});refresh();});b.dataset.order=i;card.append(b);
      }refresh();
    }else if(tab===1){
      say(host,'圖紙的裂口仍然連著銅線。選取碎片後旋轉，點空格放置；點其他格可交換，拖放也可交換。');
      let chosen=null;const status=el('p','','mechanism-status'),tools=row(host),left=button('↶ 旋轉選取圖紙',()=>rotate(-90)),right=button('旋轉選取圖紙 ↷',()=>rotate(90));tools.append(left,right);host.append(status);
      const workspace=el('div','','diagram-work'),grid=el('div','','diagram-grid'),tray=el('div','','diagram-tray');workspace.append(grid,tray);host.append(workspace);
      function rotate(delta){if(chosen===null)return;dispatch({type:'DIAGRAM_ROTATE',index:chosen,delta},{silent:true});refresh();}
      function put(slot){if(chosen===null)return toast('先點選一片圖紙。');dispatch({type:'DIAGRAM',index:chosen,slot},{silent:true});refresh();}
      function tile(id,slot=null){const b=button('',()=>{if(slot!==null&&(id===null||chosen!==null&&chosen!==id))put(slot);else{chosen=chosen===id?null:id;refresh();}},'diagram-piece');b.setAttribute('aria-label',slot===null?`選取線路圖碎片 ${['D','A','C','B'][id]}`:`圖紙格 ${slot+1}${id===null?' 空位':''}`);
        if(id!==null){b.setAttribute('aria-pressed',String(chosen===id));b.innerHTML=`<svg viewBox="${id%2*100} ${Math.floor(id/2)*100} 100 100" aria-hidden="true" style="transform:rotate(${l().diagramAngles[id]}deg)">${paths}</svg>`;b.draggable=true;b.ondragstart=e=>{chosen=id;e.dataTransfer.setData('text/plain',String(id));};}else b.textContent='＋';
        if(slot!==null){b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const value=e.dataTransfer.getData('text/plain');if(/^[0-3]$/.test(value)&&l().collected.includes(`map${value}`)){chosen=Number(value);put(slot);}};}
        return b;
      }
      function refresh(){grid.replaceChildren();tray.replaceChildren();l().diagram.forEach((id,slot)=>grid.append(tile(id,slot)));for(const id of [2,0,3,1])if(l().collected.includes(`map${id}`)&&!l().diagram.includes(id))tray.append(tile(id));left.disabled=right.disabled=chosen===null;status.textContent=diagramReady(l())?'銅線完整接合。圖形指出三條線應接到的插孔。':`已尋回 ${l().collected.filter(id=>/^map/.test(id)).length} / 4 片`;}
      refresh();
    }else if(tab===2){
      say(host,'圖紙左側：▣ 工作、⌂ 家庭、◉ 自己。沿銅線找到右側的插孔圖形。接錯可直接重接，不會遺失接頭。');
      if(diagramReady(l())){const map=el('div','','complete-diagram');map.innerHTML=`<svg viewBox="0 0 200 200" aria-label="已拼合的線路圖">${paths}</svg>`;host.append(map);}
      const status=el('p','','mechanism-status');host.append(status);const choices=[];
      LINE_NAMES.forEach((name,index)=>{const r=row(host);r.append(el('strong',`${LINE_ICONS[index]} ${name}`));SOCKET_ICONS.forEach((symbol,socket)=>{const b=button(`${name}線接到 ${symbol}`,()=>{dispatch({type:'CONNECT',index,socket});refresh();});b.disabled=!diagramReady(l())||!l().collected.includes(`plug${index}`);r.append(b);choices.push({b,index,socket});});});
      function refresh(){choices.forEach(({b,index,socket})=>b.setAttribute('aria-pressed',String(l().wires[index]===socket)));status.textContent=l().wires.map((v,i)=>`${LINE_NAMES[i]}：${v===null?'未接':SOCKET_ICONS[v]}`).join('　');}refresh();
    }else{
      say(host,'每段錄音尾端都有敲擊節奏。讓工作、家庭、自己的訊號旋鈕對應各自的拍數，再接通總機。靜音時可讀逐字稿與節奏符號。');
      LINE_NAMES.forEach((name,index)=>{const r=row(host);r.append(el('strong',name));const out=el('output',String(l().signals[index]));r.append(out);r.append(button(`${name}訊號 −`,()=>change(-1)),button(`${name}訊號 ＋`,()=>change(1)),button(`重聽${name}錄音`,()=>play(index,false)));
        function change(delta){const result=dispatch({type:'SIGNAL',index,value:l().signals[index]+delta},{silent:true});if(result.ok)out.textContent=String(l().signals[index]);}
      });
      const status=el('p','','mechanism-status');host.append(status);const refresh=()=>{const v=switchboardStatus(l());status.textContent=`時間線 ${v.order?'已連結':'未連結'} · 圖紙 ${v.diagram?'完整':'未拼好'} · ${l().wires.filter(v=>v!==null).length} 條線已插入`;};
      host.append(button('接通記憶總機',()=>{const r=dispatch({type:'ACTIVATE_BOARD'});if(r.distorted!==undefined)play(r.distorted,true);if(r.completedNow)play('all',false);else refresh();},'primary'));refresh();
    }
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
