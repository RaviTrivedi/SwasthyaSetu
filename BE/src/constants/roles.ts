// Doctor represents a clinic/hospital member account, not a verified medical credential.
export const Role = { PATIENT: 'PATIENT', ADMIN: 'ADMIN', DOCTOR: 'DOCTOR' } as const;
export type Role = string;
