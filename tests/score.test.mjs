import test from 'node:test';
import assert from 'node:assert/strict';
import {SCORE_RULES,BASE_PUBLIC_LAUNCH_MS,launchDays,calculateBaseScore} from '../src/score-widget.mjs';
const now=Date.parse('2026-11-16T10:00:00Z');
const activityDays=Array.from({length:21},(_,i)=>({day:new Date(now-i*86400000).toISOString().slice(0,10),count:1}));
test('all four categories are out of 100 and overall maximum is 100',()=>{
 const s=calculateBaseScore({source:'etherscan',transactions:3000,daysOnBase:launchDays(now),uniqueContracts:50,activityDays},now);
 assert.equal(s.score,100);
 assert.deepEqual(s.breakdown.map(r=>r.points),[100,100,100,100]);
 assert.deepEqual(SCORE_RULES.map(r=>r.weight),[30,25,25,20]);
 assert.deepEqual(SCORE_RULES.map(r=>r.max),[100,100,100,100]);
});
test('wallet age is benchmarked against public launch of Base Mainnet',()=>{
 assert.equal(BASE_PUBLIC_LAUNCH_MS,Date.parse('2023-08-09T00:00:00Z'));
 const s=calculateBaseScore({source:'alchemy',transactions:0,daysOnBase:launchDays(now),uniqueContracts:0,activityDays:[]},now);
 assert.equal(s.breakdown[1].points,100);assert.equal(s.score,25);
});
test('unavailable data is not fabricated',()=>{
 const s=calculateBaseScore({source:'rpc',transactions:100,daysOnBase:null,activityDays:[]},now);
 assert.equal(s.score,null);assert.equal(s.availableCategories,1);assert.equal(s.breakdown[1].points,null);
});
test('sampled active days count unique dates and are marked partial',()=>{
 const s=calculateBaseScore({source:'alchemy',historyPartial:true,transactions:1,daysOnBase:2,uniqueContracts:3,
  activityDays:[{day:'2026-11-16',count:2},{day:'2026-11-16',count:1},{day:'2026-10-01',count:10}]},now);
 assert.equal(s.partial,true);assert.equal(s.breakdown[3].value,1);
});
test('gas has no effect on score',()=>{
 const p={source:'alchemy',transactions:3000,daysOnBase:launchDays(now),uniqueContracts:50,activityDays};
 assert.equal(calculateBaseScore(p,now).score,calculateBaseScore({...p,totalGasWei:'10000000000000000000'},now).score);
});
