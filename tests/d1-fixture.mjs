import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0000_rich_iron_fist.sql', import.meta.url), 'utf8'));
  const db = {
    sqlite,
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async run() { const result = sqlite.prepare(sql).run(...values); return {meta:{changes:Number(result.changes)}}; },
        async all() { return {results:sqlite.prepare(sql).all(...values)}; }
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.all()); sqlite.exec('COMMIT'); return results; }
      catch(error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  return db;
}
