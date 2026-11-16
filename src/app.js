import {CONFIG} from '../config.js';
import {hydrateIcons, icon} from './icons.js';
import {abiEncode,callData,formatUnits,parseUnits,isAddress,shortAddress,hex,errorMessage,builderCodeSuffix} from './eth.js';
import {validateMainnetX402,createMainnetAuthorization,encodeMainnetPayment} from './x402-payment.mjs';

const $=id=>document.getElementById(id);
const txStorePrefix='bah:confirmed:';
const today=()=>new Date().toLocaleDateString('en-CA');
const zero='0x0000000000000000000000000000000000000000';
const actions=[
  {id:'gm',icon:'message',title:'GM Base',ua:'GM у Base',subtitle:'Say GM onchain',subUa:'Напиши GM у мережі'},
  {id:'checkin',icon:'calendar',title:'Daily Check-in',ua:'Щоденний check-in',subtitle:'Keep your streak',subUa:'Підтримуй активність'},
  {id:'mint',icon:'image',title:'Mint NFT',ua:'Мінт NFT',subtitle:'Mint an original collectible',subUa:'Створи власний NFT'},
  {id:'deploy',icon:'code',title:'Deploy Contract',ua:'Деплой контракту',subtitle:'Create a smart contract',subUa:'Розгорни свій контракт'},
  {id:'mintToken',icon:'layers',title:'Mint Token',ua:'Створи токен',subtitle:'Deploy your ERC-20',subUa:'Запусти власний ERC-20'},
  {id:'sendETH',icon:'send',title:'Send ETH',ua:'Надіслати ETH',subtitle:'Make a transfer',subUa:'Переказ ETH'},
  {id:'sendUSDC',icon:'dollar',title:'Send USDC',ua:'Надіслати USDC',subtitle:'Transfer USDC on Base',subUa:'Переказ USDC'},
  {id:'swap',icon:'swap',title:'Token Swap',ua:'Обмін токенів',subtitle:'Open trusted swap',subUa:'Перейти на Uniswap'},
  {id:'message',icon:'message',title:'Onchain Message',ua:'Ончейн-повідомлення',subtitle:'Write to the blockchain',subUa:'Напиши у блокчейн'},
  {id:'x402',icon:'wallet',title:'x402 Payments',ua:'Платежі x402',subtitle:'Check 0.01 USDC payment readiness',subUa:'Перевірка оплати 0.01 USDC'},
];
const dailyTasks=[{id:'gm',title:'Say GM onchain',ua:'Написати GM ончейн',cost:'gas'},{id:'mint',title:'Mint an NFT',ua:'Змінтити NFT',cost:'from $0.10 + gas'},{id:'sendETH',title:'Make a transfer',ua:'Зробити переказ',cost:'gas + transfer'},{id:'message',title:'Leave an onchain message',ua:'Залишити повідомлення',cost:'gas'},{id:'deploy',title:'Deploy a contract',ua:'Розгорнути контракт',cost:'$0.10 + gas'}];
const uiStrings={
 en:{navHome:'Home',navAnalytics:'Analytics',navAchievements:'Achievements',myProfile:'My Base Profile',transactions:'Outgoing txs',daysOnBase:'Days on Base',activeDays:'Active days',deployedContracts:'Contracts created*',nftsMinted:'NFT minted*',uniqueContracts:'Unique contracts',balances:'Balances (Base)',firstTransaction:'First transaction',refreshData:'Refresh profile',onchainActions:'Onchain Actions',actionsSubtitle:'Real interactions with Base, without the complexity.',nftCollection:'Mint NFT Collection',nftSubtitle:'Collect original Base-inspired artwork.',contractFactory:'Smart Contract Factory',factorySubtitle:'Your own contract, in a few clicks.',contractType:'Contract type',deployContract:'Deploy Contract',dailyActivity:'Daily Activity',dailySubtitle:'Your 5 onchain actions for today.',achievements:'Achievements',recentActivity:'Recent Activity',activityCalendar:'Activity Calendar'},
 ua:{navHome:'Головна',navAnalytics:'Аналітика',navAchievements:'Досягнення',myProfile:'Мій профіль Base',transactions:'Вихідні транзакції',daysOnBase:'Днів у Base',activeDays:'Активних днів',deployedContracts:'Створено контрактів*',nftsMinted:'Створено NFT*',uniqueContracts:'Різних контрактів',balances:'Баланс (Base)',firstTransaction:'Перша транзакція',refreshData:'Оновити профіль',onchainActions:'Ончейн-дії',actionsSubtitle:'Реальні взаємодії з Base без складнощів.',nftCollection:'Колекція NFT',nftSubtitle:'Колекційні NFT, присвячені Base.',contractFactory:'Фабрика контрактів',factorySubtitle:'Твій контракт за кілька натискань.',contractType:'Тип контракту',deployContract:'Задеплоїти контракт',dailyActivity:'Активність за день',dailySubtitle:'П’ять ончейн-дій на сьогодні.',achievements:'Досягнення',recentActivity:'Останні дії',activityCalendar:'Календар активності'},
};
const state={language:'en',chainId:8453,provider:null,account:null,profile:null,busy:false,modal:null,localEvents:[],daily:{},noticeDismissed:false};
const tr=(en,ua)=>en;
function safe(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(message,type='info'){const el=document.createElement('div');el.className='toast '+type;el.textContent=message;$('toastContainer').append(el);setTimeout(()=>el.remove(),6000)}
function config(){return CONFIG.chains[state.chainId]}
function storageKey(){return `${txStorePrefix}${state.chainId}:${state.account?.toLowerCase()||'demo'}`}
function readEvents(){try{return JSON.parse(localStorage.getItem(storageKey())||'[]').filter(e=>e&&typeof e.hash==='string')}catch{return []}}
function saveEvent(event){state.localEvents=[event,...state.localEvents].slice(0,100);localStorage.setItem(storageKey(),JSON.stringify(state.localEvents));renderDaily();renderRecent();renderCalendar()}
function getDays(){const days={};for(const e of state.localEvents){if(e.date)days[e.date]=(days[e.date]||0)+1}for(const r of state.profile?.activityDays||[]){days[r.day]=Math.max(days[r.day]||0,Number(r.count)||0)}return days}
function isDone(actionId){const aliases=actionId==='sendETH'?['sendETH','sendUSDC']:actionId==='deploy'?['deploy','mintToken']: [actionId];return state.localEvents.some(e=>e.date===today()&&aliases.includes(e.type))}
function renderActions(){const container=$('actionsGrid');container.innerHTML=actions.map((a,i)=>`<button class="action-tile ${i===0?'primary':''}" data-action="${a.id}"><span class="tile-icon">${icon(a.icon)}</span><span class="tile-arrow">${icon('chevron')}</span><h3>${safe(state.language==='ua'?a.ua:a.title)}</h3><p>${safe(state.language==='ua'?a.subUa:a.subtitle)}</p></button>`).join('');container.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>openAction(el.dataset.action)))}
function renderNfts(){
 $('nftGallery').innerHTML=CONFIG.nftItems.map(n=>`<article class="nft-item nft-${n.rarity.toLowerCase()}">
  <div class="nft-artwork">
   <img src="${n.image}" alt="${safe(n.name)} — ${safe(n.rarity)} NFT" loading="lazy" width="384" height="384">
   <span class="nft-rarity">${safe(n.rarity.toUpperCase())}</span>
  </div>
  <h3>${safe(n.name)}</h3>
  <strong class="nft-cost">${n.priceUsdc} USDC</strong>
  <small>Max supply ${Number(n.maxSupply).toLocaleString('en-US')}</small>
  <button data-nft="${n.id}" aria-label="Mint ${safe(n.name)} for ${n.priceUsdc} USDC">Mint NFT</button>
 </article>`).join('');
 document.querySelectorAll('[data-nft]').forEach(button=>button.addEventListener('click',()=>openAction('mint',{nftId:Number(button.dataset.nft)})));
}
function renderDaily(){const done=dailyTasks.filter(t=>isDone(t.id)).length;$('dailyCounter').textContent=`${done} / 5`;$('dailyTasks').innerHTML=dailyTasks.map(t=>`<button class="daily-task ${isDone(t.id)?'done':''}" data-daily="${t.id}"><span class="task-check">${isDone(t.id)?icon('check'):''}</span>${icon(actions.find(a=>a.id===t.id)?.icon||'check')}<span>${safe(state.language==='ua'?t.ua:t.title)}</span><small>${safe(t.cost)}</small></button>`).join('');document.querySelectorAll('[data-daily]').forEach(el=>el.addEventListener('click',()=>openAction(el.dataset.daily)));const next=dailyTasks.find(t=>!isDone(t.id));$('dailyButton').innerHTML=icon(next?'rocket':'check')+`<span>${next?tr('Start Daily Activity','Почати активність'):tr('Daily activity complete!','Завдання виконано!')}</span><small>${tr('One confirmation per action · gas varies','Підтвердження кожної дії · gas змінюється')}</small>`}
function renderAchievements(){const p=state.profile||{};const tx=p.transactions||0,days=p.activeDays||0,nft=p.nftMints||0,contracts=p.contractDeploys||0;const achievementList=[{title:'First GM',ua:'Перший GM',icon:'message',ok:state.localEvents.some(e=>e.type==='gm')},{title:'7 Active Days',ua:'7 активних днів',icon:'calendar',ok:days>=7},{title:'5 NFTs Minted',ua:'5 NFT',icon:'layers',ok:nft>=5},{title:'First Contract',ua:'Перший контракт',icon:'code',ok:contracts>=1},{title:'10 Transactions',ua:'10 транзакцій',icon:'zap',ok:tx>=10},{title:'100 Transactions',ua:'100 транзакцій',icon:'trophy',ok:tx>=100},{title:'30 Active Days',ua:'30 активних днів',icon:'flame',ok:days>=30},{title:'Explorer',ua:'Дослідник',icon:'globe',ok:state.localEvents.length>=5}];$('achievementCount').textContent=`${achievementList.filter(a=>a.ok).length} / 8`;$('achievementsList').innerHTML=achievementList.slice(0,4).map(a=>`<div class="achievement ${a.ok?'':'locked'}"><div class="achievement-icon">${icon(a.ok?a.icon:'lock')}</div><strong>${safe(state.language==='ua'?a.ua:a.title)}</strong><small>${a.ok?tr('Unlocked','Відкрито'):tr('Locked','Заблоковано')}</small></div>`).join('')}
function defaultProfile(){return {transactions:248,daysOnBase:126,activeDays:18,contractDeploys:4,nftMints:32,uniqueContracts:12,totalGasWei:'18700000000000000',firstTransaction:1712900000,balances:{eth:'42300000000000000',usdc:'12500000'},source:'demo',activityDays:[]}}
function displayStats(){const p=state.profile||{};const preview=!state.account;const formatNumber=n=>(n===null||n===undefined)?'—':Number(n).toLocaleString('en-US');$('statTx').textContent=formatNumber(p.transactions);$('statDays').textContent=formatNumber(p.daysOnBase);$('statActive').textContent=formatNumber(p.activeDays);$('statContracts').textContent=formatNumber(p.contractDeploys);$('statNft').textContent=formatNumber(p.nftMints);$('statUnique').textContent=formatNumber(p.uniqueContracts);$('balanceEth').textContent=p.balances?.eth?formatUnits(p.balances.eth,18,5)+' ETH':(p.balances?.eth==='0'?'0 ETH':'—');$('balanceUsdc').textContent=p.balances?.usdc?formatUnits(p.balances.usdc,6,2)+(' USDC'):'—';$('balanceEthUSD').textContent=preview?'Demo':tr('Live balance','Баланс з мережі');$('balanceUsdcUSD').textContent=preview?'Demo':('Live balance');$('firstTransaction').textContent=p.firstTransaction?new Date(p.firstTransaction*1000).toLocaleDateString(state.language==='ua'?'uk-UA':'en-US',{month:'short',day:'numeric',year:'numeric'}):'—';$('profileSource').textContent=preview?'Preview statistics · not live':(p.source==='etherscan'?'Explorer data · recent activity may be partial':p.source==='alchemy'?'Alchemy · sampled transfers, not full history':'RPC only · historical analytics need API key');renderAchievements();renderCalendar();window.dispatchEvent(new CustomEvent('bah:profile',{detail:{account:state.account,chainId:state.chainId,profile:p}}))}
function renderRecent(){const events=state.account?state.localEvents: [{type:'mint',label:'Mint NFT — Base Explorer',hash:'',date:today()},{type:'gm',label:'GM Base',hash:'',date:today()},{type:'deploy',label:'Deploy Contract',hash:'',date:today()},{type:'sendUSDC',label:'Send USDC',hash:'',date:today()}];const remote=(state.profile?.recent||[]).filter(tx=>!events.some(e=>e.hash===tx.hash));const combined=[...events.map(e=>({...e,local:true})),...remote.map(t=>({...t,label:(t.from?.toLowerCase()===state.account?.toLowerCase()?'Sent transaction':'Received transaction'),type:'arrows',date:new Date(t.timestamp*1000).toLocaleDateString(),local:false}))].slice(0,5);if(!combined.length){$('recentList').innerHTML=`<p class="empty-state">${tr('Connect and send a transaction to see your activity here.','Підключи гаманець і здійсни транзакцію, щоб побачити історію.')}</p>`;return}$('recentList').innerHTML=combined.map(e=>`<div class="recent-row"><span class="recent-ic">${icon(actions.find(a=>a.id===e.type)?.icon||'arrows')}</span><span class="recent-description">${safe(e.label||e.type)}</span><time>${safe(e.date||'')}</time>${e.hash?`<a href="${config().explorer}/tx/${encodeURIComponent(e.hash)}" target="_blank" rel="noopener noreferrer" aria-label="View transaction">${icon('external')}</a>`:''}</div>`).join('')}
function renderCalendar(){const sample=[0,1,0,2,0,2,4,1,0,2,0,3,0,2,1,0,3,2,0,1,2,0,3,0,2,1,0,2,0,1];const days=getDays(),current=new Date();const data=Array.from({length:30},(_,i)=>{const d=new Date(current.getFullYear(),current.getMonth(),current.getDate()-29+i);return {day:d.toLocaleDateString('en-CA'),count:state.account?(days[d.toLocaleDateString('en-CA')]||0):sample[i]}});$('calendarHeatmap').innerHTML=data.map(a=>`<span class="heat-cell ${a.count?'level'+Math.min(a.count,4):''}" title="${a.day}: ${a.count} transaction(s)"></span>`).join('');$('calendarActive').textContent=data.filter(d=>d.count>0).length;$('calendarTx').textContent=data.reduce((a,d)=>a+d.count,0)}
function clearDemo(){state.profile={transactions:null,daysOnBase:null,activeDays:null,contractDeploys:null,nftMints:null,uniqueContracts:null,totalGasWei:null,firstTransaction:null,balances:{eth:null,usdc:null},recent:[],activityDays:[],source:'rpc'}}
function updateMode(){const connected=Boolean(state.account);$('profileAddress').textContent=connected?shortAddress(state.account):tr('Preview profile','Демонстрація');$('profileStatus').textContent=connected?'Connected':'Demo';$('walletButtonLabel').textContent=connected?shortAddress(state.account):tr('Connect wallet','Підключити гаманець');$('copyAddress').style.visibility=connected?'visible':'hidden';$('modeNotice').classList.toggle('hidden',state.noticeDismissed);$('modeText').textContent=connected?tr('Connected to Base. Historical analytics require an explorer API; unsupported figures are shown as —.','Гаманець підключено. Для історичних даних потрібен Explorer API; недоступні показники позначено «—».'):tr('Preview mode — sample numbers are not real. Connect your wallet to view Base data.','Режим перегляду: цифри демонстраційні. Підключи гаманець для реальних даних.');$('scanLink').href=connected?`${config().explorer}/address/${state.account}`:config().explorer;}
function currentProvider(){if(window.ethereum?.request)return window.ethereum;if(window.coinbaseWalletExtension?.request)return window.coinbaseWalletExtension;return null}
async function connect(){if(state.busy)return;const provider=currentProvider();if(!provider){toast(tr('Install MetaMask, Coinbase Wallet or open this page in a wallet browser.','Встанови MetaMask, Coinbase Wallet або відкрий сайт у браузері гаманця.'),'error');return}try{const accounts=await provider.request({method:'eth_requestAccounts'});if(!accounts?.[0])return;state.provider=provider;state.account=accounts[0];await switchNetwork(state.chainId);state.localEvents=readEvents();clearDemo();updateMode();displayStats();renderDaily();renderRecent();await loadProfile();toast(tr('Wallet connected','Гаманець підключено'),'success')}catch(e){toast(errorMessage(e),'error')}}
async function switchNetwork(chainId){if(chainId!==8453)throw Error('Only Base Mainnet (8453) is supported.');const p=state.provider||currentProvider();if(!p)throw Error('No wallet provider');const id=hex(chainId);try{await p.request({method:'wallet_switchEthereumChain',params:[{chainId:id}]})}catch(err){if(err.code===4902||/unrecognized chain/i.test(err.message||'')){await p.request({method:'wallet_addEthereumChain',params:[{chainId:id,chainName:CONFIG.chains[chainId].name,rpcUrls:[CONFIG.chains[chainId].rpcUrl],nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},blockExplorerUrls:[CONFIG.chains[chainId].explorer]}]})}else throw err}}
async function rpc(method,params){const p=state.provider||currentProvider();if(!p)throw Error('Connect a wallet first.');return await p.request({method,params})}
async function verifyActivityBoard(){
  // Read-only onchain verification; prevents sending gas to an EOA/nonconforming address.
  const board=assertConfiguredContract('activityBoard');
  const code=await rpc('eth_getCode',[board,'latest']);
  if(typeof code!=='string'||!/^0x[0-9a-f]+$/i.test(code)||code.length<=2)throw Error('Configured ActivityBoard has no deployed contract code on this network.');
  for(const signature of ['gmCount(address)','lastCheckInDay(address)']){
    const result=await rpc('eth_call',[{to:board,data:callData(signature,['address'],[state.account])},'latest']);
    if(typeof result!=='string'||!/^0x[0-9a-f]{64}$/i.test(result))throw Error('ActivityBoard contract read failed ('+signature+'). Check its address before sending a transaction.');
  }
  return board;
}

