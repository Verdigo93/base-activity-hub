import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTransferSample} from '../api/alchemy.mjs';
const wallet='0x1111111111111111111111111111111111111111',hash='0x'+'a'.repeat(64);
test('alchemy outgoing transfer dedupe and incomplete histories',()=>{const x={hash,from:wallet,to:'0x2222222222222222222222222222222222222222',metadata:{blockTimestamp:'2026-11-12T10:00:00.000Z'}};const p=summarizeTransferSample({recent:[x,x],earliest:[x],hasMore:true},wallet,7645,Date.parse('2026-11-16T10:00:00.000Z'));assert.equal(p.transactionsWindow,1);assert.equal(p.activeDays,1);assert.equal(p.historyPartial,true);assert.equal(p.totalGasWei,undefined);});