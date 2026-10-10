import assert from 'node:assert/strict';
import {BudgetLedger, budgetDay} from '../worker/budget.mjs';
import {database} from './d1-fixture.mjs';
const db = database(), ledger = new BudgetLedger(db);
const before = Date.parse('2026-10-10T15:59:59Z'), after = before + 2000;
assert.equal(budgetDay(before), '2026-10-10');
assert.equal(budgetDay(after), '2026-10-11');
// Concurrency, including two identical IDs in the same millisecond: one dispatch.
const duplicate = await Promise.all([ledger.reserve('same','a',500000,before), ledger.reserve('same','a',500000,before)]);
assert.equal(duplicate.filter(r=>r.allowed).length, 1);
assert.equal((await ledger.reserve('same','different',500000,before)).reason, 'conflict');
const races = await Promise.all(Array.from({length:20},(_,i)=>ledger.reserve('race'+i,'b',500000,before)));
assert.equal(races.filter(r=>r.allowed).length, 1);
assert.equal((await ledger.reserve('new-day','c',1,after)).allowed, false, 'pending old day still consumes budget');
await ledger.settle('same',250000,{answer:'test'},after);
assert.equal((await ledger.reserve('fits','c',250000,after)).allowed, true);
assert.equal((await ledger.reserve('over','c',1,after)).allowed, false);
await ledger.uncertain('fits');
assert.equal((await new BudgetLedger(db).reserve('restart','d',1,after)).allowed, false);
await assert.rejects(ledger.settle('fits',250001,{},after));
assert.equal((await ledger.reserve('same','a',500000,after)).row.result, '{"answer":"test"}');
// Settlement across midnight is conservatively counted on both accounting days.
const cross = database(), other = new BudgetLedger(cross);
await other.reserve('x','a',500000,before); await other.settle('x',400000,{},after);
assert.equal((await other.reserve('a','a',700000,before)).allowed, false);
assert.equal((await other.reserve('b','b',700000,after)).allowed, false);
assert.equal((await other.reserve('c','c',700000,after+86400000)).allowed, true);
console.log('budget: concurrent reservations, duplicate IDs, UTC+8 rollover, restart, unknown cost, replay passed');
