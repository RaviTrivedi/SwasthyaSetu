import { hash } from '@node-rs/argon2';
import * as repository from '../../repositories/admin/account.repository.js';
import { adminProvisionConfig, ADMIN_PROVISION_MESSAGES } from '../../config/admin-provision.js';

type Repository = { [K in keyof typeof repository]: (...args: Parameters<(typeof repository)[K]>) => Promise<Awaited<ReturnType<(typeof repository)[K]>>> };
export function createProvisionAdmin(data: Repository = repository) {
  return async (source: NodeJS.ProcessEnv) => {
    const input = adminProvisionConfig(source);
    if (await data.findAccount(input.email)) throw new Error(ADMIN_PROVISION_MESSAGES.exists);
    const passwordHash = await hash(input.password, { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    try {
      await data.createAdmin({ firstName: input.firstName, email: input.email, passwordHash });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new Error(ADMIN_PROVISION_MESSAGES.exists);
      }
      throw new Error(ADMIN_PROVISION_MESSAGES.failed);
    }
  };
}
export const provisionAdmin = createProvisionAdmin();
