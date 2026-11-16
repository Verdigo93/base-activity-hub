/** x402 v2 exact EIP-3009 paid resource. TESTNET ONLY until security review. */
const ADDRESS=/^0x[0-9a-f]{40}$/i, HASH=/^0x[0-9a-f]{64}$/i, SIGNATURE=/^0x[0-9a-f]{130}$/i;
export const X402={chainId:84532,network:'eip155:84532',usdc:'0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  payTo:'0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F',amount:'10000',facilitator:'https://x402.org/facilitator'};
const same=(a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();
export function challenge(wallet,baseUrl='https://base-activity-hub.onrender.com'){
 if(!ADDRESS.test(wallet))throw Error('Invalid wallet');
 const host=new URL(baseUrl);if(!['https:','http:'].includes(host.protocol))throw Error('Invalid public URL');
 const resource={url:new URL('/api/x402/report?address='+wallet.toLowerCase()+'&chainId=84532',host).href,description:'Base Activity Hub testnet wallet snapshot',mimeType:'application/json'};
 const accepted={scheme:'exact',network:X402.network,amount:X402.amount,asset:X402.usdc,payTo:X402.payTo,
 maxTimeoutSeconds:300,extra:{assetTransferMethod:'eip3009',name:'USDC',version:'2'}};
 return {x402Version:2,resource,accepts:[accepted],extensions:{}};
}
export function parseAndCheck(header,terms,wallet,now=Math.floor(Date.now()/1000)){
 if(typeof header!=='string'||header.length>8000||!/^[A-Za-z0-9+/=]+$/.test(header))throw Error('Invalid PAYMENT-SIGNATURE header');
 let data;try{data=JSON.parse(Buffer.from(header,'base64').toString('utf8'))}catch{throw Error('Invalid payment JSON')}
 const required=terms.accepts[0],got=data?.accepted,auth=data?.payload?.authorization;
 if(data?.x402Version!==2||!got||!auth||data.resource?.url!==terms.resource.url)throw Error('Wrong x402 resource');
 for(const key of ['scheme','network','amount','asset','payTo','maxTimeoutSeconds'])if(!same(got[key],required[key]))throw Error('Payment terms mismatch: '+key);
 for(const key of ['assetTransferMethod','name','version'])if(got.extra?.[key]!==required.extra[key])throw Error('Token domain mismatch');
 if(!ADDRESS.test(auth.from)||!same(auth.from,wallet)||!same(auth.to,required.payTo)||String(auth.value)!==required.amount)throw Error('Invalid payer, recipient or price');
 if(!HASH.test(auth.nonce)||!SIGNATURE.test(data.payload.signature))throw Error('Invalid signature/nonce format');
 if(!/^\d+$/.test(String(auth.validAfter))||!/^\d+$/.test(String(auth.validBefore)))throw Error('Invalid authorization window');
 if(Number(auth.validAfter)>now||Number(auth.validBefore)<=now||Number(auth.validBefore)>now+420||Number(auth.validAfter)<now-420)throw Error('Expired or implausible payment window');
 return data;
}
async function facilitate(path,payload,requirement){
 const base=new URL(process.env.X402_TESTNET_FACILITATOR||X402.facilitator);
 if(base.protocol!=='https:')throw Error('Facilitator must use HTTPS');
 const endpoint=base.href.replace(/\/$/,'')+'/'+path;
 const resp=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({x402Version:2,paymentPayload:payload,paymentRequirements:requirement}),signal:AbortSignal.timeout(20000)});
 if(!resp.ok)throw Error('Facilitator '+path+' HTTP '+resp.status);
 return resp.json();
}
function respond(res,status,data,more={}){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...more});
 res.end(JSON.stringify(data));
}
export async function handleX402(req,res,url,getProfile){
 if(req.method!=='GET'){respond(res,405,{error:'Only GET is supported'});return}
 const wallet=url.searchParams.get('address')||'';
 if(!ADDRESS.test(wallet)||url.searchParams.get('chainId')!=='84532'){
   respond(res,400,{error:'Valid address and chainId=84532 required; Mainnet x402 is not enabled.'});return;
 }
 const requirements=challenge(wallet,process.env.PUBLIC_APP_URL||'https://base-activity-hub.onrender.com');
 const raw=req.headers['payment-signature'];
 if(!raw){
   respond(res,402,{...requirements,error:'Payment required: 0.01 Base Sepolia test USDC'},
     {'PAYMENT-REQUIRED':Buffer.from(JSON.stringify(requirements)).toString('base64')});return;
 }
 try{
   const payment=parseAndCheck(raw,requirements,wallet);
   // Prepare paid data before settling so an API failure cannot charge for unavailable content.
   const report=await getProfile(wallet,84532);
   const terms=requirements.accepts[0];
   const verified=await facilitate('verify',payment,terms);
   if(verified.isValid!==true||!same(verified.payer,wallet))throw Error('Payment verification rejected');
   const settled=await facilitate('settle',payment,terms);
   if(settled.success!==true||!HASH.test(settled.transaction)||settled.network!==X402.network)
     throw Error('Settlement not confirmed. Inspect onchain status before retrying.');
   respond(res,200,{ok:true,testnet:true,chainId:84532,service:'Base Activity Hub testnet wallet snapshot',
     priceTestUsdc:'0.01',payer:wallet,transaction:settled.transaction,report},
     {'PAYMENT-RESPONSE':Buffer.from(JSON.stringify(settled)).toString('base64')});
 }catch(e){respond(res,502,{ok:false,error:String(e.message||'x402 unavailable').slice(0,200),noAutomaticRetry:true});}
}
