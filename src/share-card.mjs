/** Public wallet activity card: created locally with Canvas, never requests a wallet signature. */
import {calculateBaseScore} from './score-widget.mjs';
const SITE='https://base-activity-hub.onrender.com/';
const $=id=>document.getElementById(id);
const number=x=>x==null||!Number.isFinite(Number(x))?'—':Math.floor(Number(x)).toLocaleString('en-US');
const addr=x=>/^0x[\da-f]{40}$/i.test(x||'')?x.slice(0,6)+'…'+x.slice(-4):'Wallet';
export function shareSummary(profile={},address='',chainId=8453,now=Date.now()){
  const score=calculateBaseScore(profile,now);
  const since=new Date(now-29*86400000).toISOString().slice(0,10);
  const recent=Array.isArray(profile.activityDays)&&['alchemy','etherscan'].includes(profile.source)
    ?profile.activityDays.filter(x=>x.day>=since&&Number(x.count)>0).length:null;
  return {address:addr(address),network:'Base Mainnet',
    transactions:number(profile.transactions),age:number(profile.daysOnBase),recent:number(recent),
    contracts:number(profile.uniqueContracts),score:score.score==null?'—':String(score.score),partial:score.partial};
}
function rect(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function txt(c,s,x,y,size,color='#182b55',bold=true){c.fillStyle=color;c.font=(bold?'800 ':'500 ')+size+'px Manrope, Arial';c.fillText(String(s),x,y);}
function makeCanvas(p){
  const canvas=document.createElement('canvas');
  canvas.width=1200;canvas.height=675;
  const c=canvas.getContext('2d');
  if(!c)throw Error('This browser cannot create a share image');
  const W=1200,H=675,PI=Math.PI;
  const fill=(style,x,y,w,h)=>{c.fillStyle=style;c.fillRect(x,y,w,h)};
  const round=(x,y,w,h,r,color,stroke)=>{
    c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();
    if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke()}
  };
  const text=(value,x,y,size,color='#ffffff',weight=700,maxWidth)=>{
    c.font=weight+' '+size+'px Manrope, Inter, Arial, sans-serif';
    c.fillStyle=color;c.textBaseline='alphabetic';
    if(maxWidth)c.fillText(String(value),x,y,maxWidth);else c.fillText(String(value),x,y);
  };
  const linear=c.createLinearGradient(0,0,W,H);
  linear.addColorStop(0,'#050b20');linear.addColorStop(.5,'#112650');linear.addColorStop(1,'#0b1744');
  fill(linear,0,0,W,H);

  // Glowing base-blue and cyan atmosphere, with fine schematic grid lines.
  for(const [x,y,r,color] of [[1050,120,360,'83,126,255'],[800,560,400,'22,185,255'],[230,110,300,'38,92,242']]){
    const glow=c.createRadialGradient(x,y,0,x,y,r);
    glow.addColorStop(0,'rgba('+color+',0.29)');
    glow.addColorStop(.55,'rgba('+color+',0.09)');
    glow.addColorStop(1,'rgba('+color+',0)');
    fill(glow,0,0,W,H);
  }
  c.save();c.strokeStyle='rgba(125,167,255,.085)';c.lineWidth=1;
  for(let x=-250;x<1400;x+=56){c.beginPath();c.moveTo(x,0);c.lineTo(x+290,H);c.stroke()}
  for(let y=0;y<H;y+=54){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
  c.restore();
  // Outer luminous shell and glossy surface.
  c.shadowColor='rgba(17,68,190,.52)';c.shadowBlur=42;
  round(30,30,1140,615,34,'rgba(9,22,52,.84)','rgba(171,203,255,.30)');
  c.shadowBlur=0;
  const sheet=c.createLinearGradient(30,30,1160,650);
  sheet.addColorStop(0,'rgba(49,93,193,.13)');
  sheet.addColorStop(.4,'rgba(20,43,100,.03)');
  sheet.addColorStop(1,'rgba(28,103,235,.19)');
  round(34,34,1132,607,31,sheet);
  // Electric top accent, intentionally distinctive from plain dashboard tiles.
  const accent=c.createLinearGradient(60,0,1140,0);
  accent.addColorStop(0,'#2c72ff');accent.addColorStop(.54,'#59d3ff');accent.addColorStop(1,'rgba(70,139,255,0)');
  round(63,33,1074,4,2,accent);

  // Header brand mark and small network pill.
  round(66,65,52,52,16,'#2b69ff');
  c.strokeStyle='#fff';c.lineWidth=6;c.lineCap='round';
  c.beginPath();c.moveTo(82,91);c.lineTo(104,91);c.stroke();
  c.beginPath();c.moveTo(89,80);c.lineTo(89,103);c.stroke();
  text('BASE ACTIVITY HUB',136,95,24,'#f6f9ff',800);
  text('ONCHAIN WALLET INSIGHTS',137,115,11,'#9fbdf1',600);
  round(931,68,197,40,20,'rgba(49,91,174,.38)','rgba(110,160,255,.40)');
  c.beginPath();c.arc(949,88,5,0,2*PI);c.fillStyle='#49dfae';c.fill();
  text('BASE MAINNET',965,94,16,'#dfeaff',800);

  // Editorial hierarchy.
  text('YOUR BASE',70,192,57,'#fcfdff',850);
  text('JOURNEY',70,254,66,'#8ec5ff',850);
  text('Every transaction tells your story.',73,293,19,'#c0d4f1',500);
  round(69,309,245,38,11,'rgba(54,97,177,.37)','rgba(101,150,245,.30)');
  text(p.address,84,334,18,'#d6e9ff',750,220);

  // Score halo with pronounced ring and legible large number.
  const cx=987,cy=259,r=104;
  const halo=c.createRadialGradient(cx,cy,40,cx,cy,168);
  halo.addColorStop(0,'rgba(61,135,255,.25)');halo.addColorStop(1,'rgba(61,135,255,0)');
  fill(halo,784,66,406,396);
  c.strokeStyle='rgba(89,136,226,.30)';c.lineWidth=2;
  c.beginPath();c.arc(cx,cy,124,0,2*PI);c.stroke();
  c.beginPath();c.arc(cx,cy,147,-.4,1.3);c.stroke();
  c.strokeStyle='#294576';c.lineWidth=15;c.lineCap='round';
  c.beginPath();c.arc(cx,cy,r,-PI/2,1.5*PI);c.stroke();
  const scoreNum=p.score==='—'?null:Number(p.score);
  const pct=Number.isFinite(scoreNum)?Math.min(100,Math.max(0,scoreNum)):null;
  if(pct!==null&&pct>0){
    const ring=c.createLinearGradient(cx-100,cy-100,cx+100,cy+100);
    ring.addColorStop(0,'#4f83ff');ring.addColorStop(.5,'#61d9ff');ring.addColorStop(1,'#9bafff');
    c.strokeStyle=ring;c.lineWidth=16;c.shadowColor='#479cff';c.shadowBlur=18;
    c.beginPath();c.arc(cx,cy,r,-PI/2,-PI/2+2*PI*pct/100);c.stroke();c.shadowBlur=0;
  }
  c.textAlign='center';text('ACTIVITY SCORE',cx,218,14,'#b6cfff',800);
  text(p.score,cx,296,78,'#ffffff',850);
  text('/ 100',cx,325,24,'#abc8f4',700);c.textAlign='start';

  // Four high-contrast data panels across the full width.
  const metrics=[
    ['TRANSACTIONS',p.transactions,'#9cd0ff'],
    ['DAYS ON BASE',p.age,'#c0b6ff'],
    ['ACTIVE DAYS · 30D',p.recent,'#9df4de'],
    ['DESTINATIONS*',p.contracts,'#ffd2a4']
  ];
  metrics.forEach(([label,value,tone],i)=>{
    const x=68+i*268,y=386,w=252,h=154;
    round(x,y,w,h,20,'rgba(28,48,95,.88)','rgba(118,168,255,.24)');
    round(x+17,y+17,38,4,2,tone);
    text(label,x+17,y+52,14,'#afc5e8',800,220);
    const v=String(value);
    text(v,x+17,y+111,v.length>=9?32:v.length>=7?37:47,'#f6faff',850,214);
    text(i===0?'ONCHAIN TRANSACTIONS':i===1?'FIRST OBSERVED ACTIVITY':i===2?'LAST 30 DAYS':'UNIQUE DESTINATIONS',x+17,y+136,10,'#8ba6cd',650,220);
  });
  // Bottom edge CTA and clear attribution.
  round(69,563,1049,1,1,'rgba(128,169,239,.22)');
  round(69,584,31,31,9,'#3678ff');
  text('↗',76,607,21,'#ffffff',800);
  text('Check yours at',114,607,18,'#b8cbed',600);
  text('base-activity-hub.onrender.com',255,607,19,'#72c9ff',800);
  c.textAlign='right';text(p.partial?'INDEPENDENT · ESTIMATED':'INDEPENDENT · NOT OFFICIAL',1122,630,12,'#9db5da',700);c.textAlign='start';
  return canvas;
}
export function postText(s){
 const scoreLine=s.score==='—'?'Activity score: unavailable':s.score+'/100 activity score'+(s.partial?' (estimated)':'');
 const txLine=s.transactions==='—'?'Transactions: unavailable':s.transactions+' transactions';
 const ageLine=s.age==='—'?'Days on Base: unavailable':s.age+' days on Base';
 const daysLine=s.recent==='—'?'Active days (last 30 days): unavailable':s.recent+' active days in the last 30 days';
 return 'I checked my Base wallet on Base Activity Hub.\n\n'+scoreLine+'\n'+txLine+'\n'+ageLine+'\n'+daysLine+'\n\nCheck your wallet and grow your Base activity:\n'+SITE;
}
export function xIntentUrl(s){return 'https://x.com/intent/post?text='+encodeURIComponent(postText(s));}
function nextTarget(v,targets){return targets.find(x=>x>Number(v))||targets[targets.length-1];}
let state={profile:null,address:'',chainId:8453},png='',summary=null;
function drawMissions(){
  const box=$('shareMilestones');if(!box)return;const p=state.profile||{};
  const since=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  const active=Array.isArray(p.activityDays)&&['alchemy','etherscan'].includes(p.source)
     ?p.activityDays.filter(x=>x.day>=since&&Number(x.count)>0).length:null;
  box.replaceChildren();
  [['Transactions',p.transactions,[10,50,100,500,1000,5000,10000,20000]],
  ['Recent active days · sample',active,[3,7,10,15,20,30]],
  ['Destinations · sample',p.uniqueContracts,[3,5,10,20,30,50]]].forEach(([label,val,levels])=>{
     const target=val==null?levels[0]:nextTarget(val,levels);
     const card=document.createElement('div');card.className='bshare-mission';
     const head=document.createElement('b');head.textContent=val==null?'—':number(val)+' / '+number(target);
     const sub=document.createElement('small');sub.textContent=label;
     const bar=document.createElement('div');bar.className='bshare-progress';
     const fill=document.createElement('i');fill.style.width=val==null?'0%':Math.min(100,Number(val)/target*100)+'%';
     bar.append(fill);card.append(head,sub,bar);box.append(card);
  });
}
function download(){
  if(!png)return;
  const a=document.createElement('a');a.href=png;a.download='base-activity.png';document.body.append(a);a.click();a.remove();
}
function setup(){
 if(!$('base-score'))return;
 const css=document.createElement('style');css.textContent='.bshare-bar{margin:14px 0 10px;padding:13px 16px;border-radius:15px;border:1px solid #dce7ff;background:linear-gradient(115deg,#f7faff,#eaf2ff);display:flex;align-items:center;gap:13px;flex-wrap:wrap}.bshare-bar>div{flex:1}.bshare-bar b{color:#1a2c5b;font-size:14px}.bshare-bar p{color:#6e7c99;margin:3px 0 0;font-size:11px}.bshare-button,.bshare-dialog button{border:0;border-radius:10px;background:#245bfa;color:#fff;padding:11px 15px;font-weight:800;font-size:12px;cursor:pointer}.bshare-note{font-size:11px;color:#7b89a4}.bshare-missions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}.bshare-mission{border:1px solid #e1eaff;border-radius:12px;background:#f8faff;padding:11px}.bshare-mission b{display:block;color:#244bcb;font-size:16px}.bshare-mission small{display:block;color:#647895;margin:6px 0;font-size:11px}.bshare-progress{height:6px;background:#dce7fa;border-radius:5px;overflow:hidden}.bshare-progress i{display:block;background:#2863fc;height:100%}.bshare-overlay{display:none;position:fixed;inset:0;z-index:10000;background:#071535bb;align-items:center;justify-content:center;padding:14px}.bshare-overlay.show{display:flex}.bshare-dialog{width:min(650px,100%);max-height:95vh;overflow:auto;background:white;border-radius:19px;padding:20px;box-shadow:0 25px 80px #0003}.bshare-dialog h2{margin:0 0 6px;color:#18264a;font-size:20px}.bshare-dialog img{width:100%;border-radius:10px;border:1px solid #e0e9ff}.bshare-buttons{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}.bshare-dialog button.secondary{background:#ebf1ff;color:#2255cd}@media(max-width:640px){.bshare-missions{grid-template-columns:1fr}.bshare-buttons button{flex:1}}';
 document.head.append(css);
 const control=$('base-score').querySelector('.score-controls');
 const bar=document.createElement('div');bar.className='bshare-bar';
 bar.innerHTML='<div><b>🔵 Share My Base Activity</b><p>Create a PNG card with your onchain stats and share it on X.</p></div><button class="bshare-button" id="bshareOpen">Create share card ↗</button>';
 control.before(bar);
 const missions=document.createElement('div');missions.innerHTML='<b style="font-size:13px;color:#1b2b55">🎯 Next Milestones</b><div class="bshare-missions" id="shareMilestones"></div><small class="bshare-note">Independent goals, not official Base rewards. Sampled data may be incomplete.</small>';
 bar.after(missions);
 const overlay=document.createElement('div');overlay.id='bshareOverlay';overlay.className='bshare-overlay';
 overlay.innerHTML='<div class="bshare-dialog" role="dialog" aria-modal="true" aria-label="Base share card"><button class="secondary" id="bshareClose" style="float:right">×</button><h2>My Base activity card</h2><p class="bshare-note">Personal wallet stats, generated in your browser — no signature required.</p><img id="bsharePreview" alt="Base activity share image"><div class="bshare-buttons"><button class="secondary" id="bshareDownload">Download PNG</button><button id="bsharePost">Share to X ↗</button><button class="secondary" id="bshareCopy">Copy text</button></div><p class="bshare-note" id="bshareHint">Share to X opens a ready-to-post message; download PNG separately to attach an image.</p></div>';
 document.body.append(overlay);
 $('bshareClose').onclick=()=>overlay.classList.remove('show');
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
 $('bshareOpen').onclick=()=>{
   const address=$('scoreAddress').value.trim()||state.address;
   if(!/^0x[\da-f]{40}$/i.test(address)||address.toLowerCase()!==String(state.address).toLowerCase()){alert('Connect wallet or click Check activity for this address before sharing its statistics.');return;}
   summary=shareSummary(state.profile||{},address,state.chainId);png=makeCanvas(summary).toDataURL('image/png');
   $('bsharePreview').src=png;overlay.classList.add('show');
 };
 $('bshareDownload').onclick=download;
 $('bshareCopy').onclick=async()=>{if(!summary)return;try{await navigator.clipboard.writeText(postText(summary));$('bshareCopy').textContent='Copied ✓'}catch{$('bshareHint').textContent=postText(summary)}};
 $('bsharePost').onclick=()=>{
   if(!summary)return;
   // Synchronous click opens the X composer; PNG remains optional and separately downloadable.
   window.open(xIntentUrl(summary),'_blank','noopener,noreferrer');
   $('bshareHint').textContent='X opens with a ready-to-post message. Use Download PNG if you wish to attach the image.';
 };
 drawMissions();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
 window.addEventListener('bah:scorecard-data',e=>{
  const d=e.detail||{};state={profile:d.profile||null,address:d.address||'',chainId:Number(d.chainId)||8453};drawMissions();
 });
}
