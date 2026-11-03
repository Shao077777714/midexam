import {SHADOW_TARGETS,shadowAligned} from './engine.mjs';
import {RECORDINGS,PARTS,circuitStatus} from './puzzles.mjs';
export {initialGuidance,hintTier,tickGuidance} from './guidance-time.mjs';
const goal=(id,copy,hints,progress=0)=>({id,copy,hints,progress});
const clues={
 exit:['房間似乎比剛才安靜了一些。','來時的地方，現在看起來有些不同。','有些改變，要走近才看得見。','試著回望這段記憶的邊界。','也許，下一步已經不在這個房間裡。'],
 trigger:['這個地方留下了一些與你有關的痕跡。','熟悉的日常裡，似乎有一處不太平靜。','有些東西不像擺設，更像在等待回應。','留意那些被留下、卻沒有被好好看過的痕跡。','試著把注意力放在那份尚未被接住的訊息。'],
 shadow:['有些輪廓，比房間裡的物品更像一段記憶。','光照得到的地方，和你看見的形狀未必相同。','站在另一個位置，再看看同一件東西。','熟悉的形狀換個方向，可能就不再熟悉。','留意哪些線條彼此呼應，哪些仍然錯開。'],
 key:['走廊裡，時間似乎停在不同的地方。','留下的訊息未必只藏在話語裡。','有些細節可以在別處找到回聲。','把兩處關於時間的痕跡放在一起想想。','它們曾經指向同一個被錯過的時刻。'],
 drawing:['有些痕跡被日常的東西擋住了。','孩子看見的家，和大人記得的未必一樣。','不要只看與視線一樣高的地方。','熟悉的通道旁，也可能留著沒有收好的回憶。','換一個角度看看那些不太容易靠近的空隙。'],
 letter:['有些話留下來了，卻一直沒有離開這裡。','小小的圖案也有自己的次序。','不同物件上留下的形狀，也許彼此認得。','試著從一段完整的畫面裡尋找關聯。','線索就在已看過的回憶裡，不必急著猜。'],
 slots:['這裡的空缺，似乎各自等待著什麼。','不同的記憶，留下的形狀也不同。','想想每件東西曾經代表過什麼。','圖像和物品之間，可能有比外觀更深的聯繫。','先試著理解空缺，再決定讓什麼回去。'],
 photos:['生活的角落裡，還留著一些不完整的畫面。','看似不起眼的東西，也可能保存了記憶。','留意能打開或挪動的日常物件。','沒有看見的地方，不一定是空的。','停下來看看已經經過的角落，也許還漏了什麼。'],
 assemble:['分開的畫面，仍然來自同一個瞬間。','顏色、光線與輪廓，會透露它們曾經的關係。','試著讓畫面自己說話，而不是依賴代號。','有些線條，換個方向才接得起來。','一張照片能留下的，可能不只有眼前這一面。'],
 recordings:['有些聲音，被藏在了日常裡。','不同的話語，留下了各自的時間痕跡。','先聽聽它們說了什麼，再想彼此的關係。','回憶常常不是依你找到它的順序發生。','讓那些被打斷的日子，再次連成一段經歷。'],
 lamps:['有些光沒有熄滅，只是還缺少一部分。','同樣是燈，彼此缺少的東西可能不同。','日常物件裡，也可能留著重新亮起的機會。','留意手中之物與空缺的形狀。','光的名字，似乎也保存了一段人生。'],
 circuit:['光需要一條沒有中斷的路。','看似接近的線條，未必真的相通。','留意每個相鄰的邊緣，而不只是整體圖案。','從有光的一端慢慢看，看看它在哪裡停下。','一處轉折，可能影響不只一條路。'],
 'light-order':['三盞光像是同一段人生的不同時刻。','它們的名字，比外形更值得留意。','有些事情，無法跳過之前的經歷。','想想自己是從哪裡走到這裡的。','如果把這一生看成一段旅程，光會怎麼延續？'],
 projection:['那些零散的片段，似乎已經準備好重新相遇。','房間裡還有一個一直沉默的存在。','光匯聚的地方，也許能留下完整的畫面。','不必再急著尋找新的東西。','這一次，試著把一段回憶看完。'],
 mail:['有些話，終究需要被送達。','微弱的光，在黑暗裡留下了一條路。','走過那些聲音，聽聽自己曾經錯過什麼。','一直留在身邊的東西，也許還有未完成的意義。','想一想，那份沒有離開過的心意可以去向哪裡。']
};
const doorHints=clues.exit;
export function currentGoal(s){
 const i=s.level,l=s.levels[i],prefix=`${i}:`;
 if(s.completed[i])return goal(prefix+'exit',i===5?'信已寄出，親自打開最後的門。':'記憶已找回，親自打開出口的門前往下一關。',doorHints,1000);
 if(!l.triggered)return goal(prefix+'trigger', ['查看床邊抽屜裡的回診提醒。','查看長椅上的手機，聽見未接的聲音。','靠近牆上的家庭照片。','閱讀桌上的成癮諮詢紀錄。','閱讀桌上的求助信。'][i],clues['trigger']);
 if(i===0){const count=l.shadow.filter((v,n)=>shadowAligned(v,SHADOW_TARGETS[n])).length;return goal(prefix+'shadow:'+count,`讓三件物品與牆上影子重合（${count}/3）。`,clues['shadow'],10+count*10);}
 if(i===1){
  // Count actual milestones independently of which clue the player pursues first.
  const progress=10+5*Number(l.searched.includes('clock'))+5*Number(l.chair)+5*Number(l.searched.includes('letterbox'))+10*['key','drawing','letter'].filter(id=>l.collected.includes(id)).length+10*Object.values(l.slots).length;
  if(!l.collected.includes('key'))return goal(prefix+'key:'+l.searched.includes('clock'),'依手機通知調整座鐘，找回舊家鑰匙。',clues['key'],progress);
  if(!l.collected.includes('drawing'))return goal(prefix+'drawing:'+l.chair,'查看門後，找回孩子的畫。',clues['drawing'],progress);
  if(!l.collected.includes('letter'))return goal(prefix+'letter:'+l.searched.includes('letterbox'),'依孩子畫裡的圖案，解開信匣並拿取信。',clues['letter'],progress);
  const count=Object.values(l.slots).length;return goal(prefix+'slots:'+count,`把三件回憶放入對應凹槽（${count}/3）。`,clues['slots'],progress);
 }
 if(i===2){const count=l.collected.filter(id=>/^p[0-8]$/.test(id)).length,correct=l.photos.filter((p,n)=>p?.id===`p${n}`&&p.angle===0).length;
  if(count<9)return goal(prefix+'photos:'+count,`探索日常物件，找齊九片照片（${count}/9）。`,clues['photos'],10+count*2);
  return goal(prefix+'assemble:'+correct+':'+l.photoRead,'在相框拼回九片照片，再翻面查看。',clues['assemble'],50+correct);
 }
 if(i===3){const count=RECORDINGS.filter(t=>l.collected.includes(t.id)).length;let order=0;while(l.recordOrder[order]===order)order++;
  return goal(prefix+'recordings:'+count+':'+order,count<5?`在五處藏點找回錄音（${count}/5）。`:'按日期排列五段錄音，再接通記憶總機。',clues['recordings'],10+count*6+order);
 }
 if(i===4){
  if(!l.installed.every(Boolean)){const count=l.installed.filter(Boolean).length,found=PARTS.filter(id=>l.collected.includes(id)).length;return goal(prefix+'lamps:'+count+':'+found,`尋找零件，修好三盞燈（${count}/3）。`,clues['lamps'],10+count*10+found*2);}
  const powered=circuitStatus(l).lamps.filter(Boolean).length;if(powered<3)return goal(prefix+'circuit:'+powered,`修復配電箱，接通三盞燈（${powered}/3）。`,clues['circuit'],60+powered);
  if(l.lampOrder.length<3)return goal(prefix+'light-order:'+l.lampOrder.length,'依時間先後點亮過去、現在、未來。',clues['light-order'],80+l.lampOrder.length);
  return goal(prefix+'projection','啟動記憶投影裝置，完整看完回憶。',clues['projection'],90);
 }
 return goal(prefix+'mail:'+l.echoesSeen.length,'沿紅光走過回憶，將第二關的信投入信箱。',clues['mail'],10+l.echoesSeen.length*2);
}
