import test from 'node:test';
import assert from 'node:assert/strict';
import { MAINNET_X402, mainnetChallenge, parseMainnetPayment, handleMainnetX402Challenge, checkMainnetFacilitator } from '../api/x402-mainnet.mjs';

const wallet='0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F';
const url=new URL('https://base-activity-hub.onrender.com/api/x402/report?address='+wallet+'&chainId=8453');
function response(){
 return {status:0,headers:{},body:'',
  writeHead(code,headers){this.status=code;this.headers=headers},
  end(value){this.body=value}};
}
async function run(req={method:'GET',headers:{}},opts={},getReport=async()=>({source:'test',transactions:1}),target=url){
 const res=response();
 await handleMainnetX402Challenge(req,res,target,getReport,opts);
 return {status:res.status,headers:res.headers,body:JSON.parse(res.body)};
}
function payment(params={}){
 const now=Math.floor(Date.now()/1000),challenge=mainnetChallenge(wallet);
 const data={x402Version:2,resource:challenge.resource,accepted:challenge.accepts[0],
  payload:{signature:'0x'+'ab'.repeat(65),authorization:{
   from:wallet,to:MAINNET_X402.payTo,value:'10000',validAfter:String(now-10),
   validBefore:String(now+120),nonce:'0x'+'cd'.repeat(32),...params}}};
 return Buffer.from(JSON.stringify(data)).toString('base64');
}
function fakeFetchFactory(verify=true,settle=true){
 const calls=[];
 const fetchImpl=async (target,options)=>{
  calls.push({url:String(target),body:options?.body?JSON.parse(options.body):null});
  const data=String(target).endsWith('/supported')
   ? {kinds:[{x402Version:2,scheme:'exact',network:'eip155:8453'}]}
   : String(target).endsWith('/verify')
   ? {isValid:verify,payer:wallet}
   : {success:settle,network:'eip155:8453',payer:wallet,transaction:'0x'+'12'.repeat(32)};
  return {ok:true,json:async()=>data};
 };
 return {fetchImpl,calls};
}

test('Mainnet challenge advertises exact 0.01 USDC and correct payout',()=>{
 const challenge=mainnetChallenge(wallet);
 assert.equal(challenge.x402Version,2);
 assert.equal(challenge.accepts[0].network,'eip155:8453');
 assert.equal(challenge.accepts[0].asset,MAINNET_X402.asset);
 assert.equal(challenge.accepts[0].amount,'10000');
 assert.equal(challenge.accepts[0].payTo,wallet);
 assert.equal(challenge.accepts[0].extra.assetTransferMethod,'eip3009');
 assert.equal(challenge.accepts[0].extra.name,'USD Coin');
 assert.match(challenge.resource.url,/chainId=8453/);
});

test('Unsigned request responds with standard HTTP 402 challenge',async()=>{
 const result=await run();
 assert.equal(result.status,402);
 assert.equal(result.body.x402Version,2);
 const challenge=JSON.parse(Buffer.from(result.headers['PAYMENT-REQUIRED'],'base64').toString());
 assert.deepEqual(challenge.accepts,result.body.accepts);
});

test('Invalid method, chain, and legacy payment headers are rejected',async()=>{
 assert.equal((await run({method:'POST',headers:{}})).status,405);
 const invalid=new URL('https://base-activity-hub.onrender.com/api/x402/report?address=abc&chainId=8453');
 assert.equal((await run(undefined,{},undefined,invalid)).status,400);
 const testnet=new URL('https://base-activity-hub.onrender.com/api/x402/report?address='+wallet+'&chainId=84532');
 assert.equal((await run(undefined,{},undefined,testnet)).status,400);
 assert.equal((await run({method:'GET',headers:{'x-payment':'legacy'}})).status,400);
});

test('Signed payments are blocked when settlement is explicitly disabled',async()=>{
 // The production Render environment may set X402_MAINNET_ENABLED=true.
 // This safety test must override it to guarantee no external payment calls.
 const r=await run({method:'GET',headers:{'payment-signature':payment()}},{enabled:false});
 assert.equal(r.status,503);assert.equal(r.body.ok,undefined);
});

test('Strict local validation prevents wrong receiver and resource before network requests',async()=>{
 assert.throws(()=>parseMainnetPayment(payment({to:'0x'+'12'.repeat(20)}),mainnetChallenge(wallet),wallet),/recipient|amount/);
 const challenge=mainnetChallenge(wallet);
 assert.throws(()=>parseMainnetPayment('garbage!',challenge,wallet),/encoding/);
 const p=JSON.parse(Buffer.from(payment(),'base64').toString());
 p.resource.url='https://example.net/something';
 assert.throws(()=>parseMainnetPayment(Buffer.from(JSON.stringify(p)).toString('base64'),challenge,wallet),/resource/);
});

test('Enabled flow verifies and settles once, then returns paid report',async()=>{
 const {fetchImpl,calls}=fakeFetchFactory();
 const r=await run({method:'GET',headers:{'payment-signature':payment()}},{enabled:true,fetchImpl});
 assert.equal(r.status,200);assert.equal(r.body.paid,true);
 assert.equal(r.body.priceUsdc,'0.01');
 assert.equal(r.body.report.transactions,1);
 assert.ok(r.headers['PAYMENT-RESPONSE']);
 assert.deepEqual(calls.map(c=>c.url.split('/').at(-1)),['supported','verify','settle']);
 assert.equal(calls[1].body.paymentRequirements.amount,'10000');
});

test('No settlement for invalid verification or unavailable report',async()=>{
 const a=fakeFetchFactory(false);
 const invalid=await run({method:'GET',headers:{'payment-signature':payment()}},{enabled:true,fetchImpl:a.fetchImpl});
 assert.equal(invalid.status,402);
 assert.deepEqual(a.calls.map(c=>c.url.split('/').at(-1)),['supported','verify']);
 const b=fakeFetchFactory(true);
 const unavailable=await run({method:'GET',headers:{'payment-signature':payment()}},{enabled:true,fetchImpl:b.fetchImpl},async()=>{throw Error('Report failed')});
 assert.equal(unavailable.status,503);
 assert.deepEqual(b.calls.map(c=>c.url.split('/').at(-1)),['supported','verify']);
});

test('Unconfirmed settlement never grants access',async()=>{
 const a=fakeFetchFactory(true,false);
 const r=await run({method:'GET',headers:{'payment-signature':payment()}},{enabled:true,fetchImpl:a.fetchImpl});
 assert.equal(r.status,503);
 assert.equal(r.body.noAutomaticRetry,true);
});

test('Read-only facilitator status checks Base Mainnet without verify or settle',async()=>{
 const {fetchImpl,calls}=fakeFetchFactory();
 const status=await checkMainnetFacilitator(fetchImpl);
 assert.equal(status.x402Version,2);
 assert.equal(status.network,'eip155:8453');
 assert.equal(status.facilitatorSupported,true);
 assert.equal(typeof status.settlementEnabled,'boolean');
 assert.deepEqual(calls.map(c=>c.url.split('/').at(-1)),['supported']);
});
