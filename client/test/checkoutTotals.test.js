import test from'node:test';import assert from'node:assert/strict';import{checkoutTotal}from'../src/utils/checkoutTotals.js';
test('checkout total applies discount before shipping',()=>assert.equal(checkoutTotal(1000,50,125),925));
test('discount cannot reduce merchandise below zero',()=>assert.equal(checkoutTotal(100,25,500),25));
test('currency total is rounded to two decimals',()=>assert.equal(checkoutTotal(10.005,2.005,1),11.01));
