import { getDatabase } from '../src/config/database.js';
export function createAccountFixture(input: { id: string; firstName: string; email: string; passwordHash: string; role?: { connect: { name: string } } }) {
 return getDatabase().user.create({ data: { ...input, role: input.role ?? { connect: { name: 'PATIENT' } } } });
}
