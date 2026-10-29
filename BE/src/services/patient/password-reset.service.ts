import { createHash, randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { HttpError } from '../../errors/http-error.js';
import * as repository from '../../repositories/password-reset.repository.js';
import { deliverPasswordReset, requireResetDelivery } from '../password-reset-delivery.js';

type Repository = { [K in keyof typeof repository]: (...args: Parameters<typeof repository[K]>) => Promise<Awaited<ReturnType<typeof repository[K]>>> };
export const invalidResetMessage = 'Invalid or expired reset token';

export function createPasswordReset(
  data: Repository = repository,
  deliver = deliverPasswordReset,
  requireDelivery = requireResetDelivery,
) {
  return {
    async request(email: string): Promise<void> {
      requireDelivery();
      const user = await data.findResetUser(email.trim().toLowerCase());
      if (!user) return;
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 30 * 60000);
      const record = await data.createResetToken({ userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt });
      try { await deliver({ email: user.email, token, expiresAt }); }
      catch {
        // Same public result even if delivery fails; never log provider errors.
        await data.revokeResetToken(record.id).catch(() => undefined);
        console.warn(JSON.stringify({ event: 'password_reset_delivery_failed' }));
      }
    },
    async confirm(token: string, newPassword: string): Promise<void> {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      // Match registration's Argon2id parameters; never trim the password.
      const passwordHash = await hash(newPassword, { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 });
      if (!await data.consumeResetToken(tokenHash, passwordHash)) throw new HttpError(400, invalidResetMessage);
    },
  };
}
export const passwordReset = createPasswordReset();
export type PasswordReset = ReturnType<typeof createPasswordReset>;
