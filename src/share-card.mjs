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
  return {address:addr(address),network:chainId===84532?'Base Sepolia':'Base Mainnet',
    transactions:number(profile.transactions),age:number(profile.daysOnBase),recent:number(recent),
    contracts:number(profile.uniqueContracts),score:score.score==null?'—':String(score.score),partial:score.partial};
}
function rect(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function txt(c,s,x,y,size,color='#182b55',bold=true){c.fillStyle=color;c.font=(bold?'800 ':'500 ')+size+'px Manrope, Arial';c.fillText(String(s),x,y);}
function makeCanvas(p){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=675;
  const c=canvas.getContext('2d'),bg=c.createLinearGradient(0,0,1100,675);
  bg.addColorStop(0,'#ffffff');bg.addColorStop(.65,'#f1f5ff');bg.addColorStop(1,'#c5d8ff');
  c.fillStyle=bg;c.fillRect(0,0,1200,675);
  const halo=c.createRadialGradient(1020,160,10,1020,160,450);halo.addColorStop(0,'#b1c7ff');halo.addColorStop(1,'#edf3ff00');
  c.fillStyle=halo;c.fillRect(600,0,600,600);
  rect(c,34,33,1132,609,27,'#ffffffee');rect(c,68,65,73,73,19,'#1557fc');
  c.fillStyle='#fff';c.fillRect(83,99,42,5);
  txt(c,'BASE ACTIVITY HUB',161,104,29);txt(c,'PERSONAL ONCHAIN CARD',161,131,16,'#6380ad');
  rect(c,915,77,203,44,24,'#e6efff');txt(c,p.network,934,106,17,'#235ad1');
  txt(c,'MY BASE JOURNEY',78,204,17,'#295ff4');txt(c,p.address,76,266,40);
  rect(c,887,196,236,133,22,'#2156e9');txt(c,'ACTIVITY SCORE',909,230,15,'#d7e1ff');
  txt(c,p.score,908,296,68,'#fff');txt(c,'/ 100',1002,296,22,'#cbd9ff');
  const tiles=[['TRANSACTIONS',p.transactions],['DAYS ON BASE',p.age],['ACTIVE DAYS · 30D',p.recent],['DESTINATIONS*',p.contracts]];
  tiles.forEach((t,i)=>{const x=76+i*268;rect(c,x,366,252,138,18,'#eff5ff');txt(c,t[1],x+16,420,38,'#174bcb');txt(c,t[0],x+16,477,15,'#5e759d');});
  c.fillStyle='#dce6fb';c.fillRect(76,539,1047,2);
  txt(c,'Explore your onchain activity',76,582,21);
  txt(c,'base-activity-hub.onrender.com',76,611,19,'#235ff0');
  txt(c,p.partial?'Independent estimate · Some stats are incomplete':'Independent estimate · Not official Base ranking',650,610,14,'#7381a1',false);
  return canvas;
}
function postText(s){return 'My Base activity: '+s.transactions+' transactions on '+s.network+' 🔵\nCheck your wallet and explore onchain actions with Base Activity Hub.\n'+SITE;}
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
 overlay.innerHTML='<div class="bshare-dialog" role="dialog" aria-modal="true" aria-label="Base share card"><button class="secondary" id="bshareClose" style="float:right">×</button><h2>My Base activity card</h2><p class="bshare-note">Personal wallet stats, generated in your browser — no signature required.</p><img id="bsharePreview" alt="Base activity share image"><div class="bshare-buttons"><button class="secondary" id="bshareDownload">Download PNG</button><button id="bsharePost">Share to X ↗</button><button class="secondary" id="bshareCopy">Copy text</button></div><p class="bshare-note" id="bshareHint">On desktop, attach the PNG in the X composer before posting.</p></div>';
 document.body.append(overlay);
 $('bshareClose').onclick=()=>overlay.classList.remove('show');
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
 $('bshareOpen').onclick=()=>{
   const address=$('scoreAddress').value.trim()||state.address;
   if(!/^0x[\da-f]{40}$/i.test(address)){alert('Connect wallet or enter an address and use Check activity first.');return;}
   summary=shareSummary(state.profile||{},address,state.chainId);png=makeCanvas(summary).toDataURL('image/png');
   $('bsharePreview').src=png;overlay.classList.add('show');
 };
 $('bshareDownload').onclick=download;
 $('bshareCopy').onclick=async()=>{if(!summary)return;try{await navigator.clipboard.writeText(postText(summary));$('bshareCopy').textContent='Copied ✓'}catch{$('bshareHint').textContent=postText(summary)}};
 $('bsharePost').onclick=async()=>{
   if(!summary)return;
   if(navigator.share&&navigator.canShare){try{
     const blob=await(await fetch(png)).blob(),file=new File([blob],'base-activity.png',{type:'image/png'});
     if(navigator.canShare({files:[file]})){await navigator.share({files:[file],text:postText(summary),title:'My Base Activity'});return;}
   }catch(e){if(e.name==='AbortError')return;}}
   download();window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(postText(summary)),'_blank','noopener,noreferrer');
   $('bshareHint').textContent='Downloaded base-activity.png. Attach it to the prefilled post on X before publishing.';
 };
 drawMissions();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
 window.addEventListener('bah:scorecard-data',e=>{
  const d=e.detail||{};state={profile:d.profile||null,address:d.address||'',chainId:Number(d.chainId)||8453};drawMissions();
 });
}