async function loadProfile(){if(!state.account)return;const account=state.account,chainId=state.chainId;$('refreshButton').disabled=true;try{const chain=config();const [eth,usdc]=await Promise.allSettled([rpc('eth_getBalance',[account,'latest']),chain.usdc?rpc('eth_call',[{to:chain.usdc,data:callData('balanceOf(address)',['address'],[account])},'latest']):Promise.resolve(null)]);if(account!==state.account||chainId!==state.chainId)return;state.profile.balances.eth=eth.status==='fulfilled'?BigInt(eth.value).toString():null;state.profile.balances.usdc=usdc.status==='fulfilled'&&usdc.value?BigInt(usdc.value).toString():null;displayStats();let res;try{res=await fetch(`/api/profile?address=${encodeURIComponent(account)}&chainId=${chainId}`,{signal:AbortSignal.timeout(18000)});if(res.ok){const data=await res.json();if(account!==state.account||chainId!==state.chainId)return;state.profile={...state.profile,...data,balances:{...state.profile.balances,...Object.fromEntries(Object.entries(data.balances||{}).filter(([k,v])=>v!==null))}};if(data.warning)console.info('[Base Activity Hub]',data.warning)}}catch(e){console.info('Optional analytics backend unavailable:',e.message)}try{state.profile.transactions=Number(BigInt(await rpc('eth_getTransactionCount',[account,'latest'])))}catch{}displayStats();renderRecent()}catch(err){toast(tr('Could not refresh data: ','Не вдалося оновити: ')+errorMessage(err),'error')}finally{$('refreshButton').disabled=false}}
function renderLanguage(){document.querySelectorAll('[data-i18n]').forEach(el=>{const value=uiStrings[state.language][el.dataset.i18n];if(value)el.textContent=value});renderActions();renderNfts();renderDaily();renderAchievements();renderRecent();updateMode();displayStats()}

