import * as repository from '../../repositories/admin/directory.repository.js';
export function createAdminDirectory(data: Pick<typeof repository, 'listDoctors' | 'listUsers' | 'listSlots'> = repository) {
  return { doctors: data.listDoctors, users: data.listUsers, slots: data.listSlots };
}
export const adminDirectory = createAdminDirectory();
