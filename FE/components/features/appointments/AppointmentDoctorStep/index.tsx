import BookingFlow from '../BookingFlow';
export default async function AppointmentDoctorStep({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;const facilityId=typeof params.facilityId==='string'?params.facilityId:'';
 return <BookingFlow key={facilityId} facilityId={facilityId} initialDate={typeof params.date==='string'?params.date:''} initialSlot={typeof params.slotId==='string'?params.slotId:''} booking/>;
}
