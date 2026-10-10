import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const usageLedger = sqliteTable('usage_ledger', {
  id:text('id').primaryKey(), fingerprint:text('fingerprint').notNull(),
  startDay:text('start_day').notNull(), endDay:text('end_day'),
  reserved:integer('reserved').notNull(), cost:integer('cost'),
  state:text('state').notNull(), result:text('result'), createdAt:integer('created_at').notNull(),
});
export const sessions = sqliteTable('family_sessions', {
  tokenHash:text('token_hash').primaryKey(), expiresAt:integer('expires_at').notNull(),
});
export const attempts = sqliteTable('login_attempts', {
  bucket:text('bucket').primaryKey(), count:integer('count').notNull(),
});
