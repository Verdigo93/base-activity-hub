import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBaseScore} from '../src/score-widget.mjs';
const now=Date.parse('2026-11-16T10:00:00Z');
test('score uses capped five-category weights and never invents rank',()=>{
  const s=calculateBaseScore({source:'etherscan',transactions:200,daysOnBase:400,uniqueContracts:40,totalGasWei:'100000000000000000',
    activityDays:Array.from({length:12},(_,i)=>({day:new Date(now-i*86400000).toISOString().slice(0,10),count:1}))},now);
  assert.equal(s.score,100); assert.equal(s.breakdown.reduce((a,b)=>a+b.max,0),100);assert.equal(s.partial,false);
});
test('with missing explorer history overall score is unavailable',()=>{
  const s=calculateBaseScore({source:'rpc',transactions:100,daysOnBase:null,activityDays:[]},now);
  assert.equal(s.score,null);assert.equal(s.availableCategories,1); assert.equal(s.breakdown[1].points,null);
});
test('partial sampled history is flagged',()=>{
  const s=calculateBaseScore({source:'etherscan',transactions:10,daysOnBase:2,uniqueContracts:3,sampleGasWei:'200000000000000',historyPartial:true,
    activityDays:[{day:'2026-11-16',count:2},{day:'2026-10-01',count:200}]},now);
  assert.equal(s.partial,true);assert.ok(s.score!==null);assert.equal(s.breakdown[3].value,1);
});
