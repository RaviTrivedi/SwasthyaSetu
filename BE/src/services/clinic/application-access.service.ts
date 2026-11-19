import { doctorApplicationAccess } from '../../repositories/clinic/application-access.repository.js';
export const getDoctorApplicationAccess = (userId: string) => doctorApplicationAccess(userId);
