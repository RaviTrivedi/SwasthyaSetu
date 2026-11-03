// Names used by current authorization rules. Additional roles can be database rows;
// adding a row does not grant access to any existing privileged endpoint.
export const Role = { PATIENT: 'PATIENT', ADMIN: 'ADMIN', DOCTOR: 'DOCTOR', STAFF: 'STAFF' } as const;
export type Role = string;


