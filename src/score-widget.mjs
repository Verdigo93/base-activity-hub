/** Base Activity Hub independent scoring system. Four 0–100 metrics with a weighted /100 result. */
export const BASE_PUBLIC_LAUNCH_MS=Date.parse('2023-08-09T00:00:00Z');
export const SCORE_RULES=Object.freeze([
 {key:'transactions',weight:30,max:100,target:3000,label:'Transactions',ua:'Транзакції'},
 {key:'daysOnBase',weight:25,max:100,target:'launch',label:'Wallet age',ua:'Вік гаманця'},
 {key:'uniqueContracts',weight:25,max:100,target:50,label:'Contract destinations*',ua:'Різні контракти*'},
 {key:'recentActiveDays',weight:20,max:100,target:20,label:'Recent active days',ua:'Активні дні за 30 днів'}
]);
export function launchDays(now=Date.now()){return Math.max(1,Math.floor((now-BASE_PUBLIC_LAUNCH_MS)/86400000)+1)}
export function calculateBaseScore(profile,now=Date.now()){
 const since=new Date(now-29*86400000).toISOString().slice(0,10),today=new Date(now).toISOString().slice(0,10);
 const recentActiveDays=['etherscan','alchemy'].includes(profile?.source)&&Array.isArray(profile?.activityDays)
  ?new Set(profile.activityDays.filter(d=>d?.day>=since&&d.day<=today&&Number(d.count)>0).map(d=>d.day)).size:null;
 const values={transactions:profile?.transactions??null,daysOnBase:profile?.daysOnBase??null,
  uniqueContracts:profile?.uniqueContracts??null,recentActiveDays};
 const breakdown=SCORE_RULES.map(rule=>{
  const raw=values[rule.key],valid=raw!==null&&Number.isFinite(Number(raw))&&Number(raw)>=0;
  const value=valid?Number(raw):null,target=rule.target==='launch'?launchDays(now):rule.target;
  const points=value===null?null:Math.round(Math.min(1,value/target)*100);
  return {...rule,target,value,points,weightedPoints:points===null?null:points*rule.weight/100};
 });
 const available=breakdown.filter(r=>r.points!==null),complete=available.length===SCORE_RULES.length;
 return {breakdown,score:complete?Math.round(available.reduce((a,r)=>a+r.weightedPoints,0)):null,
  availableCategories:available.length,partial:profile?.historyPartial===true||!['etherscan','alchemy'].includes(profile?.source),
  source:profile?.source||'unknown'};
}

