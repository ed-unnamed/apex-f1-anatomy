const corners=[[275,1190],[510,1190],[970,1190],[1470,1190],[1720,1090],[1750,885],[1560,755],[1260,753],[1115,630],[1220,468],[1530,427],[1665,275],[1490,155],[1060,155],[600,155],[240,200],[155,400],[300,555],[555,590],[670,755],[560,915],[285,932],[148,1015]];
export const width=1900,height=1350,road=150, wall=101;
const steps=10, N=corners.length;
export const course=corners.flatMap((b,i)=>{
 const a=corners[(i+N-1)%N],c=corners[(i+1)%N],d=corners[(i+2)%N];
 return Array.from({length:steps},(_,j)=>{const t=j/steps;return b.map((v,k)=>.5*(2*v+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t));});
});
export const raceLaps=3, maxTicks=10500, tickMs=1000/30;
const count=course.length;
export function initial(lane=0,laps=raceLaps){
 const [x,y]=course[0],a=Math.atan2(course[1][1]-y,course[1][0]-x);
 return {x:x-Math.sin(a)*lane,y:y+Math.cos(a)*lane,a,v:0,ticks:0,progress:0,lap:0,laps,off:false,done:false};
}
export function locate(x,y,hint){
 let best=Infinity,p=0;
 const base=Number.isFinite(hint)?Math.floor(hint)-5:0, end=Number.isFinite(hint)?base+12:count;
 for(let n=base;n<end;n++){
  const i=((n%count)+count)%count;
  const [ax,ay]=course[i], [bx,by]=course[(i+1)%count], dx=bx-ax,dy=by-ay;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
  const d=(x-ax-dx*t)**2+(y-ay-dy*t)**2;
  if(d<best){best=d;p=n+t;}
 }
 return {p,d:Math.sqrt(best)};
}
export function advance(s,input){
 if(s.done||s.ticks>=maxTicks)return;
 const {d}=locate(s.x,s.y,s.progress);s.off=d>road/2-3;
 const cap=s.off?3.4:11.5, accelerate=input&1, brake=input&2;
 if(brake)s.v=Math.max(-2.5,s.v-(s.v>0?.60:.14));
 else if(accelerate)s.v=Math.min(s.v+.32,Math.max(cap,s.v-.57));
 else s.v*=s.off?.88:.977;
 if(s.off&&s.v>cap)s.v=Math.max(cap,s.v-.57);
 const turn=(input&8?1:0)-(input&4?1:0);
 s.a+=turn*(.046+.021*Math.min(1,Math.abs(s.v)/7))*Math.min(1,Math.abs(s.v)/1.5)*Math.sign(s.v);
 const x=s.x+Math.cos(s.a)*s.v,y=s.y+Math.sin(s.a)*s.v;
 const next=locate(x,y,s.progress);
 s.ticks++;
 if(next.d>wall-9){s.v=0;return;}
 s.x=x;s.y=y;s.progress=next.p;s.off=next.d>road/2-3;
 s.lap=Math.max(s.lap,Math.min(s.laps,Math.floor(s.progress/count)));
 s.done=s.lap===s.laps;
}
export const elapsed=s=>Math.round(s.ticks*tickMs);
