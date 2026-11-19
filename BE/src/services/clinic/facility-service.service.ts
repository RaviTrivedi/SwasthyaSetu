import { accessOwnedServices, type ServiceOperation } from '../../repositories/facility-service.repository.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES as messages } from '../../constants/messages.js';
export function createFacilityServices(access = accessOwnedServices) {
  return async (userId: string, operation: ServiceOperation) => {
    try {
      const result = await access(userId, operation);
      switch (result.outcome) {
        case 'multiple': throw new HttpError(409, messages.MULTIPLE_FACILITIES);
        case 'missing': throw new HttpError(404, messages.FACILITY_PROFILE_NOT_FOUND);
        case 'serviceMissing': throw new HttpError(404, messages.FACILITY_SERVICE_NOT_FOUND);
        case 'limit': throw new HttpError(409, messages.FACILITY_SERVICE_LIMIT);
        default: return result;
      }
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') throw new HttpError(409, messages.PROFILE_UPDATE_CONFLICT);
      throw error;
    }
  };
}
export const facilityServices = createFacilityServices();
