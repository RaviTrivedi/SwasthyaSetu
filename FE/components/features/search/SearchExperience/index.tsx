'use client';
import Link from 'next/link';
import {useEffect,useState,type FormEvent} from 'react';
import {useSearchParams} from 'next/navigation';
import {bookingApi} from '../../appointments/api';
import styles from '../../appointments/PatientBooking.module.css';
function Results({query,onPage}:{query:string;onPage:(page:number)=>void}){
 const [data,setData]=useState<Awaited<ReturnType<typeof bookingApi.list>>|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;bookingApi.list(query).then(value=>{if(active)setData(value);}).catch(error=>{if(active)setError(error.message??'Unable to load facilities.');});return()=>{active=false;};},[query,attempt]);
 if(error)return <div role="alert"><p>{error}</p><button onClick={()=>{setError('');setAttempt(value=>value+1);}}>Retry</button></div>;
 if(!data)return <p role="status">Loading clinics and hospitals...</p>;
 return <><p role="status">{data.total} facilities found</p><div className={styles.cards}>{data.items.map(item=><article className={styles.panel} key={item.id}><h2>{item.facilityName}</h2><p>{item.facilityType} · {item.address}, {item.city}</p><p>{item.description}</p><ul className={styles.list}>{item.services.map((name,i)=><li key={i}>{name}</li>)}</ul><Link className={styles.link} href={`/facilities/${item.id}`}>View facility and available times</Link></article>)}</div>{!data.items.length&&<p>No facilities match these filters.</p>}<nav className={styles.actions} aria-label="Facility result pages"><button disabled={data.page<=1} onClick={()=>onPage(data.page-1)}>Previous</button><span>Page {data.page} of {Math.max(1,Math.ceil(data.total/data.pageSize))}</span><button disabled={data.page>=100000||data.page*data.pageSize>=data.total} onClick={()=>onPage(data.page+1)}>Next</button></nav></>;
}
export default function SearchExperience(){
 const params=useSearchParams();const [query,setQuery]=useState(()=>new URLSearchParams({page:'1',pageSize:'20',...(params.get('query')?{query:params.get('query')!.slice(0,100)}:{})}).toString());
 function search(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget),next=new URLSearchParams({page:'1',pageSize:'20'});for(const key of ['query','city','facilityType']){const value=String(form.get(key)??'').trim();if(value)next.set(key,value);}setQuery(next.toString());}
 return <section className={styles.panel}><h1>Find a clinic or hospital</h1><form onSubmit={search} className={styles.actions}><label>Facility name<input name="query" maxLength={100} defaultValue={params.get('query')??''}/></label><label>City<input name="city" maxLength={100}/></label><label>Type<select name="facilityType"><option value="">All</option><option value="CLINIC">Clinic</option><option value="HOSPITAL">Hospital</option></select></label><button>Search</button></form><Results key={query} query={query} onPage={page=>{const next=new URLSearchParams(query);next.set('page',String(page));setQuery(next.toString());}}/></section>;
}
