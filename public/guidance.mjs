import {SHADOW_TARGETS,shadowAligned} from './engine.mjs';
import {RECORDINGS,PARTS,circuitStatus} from './puzzles.mjs';
export {initialGuidance,hintTier,tickGuidance} from './guidance-time.mjs';
const goal=(id,copy,hints,progress=0)=>({id,copy,hints,progress});
const doorHints=['這一段記憶已經完整，出口現在可以打開。','返回場景，尋找有門框與把手的出口。','可以按N導覽到出口前，仍需你親自開門。','靠近門，讓準星對著門板，再按E或雙擊。','成功視窗不會帶你換關；回到場景親手開門，才會離開。'];
export function currentGoal(s){
 const i=s.level,l=s.levels[i],prefix=`${i}:`;
 if(s.completed[i])return goal(prefix+'exit',i===5?'信已寄出，親自打開最後的門。':'記憶已找回，親自打開出口的門前往下一關。',doorHints,1000);
 if(!l.triggered)return goal(prefix+'trigger', ['查看床邊抽屜裡的回診提醒。','查看長椅上的手機，聽見未接的聲音。','靠近牆上的家庭照片。','閱讀桌上的成癮諮詢紀錄。','閱讀桌上的求助信。'][i],['先查看房間裡與自己有關的物件。','讓準星對準附近的物件，按E互動。','按N可查看可探索物件，導覽仍須自己互動。','指定的紙張或照片會讓世界改變。',`本關先操作${['床邊抽屜，再拿回診提醒','長椅上手機','牆上的家庭照片','成癮諮詢紀錄','寫給自己的求助信'][i]}。`]);
 if(i===0){const count=l.shadow.filter((v,n)=>shadowAligned(v,SHADOW_TARGETS[n])).length;return goal(prefix+'shadow:'+count,`讓三件物品與牆上影子重合（${count}/3）。`,['觀察三個光圈，以及牆上的輪廓。','月亮、兔子和花瓶都可以互動，已對齊者會固定。','除了位置，旋轉角度也會改變影子。','月亮屬於左側，兔子屬於中央，花瓶屬於右側。','在物件面板慢慢調位置與方向；若被你擋住，先退開讓出推動路徑。'],10+count*10);}
 if(i===1){
  // Count actual milestones independently of which clue the player pursues first.
  const progress=10+5*Number(l.searched.includes('clock'))+5*Number(l.chair)+5*Number(l.searched.includes('letterbox'))+10*['key','drawing','letter'].filter(id=>l.collected.includes(id)).length+10*Object.values(l.slots).length;
  if(!l.collected.includes('key'))return goal(prefix+'key:'+l.searched.includes('clock'),'依手機通知調整座鐘，找回舊家鑰匙。',['手機通知記下了孩子第一通來電。','長椅旁座鐘的上蓋尚未鬆開。','先讀手機通知，再分別移動時針和分針。','來電是在早上八點十分。','把時針設8、分針設10，試著開蓋，再拿鑰匙。'],progress);
  if(!l.collected.includes('drawing'))return goal(prefix+'drawing:'+l.chair,'查看門後，找回孩子的畫。',['孩子曾把回家的地方畫下來。','走廊門後有一張椅子。','椅子擋住了紙張，先互動移開。','留出椅子的移動空間，準星看向後方地面。','移開擋住門後的椅子，再拿取孩子的畫；背包選取後R可檢視。'],progress);
  if(!l.collected.includes('letter'))return goal(prefix+'letter:'+l.searched.includes('letterbox'),'依孩子畫裡的圖案，解開信匣並拿取信。',['舊鑰匙與孩子的畫都和信匣有關。','從背包選孩子的畫，收起後按R檢視。','比較畫裡由左到右的三個形狀。','依序是樹、房子和月亮。','將信匣轉盤設為樹→房子→月亮，再用鑰匙開匣，拿走未寄出的信。'],progress);
  const count=Object.values(l.slots).length;return goal(prefix+'slots:'+count,`把三件回憶放入對應凹槽（${count}/3）。`,['走廊盡頭有三個不同圖案的凹槽。','房子、家庭及信封，各自對應一件物品。','在凹槽操作面板中選擇相符的道具。','鑰匙配房子，孩子的畫配家庭回憶，信配信封。','三個凹槽都放好才會解鎖出口，已放置物品仍可在背包檢視。'],progress);
 }
 if(i===2){const count=l.collected.filter(id=>/^p[0-8]$/.test(id)).length,correct=l.photos.filter((p,n)=>p?.id===`p${n}`&&p.angle===0).length;
  if(count<9)return goal(prefix+'photos:'+count,`探索日常物件，找齊九片照片（${count}/9）。`,['桌下、椅背和相框附近都留下了碎片。','抽屜以外，收音機、書本和軟墊也能打開。','檢查餐具櫃與電視的夾層。','電視打開後，前方托架會清楚展示照片。','按N逐一檢查尚未打開的藏點；先開機關，再拿取出現的照片。'],10+count*2);
  return goal(prefix+'assemble:'+correct+':'+l.photoRead,'在相框拼回九片照片，再翻面查看。',['照片以真實圖案相接，不依碎片代號排序。','先點選一片，出現亮邊後才可旋轉。','可以拖到格位或交換，錯放也可取回。','找人物臉部、衣服、桌沿與背景相接的位置。','九片位置和角度全對後，查看完整照片並翻到背面，讀完才完成。'],50+correct);
 }
 if(i===3){const count=RECORDINGS.filter(t=>l.collected.includes(t.id)).length;let order=0;while(l.recordOrder[order]===order)order++;
  return goal(prefix+'recordings:'+count+':'+order,count<5?`在五處藏點找回錄音（${count}/5）。`:'按日期排列五段錄音，再接通記憶總機。',['五段錄音分散在家具與裝置裡。','檔案匣、答錄機、木櫃、孩子留言匣與角落矮櫃都可查看。','總機可逐段閱讀日期與逐字稿，靜音也能解。','依三月八日、十二日、十五日、十八日、二十日由早到晚排列。','錯序可點已排列的錄音取回；五段全對後，還要親自按接通記憶總機。'],10+count*6+order);
 }
 if(i===4){
  if(!l.installed.every(Boolean)){const count=l.installed.filter(Boolean).length,found=PARTS.filter(id=>l.collected.includes(id)).length;return goal(prefix+'lamps:'+count+':'+found,`尋找零件，修好三盞燈（${count}/3）。`,['三盞燈缺少不同的零件。','舊燈具匣、摺疊布箱與收音機可以打開。','燈泡、燈罩及電池各有相符的位置。','拿到零件後，靠近對應的過去、現在、未來之燈安裝。','先找齊三件零件並裝好，再檢查配電箱，不必把記憶碎片投入裝置。'],10+count*10+found*2);}
  const powered=circuitStatus(l).lamps.filter(Boolean).length;if(powered<3)return goal(prefix+'circuit:'+powered,`修復配電箱，接通三盞燈（${powered}/3）。`,['電源從左側流入，目標是右側三個接口。','單擊只旋轉；按住拖到另一格才會交換。','中央左側的分岔要同時向上、右、下供電。','上、下支路先轉彎，再各自向右通往燈具。','檢查每個相鄰接口是否對上；初始第1與2格、第6與7格可拖移交換，再調角度。'],60+powered);
  if(l.lampOrder.length<3)return goal(prefix+'light-order:'+l.lampOrder.length,'依時間先後點亮過去、現在、未來。',['電路已接通，現在回到房間操作燈。','燈名暗示時間的方向。','錯序會熄燈，可安全重來。','先過去，再現在，最後未來。','三盞依過去→現在→未來亮起後，前往中央的記憶投影裝置。'],80+l.lampOrder.length);
  return goal(prefix+'projection','啟動記憶投影裝置，完整看完回憶。',['三盞燈已經亮了。','中央裝置等待你啟動。','靠近記憶投影裝置，按E。','在面板按啟動記憶投影。','完整播放結束後，回到房間親自打開出口。'],90);
 }
 return goal(prefix+'mail:'+l.echoesSeen.length,'沿紅光走過回憶，將第二關的信投入信箱。',['不需要再找新的道具。','沿微弱紅色地面標記往前走。','紅字與家庭照片會隨行走分段浮現。','第二關未寄出的信一直保留在背包。','靠近走道盡頭的信箱，投入信後，再親自打開後方最後的門。'],10+l.echoesSeen.length*2);
}
