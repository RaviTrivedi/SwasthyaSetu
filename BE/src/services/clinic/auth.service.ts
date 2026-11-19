import { createRegisterPatient } from '../patient/register.service.js';
import { createLoginPatient } from '../patient/login.service.js';
import * as repository from '../../repositories/clinic/account.repository.js';
import { Role } from '../../constants/roles.js';

// Reuse registration validation, Argon2id hashing, duplicate handling and safe output.
// The clinic repository assigns DOCTOR; callers cannot choose their role.
export function createRegisterDoctor(data = repository) {
  return createRegisterPatient(data);
}
export function createLoginDoctor(data: Pick<typeof repository, 'findUserByEmail'> = repository) {
  return createLoginPatient({ async findUserByEmail(email) {
    const user = await data.findUserByEmail(email);
    return user?.role === Role.DOCTOR && !user.disabledAt ? user : null;
  } });
}
export const registerDoctor = createRegisterDoctor();
export const loginDoctor = createLoginDoctor();
