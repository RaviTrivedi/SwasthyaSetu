import { createPasswordReset } from '../patient/password-reset.service.js';
import * as repository from '../../repositories/password-reset.repository.js';

// Scope both email lookup and token consumption to this account table.
export function createAdminPasswordReset(data = repository, deliver?: Parameters<typeof createPasswordReset>[1], requireDelivery?: Parameters<typeof createPasswordReset>[2]) {
 return createPasswordReset({
  findResetUser: email => data.findResetUser(email, 'admin'),
  createResetToken: input => data.createResetToken(input, 'admin'),
  revokeResetToken: tokenHash => data.revokeResetToken(tokenHash, 'admin'),
  consumeResetToken: (tokenHash, passwordHash) => data.consumeResetToken(tokenHash, passwordHash, 'admin'),
 }, deliver, requireDelivery);
}
export const adminPasswordReset = createAdminPasswordReset();
