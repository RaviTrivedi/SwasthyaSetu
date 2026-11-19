import { getDatabase } from '../../config/database.js';
export async function doctorApplicationAccess(userId: string) {
  const applications = await getDatabase().facilityApplication.findMany({
    where: { applicantId: userId, applicantDoctorId: userId, applicantDoctor: { disabledAt: null, role: { name: 'DOCTOR' } } },
    select: { id: true, facilityName: true, status: true, facility: { select: { id: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const approved = applications.filter(application => application.status === 'APPROVED');
  return { approvedCount: approved.length, profileAvailable: approved.length === 1 && approved[0]!.facility !== null,
    applications: applications.map(({ id, facilityName, status }) => ({ id, facilityName, status })) };
}
