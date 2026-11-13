import {advance,initial,course,width,height,road,wall,raceLaps,maxTicks,tickMs,elapsed} from './lap.js?v=grid';
const $=id=>document.getElementById(id), action=$('action'), modes=$('modes'), canvas=$('circuit'), ctx=canvas.getContext('2d');
const controls=[['KeyW','KeyS','KeyA','KeyD'],['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'],['KeyI','KeyK','KeyJ','KeyL']];
const colours=['#ffd278','#69d8ff','#ff879b'], keys=new Set(), fmt=ms=>(ms/1000).toFixed(2)+' s';
const track=document.createElement('canvas');track.width=width;track.height=height;
const g=track.getContext('2d'), path=new Path2D();course.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();
g.fillStyle='#20392c';g.fillRect(0,0,width,height);
g.fillStyle='#254333';for(let i=-height;i<width;i+=120){g.beginPath();g.moveTo(i,0);g.lineTo(i+58,0);g.lineTo(i+height+58,height);g.lineTo(i+height,height);g.fill();}
g.lineJoin='round';
for(const [w,c,dash] of [[wall*2+8,'#14191c',[]],[wall*2,'#b8c1c6',[]],[wall*2-10,'#47604a',[]],[road+18,'#e5dfcc',[]],[road+18,'#ab463c',[21,21]],[road,'#353b41',[]],[road-14,'#393f45',[]]]){g.strokeStyle=c;g.lineWidth=w;g.setLineDash(dash);g.stroke(path);}
g.setLineDash([]);
for(let i=0;i<course.length;i+=10){
 const [x,y]=course[i], [u,v]=course[(i+1)%course.length],a=Math.atan2(v-y,u-x);
 g.save();g.translate(x,y);g.rotate(a);
 if(!i){for(let j=0;j<10;j++)for(let k=0;k<2;k++){g.fillStyle=(j+k)%2?'#101418':'#f4eedf';g.fillRect(k*12-12,j*15-75,12,15);}}
 else{g.strokeStyle='#a3a9ae';g.lineWidth=3;g.beginPath();g.moveTo(-12,-10);g.lineTo(1,0);g.lineTo(-12,10);g.stroke();}
 g.restore();
}
g.fillStyle='#c4aa76';g.font='bold 46px system-ui';g.fillText('APEX GP',770,920);
g.font='22px system-ui';g.fillText('CIRCUIT 03',775,956);
const race=$("race"), countdown=$("countdown"), lobby=$("lobby");
let round=0, cars=[], state='ready', run, inputLog='', last=0, finishOrder=[];
const hosted=location.hostname==='apex-f1-explorer.panshuosally.chatgpt.site';
const localBest=()=>{try{return Number(localStorage.getItem('apex-circuit-local-best'))||0;}catch{return 0;}};
const players=()=>Number(modes.querySelector(':checked').value);
function grid(){cars=Array.from({length:players()},(_,i)=>initial([0,-38,38][i]));finishOrder=[];paint();}
function paint(){
 ctx.drawImage(track,0,0);
 cars.forEach((s,i)=>{
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.a);
  ctx.fillStyle='#121418';for(const x of [-16,11])for(const y of [-14,6])ctx.fillRect(x,y,9,8);
  ctx.fillStyle=colours[i];ctx.beginPath();ctx.moveTo(22,-3);ctx.lineTo(22,3);ctx.lineTo(5,6);ctx.lineTo(-9,9);ctx.lineTo(-18,6);ctx.lineTo(-18,-6);ctx.lineTo(-9,-9);ctx.lineTo(5,-6);ctx.fill();
  ctx.fillRect(-19,-12,5,24);ctx.fillRect(18,-9,4,18);ctx.fillStyle='#171b21';ctx.fillRect(-7,-4,10,8);ctx.restore();
  ctx.fillStyle=colours[i];ctx.font='bold 22px system-ui';ctx.fillText('P'+(i+1),s.x-12,s.y-23);
 });
}
function hud(){
 const rows=cars.map((s,i)=>{
  const row=document.createElement('span');row.style.setProperty('--driver',colours[i]);
  const label=document.createElement('strong');
  label.textContent=s.done?'FINISHED':s.lap+1===raceLaps?'FINAL LAP':'LAP '+(s.lap+1)+' / '+raceLaps;
  if(!s.done&&s.lap+1===raceLaps)row.classList.add('final');
  row.append(label,'P'+(i+1)+' · '+fmt(elapsed(s))+(s.off?' · Grass':''));
  return row;
 });$('drivers').replaceChildren(...rows);
}
async function request(path,data){
 const res=await fetch('./api/circuit-v2/'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const body=await res.json();if(!res.ok)throw Error(body.error||'Leaderboard unavailable.');return body;
}
async function board(){
 if(!hosted){
  $('ranked-link').hidden=false;
  $('board-state').textContent=localBest()?'This browser’s solo best: '+fmt(localBest()):'Race here for a personal best, or open APEX to race for a shared score.';return;
 }
 try{
  const rows=await request('scores');
  $('scores').replaceChildren(...rows.map(({tag,score})=>{
   const li=document.createElement('li'),time=document.createElement('span');time.textContent=fmt(score);li.append(document.createTextNode(tag),time);return li;
  }));$('board-state').textContent=rows.length?'':'No solo times yet.';
 }catch{$('board-state').textContent='Shared times are unavailable here. You can still race locally.';}
}
async function finish(){
 state='finishing';
 const completedRound=round;
 const winner=finishOrder[0];
 $('status').textContent=winner===undefined?'Time limit reached. Try again.':cars.length===1?'Race complete: '+fmt(elapsed(cars[0])):'Player '+(winner+1)+' wins in '+fmt(elapsed(cars[winner]))+'!';
 countdown.classList.add('result');countdown.textContent=winner===undefined?'Time limit':cars.length===1?'Race complete':'Player '+(winner+1)+' wins!';countdown.hidden=false;
 if(!hosted&&cars.length===1&&cars[0].done){
  const time=elapsed(cars[0]);
  if(!localBest()||time<localBest())try{localStorage.setItem('apex-circuit-local-best',String(time));}catch{}
  await board();
 }
 if(run?.id&&cars[0].done){
  try{const result=await request('finish',{id:run.id,inputs:inputLog});if(round!==completedRound)return;$('status').textContent+=' Personal best: '+fmt(result.best)+' · '+result.tag;await board();}
  catch(e){if(round!==completedRound)return;$('status').textContent+=' '+e.message;}
 }
 if(round===completedRound)state='result';
}
function frame(now){
 if(state!=='race')return;
 const delta=Math.min(150,now-last);if(now-last>150)last=now-delta;
 while(now-last>=tickMs&&!finishOrder.length){
  cars.forEach((s,i)=>{
   if(s.done||s.ticks>=maxTicks)return;
   const input=controls[i].reduce((a,k,j)=>a|(keys.has(k)?1<<j:0),0);
   if(run?.id&&i===0)inputLog+=input.toString(16);
   advance(s,input);if(s.done)finishOrder.push(i);
  });last+=tickMs;
 }
 paint();hud();
 if(finishOrder.length||cars.every(s=>s.ticks>=maxTicks))finish();else requestAnimationFrame(frame);
}
action.onclick=()=>{
 const token=++round;
 action.disabled=true;modes.disabled=true;state='loading';grid();hud();inputLog='';run=null;keys.clear();
 race.hidden=false;lobby.inert=true;
 if(race.requestFullscreen)race.requestFullscreen().catch(()=>{});
 countdown.classList.remove('result');countdown.textContent='READY';countdown.hidden=false;
 $('status').textContent='';
 const ready=hosted&&cars.length===1?request('start',{}).catch(()=>null):Promise.resolve(null);

 function lights(now){
  if(token!==round)return;
  const left=3-Math.floor((now-start)/1000);
  if(left>0){countdown.textContent=String(left);requestAnimationFrame(lights);return;}
  countdown.textContent='GO!';
  state='race';last=performance.now();
  // Register before recording any inputs. If the server has not answered yet, race locally.
  run=registered;requestAnimationFrame(frame);
  setTimeout(()=>{if(token===round&&state==='race')countdown.hidden=true;},550);
 }
 let registered=null,start;
 Promise.race([ready,new Promise(resolve=>setTimeout(()=>resolve(null),6000))]).then(result=>{
  if(token!==round)return;registered=result;start=performance.now();
  $('status').textContent=cars.length>1?'Local multiplayer':registered?'Ranked solo race':hosted?'Practice · shared scoring unavailable for this run':'Solo · personal best saved on this browser';
  requestAnimationFrame(lights);
 });
};
$('back').onclick=()=>{
 ++round;keys.clear();state='ready';race.hidden=true;lobby.inert=false;
 if(document.fullscreenElement===race)document.exitFullscreen().catch(()=>{});
 action.disabled=false;modes.disabled=false;action.focus();
};
modes.onchange=()=>{grid();hud();};
document.addEventListener('keydown',e=>{
 const group=controls.findIndex(c=>c.includes(e.code));
 if((state==='race'||state==='loading')&&group>=0&&group<cars.length){e.preventDefault();keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>keys.clear());
grid();hud();board();
