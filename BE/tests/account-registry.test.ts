import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { createUser, findUserByEmail } from '../src/repositories/user.repository.js';
import { createAdmin, findAccount } from '../src/repositories/admin/account.repository.js';

test('registration and admin provisioning use one normalized email registry and atomic nested credentials', async () => {
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
 const db = getDatabase(); const create = db.user.create; const find = db.user.findUnique;
 const stored = new Map<string, any>();
 db.user.create = (async ({ data }: any) => {
  if (stored.has(data.email)) throw { code: 'P2002' };
  const account = { ...data, id: 'fixture', role: { name: data.role.connect.name } };
  stored.set(data.email, account); return account;
 }) as typeof db.user.create;
 db.user.findUnique = (async ({ where }: any) => stored.get(where.email) ?? null) as typeof db.user.findUnique;
 try {
  const input = { firstName: 'Fixture', email: ' SAME@EXAMPLE.INVALID ', passwordHash: 'hash-fixture' };
  await createUser(input);
  assert.ok(await findAccount(input.email));
  await assert.rejects(createAdmin(input), { code: 'P2002' });
  assert.equal((await findUserByEmail(input.email))?.role, 'PATIENT');
  stored.clear(); await createAdmin(input);
  await assert.rejects(createUser(input), { code: 'P2002' });
  assert.equal((await findUserByEmail(input.email))?.role, 'ADMIN');
  assert.deepEqual([...stored.keys()], ['same@example.invalid']);
 } finally { db.user.create = create; db.user.findUnique = find; await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});

