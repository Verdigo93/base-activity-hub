/** Optional Alchemy enrichment. Bounded sample, never described as complete wallet history. */
const rpcHost={8453:'base-mainnet',84532:'base-sepolia'};
const cutoff=Date.now()-30*86400000;
const sec=s=>{const n=Date.parse(s||'');return Number.isFinite(n)?Math.floor(n/1000):0};
const day=t=>new Date(t*1000).toISOString().slice(0,10);
const lower=x=>String(x||'').toLowerCase();
export function summarizeTransferSample(data, wallet, txCount, now=Date.now()){
  const seen=new Map(), all=data?.recent||[];
  for(const transfer of all){if(!transfer?.hash || !/^0x[0-9a-f]{64}$/i.test(transfer.hash))continue;
    if(lower(transfer.from)!==lower(wallet))continue;
    const timestamp=sec(transfer.metadata?.blockTimestamp);
    if(!timestamp)continue;
    if(!seen.has(transfer.hash))seen.set(transfer.hash,{hash:transfer.hash,from:transfer.from,to:transfer.to||'',timestamp,valueWei:'0',gasWei:'0',status:'unknown'});
  }
  const tx=[...seen.values()].sort((a,b)=>b.timestamp-a.timestamp);
  const days=new Map();const destinations=new Set();
  for(const item of tx){const date=day(item.timestamp);days.set(date,(days.get(date)||0)+1);if(/^0x[0-9a-f]{40}$/i.test(item.to))destinations.add(lower(item.to));}
  const thirty=now-29*86400000;const recent=tx.filter(x=>x.timestamp*1000>=thirty).length;
  let earliest=sec(data?.earliest?.[0]?.metadata?.blockTimestamp);
  if(!earliest&&tx.length)earliest=tx[tx.length-1].timestamp;
  const daysOnBase=earliest?Math.max(1,Math.floor((now/1000-earliest)/86400)+1):null;
  const possiblyPartial=Boolean(data?.hasMore)||Number(txCount)>tx.length;
  return {source:'alchemy',historyPartial:possiblyPartial,historyBasis:'earliest-observed-external-transfer',
    firstTransaction:earliest||null,daysOnBase,uniqueContracts:destinations.size,
    activeDays:days.size,activityDays:[...days].map(([day,count])=>({day,count})).sort((a,b)=>a.day.localeCompare(b.day)),
    recent:tx.slice(0,12),transactionsWindow:tx.length,sampled30dTransactions:recent,
    warning:possiblyPartial?'Alchemy transfer sample: wallet age is based on first observed transfer. Contract destinations, active days and gas are sample-based, not full totals.':'Alchemy external-transfer history: transfer activity may exclude other contract operations.'};
}
async function alchemyCall(host,key,method,params){
  const response=await fetch(`https://${host}.g.alchemy.com/v2/${encodeURIComponent(key)}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(11000)});
  if(!response.ok)throw Error(`Alchemy HTTP ${response.status}`);
  const body=await response.json();if(body.error)throw Error(`Alchemy error ${body.error.code||'unknown'}`);return body.result;
}
export async function alchemyEnrichProfile(result,address,chainId,key,now=Date.now()){
  const host=rpcHost[chainId];if(!host||!key)return result;
  const request=async(order,maxCount,pageKey)=>alchemyCall(host,key,'alchemy_getAssetTransfers',[{
    fromBlock:'0x0',toBlock:'latest',fromAddress:address,category:['external'],withMetadata:true,
    excludeZeroValue:false,order,maxCount,...(pageKey?{pageKey}:{})}]);
  const [latest,oldest]=await Promise.all([request('desc','0x64'),request('asc','0x1')]);
  const entries=[...(latest?.transfers||[])];let pageKey=latest?.pageKey;
  // Bounded sample: prevent excessive API consumption and slow Render responses.
  if(pageKey){try{const page=await request('desc','0x64',pageKey);entries.push(...(page?.transfers||[]));pageKey=page?.pageKey;}catch{ /* retain partial sample */ }}
  const sample=summarizeTransferSample({recent:entries,earliest:oldest?.transfers||[],hasMore:Boolean(pageKey)},address,result.transactions,now);
  // Gas is only for the latest subset for which we fetched receipts, never totalGasWei.
  const hashes=sample.recent.slice(0,5).map(t=>t.hash);
  if(hashes.length){const receipts=await Promise.allSettled(hashes.map(hash=>alchemyCall(host,key,'eth_getTransactionReceipt',[hash])));
    let sum=0n,count=0;for(const r of receipts){if(r.status==='fulfilled'&&r.value){const x=r.value;try{sum+=BigInt(x.gasUsed||'0x0')*BigInt(x.effectiveGasPrice||x.gasPrice||'0x0');count++}catch{}}}
    if(count)sample.sampleGasWei=sum.toString();sample.sampleGasTransactions=count;
  }
  return {...result,...sample,balances:result.balances,transactions:result.transactions};
}
