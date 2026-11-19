import { accessOwnedSchedule, type ScheduleOperation } from '../../repositories/opening-hours.repository.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';
export function createOpeningHours(access = accessOwnedSchedule) {
  return async (userId: string, operation: ScheduleOperation) => {
    try { return await access(userId, operation); }
    catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') throw new HttpError(409, API_ERROR_MESSAGES.SCHEDULE_CONFLICT);
      throw error;
    }
  };
}
export const openingHours = createOpeningHours();
