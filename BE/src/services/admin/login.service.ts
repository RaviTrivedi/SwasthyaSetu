import { createLoginPatient } from '../patient/login.service.js';
import * as repository from '../../repositories/user.repository.js';
import { Role } from '../../constants/roles.js';

type Repository = { findUserByEmail(email: string): Promise<Awaited<ReturnType<typeof repository.findUserByEmail>>> };
export function createLoginAdmin(data: Repository = repository) {
  // Reuse credential verification, including dummy hashing and generic failures.
  return createLoginPatient({ async findUserByEmail(email) {
    const user = await data.findUserByEmail(email);
    return user?.role === Role.ADMIN && !user.disabledAt ? user : null;
  } });
}
export const loginAdmin = createLoginAdmin();
