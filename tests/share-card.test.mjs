import test from 'node:test';
import assert from 'node:assert/strict';
import {shareSummary,postText,xIntentUrl} from '../src/share-card.mjs';
test('share card never invents missing analytics',()=>{const p=shareSummary({source:'rpc',transactions:7645},'0x1111111111111111111111111111111111111111',8453);assert.equal(p.transactions,'7,645');assert.equal(p.score,'—');assert.equal(p.age,'—');});
test('share card is Base Mainnet only',()=>{assert.equal(shareSummary({},'',8453).network,'Base Mainnet');});
test('X composer prefilled with the preferred text and link',()=>{
 const sample={score:'81',transactions:'7,645',age:'1,155',recent:'4',partial:false};
 const text=postText(sample),url=new URL(xIntentUrl(sample));
 assert.equal(text.split('\n')[0],'I checked my Base wallet on Base Activity Hub.');
 assert.match(text,/81\/100 activity score/);assert.match(text,/7,645 transactions/);
 assert.match(text,/1,155 days on Base/);assert.match(text,/4 active days in the last 30 days/);
 assert.match(text,/https:\/\/base-activity-hub.onrender.com\//);
 assert.equal(url.origin,'https://x.com');assert.equal(url.pathname,'/intent/post');
 assert.equal(url.searchParams.get('text'),text);assert.ok(text.length<280);
});
test('missing metrics are never invented',()=>{
 const t=postText({score:'—',transactions:'—',age:'—',recent:'—'});
 assert.match(t,/Activity score: unavailable/);assert.doesNotMatch(t,/undefined/);
});
