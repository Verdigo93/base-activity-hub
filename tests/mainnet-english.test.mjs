import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('English only, Base Mainnet only UI',()=>{
 const html=read('index.html'),app=read('src/app.js'),cfg=read('config.js');
 assert.match(html,/aria-label="Network: Base Mainnet"/);
 assert.doesNotMatch(html,/networkSelect|languageButton|Base Sepolia/);
 assert.doesNotMatch(app,/networkSelect|languageButton|buyX402Report|Base Sepolia/);
 assert.match(app,/language:'en'/);
 assert.match(app,/Only Base Mainnet \(8453\) is supported/);
 assert.doesNotMatch(cfg,/84532:/);
});
test('x402 Mainnet action cannot initiate a testnet payment',()=>{
 const app=read('src/app.js');
 assert.match(app,/x402 payments on Base Mainnet are not available yet/);
 assert.match(app,/unavailable:true/);
 assert.doesNotMatch(app,/switchNetwork\(84532\)/);
 assert.match(read('api/server.mjs'),/Mainnet x402 payment integration is not enabled yet/);
});