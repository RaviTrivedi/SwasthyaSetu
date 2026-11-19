import { createPasswordReset } from '../patient/password-reset.service.js';
import * as repository from '../../repositories/password-reset.repository.js';

// Scope both email lookup and token consumption to this account table.
export function createDoctorPasswordReset(data = repository, deliver?: Parameters<typeof createPasswordReset>[1], requireDelivery?: Parameters<typeof createPasswordReset>[2]) {
 return createPasswordReset({
  findResetUser: email => data.findResetUser(email, 'doctor'),
  createResetToken: input => data.createResetToken(input, 'doctor'),
  revokeResetToken: tokenHash => data.revokeResetToken(tokenHash, 'doctor'),
  consumeResetToken: (tokenHash, passwordHash) => data.consumeResetToken(tokenHash, passwordHash, 'doctor'),
 }, deliver, requireDelivery);
}
export const doctorPasswordReset = createDoctorPasswordReset();
