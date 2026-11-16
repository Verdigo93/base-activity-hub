import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseTheme} from '../src/theme.mjs';
test('user preference overrides OS mode',()=>{
 assert.equal(chooseTheme('dark',false),'dark');
 assert.equal(chooseTheme('light',true),'light');
});
test('no user preference follows OS mode',()=>{
 assert.equal(chooseTheme(null,true),'dark');
 assert.equal(chooseTheme(null,false),'light');
});