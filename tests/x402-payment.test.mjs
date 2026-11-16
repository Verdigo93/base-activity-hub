import test from 'node:test';
import assert from 'node:assert/strict';
import {mainnetChallenge} from '../api/x402-mainnet.mjs';
import {X402_USDC,X402_AMOUNT,validateMainnetX402,createMainnetAuthorization,encodeMainnetPayment} from '../src/x402-payment.mjs';

const account='0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F';
const origin='https://base-activity-hub.onrender.com';
const valid=()=>mainnetChallenge(account);

test('Browser independently checks mainnet x402 destination, exact amount and resource',()=>{
 const c=valid();
 const result=validateMainnetX402(c,account,origin,account);
 assert.equal(result.terms.amount,X402_AMOUNT);
 assert.equal(result.terms.asset,X402_USDC);
 assert.match(result.url,/chainId=8453/);
 const wrongAmount=structuredClone(c);wrongAmount.accepts[0].amount='50000';
 assert.throws(()=>validateMainnetX402(wrongAmount,account,origin,account),/payment terms/);
 const wrongRecipient=structuredClone(c);wrongRecipient.accepts[0].payTo='0x'+'12'.repeat(20);
 assert.throws(()=>validateMainnetX402(wrongRecipient,account,origin,account),/payment terms/);
 const wrongSource=structuredClone(c);wrongSource.resource.url='https://attacker.example/pay';
 assert.throws(()=>validateMainnetX402(wrongSource,account,origin,account),/resource/);
 const wrongDomain=structuredClone(c);wrongDomain.accepts[0].extra.name='USDC';
 assert.throws(()=>validateMainnetX402(wrongDomain,account,origin,account),/payment terms/);
});

test('EIP-712 transfer authorization is exact 0.01 USDC and has unique nonce',()=>{
 const c=valid();
 const random=new Uint8Array(32).fill(0x1a);
 const {authorization,typedData}=createMainnetAuthorization(c,account,origin,account,random,2000000000);
 assert.equal(authorization.from,account);
 assert.equal(authorization.to,account);
 assert.equal(authorization.value,'10000');
 assert.equal(authorization.validBefore,'2000000240');
 assert.equal(authorization.nonce,'0x'+'1a'.repeat(32));
 assert.equal(typedData.domain.name,'USD Coin');
 assert.equal(typedData.domain.version,'2');
 assert.equal(typedData.domain.chainId,8453);
 assert.equal(typedData.domain.verifyingContract,X402_USDC);
 assert.equal(typedData.primaryType,'TransferWithAuthorization');
 assert.deepEqual(typedData.types.TransferWithAuthorization.map(x=>x.name),
   ['from','to','value','validAfter','validBefore','nonce']);
 assert.throws(()=>createMainnetAuthorization(c,account,origin,account,new Uint8Array(3)),/32-byte/);
});

test('Payment header encodes original v2 resource and signed EIP-3009 authorization',()=>{
 const c=valid();
 const authorization=createMainnetAuthorization(c,account,origin,account,new Uint8Array(32).fill(1)).authorization;
 const signature='0x'+'ab'.repeat(65);
 const encoded=encodeMainnetPayment(c,authorization,signature);
 const payload=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
 assert.equal(payload.x402Version,2);
 assert.equal(payload.resource.url,c.resource.url);
 assert.deepEqual(payload.accepted,c.accepts[0]);
 assert.equal(payload.payload.authorization.value,'10000');
 assert.equal(payload.payload.signature,signature);
 assert.throws(()=>encodeMainnetPayment(c,authorization,'0xdeadbeef'),/signature/);
});
