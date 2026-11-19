import { getDatabase } from '../config/database.js';
import { ownedApplication, serviceSelect } from './facility-profile.repository.js';
export type ServiceOperation = { kind: 'list' } | { kind: 'create'; name: string } | { kind: 'update'; id: string; name: string } | { kind: 'delete'; id: string };

export async function accessOwnedServices(userId: string, operation: ServiceOperation) {
  return getDatabase().$transaction(async tx => {
    const ownership = ownedApplication(userId, true);
    const applications = await tx.facilityApplication.findMany({ where: ownership, take: 2, select: { facility: { select: { id: true } } } });
    if (applications.length > 1) return { outcome: 'multiple' } as const;
    const facility = applications[0]?.facility;
    if (!facility) return { outcome: 'missing' } as const;
    const where = { facilityId: facility.id, facility: { application: ownership } };
    if (operation.kind === 'list') {
      const services = await tx.facilityService.findMany({ where, select: serviceSelect, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
      return { outcome: 'listed', services } as const;
    }
    // All profile/service writes touch this row, serializing changes to the list and its limits.
    const changed = await tx.facility.updateMany({ where: { id: facility.id, application: ownership }, data: { updatedAt: new Date() } });
    if (!changed.count) return { outcome: 'missing' } as const;
    if (operation.kind === 'create') {
      const rows = await tx.facilityService.findMany({ where, select: { position: true } });
      if (rows.length >= 50) return { outcome: 'limit' } as const;
      const service = await tx.facilityService.create({ data: { facilityId: facility.id, name: operation.name, position: Math.max(-1, ...rows.map(row => row.position)) + 1 }, select: serviceSelect });
      return { outcome: 'saved', service } as const;
    }
    const scoped = { ...where, id: operation.id };
    if (operation.kind === 'delete') {
      const result = await tx.facilityService.deleteMany({ where: scoped });
      return { outcome: result.count ? 'deleted' : 'serviceMissing' } as const;
    }
    const result = await tx.facilityService.updateMany({ where: scoped, data: { name: operation.name } });
    if (!result.count) return { outcome: 'serviceMissing' } as const;
    const service = await tx.facilityService.findFirstOrThrow({ where: scoped, select: serviceSelect });
    return { outcome: 'saved', service } as const;
  }, { isolationLevel: 'Serializable' });
}
