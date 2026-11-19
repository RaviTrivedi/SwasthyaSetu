import * as repository from '../../repositories/patient/marketplace.repository.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';
export function createMarketplace(data: Pick<typeof repository,'listFacilities'|'findFacility'|'facilityAvailability'> = repository) {
  return { list: data.listFacilities, detail: data.findFacility, async slots(id: string,date: string) {
    try { return await data.facilityAvailability(id,date); }
    catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') throw new HttpError(409,API_ERROR_MESSAGES.SCHEDULE_CONFLICT); throw error; }
  } };
}
export const marketplace = createMarketplace();