if(typeof document!=='undefined'){
  const $=id=>document.getElementById(id);
  const scoreStatus=$('scoreStatus'),scoreInput=$('scoreAddress'),scoreGo=$('scoreSearch');
  let selectedChain=8453,lastConnected=null,requestId=0;
  const language=()=> 'en';
  const t=(en,ua)=>en;
  const addressOk=s=>/^0x[0-9a-fA-F]{40}$/.test(s||'');
  const number=(n,digits=0)=>Number(n).toLocaleString(language()==='ua'?'uk-UA':'en-US',{maximumFractionDigits:digits});
  function setStatus(msg,kind='normal'){scoreStatus.textContent=msg;scoreStatus.dataset.kind=kind;}
  function paint(profile){
    const result=calculateBaseScore(profile);
    window.dispatchEvent(new CustomEvent('bah:scorecard-data',{detail:{profile,address:scoreInput.value.trim(),chainId:selectedChain}}));
    const available=result.availableCategories;
    $('scoreValue').textContent=result.score===null?'—':String(result.score);
    $('scoreRing').style.setProperty('--score-deg',result.score===null?'0deg':`${result.score*3.6}deg`);
    $('scoreConfidence').textContent=result.score===null?t(`${available}/4 data sources available`,`${available}/4 показників доступно`):
      result.partial?t('Estimated from a limited sample','Оцінка за неповними даними'):t('Unofficial activity estimate','Неофіційна оцінка активності');
    const rows=$('scoreRows');rows.innerHTML='';
    for(const entry of result.breakdown){
      const row=document.createElement('div');row.className='score-breakdown-row';
      const heading=document.createElement('div');heading.className='score-breakdown-heading';
      const label=document.createElement('span');label.textContent=entry.label+' · '+entry.weight+'% weight';
      const points=document.createElement('strong');points.textContent=entry.points===null?'— / 100':`${number(entry.points)} / 100`;
      heading.append(label,points);
      const track=document.createElement('div');track.className='score-meter';track.setAttribute('role','progressbar');
      track.setAttribute('aria-label',label.textContent);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(entry.max));
      if(entry.points!==null)track.setAttribute('aria-valuenow',String(entry.points));
      const bar=document.createElement('span');bar.style.width=`${entry.points===null?0:entry.points/entry.max*100}%`;
      track.append(bar);
      row.append(heading,track);rows.append(row);
    }
    $('scoreNetwork').textContent='Base Mainnet';
    const stats=[['scoreTx',profile?.transactions],['scoreAge',profile?.daysOnBase],['scoreApps',profile?.uniqueContracts],
      ['scoreActive',result.breakdown.find(x=>x.key==='recentActiveDays')?.value]];
    for(const [id,val] of stats)$(id).textContent=val==null?'—':number(val);
    const limited=result.partial;
    const label=language()==='ua'
      ? limited?'*Різні адреси контрактних викликів у доступній вибірці — не кількість застосунків. Дані можуть бути неповними.':'*Оцінка різних адрес контрактних викликів, не кількості застосунків.'
      : limited?'*Distinct contract call destinations in the available sample; not verified app count. History may be incomplete.':'*Distinct contract call destinations, not verified app count.';
    $('scoreDisclaimer').textContent=label;
    if(result.score===null){setStatus(t('Full score needs indexed history. Set ALCHEMY_API_KEY on Render (or explorer API); no rank or tier is invented.',
      'Для повного балу потрібна історія операцій. Додай ALCHEMY_API_KEY у Render; вигаданих рейтингів немає.'),'notice');}
    else setStatus(result.partial?t('Estimated from the latest available transactions; not an official Base or Alpha Drops score.',
      'Оцінка за доступними транзакціями; це не офіційний рейтинг Base або Alpha Drops.'):
      t('Community estimate using transparent scoring rules, not an official Base or Alpha Drops score.',
      'Незалежна оцінка за відкритою формулою, не офіційний рейтинг Base або Alpha Drops.'));
  }
  function reset(){paint({source:'none'});setStatus(t('Connect a wallet or enter any public Base address to check its activity.',
    'Підключи гаманець або введи будь-яку публічну Base-адресу, щоб перевірити активність.'));}
  async function checkAddress(address){
    if(!addressOk(address)){setStatus(t('Enter a valid 0x wallet address.','Введи правильну адресу гаманця 0x.'),'error');return;}
    const current=++requestId,chain=selectedChain;
    scoreGo.disabled=true;setStatus(t('Loading onchain activity…','Завантажую активність у блокчейні…'));
    try{
      const response=await fetch(`/api/profile?address=${encodeURIComponent(address)}&chainId=${chain}`);
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const profile=await response.json();
      if(current!==requestId||chain!==selectedChain)return;
      paint(profile);
    }catch(e){if(current===requestId)setStatus(t('Could not load history: ','Не вдалося отримати історію: ')+e.message,'error')}
    finally{if(current===requestId)scoreGo.disabled=false;}
  }
  window.addEventListener('bah:profile',event=>{
    const {account,chainId,profile}=event.detail||{};if(!account||!addressOk(account))return;
    selectedChain=8453;lastConnected=account;
    scoreInput.value=account;paint(profile);
  });
  scoreGo.addEventListener('click',()=>checkAddress(scoreInput.value.trim()));
  scoreInput.addEventListener('keydown',e=>{if(e.key==='Enter')checkAddress(scoreInput.value.trim())});
  $('scoreNetwork').textContent='Base Mainnet';reset();
}
