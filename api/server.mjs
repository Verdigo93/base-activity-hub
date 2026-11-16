/** Zero-dependency static + read-only analytics server. NEVER accepts or stores wallet secrets. */
import http from 'node:http';
import {alchemyEnrichProfile} from './alchemy.mjs';
import {readFile} from 'node:fs/promises';
import {existsSync, createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handleX402} from './x402.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const envPath=path.join(root,'.env');
if(existsSync(envPath)){
  const text=await readFile(envPath,'utf8');
  for(const line of text.split(/\r?\n/)){
    const match=line.match(/^([A-Za-z_][\w]*)\s*=\s*(.*)$/);
    if(match && !(match[1] in process.env))process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
  }
}
const port=Number(process.env.PORT||4173);
const apiKey=process.env.ETHERSCAN_API_KEY||'';
const alchemyKey=process.env.ALCHEMY_API_KEY||'';
const duneKey=process.env.DUNE_API_KEY||'';
const duneQuery=process.env.DUNE_QUERY_ID||'';
const rpcUrls={8453:process.env.BASE_RPC_URL||'https://mainnet.base.org',84532:process.env.BASE_SEPOLIA_RPC_URL||'https://sepolia.base.org'};
const cache=new Map();
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const isAddress=s=>/^0x[0-9a-f]{40}$/i.test(s||'');
function respond(res,status,data){res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))}
const timestampToDay=s=>new Date(Number(s)*1000).toISOString().slice(0,10);
async function requestJson(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(12500)});if(!r.ok)throw Error(`Remote API HTTP ${r.status}`);return r.json()}
async function chainRpc(chainId,method,params){const data=await requestJson(rpcUrls[chainId],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(data.error)throw Error(String(data.error.message||'RPC failure'));return data.result}
async function explorer(chainId,action,address,extra={}){let url=new URL('https://api.etherscan.io/v2/api');for(const [k,v] of Object.entries({chainid:chainId,module:'account',action,address,apikey:apiKey,...extra}))url.searchParams.set(k,String(v));const j=await requestJson(url);if(j.status==='0'&&!/No transactions found|No records found/i.test(String(j.message)+' '+String(j.result)))throw Error(typeof j.result==='string'?j.result:(j.message||'Etherscan unavailable'));return Array.isArray(j.result)?j.result:[]}
function slimTx(tx){const gas=BigInt(tx.gasUsed||'0')*BigInt(tx.gasPrice||'0');return {hash:tx.hash,from:tx.from,to:tx.to||'',timestamp:Number(tx.timeStamp||0),valueWei:String(tx.value||'0'),gasWei:gas.toString(),contractAddress:tx.contractAddress||'',status:tx.isError==='1'?'failed':'success'};}
async function profile(address,chainId){
  let outgoing=null,source='rpc',warning='',balances={eth:null,usdc:null};
  try{outgoing=Number(BigInt(await chainRpc(chainId,'eth_getTransactionCount',[address,'latest'])));balances.eth=String(BigInt(await chainRpc(chainId,'eth_getBalance',[address,'latest'])))}catch(e){warning='Public RPC temporarily unavailable.'}
  const result={source,warning,address,chainId,transactions:outgoing,firstTransaction:null,daysOnBase:null,activeDays:null,contractDeploys:null,nftMints:null,uniqueContracts:null,totalGasWei:null,sampleGasWei:null,historyPartial:false,transactionsWindow:null,recent:[],activityDays:[],balances};
  if(!apiKey){
    if(alchemyKey)try{return await alchemyEnrichProfile(result,address,chainId,alchemyKey)}catch(e){result.warning='Alchemy analytics unavailable: '+String(e.message).slice(0,130)}
    else result.warning='To see historical activity, configure ALCHEMY_API_KEY (free Alchemy tier) or ETHERSCAN_API_KEY on the server.';
    return result;
  }
  try{
    // Fetch sequentially to reduce API burst/rate-limit failures.
    const first=await explorer(chainId,'txlist',address,{startblock:0,endblock:99999999,page:1,offset:1,sort:'asc'});
    const latest=await explorer(chainId,'txlist',address,{startblock:0,endblock:99999999,page:1,offset:1000,sort:'desc'});
    let nfts=[];
    try{nfts=await explorer(chainId,'tokennfttx',address,{page:1,offset:1000,sort:'desc'})}catch{}
    result.source='etherscan';result.firstTransaction=first[0]?Number(first[0].timeStamp):null;
    result.daysOnBase=result.firstTransaction?Math.max(1,Math.floor((Date.now()/1000-result.firstTransaction)/86400)+1):0;
    const own=latest.filter(t=>t.from?.toLowerCase()===address.toLowerCase());
    const dayCounts={};for(const t of own){const d=timestampToDay(t.timeStamp);dayCounts[d]=(dayCounts[d]||0)+1}
    result.activityDays=Object.entries(dayCounts).map(([day,count])=>({day,count})).sort((a,b)=>a.day.localeCompare(b.day));
    result.activeDays=Object.keys(dayCounts).length;
    result.transactionsWindow=own.length;
    result.contractDeploys=own.filter(t=>(!t.to||t.to==='0x') && t.isError!=='1').length;
    // Estimate unique target contracts by calldata-bearing calls, not verified app identities.
    result.uniqueContracts=new Set(own.filter(t=>t.to&&t.to!=='0x'&&t.input&&t.input!=='0x'&&t.isError!=='1').map(t=>t.to.toLowerCase())).size;
    result.nftMints=nfts.filter(t=>t.from?.toLowerCase()==='0x0000000000000000000000000000000000000000' && t.to?.toLowerCase()===address.toLowerCase()).length;
    result.recent=latest.slice(0,12).map(slimTx);
    result.sampleGasWei=own.reduce((sum,t)=>sum+BigInt(t.gasUsed||'0')*BigInt(t.gasPrice||'0'),0n).toString();
    result.historyPartial=latest.length===1000 || (outgoing!==null&&outgoing>own.length);
    if(!result.historyPartial)result.totalGasWei=result.sampleGasWei;
    if(latest.length===1000){result.warning='Historical counts of active days, deployments and NFT mints may be partial (latest 1,000 records).';}
  }catch(err){result.warning=`Explorer data unavailable: ${String(err.message).slice(0,170)}. Only RPC values shown.`;result.source='rpc';if(alchemyKey)try{return await alchemyEnrichProfile(result,address,chainId,alchemyKey)}catch{}}
  return result;
}
async function duneRows(address){if(!duneKey||!duneQuery)throw Error('Dune integration not configured. Set DUNE_API_KEY and DUNE_QUERY_ID for your own parameterized query.');if(!/^\d{3,12}$/.test(duneQuery))throw Error('Invalid Dune query ID');const j=await requestJson(`https://api.dune.com/api/v1/query/${duneQuery}/execute`,{method:'POST',headers:{'Content-Type':'application/json','X-Dune-API-Key':duneKey},body:JSON.stringify({query_parameters:{wallet_address:address}})});if(!j.execution_id)throw Error('Dune did not return an execution ID');return {executionId:j.execution_id,status:j.state}}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(url.pathname==='/api/x402/report')return await handleX402(req,res,url,profile);
    if(url.pathname==='/api/health')return respond(res,200,{ok:true,etherscanConfigured:Boolean(apiKey),alchemyConfigured:Boolean(alchemyKey),duneConfigured:Boolean(duneKey&&duneQuery)});
    if(url.pathname==='/api/profile'){
      const address=url.searchParams.get('address')||'';
      const chainId=Number(url.searchParams.get('chainId')||8453);
      if(!isAddress(address)||!rpcUrls[chainId])return respond(res,400,{error:'Provide a valid wallet and Base chainId.'});
      const key=`${chainId}:${address.toLowerCase()}`;
      const cached=cache.get(key);if(cached&&Date.now()<cached.until)return respond(res,200,cached.data);
      const data=await profile(address,chainId);cache.set(key,{until:Date.now()+90_000,data});return respond(res,200,data);
    }
    if(url.pathname==='/api/dune/execute'){
      const address=url.searchParams.get('address');if(!isAddress(address))return respond(res,400,{error:'Valid address required'});
      return respond(res,200,await duneRows(address));
    }
    if(url.pathname.startsWith('/api/'))return respond(res,404,{error:'Unknown API route'});
    let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';if(pathname==='/.well-known/farcaster.json')pathname='/public/.well-known/farcaster.json';
    const full=path.resolve(root,'.'+pathname);
    if(!(full===root||full.startsWith(root+path.sep)))return respond(res,403,{error:'Forbidden'});
    if(full.endsWith('.env')||full.includes('/api/')||full.includes('/tests/')||full.includes('/contracts/')||path.basename(full).startsWith('.'))return respond(res,403,{error:'Forbidden'});
    if(!existsSync(full))return respond(res,404,{error:'Not found'});
    const ext=path.extname(full);
    if(!mime[ext])return respond(res,403,{error:'Unsupported file type'});
    res.writeHead(200,{...headers,'Content-Type':mime[ext],'Cache-Control':ext==='.png'?'public, max-age=3600':'no-cache'});
    createReadStream(full).pipe(res);
  }catch(e){respond(res,500,{error:String(e.message||'Server error').slice(0,220)})}
});
server.listen(port,'0.0.0.0',()=>{console.log(`Base Activity Hub ready at http://localhost:${port}`)});
