/** One-time x402 EIP-3009 signing using injected browser wallet. TESTNET only. */
const TESTNET='eip155:84532',USDC='0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const TREASURY='0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F';
const ADDR=/^0x[0-9a-f]{40}$/i;
const same=(a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();
export function checkRequirements(details,wallet){
 const r=details?.accepts?.[0];
 if(details?.x402Version!==2||!ADDR.test(wallet)||!r)throw Error('Invalid x402 challenge');
 if(r.scheme!=='exact'||r.network!==TESTNET||r.amount!=='10000'||!same(r.asset,USDC)||!same(r.payTo,TREASURY))
   throw Error('Unexpected payment amount, token or recipient: blocked.');
 if(r.extra?.name!=='USDC'||r.extra?.version!=='2'||!['eip3009',undefined].includes(r.extra?.assetTransferMethod))
   throw Error('Unsupported token domain');
 if(!(r.maxTimeoutSeconds>0&&r.maxTimeoutSeconds<=420)||!details.resource?.url?.includes('/api/x402/report'))
   throw Error('Untrusted x402 resource');
 return r;
}
export function makeAuthorization(wallet,req,now=Math.floor(Date.now()/1000),nonce){
 const n=nonce||'0x'+Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 return {from:wallet,to:req.payTo,value:req.amount,validAfter:String(now-60),validBefore:String(now+240),nonce:n};
}
export function typedPayment(req,authorization){
 return {types:{EIP712Domain:[{name:'name',type:'string'},{name:'version',type:'string'},{name:'chainId',type:'uint256'},{name:'verifyingContract',type:'address'}],
 TransferWithAuthorization:[{name:'from',type:'address'},{name:'to',type:'address'},{name:'value',type:'uint256'},{name:'validAfter',type:'uint256'},{name:'validBefore',type:'uint256'},{name:'nonce',type:'bytes32'}]},
 primaryType:'TransferWithAuthorization',domain:{name:req.extra.name,version:req.extra.version,chainId:84532,verifyingContract:req.asset},message:authorization};
}
export async function buyX402Report(provider,wallet){
 if(!provider||!ADDR.test(wallet))throw Error('Connect your wallet first');
 const chain=Number(BigInt(await provider.request({method:'eth_chainId'})));
 if(chain!==84532)throw Error('Select Base Sepolia before paying test USDC');
 const url='/api/x402/report?address='+encodeURIComponent(wallet.toLowerCase())+'&chainId=84532';
 const initial=await fetch(url,{cache:'no-store'});
 if(initial.status!==402)throw Error('x402 endpoint did not return HTTP 402 ('+initial.status+')');
 const details=await initial.json(),terms=checkRequirements(details,wallet);
 const auth=makeAuthorization(wallet,terms);
 const signature=await provider.request({method:'eth_signTypedData_v4',params:[wallet,JSON.stringify(typedPayment(terms,auth))]});
 if(!/^0x[0-9a-f]{130}$/i.test(signature))throw Error('Unexpected wallet signature');
 const payment={x402Version:2,resource:details.resource,accepted:terms,payload:{signature,authorization:auth},extensions:details.extensions||{}};
 const response=await fetch(url,{headers:{'PAYMENT-SIGNATURE':btoa(JSON.stringify(payment))},cache:'no-store'});
 const result=await response.json();
 if(!response.ok||result.ok!==true)throw Error(result.error||'Payment could not be confirmed; check explorer before retrying');
 return result;
}
