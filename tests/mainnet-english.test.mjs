import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('visible site exposes English and Base Mainnet only',()=>{
 const html=read('index.html'),app=read('src/app.js'),cfg=read('config.js');
 assert.doesNotMatch(html,/value="84532"|Base Sepolia/);
 assert.match(html,/aria-label="Network: Base Mainnet"/);
 assert.match(html,/id="languageButton"[^>]*display:none/);
 assert.match(app,/language:'en'/);
 assert.match(app,/Only Base Mainnet \(8453\) is supported/);
 assert.doesNotMatch(cfg,/84532:/);
});
test('x402 cannot switch to testnet or charge a Mainnet wallet',()=>{
 const s=read('src/app.js');
 assert.match(s,/x402 payments on Base Mainnet are not available yet/);
 assert.match(s,/unavailable:true/);
 assert.match(s,/if\(chainId!==8453\)throw Error/);
});
