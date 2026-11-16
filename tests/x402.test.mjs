import test from 'node:test';
import assert from 'node:assert/strict';
import {challenge,parseAndCheck,X402} from '../api/x402.mjs';
import {checkRequirements,makeAuthorization,typedPayment} from '../src/x402-client.mjs';
const wallet='0x1111111111111111111111111111111111111111',now=1794823200;
const sign='0x'+'ab'.repeat(65),nonce='0x'+'12'.repeat(32);
test('v2 Sepolia terms and recipient',()=>{
 const r=challenge(wallet),p=checkRequirements(r,wallet);
 assert.equal(r.x402Version,2);assert.equal(p.network,'eip155:84532');assert.equal(p.payTo,X402.payTo);
 assert.equal(p.amount,'10000');assert.equal(typedPayment(p,makeAuthorization(wallet,p,now,nonce)).domain.chainId,84532);
});
test('payment details cannot be substituted',()=>{
 const req=challenge(wallet),t=req.accepts[0],a=makeAuthorization(wallet,t,now,nonce);
 const good={x402Version:2,resource:req.resource,accepted:t,payload:{signature:sign,authorization:a}};
 const enc=p=>Buffer.from(JSON.stringify(p)).toString('base64');
 assert.equal(parseAndCheck(enc(good),req,wallet,now).payload.authorization.value,'10000');
 assert.throws(()=>parseAndCheck(enc({...good,accepted:{...t,payTo:wallet}}),req,wallet,now),/mismatch/);
 assert.throws(()=>parseAndCheck(enc({...good,payload:{...good.payload,authorization:{...a,value:'20000'}}}),req,wallet,now),/Invalid payer/);
});
test('never accepts a Mainnet request in Sepolia payment flow',()=>{
 const r=challenge(wallet);r.accepts[0].network='eip155:8453';
 assert.throws(()=>checkRequirements(r,wallet),/Unexpected payment/);
});
