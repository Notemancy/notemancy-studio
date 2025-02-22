// src/lib/server/db/schema.ts
import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const mdfiles = sqliteTable('mdfiles', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	localPath: text('local_path').notNull().unique(), // Now unique
	virtualPath: text('virtual_path').notNull(),
	mdcontent: text('mdcontent').notNull(),
	metadata: text('metadata').notNull() // storing JSON as a string
});

// New table for storing images.
export const mdimages = sqliteTable('mdimages', {
	localPath: text('local_path').notNull().unique(), // unique local path
	virtualPath: text('virtual_path').notNull(),
	imagedata: blob('imagedata').notNull() // store binary data
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
