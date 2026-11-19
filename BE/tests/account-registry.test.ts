import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { createUser, findUserByEmail } from '../src/repositories/user.repository.js';
import { createAdmin, findAccount } from '../src/repositories/admin/account.repository.js';
import { createUser as createDoctor } from '../src/repositories/clinic/account.repository.js';

test('account repositories choose separate tables, normalize emails and find duplicates across all types', async () => {
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
 const db = getDatabase(); const stored = new Map<string, any>(); const restore: (() => void)[] = [];
 for (const kind of ['patient','admin','doctor'] as const) {
  const delegate = db[kind]; const create = delegate.create; const find = delegate.findUnique;
  delegate.create = (async ({ data }: any) => {
   if (stored.has(data.email)) throw { code: 'P2002' };
   assert.equal(data.role.connect.name, kind.toUpperCase());
   const account = { ...data, kind, id: 'fixture', role: { name: data.role.connect.name } };
   stored.set(data.email, account); return account;
  }) as any;
  delegate.findUnique = (async ({ where }: any) => { const user = stored.get(where.email); return user?.kind === kind ? user : null; }) as any;
  restore.push(() => { delegate.create = create; delegate.findUnique = find; });
 }
 try {
  const input = { firstName: 'Fixture', email: ' SAME@EXAMPLE.INVALID ', passwordHash: 'hash-fixture' };
  for (const creator of [createUser, createAdmin, createDoctor]) {
   stored.clear(); await creator(input);
   assert.ok(await findAccount(input.email)); assert.ok(await findUserByEmail(input.email));
   for (const duplicate of [createUser, createAdmin, createDoctor]) await assert.rejects(duplicate(input), { code: 'P2002' });
   assert.deepEqual([...stored.keys()], ['same@example.invalid']);
  }
 } finally { restore.forEach(fn => fn()); await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});
