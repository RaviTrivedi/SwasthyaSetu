import { accessOwnedProfile, provisionOwnedProfile } from '../../repositories/facility-profile.repository.js';
import type { FacilityApplicationInput } from '../../validation/clinic/facility-application.schema.js';
import type { FacilityProfileInput } from '../../validation/clinic/facility-profile.schema.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';

export function createFacilityProfile(access = accessOwnedProfile) {
  return async (userId: string, input?: FacilityProfileInput) => {
    try {
      const result = await access(userId, input);
      if (result.outcome === 'multiple') throw new HttpError(409, API_ERROR_MESSAGES.MULTIPLE_FACILITIES);
      if (result.outcome === 'missing') throw new HttpError(404, API_ERROR_MESSAGES.FACILITY_PROFILE_NOT_FOUND);
      return result.profile;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') {
        throw new HttpError(409, API_ERROR_MESSAGES.PROFILE_UPDATE_CONFLICT);
      }
      throw error;
    }
  };
}
export const facilityProfile = createFacilityProfile();
export type FacilityProfile = typeof facilityProfile;

export function createProvisionFacilityProfile(provision = provisionOwnedProfile) {
  return async (userId: string, input: FacilityApplicationInput) => {
    try {
      const result = await provision(userId, input);
      if (result.outcome === 'multiple') throw new HttpError(409, API_ERROR_MESSAGES.MULTIPLE_FACILITIES);
      if (result.outcome === 'missing') throw new HttpError(404, API_ERROR_MESSAGES.FACILITY_PROFILE_NOT_FOUND);
      if (result.outcome === 'exists') throw new HttpError(409, API_ERROR_MESSAGES.FACILITY_PROFILE_EXISTS);
      return result.profile;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && ['P2002', 'P2034'].includes(String(error.code))) {
        throw new HttpError(409, API_ERROR_MESSAGES.PROFILE_UPDATE_CONFLICT);
      }
      throw error;
    }
  };
}
export const provisionFacilityProfile = createProvisionFacilityProfile();