function addField(key,label,type='text',value='',placeholder='',hint=''){return `<label class="form-field"><span>${safe(label)}</span>${type==='textarea'?`<textarea name="${key}" placeholder="${safe(placeholder)}" maxlength="280">${safe(value)}</textarea>`:type==='select'?`<select name="${key}">${value}</select>`:`<input name="${key}" type="${type}" value="${safe(value)}" placeholder="${safe(placeholder)}" autocomplete="off" />`}${hint?`<small>${safe(hint)}</small>`:''}</label>`}
function reviewRow(label,value){return `<div class="review-row"><span>${safe(label)}</span><strong>${safe(value)}</strong></div>`}
function getAction(id){return actions.find(a=>a.id===id)||actions[0]}
function actionInfo(id,opts={}){const chain=config();switch(id){
 case 'gm': return {desc:tr('Send a real low-cost GM transaction on Base. If no community board is deployed, the message is sent to your own address (0 ETH).','Відправити реальну дешеву GM-транзакцію в Base. Без контракту спільноти повідомлення йде на власну адресу (0 ETH).'),fields:'',destination:chain.activityBoard||tr('Your own wallet','Власний гаманець'),fee:'Only network gas'};
 case 'checkin': return {desc:tr('Record your daily onchain check-in. Contract mode allows one check-in per UTC day; self-transaction mode records your action onchain without an enforced daily limit.','Запиши щоденну ончейн-активність. Контракт обмежує до одного check-in на день UTC; транзакція самому собі такого ліміту не має.'),fields:'',destination:chain.activityBoard||tr('Your own wallet','Власний гаманець'),fee:'Only network gas'};
 case 'message':return {desc:tr('Write up to 280 characters permanently onchain. Public blockchains cannot delete messages.','Залиш повідомлення до 280 символів назавжди у блокчейні. Такі повідомлення неможливо видалити.'),fields:addField('message','Message','textarea','','Your message on Base'),destination:chain.activityBoard||tr('Your own wallet','Власний гаманець'),fee:'Only network gas'};
 case 'sendETH':return {desc:tr('Send ETH to an address you choose. Check the recipient carefully before confirming.','Надішли ETH на обрану адресу. Уважно перевіряй одержувача.'),fields:addField('to','Recipient address','text','','0x…')+addField('amount','Amount (ETH)','text','','0.0001'),destination:'Recipient you enter',fee:'Amount + network gas'};
 case 'sendUSDC':return {desc:tr('Transfer native USDC on Base. This is a token transfer, not a payment to the app.','Переказ нативного USDC у мережі Base. Це переказ токена, а не оплата застосунку.'),fields:addField('to','Recipient address','text','','0x…')+addField('amount','Amount (USDC)','text','','1.00'),destination:'Recipient you enter',fee:'Amount + network gas'};
 case 'mint':{
  const item=CONFIG.nftItems.find(n=>n.id===Number(opts.nftId??0))||CONFIG.nftItems[0];
  return {desc:`Mint ${item.name} — ${item.rarity} tier — for exactly ${item.priceUsdc} USDC plus gas. After confirmation, your wallet receives an ERC-721 NFT. The maximum tier supply is ${item.maxSupply.toLocaleString('en-US')}.`,
   fields:addField('kind','Artwork','select',CONFIG.nftItems.map(n=>`<option value="${n.id}" ${n.id===item.id?'selected':''}>${safe(n.name)} · ${n.rarity} · ${n.priceUsdc} USDC</option>`).join('')),
   destination:chain.nftContract||'NFT contract pending deployment',
   fee:`${item.priceUsdc} USDC + network gas`,requires:'nftContract'};
 }
 case 'deploy':case 'mintToken':{let type= id==='mintToken'?'token':(opts.type||$('factoryType').value);return {desc:tr('Deploy a user-owned contract from an open-source template. 0.10 USDC service fee is transferred to the contract treasury only if the deployment succeeds. Gas varies by contract size.','Розгорни власний контракт із відкритого шаблону. Комісія 0.10 USDC переказується контрактному отримувачу лише за успішного деплою. Gas залежить від розміру контракту.'),fields:addField('type','Contract type','select',[['counter','Counter'],['guestbook','Guestbook'],['storage','Simple Storage'],['token','ERC-20 Token'],['nftCollection','NFT Collection']].map(([val,name])=>`<option value="${val}" ${val===type?'selected':''}>${name}</option>`).join(''))+addField('name','Contract name','text','My Base Contract','My Base Contract')+addField('symbol','Token symbol (if token/NFT)','text','BAH','BAH')+(type==='token'?addField('supply','Initial token supply (whole tokens)','text','1000000','1000000'):''),destination:chain.factoryContract||'Contract factory pending deployment',fee:'0.10 USDC + deployment gas',requires:'factoryContract'};}
 case 'swap':return {desc:tr('Open the official Uniswap interface with Base selected. Review quoted prices, slippage and any swap fees there.','Відкрити офіційний Uniswap із вибраною мережею Base. Там можна перевірити курс, прослизання та всі комісії.'),fields:'',destination:'app.uniswap.org',fee:'Shown by Uniswap',external:true};
 case 'x402':return {desc:'Read-only check of the Base Mainnet x402 API for a 0.01 USDC wallet report. No wallet signature or USDC transfer will be requested during this check.',fields:'',destination:CONFIG.treasuryReceiver,fee:'0.01 USDC when live · no charge for this check',previewOnly:true};
 default:return {desc:'',fields:'',destination:'—',fee:'—'};
}}
function openAction(id,opts={}){const a=getAction(id);const info=actionInfo(id,opts);state.modal={id,opts,info};$('modalKicker').textContent='BASE MAINNET · TRANSACTION';$('modalTitle').textContent=state.language==='ua'?a.ua:a.title;$('modalDescription').textContent=info.desc;$('modalFields').innerHTML=info.fields;$('modalReview').innerHTML=reviewRow('Network',config().name)+reviewRow('Recipient / contract',info.destination)+(['mint','deploy','mintToken'].includes(id)?reviewRow(tr('Service fee receiver','Отримувач сервісної оплати'),CONFIG.treasuryReceiver):'')+reviewRow('Price & network cost',info.fee)+reviewRow('Confirmation',info.previewOnly?'Read-only check · no signature':info.unavailable?'Unavailable':'Required in your wallet');$('modalFeedback').className='modal-feedback hidden';$('modalFeedback').textContent='';$('confirmLabel').textContent=info.external?tr('Open Uniswap','Відкрити Uniswap'):info.previewOnly?'Check x402 API':info.unavailable?tr('Integration pending','Поки недоступно'):tr('Continue in wallet','Підтвердити у гаманці');$('confirmModal').disabled=Boolean(info.unavailable || (info.requires&&!isAddress(config()[info.requires])));if(info.requires&&!isAddress(config()[info.requires])){setFeedback('This feature is coming soon. Its Base Mainnet smart contract has not been deployed and verified yet. No payment is requested.');$('confirmLabel').textContent='Deployment pending';}if(info.requires&&!isAddress(config()[info.requires]))$('modalFeedback').insertAdjacentHTML('beforeend',' <a href="https://github.com/Verdigo93/base-activity-hub/blob/main/contracts/DEPLOY_MAINNET_UA.md" target="_blank" rel="noopener noreferrer">Mainnet deployment guide ↗</a>');if(info.unavailable)setFeedback('The x402 Mainnet integration is not live yet. No transaction or payment can be initiated.');$('modalBackdrop').classList.remove('hidden');document.body.style.overflow='hidden';$('closeModal').focus();
 if(id==='x402'){
   $('confirmModal').disabled=true;
   $('confirmLabel').textContent='Checking x402 readiness...';
   document.querySelector('.modal-warning').textContent='Read-only check. No signature or USDC will be requested.';
   fetch('/api/x402/status',{cache:'no-store',headers:{Accept:'application/json'}})
     .then(async response=>{
       const readiness=await response.json();
       if(state.modal?.id!=='x402')return;
       if(response.ok&&readiness.facilitatorSupported===true&&
          readiness.settlementEnabled===true&&readiness.network==='eip155:8453'){
         info.previewOnly=false;info.x402Ready=true;
         $('modalDescription').textContent='Buy one Base Mainnet wallet report for exactly 0.01 USDC. MetaMask will request an EIP-712 signature authorizing a one-time payment. PayAI will settle the transfer onchain. No gas is charged to your wallet for this x402 transfer.';
         $('modalReview').innerHTML=reviewRow('Network',config().name)+
           reviewRow('Payment recipient',CONFIG.treasuryReceiver)+
           reviewRow('Exact payment','0.01 USDC · gas sponsored by facilitator')+
           reviewRow('Confirmation','EIP-712 signature in your wallet');
         document.querySelector('.modal-warning').textContent='Signing authorizes an actual payment of 0.01 USDC after PayAI settlement. Review the amount and recipient carefully. Never enter your seed phrase.';
         $('confirmLabel').textContent='Pay 0.01 USDC';
       }else{
         $('confirmLabel').textContent='Check x402 API';
       }
       $('confirmModal').disabled=false;
     }).catch(()=>{
       if(state.modal?.id!=='x402')return;
       $('confirmLabel').textContent='Check x402 API';
       $('confirmModal').disabled=false;
     });
 }
 if(['mint','deploy','mintToken'].includes(id)&&isAddress(info.destination)&&state.account){
   const destination=info.destination;
   rpc('eth_call',[{to:destination,data:callData('treasury()')},'latest']).then(result=>{
     if(state.modal?.id!==id||state.modal?.info.destination!==destination)return;
     const payout='0x'+String(result).slice(-40);
     if(isAddress(payout)){$('modalReview').insertAdjacentHTML('beforeend',reviewRow(tr('Verified onchain recipient','Перевірений ончейн-отримувач'),payout));if(payout.toLowerCase()!==CONFIG.treasuryReceiver.toLowerCase()){setFeedback(tr('WARNING: This contract pays a different wallet; this operation is blocked.','УВАГА: контракт виплачує кошти на інший гаманець; операцію заблоковано.'),'error');$('confirmModal').disabled=true;}}
   }).catch(()=>{});
 }
}
function closeModal(){if(state.busy)return;$('modalBackdrop').classList.add('hidden');document.body.style.overflow='';state.modal=null}
function setFeedback(message,kind='info',hashValue=''){const el=$('modalFeedback');el.className='modal-feedback'+(kind==='error'?' error':'');el.innerHTML=safe(message)+(hashValue?` <a href="${config().explorer}/tx/${encodeURIComponent(hashValue)}" target="_blank" rel="noopener noreferrer">View on explorer ↗</a>`:'')}
function readFields(){const o={};$('modalFields').querySelectorAll('[name]').forEach(el=>o[el.name]=el.value.trim());return o}
function assertConnected(){if(!state.account||!state.provider)throw Error('Connect your wallet to continue.')}
function assertConfiguredContract(name){const addr=config()[name];if(!isAddress(addr))throw Error(`${name} is not yet deployed/configured.`);return addr}
async function walletTx({to,data='0x',value='0x0'},label,type){assertConnected();if(!isAddress(to))throw Error('Invalid recipient or contract address.');const suffix=CONFIG.baseBuilderCode?builderCodeSuffix(CONFIG.baseBuilderCode):'';const attributedData=data+(suffix?suffix.slice(2):'');const walletChain=Number(BigInt(await rpc('eth_chainId',[])));if(walletChain!==state.chainId)throw Error('Wallet is on the wrong chain. Switch to the selected Base network.');const tx={from:state.account,to,data:attributedData,value};const hashValue=await rpc('eth_sendTransaction',[tx]);if(!/^0x[0-9a-f]{64}$/i.test(hashValue))throw Error('Wallet returned an unexpected transaction hash.');setFeedback(tr('Transaction submitted. Waiting for network confirmation…','Транзакцію надіслано. Очікуємо підтвердження мережі…'),'info',hashValue);let receipt=null;for(let i=0;i<65;i++){await new Promise(resolve=>setTimeout(resolve,1600));receipt=await rpc('eth_getTransactionReceipt',[hashValue]);if(receipt)break}if(!receipt){setFeedback(tr('Transaction submitted but not confirmed. Please inspect it on BaseScan before retrying.','Транзакцію надіслано, але не підтверджено. Перевір BaseScan перед повторною спробою.'),'info',hashValue);throw Error('Transaction still pending. Check BaseScan before retrying.')}if(BigInt(receipt.status)!==1n)throw Error('The transaction reverted onchain. Check the explorer; network gas may still be charged.');saveEvent({type,label,hash:hashValue,date:today(),timestamp:Date.now()});setFeedback(tr('Success! Transaction confirmed on Base.','Успіх! Транзакцію підтверджено в Base.'),'info',hashValue);toast(tr('Confirmed on Base','Підтверджено в Base'),'success');loadProfile().catch(()=>{});return hashValue}
async function verifyPaidContract(spender,kind,artworkKind=0){
 const configuredTreasury=CONFIG.treasuryReceiver,configuredToken=config().usdc;
 if(!isAddress(configuredTreasury)||!isAddress(configuredToken))throw Error('USDC or payout wallet is not configured.');
 const item=kind==='nft'?CONFIG.nftItems.find(n=>n.id===artworkKind):null;
 if(kind==='nft'&&!item)throw Error('Invalid NFT tier');
 const feeData=kind==='nft'?callData('mintPrice(uint256)',['uint256'],[artworkKind]):callData('DEPLOY_FEE()');
 const [code,treasuryRaw,usdcRaw,feeRaw]=await Promise.all([
  rpc('eth_getCode',[spender,'latest']),
  rpc('eth_call',[{to:spender,data:callData('treasury()')},'latest']),
  rpc('eth_call',[{to:spender,data:callData('usdc()')},'latest']),
  rpc('eth_call',[{to:spender,data:feeData},'latest'])
 ]);
 if(!code||code==='0x')throw Error('Payment contract has no code on Base Mainnet.');
 const payout='0x'+String(treasuryRaw).slice(-40),token='0x'+String(usdcRaw).slice(-40);
 if(!isAddress(payout)||payout.toLowerCase()!==configuredTreasury.toLowerCase())throw Error('Payment blocked: unexpected contract treasury.');
 if(!isAddress(token)||token.toLowerCase()!==configuredToken.toLowerCase())throw Error('Payment blocked: unexpected USDC token.');
 const amount=BigInt(feeRaw),expected=kind==='nft'?BigInt(item.priceUnits):100000n;
 if(amount!==expected)throw Error('Payment blocked: tier price differs from onchain fee.');
 if(kind==='nft'){
  const [cap,minted]=await Promise.all([
   rpc('eth_call',[{to:spender,data:callData('tierMaxSupply(uint256)',['uint256'],[artworkKind])},'latest']),
   rpc('eth_call',[{to:spender,data:callData('mintedPerTier(uint256)',['uint256'],[artworkKind])},'latest'])
  ]);
  if(BigInt(cap)!==BigInt(item.maxSupply))throw Error('Payment blocked: NFT scarcity limit differs from website.');
  if(BigInt(minted)>=BigInt(cap))throw Error('This NFT tier is sold out.');
 }
 return amount;
}
async function usdcApproval(spender,amount){
 const token=assertConfiguredContract('usdc');
 const [tokenCode,spenderCode,balanceRaw]=await Promise.all([
  rpc('eth_getCode',[token,'latest']),
  rpc('eth_getCode',[spender,'latest']),
  rpc('eth_call',[{to:token,data:callData('balanceOf(address)',['address'],[state.account])},'latest'])
 ]);
 if(!tokenCode||tokenCode==='0x'||!spenderCode||spenderCode==='0x')throw Error('USDC or contract is missing on Base Mainnet.');
 if(BigInt(balanceRaw)<amount)throw Error(`Insufficient USDC on Base: your wallet has ${formatUnits(balanceRaw,6,2)} USDC, but this action requires ${formatUnits(amount,6,2)} USDC plus ETH for gas. No transaction sent.`);
 const allowed=await rpc('eth_call',[{to:token,data:callData('allowance(address,address)',['address','address'],[state.account,spender])},'latest']);
 if(BigInt(allowed)>=amount)return;
 const amountText=formatUnits(amount,6,2);
 setFeedback(`Step 1/2: approve exactly ${amountText} USDC in your wallet.`);
 await walletTx({to:token,data:callData('approve(address,uint256)',['address','uint256'],[spender,amount])},`USDC approval · ${amountText}`,'approve');
}
async function executeAction(){if(state.busy||!state.modal)return;const {id,info}=state.modal;if(info.external){window.open('https://app.uniswap.org/swap?chain=base','_blank','noopener,noreferrer');return}if(info.unavailable)return;const form=readFields();try{assertConnected();state.busy=true;$('confirmModal').disabled=true;$('closeModal').disabled=true;$('cancelModal').disabled=true;
 if(id==='x402'){
   const response=await fetch('/api/x402/report?address='+encodeURIComponent(state.account)+'&chainId=8453',{cache:'no-store',headers:{Accept:'application/json'}});
   const body=await response.json();
   if(response.status!==402)throw Error('Unexpected response from the x402 API. No payment signed.');
   validateMainnetX402(body,state.account,window.location.origin,CONFIG.treasuryReceiver);
   if(info.previewOnly){
     setFeedback(/Settlement is not enabled yet/i.test(String(body.error||''))?
       'x402 verified: Base Mainnet · 0.01 USDC · correct recipient. Settlement remains OFF. No signature or charge.' :
       'x402 terms verified. This check-only screen cannot sign or send a payment. No signature or charge.');
     return;
   }
   if(!info.x402Ready)throw Error('x402 payment is not enabled in this session.');
   const statusResponse=await fetch('/api/x402/status',{cache:'no-store'});
   const status=await statusResponse.json();
   if(!statusResponse.ok||status.facilitatorSupported!==true||status.settlementEnabled!==true||
      status.network!=='eip155:8453')throw Error('x402 settlement is not enabled. No payment signed.');
   if(Number(BigInt(await rpc('eth_chainId',[])))!==8453)
     throw Error('Switch MetaMask to Base Mainnet before paying.');
   const account=state.account;
   const balance=await rpc('eth_call',[{to:config().usdc,data:callData('balanceOf(address)',['address'],[account])},'latest']);
   if(BigInt(balance)<10000n)throw Error('Insufficient native USDC: this payment requires 0.01 USDC on Base. No signature requested.');
   const random=crypto.getRandomValues(new Uint8Array(32));
   const prepared=createMainnetAuthorization(body,account,window.location.origin,CONFIG.treasuryReceiver,random);
   setFeedback('Review the EIP-712 request in MetaMask: one-time payment of exactly 0.01 USDC to the displayed recipient. PayAI will submit it onchain after signing.');
   const signature=await state.provider.request({method:'eth_signTypedData_v4',params:[account,JSON.stringify(prepared.typedData)]});
   if(state.account?.toLowerCase()!==account.toLowerCase())throw Error('Wallet changed during signing. No payment sent.');
   const signedPayload=encodeMainnetPayment(body,prepared.authorization,signature);
   setFeedback('Signature received. Asking PayAI to verify and settle the 0.01 USDC payment. Do not repeat the payment if status is uncertain.');
   const paidResponse=await fetch('/api/x402/report?address='+encodeURIComponent(account)+'&chainId=8453',{
     method:'GET',cache:'no-store',
     headers:{Accept:'application/json','PAYMENT-SIGNATURE':signedPayload}
   });
   const paid=await paidResponse.json();
   if(!paidResponse.ok||paid.ok!==true||paid.paid!==true||
      !/^0x[0-9a-f]{64}$/i.test(paid.transaction||'')){
     throw Error(paid.error||'Payment status is not confirmed. Check your USDC transfers before trying again.');
   }
   setFeedback('Payment confirmed on Base Mainnet! Your wallet report is ready.','success',paid.transaction);
   $('modalReview').insertAdjacentHTML('beforeend',
     reviewRow('Receipt',paid.transaction)+
     reviewRow('Wallet transactions',paid.report?.transactions??'Unavailable')+
     reviewRow('Wallet age (days)',paid.report?.daysOnBase??'Unavailable')+
     reviewRow('Recent active days',paid.report?.activeDays??'Unavailable'));
   toast('x402 payment confirmed · 0.01 USDC','success');
   return;
  }
 await switchNetwork(state.chainId);const chain=config();let tx,label=getAction(id).title,type=id;
  if(id==='gm'){tx=chain.activityBoard?{to:await verifyActivityBoard(),data:callData('gm()')}:{to:state.account,data:'0x'+Array.from(new TextEncoder().encode('GM from Base Activity Hub')).map(b=>b.toString(16).padStart(2,'0')).join('')};}
  else if(id==='checkin'){tx=chain.activityBoard?{to:await verifyActivityBoard(),data:callData('dailyCheckIn()')}:{to:state.account,data:'0x'+Array.from(new TextEncoder().encode('Base Activity Hub check-in | '+today())).map(b=>b.toString(16).padStart(2,'0')).join('')};}
  else if(id==='message'){if(!form.message||new TextEncoder().encode(form.message).length>280)throw Error('Message required, max 280 bytes UTF-8.');tx=chain.activityBoard?{to:await verifyActivityBoard(),data:callData('postMessage(string)',['string'],[form.message])}:{to:state.account,data:'0x'+Array.from(new TextEncoder().encode('Base Activity Hub: '+form.message)).map(b=>b.toString(16).padStart(2,'0')).join('')};label='Onchain message';}
  else if(id==='sendETH'){if(!isAddress(form.to))throw Error('Enter a valid recipient wallet address.');const amount=parseUnits(form.amount,18);if(form.to.toLowerCase()===state.account.toLowerCase())throw Error('Recipient is your own wallet. Enter a different address.');tx={to:form.to,value:hex(amount)};label=`Send ${form.amount} ETH`;}
  else if(id==='sendUSDC'){if(!isAddress(form.to))throw Error('Enter a valid recipient wallet address.');if(form.to.toLowerCase()===state.account.toLowerCase())throw Error('Recipient is your own wallet. Enter a different address.');const amount=parseUnits(form.amount,6);tx={to:assertConfiguredContract('usdc'),data:callData('transfer(address,uint256)',['address','uint256'],[form.to,amount])};label=`Send ${form.amount} USDC`;}
  else if(id==='mint'){
   const artworkKind=Number(form.kind),item=CONFIG.nftItems.find(n=>n.id===artworkKind);
   if(!Number.isInteger(artworkKind)||!item)throw Error('Select a valid NFT tier.');
   const spender=assertConfiguredContract('nftContract');
   const amount=await verifyPaidContract(spender,'nft',artworkKind);
   await usdcApproval(spender,amount);
   setFeedback(`Step 2/2: mint ${item.name} (${item.rarity}) for exactly ${item.priceUsdc} USDC. Confirm in your wallet.`);
   tx={to:spender,data:callData('mint(uint256)',['uint256'],[artworkKind])};
   label=`Mint NFT — ${item.name} · ${item.priceUsdc} USDC`;
  }
  else if(id==='deploy'||id==='mintToken'){const spender=assertConfiguredContract('factoryContract');const contractType=id==='mintToken'?'token':form.type;const contractName=(form.name||'').trim();if(contractName.length<3||contractName.length>48)throw Error('Contract name must be 3–48 characters.');let sig,types,vals;const symbol=(form.symbol||'').trim();if(contractType==='counter'){sig='deployCounter(string)';types=['string'];vals=[contractName]}
    else if(contractType==='guestbook'){sig='deployGuestbook(string)';types=['string'];vals=[contractName]}
    else if(contractType==='storage'){sig='deployStorage(string)';types=['string'];vals=[contractName]}
    else if(contractType==='token'){if(!/^[A-Z0-9]{2,10}$/i.test(symbol))throw Error('Token symbol must contain 2–10 letters/numbers.');const supply=form.supply&&/^\d+$/.test(form.supply)?BigInt(form.supply):1000000n;if(supply<=0n||supply>1_000_000_000_000n)throw Error('Token supply must be 1–1,000,000,000,000 tokens.');sig='deployToken(string,string,uint256)';types=['string','string','uint256'];vals=[contractName,symbol,supply]}
    else if(contractType==='nftCollection'){if(!/^[A-Z0-9]{2,10}$/i.test(symbol))throw Error('Collection symbol must contain 2–10 letters/numbers.');sig='deployNFTCollection(string,string)';types=['string','string'];vals=[contractName,symbol]}
    else throw Error('Unsupported contract type');await verifyPaidContract(spender,'factory');await usdcApproval(spender,100000n);setFeedback(tr('Step 2/2: deploy your own contract. Check the gas estimate in your wallet.','Крок 2/2: розгортання твого контракту. Перевір вартість gas у гаманці.'));tx={to:spender,data:callData(sig,types,vals)};type=contractType==='token'?'mintToken':'deploy';label=`Deploy ${contractName}`;}
  else throw Error('Unsupported action');await walletTx(tx,label,type);
 }catch(e){const msg=errorMessage(e);setFeedback(msg,'error');toast(msg,'error')}finally{state.busy=false;$('confirmModal').disabled=Boolean(info.unavailable||info.requires&&!isAddress(config()[info.requires]));$('closeModal').disabled=false;$('cancelModal').disabled=false}}
