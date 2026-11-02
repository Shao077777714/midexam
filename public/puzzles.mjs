// Shared puzzle data drives the UI, scene and save validation.
export const LINES=['work','family','self'];
export const LINE_NAMES=['工作','家庭','自己'];
export const LINE_ICONS=['▣','⌂','◉'];
export const RECORDINGS=[
  {id:'tape-work',name:'磨損的錄音帶',date:'三月八日 · 早班之前',copy:'主管：你又沒有出現。我們一直聯絡不上你。',beats:2},
  {id:'tape-family',name:'纏著紅線的錄音帶',date:'三月十二日 · 孩子睡著後',copy:'家人：我們曾經等過你很多次。這次，我帶孩子先離開了。',beats:4},
  {id:'tape-self',name:'裂殼的錄音帶',date:'三月十五日 · 天亮之前',copy:'我：我以為隨時可以停下來。可藥物已經控制了我的每一天。我需要協助。',beats:3}
];
export const BOARD_ITEMS=[...RECORDINGS.map(v=>v.id),'map0','map1','map2','map3','plug0','plug1','plug2'];
export const PARTS=['bulb','shade','battery'];
export const PART_NAMES=['鎢絲燈泡','百褶燈罩','銅殼電池'];
export const LAMP_NAMES=['過去','現在','未來'];
export const NEW_ITEMS={...Object.fromEntries(RECORDINGS.map(v=>[v.id,v.name])),...Object.fromEntries([0,1,2,3].map(i=>[`map${i}`,`線路圖碎片 ${['D','A','C','B'][i]}`])),...Object.fromEntries(LINE_NAMES.map((n,i)=>[`plug${i}`,`${n}線接頭`])),...Object.fromEntries(PARTS.map((id,i)=>[id,PART_NAMES[i]]))};
export const HIDES={
  'tape-work':'work-panel',map0:'work-panel',plug0:'work-panel',
  'tape-family':'family-phone',map1:'family-phone',plug1:'family-phone',
  'tape-self':'mirror-recess',map2:'mirror-recess',map3:'mirror-recess',plug2:'mirror-recess',
  bulb:'lamp-crate',shade:'linen-box',battery:'power-radio'
};
export const SOCKETS=[2,0,1];
export const CIRCUIT_PORTS=[[0,1],[1,3],[1,3],[0,1,2,3],[1,3],[1,3],[0,1],[1,3],[1,3]];
export function puzzleState(){return {recordOrder:[],diagram:Array(4).fill(null),diagramAngles:[90,270,180,90],wires:[null,null,null],signals:[1,1,1],switchboardOn:false,installed:[false,false,false],circuit:[1,0,2,3,4,6,5,7,8],circuitAngles:[90,90,90,0,90,90,0,90,90],lampOrder:[]};}
export function diagramReady(l){return l.diagram.every((v,i)=>v===i&&l.diagramAngles[i]===0);}
export function switchboardStatus(l){return {order:l.recordOrder.join(',')==='0,1,2',diagram:diagramReady(l),wires:l.wires.map((v,i)=>v===SOCKETS[i]),signals:l.signals.map((v,i)=>v===RECORDINGS[i].beats)};}
export function switchboardReady(l){const v=switchboardStatus(l);return v.order&&v.diagram&&v.wires.every(Boolean)&&v.signals.every(Boolean);}
export function portsAt(l,cell){return CIRCUIT_PORTS[l.circuit[cell]].map(p=>(p+l.circuitAngles[cell]/90)%4);}
export function circuitStatus(l){
  const reached=new Set(),queue=[];
  if(portsAt(l,3).includes(3)){queue.push(3);reached.add(3);}
  while(queue.length){const c=queue.shift();for(const p of portsAt(l,c)){
    const x=c%3,y=Math.floor(c/3),nx=x+[0,1,0,-1][p],ny=y+[-1,0,1,0][p];
    if(nx<0||nx>2||ny<0||ny>2)continue;const n=ny*3+nx;
    if(!reached.has(n)&&portsAt(l,n).includes((p+2)%4)){reached.add(n);queue.push(n);}
  }}
  const lamps=[2,5,8].map(c=>reached.has(c)&&portsAt(l,c).includes(1));
  return {reached:[...reached],lamps,ready:lamps.every(Boolean)};
}
export function lampsReady(l){return l.installed.every(Boolean)&&circuitStatus(l).ready&&l.lampOrder.join(',')==='0,1,2';}
const index=(v,n)=>Number.isInteger(v)&&v>=0&&v<n;
const fail=message=>({ok:false,message});
export function puzzleAction(s,a){
  const l=s.levels[s.level],done=message=>({ok:true,message});
  if(!['RECORD_ORDER','DIAGRAM','DIAGRAM_ROTATE','CONNECT','SIGNAL','ACTIVATE_BOARD','INSTALL','CIRCUIT_SWAP','CIRCUIT_ROTATE','LAMP'].includes(a.type))return null;
  if(!l.triggered)return fail('先尋找讓世界改變的物件。');
  if(['RECORD_ORDER','DIAGRAM','DIAGRAM_ROTATE','CONNECT','SIGNAL','ACTIVATE_BOARD'].includes(a.type)){
    if(s.level!==3)return fail('這裡沒有電話總機。');
    if(a.type==='RECORD_ORDER'){
      if(!index(a.index,3)||!l.collected.includes(RECORDINGS[a.index].id))return fail('先找到這段錄音。');
      l.recordOrder=l.recordOrder.includes(a.index)?l.recordOrder.filter(v=>v!==a.index):[...l.recordOrder,a.index];return done('錄音順序已更新。再次點選可取回。');
    }
    if(a.type==='DIAGRAM_ROTATE'){
      if(!index(a.index,4)||!l.collected.includes(`map${a.index}`)||![-90,90].includes(a.delta))return fail('先選取已找到的圖紙。');
      l.diagramAngles[a.index]=(l.diagramAngles[a.index]+a.delta+360)%360;return done('圖紙轉動了。');
    }
    if(a.type==='DIAGRAM'){
      if(!index(a.index,4)||!index(a.slot,4)||!l.collected.includes(`map${a.index}`))return fail('先選取已找到的圖紙。');
      const old=l.diagram.indexOf(a.index),other=l.diagram[a.slot];if(old>=0)l.diagram[old]=other;l.diagram[a.slot]=a.index;return done('圖紙已放入，可交換位置。');
    }
    if(a.type==='CONNECT'){
      if(!diagramReady(l))return fail('先拼合線路圖，找出接口圖形。');
      if(!index(a.index,3)||!index(a.socket,3)||!l.collected.includes(`plug${a.index}`))return fail('先找齊接頭。');
      l.wires=l.wires.map((v,i)=>i!==a.index&&v===a.socket?null:v);l.wires[a.index]=a.socket;return done(`${LINE_NAMES[a.index]}線已接上，啟動總機檢查訊號。`);
    }
    if(a.type==='SIGNAL'){
      if(!index(a.index,3)||!index(a.value-1,5)||!l.collected.includes(RECORDINGS[a.index].id))return fail('先取得錄音並觀察節奏。');
      l.signals[a.index]=a.value;return done('訊號旋鈕已調整。');
    }
    const status=switchboardStatus(l);
    if(!status.order)return fail('總機回放的日期交錯了。請按錄音中的時間重排。');
    if(!status.diagram)return fail('線路圖還有斷裂或方向顛倒。');
    const badWire=status.wires.indexOf(false);if(badWire>=0)return fail(`${LINE_NAMES[badWire]}線未接通，檢查圖紙與插孔。`);
    const badSignal=status.signals.indexOf(false);if(badSignal>=0)return {ok:false,message:`${LINE_NAMES[badSignal]}訊號失真。重聽該錄音的敲擊節奏。`,distorted:badSignal};
    l.switchboardOn=true;return done('三段訊息連起來了。我不能再假裝自己沒有失去控制。');
  }
  if(s.level!==4)return fail('這裡沒有配電箱。');
  if(a.type==='INSTALL'){
    if(!index(a.index,3)||a.id!==PARTS[a.index]||!l.collected.includes(a.id))return fail('這個位置需要相符的燈具零件。');
    l.installed[a.index]=true;return done(`${LAMP_NAMES[a.index]}的燈已修好。`);
  }
  if(['CIRCUIT_ROTATE','CIRCUIT_SWAP'].includes(a.type)){
    if(l.projecting||l.projectionDone)return fail('投影已啟動，電路保持固定。');
    if(!index(a.index,9))return fail('無效的導電片。');
    if(a.type==='CIRCUIT_ROTATE')l.circuitAngles[a.index]=(l.circuitAngles[a.index]+90)%360;
    else {if(!index(a.slot,9))return fail('無效的位置。');[l.circuit[a.index],l.circuit[a.slot]]=[l.circuit[a.slot],l.circuit[a.index]];[l.circuitAngles[a.index],l.circuitAngles[a.slot]]=[l.circuitAngles[a.slot],l.circuitAngles[a.index]];}
    l.lampOrder=[];return done('導電片已調整，燈具回到關閉狀態。');
  }
  if(!index(a.index,3))return fail('無效的燈具。');
  if(!l.installed.every(Boolean))return fail('三盞燈還缺少零件。');
  if(!circuitStatus(l).ready)return fail('電路仍然斷開，先接通配電箱。');
  if(l.lampOrder.length===3)return fail('三盞燈已亮起。');
  if(a.index!==l.lampOrder.length){l.lampOrder=[];return done('時間倒流了，三盞燈熄滅。從最早的記憶重新開始。');}
  l.lampOrder.push(a.index);return done(`${LAMP_NAMES[a.index]}的燈亮起。`);
}
export function validPuzzle(l){
  const ints=(a,n,min,max)=>Array.isArray(a)&&a.length===n&&a.every(v=>Number.isInteger(v)&&v>=min&&v<=max);
  return Array.isArray(l.recordOrder)&&l.recordOrder.length<=3&&l.recordOrder.every(v=>index(v,3))&&new Set(l.recordOrder).size===l.recordOrder.length&&
    Array.isArray(l.diagram)&&l.diagram.length===4&&l.diagram.every(v=>v===null||index(v,4))&&new Set(l.diagram.filter(v=>v!==null)).size===l.diagram.filter(v=>v!==null).length&&
    ints(l.diagramAngles,4,0,270)&&l.diagramAngles.every(v=>v%90===0)&&Array.isArray(l.wires)&&l.wires.length===3&&l.wires.every(v=>v===null||index(v,3))&&new Set(l.wires.filter(v=>v!==null)).size===l.wires.filter(v=>v!==null).length&&ints(l.signals,3,1,5)&&typeof l.switchboardOn==='boolean'&&
    Array.isArray(l.installed)&&l.installed.length===3&&l.installed.every(v=>typeof v==='boolean')&&ints(l.circuit,9,0,8)&&new Set(l.circuit).size===9&&ints(l.circuitAngles,9,0,270)&&l.circuitAngles.every(v=>v%90===0)&&Array.isArray(l.lampOrder)&&l.lampOrder.length<=3&&l.lampOrder.every((v,i)=>v===i);
}
