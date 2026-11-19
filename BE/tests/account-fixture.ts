import { getDatabase } from '../src/config/database.js';
export function createAccountFixture(input: { id: string; firstName: string; email: string; passwordHash: string; role?: { connect: { name: string } } }) {
 const db = getDatabase();
 const data = { ...input, role: input.role ?? { connect: { name: 'PATIENT' } } };
 if (data.role.connect.name === 'ADMIN') return db.admin.create({ data });
 if (data.role.connect.name === 'DOCTOR') return db.doctor.create({ data });
 return db.patient.create({ data });
}