async function tryReconnect(){const provider=currentProvider();if(!provider)return;try{const accounts=await provider.request({method:'eth_accounts'});if(!accounts?.[0])return;state.provider=provider;state.account=accounts[0];let chainId=Number(BigInt(await provider.request({method:'eth_chainId'})));if(chainId!==8453){state.provider=null;state.account=null;return;}state.chainId=8453;state.localEvents=readEvents();clearDemo();updateMode();displayStats();renderDaily();renderRecent();loadProfile().catch(()=>{})}catch{}}
function registerEvents(){$('connectButton').addEventListener('click',()=>state.account?toast(tr('Wallet already connected. Switch accounts in your wallet.','Гаманець уже підключений. Зміни акаунт у гаманці.')):connect());$('copyAddress').addEventListener('click',async()=>{if(!state.account)return;try{await navigator.clipboard.writeText(state.account);toast('Copied!','success')}catch{toast('Could not copy wallet address','error')}});$('dismissNotice').addEventListener('click',()=>{state.noticeDismissed=true;$('modeNotice').classList.add('hidden')});$('refreshButton').addEventListener('click',()=>state.account?loadProfile():toast(tr('Connect a wallet to load live data.','Підключи гаманець для реальних даних.')));$('deployButton').addEventListener('click',()=>openAction('deploy'));$('dailyButton').addEventListener('click',()=>openAction((dailyTasks.find(t=>!isDone(t.id))||dailyTasks[0]).id));$('closeModal').addEventListener('click',closeModal);$('cancelModal').addEventListener('click',closeModal);$('confirmModal').addEventListener('click',executeAction);$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!state.busy&&!$('modalBackdrop').classList.contains('hidden'))closeModal()});$('modalFields').addEventListener('change',e=>{if(state.modal?.id==='mint'&&e.target.name==='kind'){openAction('mint',{nftId:Number(e.target.value)});return;}if(state.modal?.id==='deploy'||state.modal?.id==='mintToken'){if(e.target.name==='type'){let saved={};$('modalFields').querySelectorAll('[name]').forEach(n=>saved[n.name]=n.value);const type=saved.type;openAction(state.modal.id,{type});for(const n of $('modalFields').querySelectorAll('[name]'))if(saved[n.name]!==undefined)n.value=saved[n.name];}}});const provider=currentProvider();if(provider?.on){provider.on('accountsChanged',async accounts=>{state.account=accounts?.[0]||null;state.provider=state.account?provider:null;state.localEvents=readEvents();state.profile=state.account?null:defaultProfile();if(state.account)clearDemo();updateMode();displayStats();renderDaily();renderRecent();if(state.account)loadProfile().catch(()=>{})});provider.on('chainChanged',id=>{const parsed=Number(BigInt(id));if(parsed!==8453){state.provider=null;state.account=null;state.profile=defaultProfile();updateMode();displayStats();renderDaily();renderRecent();toast('Switch your wallet to Base Mainnet to continue.','error')}else{tryReconnect().catch(()=>{})}})}}

hydrateIcons();state.profile=defaultProfile();registerEvents();renderLanguage();tryReconnect();
