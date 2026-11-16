import test from 'node:test';
import assert from 'node:assert/strict';
import { MAINNET_X402, mainnetChallenge, handleMainnetX402Challenge } from '../api/x402-mainnet.mjs';

const wallet = '0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F';
const url = new URL('https://base-activity-hub.onrender.com/api/x402/report?address='+wallet+'&chainId=8453');

function run(req = {method:'GET', headers:{}}, requestUrl=url) {
  const response = { status:0, headers:{}, body:'',
    writeHead(code, headers){this.status=code;this.headers=headers;},
    end(value){this.body=value;}
  };
  handleMainnetX402Challenge(req,response,requestUrl);
  return {status:response.status,headers:response.headers,body:JSON.parse(response.body)};
}

test('Base Mainnet x402 challenge advertises exact native USDC 0.01', () => {
  const value=mainnetChallenge(wallet);
  assert.equal(value.x402Version,2);
  assert.equal(value.accepts[0].network,'eip155:8453');
  assert.equal(value.accepts[0].asset,MAINNET_X402.asset);
  assert.equal(value.accepts[0].amount,'10000');
  assert.equal(value.accepts[0].payTo,wallet);
  assert.equal(value.accepts[0].extra.assetTransferMethod,'eip3009');
  assert.match(value.resource.url,/chainId=8453/);
});

test('Unpaid request receives HTTP 402 with standard PAYMENT-REQUIRED header', () => {
  const result=run();
  assert.equal(result.status,402);
  assert.equal(result.body.x402Version,2);
  const challenge=JSON.parse(Buffer.from(result.headers['PAYMENT-REQUIRED'],'base64').toString());
  assert.deepEqual(challenge.accepts,result.body.accepts);
});

test('Malformed requests are rejected and signed payments cannot settle at this stage', () => {
  assert.equal(run({method:'POST',headers:{}}).status,405);
  assert.equal(run({method:'GET',headers:{}},new URL('https://base-activity-hub.onrender.com/api/x402/report?address=invalid&chainId=8453')).status,400);
  assert.equal(run({method:'GET',headers:{}},new URL('https://base-activity-hub.onrender.com/api/x402/report?address='+wallet+'&chainId=84532')).status,400);
  assert.equal(run({method:'GET',headers:{'payment-signature':'untrusted-payload'}}).status,503);
});
