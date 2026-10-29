import {shadowPlacementFree} from './spatial.mjs';
export const SAVE_KEY='dream-gap-save-v1';
export const MEMORIES=['記起','聽見','看見','承認','改變'];
export const ITEMS={key:'舊家鑰匙',drawing:'孩子的畫',letter:'未寄出的信',p0:'照片左上碎片',p1:'照片右上碎片',p2:'照片左下碎片',p3:'照片右下碎片'};
export const SHADOW_TARGETS=[{x:-2.8,z:-2,angle:0},{x:0,z:-1.2,angle:90},{x:2.8,z:-2,angle:180}];
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const angleDistance=(a,b)=>Math.abs(((a-b+540)%360)-180);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const add=(a,b,t=1)=>[a[0]+b[0]*t,a[1]+b[1]*t];
const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
export const MIRROR_POINTS=[[-3,-2],[0,-2],[0,1]];
export const LIGHT_MARKERS=[[-1.5,-2],[0,-0.5],[2,1]];
function segmentDistance(p,a,b){const v=add(b,a,-1); const t=clamp(dot(add(p,a,-1),v)/dot(v,v),0,1); const q=add(a,v,t); return Math.hypot(p[0]-q[0],p[1]-q[1]);}
export function traceMirrors(angles,torchAngle=0) {
  let origin=[-3,3], direction=[Math.sin(torchAngle*Math.PI/180),-Math.cos(torchAngle*Math.PI/180)], last=-1;
  const segments=[], marks=[];
  for(let bounce=0;bounce<5;bounce++) {
    let closest=null;
    MIRROR_POINTS.forEach((p,i)=>{
      if(i===last)return;
      const a=angles[i]*Math.PI/180,n=[Math.cos(a),Math.sin(a)], denom=dot(direction,n);
      if(Math.abs(denom)<0.00001)return;
      const t=dot(add(p,origin,-1),n)/denom;
      if(t<=0.01)return;
      const hit=add(origin,direction,t), tangent=[-n[1],n[0]];
      if(Math.abs(dot(add(hit,p,-1),tangent))>0.95)return;
      if(!closest||t<closest.t)closest={i,t,hit,n};
    });
    const end=closest?.hit||add(origin,direction,12);
    segments.push([origin,end]);
    LIGHT_MARKERS.forEach((p,i)=>{if(!marks.includes(i)&&segmentDistance(p,origin,end)<0.16)marks.push(i);});
    if(!closest)break;
    direction=unit(add(direction,closest.n,-2*dot(direction,closest.n)));
    origin=add(closest.hit,direction,0.002); last=closest.i;
  }
  return {segments,marks,solved:marks.join(',')==='0,1,2'};
}
export function shadowAligned(value,target){return Math.hypot(value.x-target.x,value.z-target.z)<0.32&&angleDistance(value.angle,target.angle)<12;}
function levelState(){return {triggered:false,drawer:false,chair:false,frame:false,collected:[],slots:{},shadow:[{x:-3.7,z:1,angle:90},{x:0.6,z:1.4,angle:0},{x:3.4,z:0.8,angle:45}],photos:[null,null,null,null],photoRead:false,mirrors:[0,45,0],torchAngle:0,flashlight:false,opticsUnlocked:false,records:[],sequence:[],projecting:false,projectionDone:false,mailed:false};}
export function newGame(){return {version:1,level:0,unlocked:0,completed:[false,false,false,false,false],memories:[],inventory:[],letter:false,elapsed:0,levels:Array.from({length:5},levelState),persisted:false};}
export function canComplete(s){const l=s.levels[s.level];if(!l.triggered)return false; switch(s.level){
case 0:return l.shadow.every((v,i)=>shadowAligned(v,SHADOW_TARGETS[i]));
case 1:return ['key','drawing','letter'].every(id=>l.slots[id]===id);
case 2:return l.photos.every((v,i)=>v&&v.id===`p${i}`&&angleDistance(v.angle,0)<1)&&l.photoRead;
case 3:return l.opticsUnlocked&&['work','family','self'].every(id=>l.records.includes(id));
case 4:return l.sequence.join(',')==='0,1,2,3'&&l.projectionDone&&l.mailed&&s.letter&&s.completed.slice(0,4).every(Boolean);
default:return false;}}
export function applyAction(current,a){
  const s=structuredClone(current),l=s.levels[s.level]; let message='';
  const fail=m=>({state:current,ok:false,message:m,completedNow:false});
  if(a.type==='NEXT'){
    if(!s.completed[s.level]||!s.persisted)return fail('請先完成本關並成功儲存進度。');
    if(s.level===4)return fail('你已找到清醒之門。');
    s.level++;return {state:s,ok:true,message:'新的記憶正在浮現。',completedNow:false};
  }
  if(a.type==='ACK_SAVE'){s.persisted=true;return {state:s,ok:true,message:'進度已儲存',completedNow:false};}
  if(s.completed[s.level])return fail('本關已完成，請從出口前往下一關。');
  if(a.type==='TRIGGER'){if(l.triggered)return fail('世界已經改變。');l.triggered=true;message='那些被藏起來的記憶，開始浮現。';}
  else if(a.type==='DRAWER'){
    if(s.level===3&&!l.opticsUnlocked)return fail('抽屜鎖著。先讓光找到三個標記。');
    l.drawer=!l.drawer;message=l.drawer?'抽屜打開了。':'抽屜關上了。';
  } else if(a.type==='CHAIR'){l.chair=!l.chair;message=l.chair?'你移開了椅子。':'椅子回到原位。';}
  else if(a.type==='FRAME'){l.frame=!l.frame;message='你查看了相框後方。';}
  else {
    if(!l.triggered)return fail('這裡似乎還缺少一個讓世界改變的契機。');
    switch(a.type){
      case 'COLLECT': {
        const allowed=s.level===1?['key','drawing','letter']:s.level===2?['p0','p1','p2','p3']:[];
        if(!allowed.includes(a.id)||l.collected.includes(a.id))return fail('這個物件無法重複拿取。');
        if((a.id==='key'||a.id==='p3')&&!l.drawer)return fail('先打開抽屜。');
        if((a.id==='drawing'||a.id==='p1')&&!l.chair)return fail('有家具擋住了物件。');
        if(a.id==='p2'&&!l.frame)return fail('查看相框後方，或許有東西。');
        l.collected.push(a.id);if(!s.inventory.includes(a.id))s.inventory.push(a.id);
        if(a.id==='letter')s.letter=true;message=`取得：${ITEMS[a.id]}`;break;
      }
      case 'SLOT':
        if(s.level!==1||!['key','drawing','letter'].includes(a.slot)||!s.inventory.includes(a.id))return fail('先從物品欄選取已找到的道具。');
        if(a.slot!==a.id)return fail('形狀不相符。這件物品似乎屬於另一個凹槽。');
        l.slots[a.slot]=a.id;message='道具與凹槽吻合。';break;
      case 'SHADOW':
        if(s.level!==0||!Number.isInteger(a.index)||a.index<0||a.index>2||![a.x,a.z,a.angle].every(Number.isFinite))return fail('無效的物件位置。');
        {const candidate={x:clamp(a.x,-4.4,4.4),z:clamp(a.z,-3,2.5),angle:((a.angle%360)+360)%360};if(!shadowPlacementFree(a.index,candidate,l.shadow))return fail('這裡被家具或另一個底座擋住了，請換一個位置。');l.shadow[a.index]=candidate;}
        message=shadowAligned(l.shadow[a.index],SHADOW_TARGETS[a.index])?'影子與記憶重合了。':'觀察牆面輪廓，再調整位置與角度。';break;
      case 'PHOTO':
        if(s.level!==2||!Number.isInteger(a.slot)||a.slot<0||a.slot>3||!Number.isFinite(a.angle)||!s.inventory.includes(a.id))return fail('先找到並選取照片碎片。');
        l.photos=l.photos.map(v=>v?.id===a.id?null:v);l.photos[a.slot]={id:a.id,angle:((a.angle%360)+360)%360};
        message='你把碎片放進了相框。';break;
      case 'PHOTO_READ':
        if(s.level!==2||!l.photos.every((v,i)=>v?.id===`p${i}`&&angleDistance(v.angle,0)<1))return fail('照片還沒有正確拼合。');
        l.photoRead=true;message='照片背面留下了最後一段話。';break;
      case 'FLASHLIGHT':if(s.level!==3)return fail('這裡沒有手電筒。');l.flashlight=true;message='手電筒亮起。';break;
      case 'MIRROR':
        if(s.level!==3||!l.flashlight||!Number.isInteger(a.index)||a.index<0||a.index>2||!Number.isFinite(a.angle))return fail('先拿起手電筒。');
        l.mirrors[a.index]=((a.angle%180)+180)%180;message='鏡面將光折向另一個方向。';break;
      case 'TORCH':if(s.level!==3||!l.flashlight||!Number.isFinite(a.angle))return fail('先拿起手電筒。');l.torchAngle=clamp(a.angle,-40,40);break;
      case 'RECORD':if(s.level!==3||!l.opticsUnlocked||!l.drawer||!['work','family','self'].includes(a.id))return fail('這份記憶仍被鎖住。');if(!l.records.includes(a.id))l.records.push(a.id);message='你讀見了過去的自己。';break;
      case 'MEMORY':
        if(s.level!==4||!Number.isInteger(a.index)||a.index<0||a.index>3||!s.completed[a.index])return fail('記憶碎片還不完整。');
        if(a.index!==l.sequence.length)return fail('順序不對。先記起過去，再聽見他人。');
        l.sequence.push(a.index);message='碎片回到了它的位置。';break;
      case 'REMOVE_MEMORY':if(s.level!==4||l.projecting||l.projectionDone)return fail('投影已啟動。');l.sequence.pop();break;
      case 'PROJECT':if(s.level!==4||l.sequence.join(',')!=='0,1,2,3'||l.projecting||l.projectionDone)return fail('先將四片記憶依序放好。');l.projecting=true;message='記憶正在重新連結……';break;
      case 'PROJECTION_END':if(s.level!==4||!l.projecting)return fail('投影尚未啟動。');l.projecting=false;l.projectionDone=true;message='現在，你可以寄出那封信了。';break;
      case 'MAIL':if(s.level!==4||!s.letter||!l.projectionDone)return fail('記憶投影完成後，才能寄出第二關的信。');l.mailed=true;message='這一次，你終於願意面對。';break;
      default:return fail('未知操作。');
    }
  }
  if(s.level===3&&l.flashlight&&traceMirrors(l.mirrors,l.torchAngle).solved)l.opticsUnlocked=true;
  const completedNow=canComplete(s);
  if(completedNow){s.completed[s.level]=true;s.unlocked=Math.min(4,s.level+1);s.memories=MEMORIES.filter((_,i)=>s.completed[i]);s.persisted=false;message=`找回記憶：${MEMORIES[s.level]}`;}
  return {state:s,ok:true,message,completedNow};
}
export function saveGame(storage,state){try{storage.setItem(SAVE_KEY,JSON.stringify(state));return {ok:true};}catch{return {ok:false,message:'無法儲存進度，請允許此網站儲存資料後重試。'};}}
export function loadGame(storage){try{
  const raw=storage.getItem(SAVE_KEY);if(!raw)return {state:null,error:null};const s=JSON.parse(raw);
  if(s.version!==1||!Number.isInteger(s.level)||s.level<0||s.level>4||!Number.isInteger(s.unlocked)||s.level>s.unlocked||s.unlocked>4||!Array.isArray(s.completed)||s.completed.length!==5||s.completed.some(v=>typeof v!=='boolean')||!Array.isArray(s.levels)||s.levels.length!==5||!Array.isArray(s.inventory)||s.inventory.some(id=>!(id in ITEMS))||typeof s.letter!=='boolean'||!Number.isFinite(s.elapsed)||s.elapsed<0)throw Error();
  let gap=false;for(const v of s.completed){if(!v)gap=true;else if(gap)throw Error();}
  const count=s.completed.filter(Boolean).length;if(s.unlocked!==Math.min(4,count)||s.memories?.join(',')!==MEMORIES.slice(0,count).join(',')||(s.completed[1]&&!s.letter))throw Error();
  s.levels.forEach(l=>{if(typeof l.triggered!=='boolean'||!Array.isArray(l.shadow)||l.shadow.length!==3||l.shadow.some(v=>![v.x,v.z,v.angle].every(Number.isFinite))||!Array.isArray(l.photos)||l.photos.length!==4||l.photos.some(v=>v!==null&&(!v||!['p0','p1','p2','p3'].includes(v.id)||!Number.isFinite(v.angle)))||!Array.isArray(l.mirrors)||l.mirrors.length!==3||l.mirrors.some(v=>!Number.isFinite(v))||!Array.isArray(l.records)||!Array.isArray(l.sequence)||!Array.isArray(l.collected)||!l.slots||typeof l.slots!=='object'||!Number.isFinite(l.torchAngle))throw Error();});
  // Projection playback is transient: a reload must allow replay, never strand the player.
  s.levels.forEach(l=>l.projecting=false);
  s.persisted=true;return {state:s,error:null};
}catch{return {state:null,error:'無法讀取這份存檔。你仍可以開始新的旅程。'};}}
