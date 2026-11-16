import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('Mainnet paid actions explain deployment and never link to Sepolia setup',()=>{
 const app=read('src/app.js');
 assert.match(app,/DEPLOY_MAINNET_UA\.md/);
 assert.match(app,/Deployment pending/);
 assert.doesNotMatch(app,/Sepolia setup guide|DEPLOY_SEPOLIA_UA/);
 assert.match(app,/The x402 Mainnet integration is not live yet/);
});
test('all three minted NFT types have valid live-domain metadata references',()=>{
 for(const artwork of ['genesis','ember','crown']){
  const m=JSON.parse(read('metadata/'+artwork+'.json'));
  assert.equal(m.image,'https://base-activity-hub.onrender.com/assets/'+artwork+'.jpg');
  assert.doesNotMatch(JSON.stringify(m),/REPLACE-YOUR-DOMAIN/);
 }
});
test('Mainnet deployment guide references exact verified mainnet USDC and expected payout',()=>{
 const guide=read('contracts/DEPLOY_MAINNET_UA.md');
 assert.match(guide,/0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913/i);
 assert.match(guide,/0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F/i);
 assert.match(guide,/BaseActivityNFT/);
 assert.match(guide,/BaseActivityFactory/);
});
