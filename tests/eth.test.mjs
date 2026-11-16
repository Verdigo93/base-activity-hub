import test from 'node:test';
import assert from 'node:assert/strict';
import {keccak256,callData,abiEncode,parseUnits,formatUnits,isAddress,builderCodeSuffix} from '../src/eth.js';
test('Keccak vectors and known ERC20 selectors',()=>{
 assert.equal(keccak256(''),'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
 assert.equal(keccak256('hello'),'1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8');
 assert.equal(callData('transfer(address,uint256)').slice(0,10),'0xa9059cbb');
 assert.equal(callData('approve(address,uint256)').slice(0,10),'0x095ea7b3');
 assert.equal(callData('balanceOf(address)').slice(0,10),'0x70a08231');
});
test('ABI-encode strings at correct offset',()=>{
 const data=abiEncode(['uint256','string'],[12,'GM']);
 assert.equal(data.slice(2,66),12n.toString(16).padStart(64,'0'));
 assert.equal(data.slice(66,130),64n.toString(16).padStart(64,'0'));
 assert.equal(data.slice(130,194),2n.toString(16).padStart(64,'0'));
 assert.equal(data.slice(194,198),'474d');
});
test('units and strict validation',()=>{
 assert.equal(parseUnits('0.10',6),100000n);
 assert.equal(parseUnits('0.000001',18),1000000000000n);
 assert.equal(formatUnits(1234567n,6,3),'1.234');
 assert.equal(isAddress('0x'+'a'.repeat(40)),true);
 assert.throws(()=>parseUnits('0.1234567',6));
 assert.throws(()=>parseUnits('-1',6));
});

test('ERC-8021 schema-0 Builder Code attribution matches ox format',()=>{
 assert.equal(builderCodeSuffix('baseapp'),'0x626173656170700700'+'8021'.repeat(8));
 assert.equal(builderCodeSuffix('bc_e5x8c1ku'),'0x62635f6535783863316b750b00'+'8021'.repeat(8));
 assert.throws(()=>builderCodeSuffix('in valid'));
});
