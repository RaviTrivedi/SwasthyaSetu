'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useSession} from '../auth/use-session';
import {bookingApi,BookingApiError,displaySlot,facilityToday,type PublicFacility,type Availability,type Booking} from './api';
import styles from './PatientBooking.module.css';

function DaySlots({facility,date,initialSlot,booking,onBusy}:{facility:PublicFacility;date:string;initialSlot:string;booking:boolean;onBusy:(busy:boolean)=>void}){
 const session=useSession();
 const [data,setData]=useState<Availability|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[attempt,setAttempt]=useState(0),[selected,setSelected]=useState(initialSlot),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState<Booking|null>(null),[uncertain,setUncertain]=useState(false),[needsLogin,setNeedsLogin]=useState(false);
 const lock=useRef(false);
 useEffect(()=>{let active=true;bookingApi.availability(facility.id,date).then(value=>{if(active)setData(value);}).catch(error=>{if(active)setError(error.message??'Unable to load availability.');});return()=>{active=false;};},[facility.id,date,attempt]);
 const slot=data?.slots.find(item=>item.id===selected&&!item.booked);
 const destination=`/appointments/new?${new URLSearchParams({facilityId:facility.id,date,...(selected?{slotId:selected}:{})})}`;
 const login=`/sign-in?role=PATIENT&returnTo=${encodeURIComponent(destination)}`;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current||!slot||uncertain)return;
  const note=String(new FormData(event.currentTarget).get('appointmentNote')??'');
  lock.current=true;setBusy(true);onBusy(true);setNotice('');
  try {setConfirmed(await bookingApi.book(slot.id,note));}
  catch(error){
   if(error instanceof BookingApiError&&error.status===409){setSelected('');setNotice('That slot was just taken or is no longer available. Choose another time from the refreshed list.');setData(null);setError('');setAttempt(value=>value+1);}
   else if(error instanceof BookingApiError&&error.status===401){setNeedsLogin(true);setNotice(error.message);}
   else if(error instanceof BookingApiError&&[400,403,404].includes(error.status))setNotice(error.message);
   else {setUncertain(true);setNotice('We could not verify the booking result. Do not submit again: contact the facility to confirm whether it was booked.');}
  }finally{lock.current=false;setBusy(false);onBusy(false);}
 }
 if(confirmed)return <section className={styles.panel} role="status"><h2>Appointment booked</h2><p>Confirmation: {confirmed.id}</p><p>Status: {confirmed.status}</p><p>{confirmed.facility.facilityName} · {confirmed.facility.address}, {confirmed.facility.city}</p><p>{displaySlot(confirmed.slot.startsAt,confirmed.facility.timezone??'UTC')} – {displaySlot(confirmed.slot.endsAt,confirmed.facility.timezone??'UTC')}</p><p>Timezone: {confirmed.facility.timezone??'UTC'}</p><p>Keep this confirmation number for your visit.</p></section>;
 return <><h2>Appointment times</h2><p>{date} · {facility.timezone??'Timezone not configured'} · 30-minute appointments</p>
  {notice&&<p role="alert">{notice}</p>}
  {error?<div role="alert"><p>{error}</p><button onClick={()=>{setError('');setData(null);setAttempt(value=>value+1);}}>Retry availability</button></div>:!data?<p role="status">Loading available times...</p>:<>
   {!data.slots.some(item=>!item.booked)&&<p>No available appointments on this date. Choose another date.</p>}
   <div className={styles.slots}>{data.slots.map(item=>booking?<button type="button" disabled={item.booked||busy||uncertain} aria-pressed={selected===item.id} key={item.id} onClick={()=>{setSelected(item.id);setNotice('');}}>{displaySlot(item.startsAt,data.timezone??'UTC')} {item.booked?'— Booked':''}</button>:item.booked?<span key={item.id}>{displaySlot(item.startsAt,data.timezone??'UTC')} — Booked</span>:<Link className={styles.link} key={item.id} href={`/appointments/new?${new URLSearchParams({facilityId:facility.id,date,slotId:item.id})}`}>{displaySlot(item.startsAt,data.timezone??'UTC')} — Select</Link>)}</div>
   {booking&&selected&&!slot&&!busy&&<p>The selected time is no longer available. Choose another slot.</p>}
   {booking&&slot&&<section className={styles.panel}><h3>Selected appointment</h3><p>{facility.facilityName} · {facility.address}, {facility.city}</p><p>{displaySlot(slot.startsAt,data.timezone??'UTC')} – {displaySlot(slot.endsAt,data.timezone??'UTC')}</p>
    {needsLogin||session.user===null?<Link className={styles.link} href={login}>Sign in as Patient to book</Link>:session.user?.role!=='PATIENT'?<p>Sign in with a Patient account to book this appointment.</p>:<form onSubmit={submit}><label>Appointment note (optional)<textarea name="appointmentNote" maxLength={2000} disabled={busy||uncertain}/></label><p>Availability is confirmed by the server when you submit.</p><button disabled={busy||uncertain} type="submit">{busy?'Booking...':'Confirm booking'}</button></form>}
   </section>}
  </>}
 </>;
}
function LoadedFacility({facility,initialDate,initialSlot,booking}:{facility:PublicFacility;initialDate:string;initialSlot:string;booking:boolean}){
 const [bookingBusy,setBookingBusy]=useState(false);
 const today=facilityToday(facility.timezone??'UTC');const valid=/^\d{4}-\d{2}-\d{2}$/.test(initialDate)&&Number.isFinite(Date.parse(initialDate));
 const [date,setDate]=useState(valid&&initialDate>=today?initialDate:today);
 const max=new Date(Date.parse(today)+365*86400000).toISOString().slice(0,10);
 return <section className={styles.panel}><Link href="/search">Back to facilities</Link><h1>{facility.facilityName}</h1><p>{facility.facilityType} · {facility.address}, {facility.city}</p><p>{facility.description}</p><h2>Services</h2>{facility.services.length?<ul className={styles.list}>{facility.services.map((name,index)=><li key={index}>{name}</li>)}</ul>:<p>No services listed.</p>}
  {!facility.timezone?<p>Online availability has not been configured for this facility.</p>:<><label>Select date ({facility.timezone})<input type="date" required disabled={bookingBusy} min={today} max={max} value={date} onChange={event=>setDate(event.target.value)}/></label>{date&&<DaySlots key={date} facility={facility} date={date} initialSlot={date===initialDate?initialSlot:''} booking={booking} onBusy={setBookingBusy}/>}</>}
 </section>;
}
export default function BookingFlow({facilityId,initialDate='',initialSlot='',booking=false}:{facilityId:string;initialDate?:string;initialSlot?:string;booking?:boolean}){
 const [facility,setFacility]=useState<PublicFacility|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!facilityId)return;let active=true;bookingApi.facility(facilityId).then(value=>{if(active)setFacility(value);}).catch(error=>{if(active)setError(error.message??'Unable to load facility.');});return()=>{active=false;};},[facilityId,attempt]);
 if(!facilityId)return <section className={styles.panel}><h1>Choose a clinic or hospital</h1><Link href="/search">Browse facilities</Link></section>;
 if(error)return <section className={styles.panel} role="alert"><p>{error}</p><button onClick={()=>{setError('');setAttempt(value=>value+1);}}>Retry</button><Link href="/search">Find another facility</Link></section>;
 if(!facility)return <p role="status">Loading facility...</p>;
 return <LoadedFacility facility={facility} initialDate={initialDate} initialSlot={initialSlot} booking={booking}/>;
}
