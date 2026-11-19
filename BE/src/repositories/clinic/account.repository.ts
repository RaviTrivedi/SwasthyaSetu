import { accountCredentials } from '../user.repository.js';
import { getDatabase } from '../../config/database.js';
import { Role } from '../../constants/roles.js';
export { findUserByEmail } from '../user.repository.js';

// Database triggers enforce unique email across Patient, Admin and Doctor.
export async function createUser(input: { firstName: string; email: string; passwordHash: string }) {
  const user = await getDatabase().doctor.create({ data: {
    firstName: input.firstName, email: input.email.trim().toLowerCase(), passwordHash: input.passwordHash,
    role: { connect: { name: Role.DOCTOR } },
  }, include: { role: true } });
  return accountCredentials(user);
}
