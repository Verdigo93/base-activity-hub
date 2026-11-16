/**
 * Base Mainnet x402 v2 exact/EIP-3009 payment gate.
 * Settlement is OFF by default. Set X402_MAINNET_ENABLED=true in Render only after review.
 * Neither this server nor the facilitator needs a customer private key.
 */
const ADDRESS=/^0x[0-9a-fA-F]{40}$/, HASH=/^0x[0-9a-fA-F]{64}$/, SIGNATURE=/^0x[0-9a-fA-F]{130}$/;
const same=(a,b)=>String(a??'').toLowerCase()===String(b??'');
export const MAINNET_X402=Object.freeze({
  network:'eip155:8453',chainId:8453,
  asset:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  payTo:'0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F',
  amount:'10000', // 0.01 USDC (6 decimals)
  facilitator:'https://facilitator.payai.network'
});

export function mainnetChallenge(wallet,publicOrigin='https://base-activity-hub.onrender.com'){
  if(!ADDRESS.test(wallet))throw Error('Invalid wallet address');
  const base=new URL(publicOrigin);
  if(base.protocol!=='https:')throw Error('Mainnet payments require HTTPS');
  const url=new URL('/api/x402/report',base);
  url.searchParams.set('address',wallet.toLowerCase());
  url.searchParams.set('chainId','8453');
  return {x402Version:2,
    resource:{url:url.href,description:'Base Activity Hub extended wallet report (Base Mainnet)',mimeType:'application/json'},
    accepts:[{scheme:'exact',network:MAINNET_X402.network,amount:MAINNET_X402.amount,
      asset:MAINNET_X402.asset,payTo:MAINNET_X402.payTo,maxTimeoutSeconds:300,
      extra:{assetTransferMethod:'eip3009',name:'USD Coin',version:'2'}}],
    extensions:{}};
}

