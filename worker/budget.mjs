// All amounts are integer micro-US dollars. D1 executes each reservation atomically.
// Unknown/in-flight costs remain reserved across midnight and Worker restarts.
export const DAILY_LIMIT = 1_000_000;
export function budgetDay(now = Date.now()) {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 10);
}
export class BudgetLedger {
  constructor(db) { this.db = db; }
  async reserve(id, fingerprint, amount, now = Date.now()) {
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > DAILY_LIMIT) throw new Error('Invalid reservation');
    const day = budgetDay(now);
    const inserted = await this.db.prepare(`INSERT OR IGNORE INTO usage_ledger
      (id, fingerprint, start_day, reserved, state, created_at)
      SELECT ?, ?, ?, ?, 'pending', ? WHERE
      COALESCE((SELECT SUM(CASE WHEN cost IS NULL THEN reserved
        WHEN start_day = ? OR end_day = ? THEN cost ELSE 0 END) FROM usage_ledger), 0) + ? <= ?`)
      .bind(id, fingerprint, day, amount, now, day, day, amount, DAILY_LIMIT).run();
    const row = await this.db.prepare('SELECT * FROM usage_ledger WHERE id = ?').bind(id).first();
    if (!row) return {allowed:false, reason:'budget'};
    if (row.fingerprint !== fingerprint) return {allowed:false, reason:'conflict'};
    return {allowed:inserted.meta.changes === 1, row};
  }
  async settle(id, cost, result, now = Date.now()) {
    if (!Number.isSafeInteger(cost) || cost < 0) throw new Error('Invalid settled cost');
    // Never release an unverified or unexpectedly large charge.
    const update = await this.db.prepare(`UPDATE usage_ledger SET cost = ?, end_day = ?, state = 'done', result = ?
      WHERE id = ? AND cost IS NULL AND ? <= reserved`)
      .bind(cost, budgetDay(now), JSON.stringify(result), id, cost).run();
    if (!update.meta.changes) throw new Error('Unable to settle reservation');
  }
  async uncertain(id) {
    await this.db.prepare("UPDATE usage_ledger SET state = 'uncertain' WHERE id = ? AND cost IS NULL").bind(id).run();
  }
}
