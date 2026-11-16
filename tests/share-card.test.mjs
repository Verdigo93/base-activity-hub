import test from 'node:test';
import assert from 'node:assert/strict';
import {shareSummary} from '../src/share-card.mjs';
test('share card never invents missing analytics',()=>{const p=shareSummary({source:'rpc',transactions:7645},'0x1111111111111111111111111111111111111111',8453);assert.equal(p.transactions,'7,645');assert.equal(p.score,'—');assert.equal(p.age,'—');});
test('share card identifies Sepolia',()=>{assert.equal(shareSummary({},'',84532).network,'Base Sepolia');});