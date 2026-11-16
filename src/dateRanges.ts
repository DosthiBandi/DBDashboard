/** Inclusive restaurant-local calendar date ranges; week starts Monday. */
export type DatePreset='today'|'yesterday'|'thisWeek'|'lastWeek'|'thisMonth'|'lastMonth'|'60days'|'90days'|'custom';
export type DateRange={start:string;end:string};
const pad=(n:number)=>String(n).padStart(2,'0');
const parse=(s:string)=>{const [y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12));};
const formatISO=(d:Date)=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const offset=(s:string,n:number)=>{const d=parse(s);d.setUTCDate(d.getUTCDate()+n);return formatISO(d);};
export function businessToday(now=new Date()):string {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=(key:string)=>parts.find(p=>p.type===key)?.value??'';
 return `${get('year')}-${get('month')}-${get('day')}`;
}
export function presetRange(preset:DatePreset,today=businessToday()):DateRange {
 const monday=offset(today,-((parse(today).getUTCDay()+6)%7));
 const first=today.slice(0,7)+'-01',prevEnd=offset(first,-1);
 switch(preset){
 case 'today':return {start:today,end:today};
 case 'yesterday':{const d=offset(today,-1);return{start:d,end:d};}
 case 'thisWeek':return{start:monday,end:today};
 case 'lastWeek':return{start:offset(monday,-7),end:offset(monday,-1)};
 case 'thisMonth':return{start:first,end:today};
 case 'lastMonth':return{start:prevEnd.slice(0,7)+'-01',end:prevEnd};
 case '60days':return{start:offset(today,-59),end:today};
 case '90days':return{start:offset(today,-89),end:today};
 case 'custom':return{start:today,end:today};
 }
}
export function dateInRange(day:string,range:DateRange){return day>=range.start&&day<=range.end;}
export function formatRange(range:DateRange){
 const date=(s:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(parse(s));
 return range.start===range.end?date(range.start):date(range.start)+' – '+date(range.end);
}
