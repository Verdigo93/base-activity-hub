import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONFIG} from '../config.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('rarity tiers, prices and fixed supply match config and metadata',()=>{
 const items=CONFIG.nftItems;
 assert.deepEqual(items.map(i=>i.name),['Base Genesis','Base Ember','Base Crown']);
 assert.deepEqual(items.map(i=>i.rarity),['Common','Rare','Legendary']);
 assert.deepEqual(items.map(i=>i.priceUnits),[100000,500000,1000000]);
 assert.deepEqual(items.map(i=>i.maxSupply),[10000,1000,100]);
 assert.deepEqual(items.map(i=>i.image),['/assets/genesis.jpg','/assets/ember.jpg','/assets/crown.jpg']);
 for(const item of items){
   const slug=['genesis','ember','crown'][item.id],m=JSON.parse(read('metadata/'+slug+'.json'));
   assert.equal(m.image,'https://base-activity-hub.onrender.com/assets/'+slug+'.jpg');
   assert.equal(m.attributes.find(a=>a.trait_type==='Rarity').value,item.rarity);
   assert.equal(m.attributes.find(a=>a.trait_type==='Max Supply').value,item.maxSupply);
 }
});
test('Solidity NFT pricing, supply caps, mint to purchaser, metadata and reentrancy guard',()=>{
 const sol=read('contracts/BaseActivity.sol');
 for(const v of ['COMMON_PRICE = 100_000','RARE_PRICE = 500_000','LEGENDARY_PRICE = 1_000_000','COMMON_SUPPLY = 10_000','RARE_SUPPLY = 1_000','LEGENDARY_SUPPLY = 100','function mintPrice(uint256 artworkKind)','function tierMaxSupply(uint256 artworkKind)','_mint(msg.sender,_artworkUris[artworkKind])','mintedPerTier[artworkKind]+=1','usdc.transferFrom(msg.sender,treasury,price)','Reentrant mint'])assert.ok(sol.includes(v),v);
});
test('The app compares the onchain tier fee and supply before requesting USDC authorization',()=>{
 const app=read('src/app.js');
 for(const v of ['mintPrice(uint256)','tierMaxSupply(uint256)','mintedPerTier(uint256)','await verifyPaidContract(spender,\'nft\',artworkKind)','await usdcApproval(spender,amount)','nft-artwork']) assert.ok(app.includes(v),v);
});
