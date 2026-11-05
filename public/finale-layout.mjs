const layouts=[
 {side:'left',top:12,photoTop:52,tilt:-7,eyes:2},
 {side:'right',top:17,photoTop:49,tilt:6,eyes:1},
 {side:'left',top:21,photoTop:59,tilt:4,eyes:1},
 {side:'right',top:12,photoTop:58,tilt:-5,eyes:2},
 {side:'left',top:16,photoTop:48,tilt:-3,eyes:2},
 {side:'right',top:20,photoTop:52,tilt:8,eyes:1}
];
function shuffled(values,random){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function createFinaleLayouts(random=Math.random,previousFirst=-1){
 const order=shuffled([0,1,2,3,4,5],random);if(order[0]===previousFirst)order.push(order.shift());
 const photos=shuffled(['park','birthday','bedtime'],random);
 return order.slice(0,5).map((id,index)=>({...layouts[id],id,photo:photos[index%3],eyeSide:index%2?'right':'left',eyeAngle:((id*17)%35)-17}));
}