const responseHeaders={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff'};
function respond(res,status,payload,extra={}){
  res.writeHead(status,{...responseHeaders,...extra});
  res.end(JSON.stringify(payload));
}
const encoded=obj=>Buffer.from(JSON.stringify(obj)).toString('base64');
function requirePayment(res,challenge,error='Payment required: 0.01 USDC on Base Mainnet.'){
  respond(res,402,{...challenge,error},{'PAYMENT-REQUIRED':encoded(challenge)});
}

// Defense in depth: bind every signature to the expected wallet, resource, network,
// asset, amount, destination, validity window and standard USDC EIP-3009 method.
// The facilitator is still responsible for cryptographic verification.
export function parseMainnetPayment(header,terms,wallet,now=Math.floor(Date.now()/1000)){
  if(typeof header!=='string'||header.length>8192||!header.length||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(header))throw Error('Invalid PAYMENT-SIGNATURE encoding');
  let signed;
  try{signed=JSON.parse(Buffer.from(header,'base64').toString('utf8'))}catch{throw Error('Invalid PAYMENT-SIGNATURE JSON')}
  const expected=terms.accepts[0],selected=signed?.accepted,auth=signed?.payload?.authorization;
  if(signed?.x402Version!==2||!selected||!auth||signed.resource?.url!==terms.resource.url)
    throw Error('Payment resource mismatch');
  for(const name of ['scheme','network','amount','asset','payTo','maxTimeoutSeconds'])
    if(!same(selected[name],expected[name]))throw Error('Payment terms mismatch: '+name);
  for(const name of ['assetTransferMethod','name','version'])
    if(selected.extra?.[name]!==expected.extra[name])throw Error('Payment token domain mismatch');
  if(!ADDRESS.test(auth.from)||!same(auth.from,wallet)||!same(auth.to,expected.payTo)||
     String(auth.value)!==expected.amount)throw Error('Payment payer, recipient or amount mismatch');
  if(!HASH.test(auth.nonce)||!SIGNATURE.test(signed.payload.signature))
    throw Error('Invalid payment authorization signature or nonce');
  const after=String(auth.validAfter),before=String(auth.validBefore);
  if(!/^\d+$/.test(after)||!/^\d+$/.test(before))throw Error('Invalid payment validity period');
  if(BigInt(after)>BigInt(now)||BigInt(before)<=BigInt(now)||
     BigInt(before)>BigInt(now+expected.maxTimeoutSeconds+120))
    throw Error('Payment authorization is expired or outside its allowed window');
  return signed;
}

async function facilitatorJSON(fetchImpl,endpoint,requestBody){
  const response=await fetchImpl(MAINNET_X402.facilitator+endpoint,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({x402Version:2,...requestBody}),signal:AbortSignal.timeout(25000)
  });
  if(!response.ok)throw Error('Facilitator '+endpoint+' HTTP '+response.status);
  return await response.json();
}
async function facilitatorSupported(fetchImpl){
  const r=await fetchImpl(MAINNET_X402.facilitator+'/supported',{signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw Error('Facilitator /supported HTTP '+r.status);
  const data=await r.json();
  return Array.isArray(data.kinds)&&data.kinds.some(x=>x.x402Version===2&&x.scheme==='exact'&&x.network===MAINNET_X402.network);
}

export async function handleMainnetX402Challenge(req,res,url,getReport,options={}){
  if(req.method!=='GET'){respond(res,405,{error:'Only GET is supported.'},{Allow:'GET'});return}
  const wallet=url.searchParams.get('address')||'';
  if(!ADDRESS.test(wallet)||url.searchParams.get('chainId')!=='8453'){
    respond(res,400,{error:'Provide a valid address and chainId=8453.'});return
  }
  const challenge=mainnetChallenge(wallet,process.env.PUBLIC_APP_URL||'https://base-activity-hub.onrender.com');
  if(req.headers['x-payment']){
    respond(res,400,{error:'Legacy X-PAYMENT is not supported. Use x402 v2 PAYMENT-SIGNATURE.'});return
  }
  const raw=req.headers['payment-signature'];
  const enabled=options.enabled??(process.env.X402_MAINNET_ENABLED==='true');
  if(!raw){
    requirePayment(res,challenge,enabled?
      'Payment required: 0.01 USDC on Base Mainnet.':
      'Payment required: 0.01 USDC on Base Mainnet. Settlement is not enabled yet.');
    return;
  }
  if(!enabled){
    respond(res,503,{error:'x402 Mainnet payment settlement is not enabled yet. No payment was submitted.'});return
  }
  let signed;
  try{signed=parseMainnetPayment(raw,challenge,wallet)}catch(e){
    requirePayment(res,challenge,String(e.message));return
  }
  const fetchImpl=options.fetchImpl||fetch;
  try{
    if(!await facilitatorSupported(fetchImpl))
      throw Error('Facilitator does not support Base Mainnet x402 v2 exact payments');
    const body={paymentPayload:signed,paymentRequirements:challenge.accepts[0]};
    const verification=await facilitatorJSON(fetchImpl,'/verify',body);
    if(verification?.isValid!==true||!same(verification.payer,wallet)){
      requirePayment(res,challenge,'Payment verification rejected');return
    }
    if(typeof getReport!=='function')throw Error('Paid resource is not available');
    // Generate the promised resource before spending the buyer's money.
    const report=await getReport(wallet,8453);
    if(!report||typeof report!=='object')throw Error('Wallet report is not available');
    const settlement=await facilitatorJSON(fetchImpl,'/settle',body);
    if(settlement?.success!==true||!HASH.test(settlement.transaction)||
       settlement.network!==MAINNET_X402.network||!same(settlement.payer,wallet)){
      // A pending or unreachable settlement is NOT proof of success.
      throw Error(settlement?.errorReason==='settlement_pending'?
        'Payment settlement pending. Check the blockchain before retrying.':
        'Payment settlement not confirmed. Check the blockchain before retrying.');
    }
    respond(res,200,{ok:true,paid:true,chainId:8453,service:'Base Activity Hub extended wallet report',
      priceUsdc:'0.01',payer:wallet,transaction:settlement.transaction,
      report:{...report,dataQuality:report.warning||'Data completeness depends on indexed providers.'}},
      {'PAYMENT-RESPONSE':encoded(settlement)});
  }catch(e){
    // Never claim that failed or unknown settlement was free, or retry it blindly.
    respond(res,503,{ok:false,error:String(e.message||'Payment unavailable').slice(0,200),
      noAutomaticRetry:true,settlementMayBePending:true});
  }
}
