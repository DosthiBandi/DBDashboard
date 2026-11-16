import {useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {businessToday,formatRange,presetRange,type DatePreset,type DateRange} from './dateRanges';
const choices:{value:DatePreset;label:string}[]=[
{value:'today',label:'Today'},{value:'yesterday',label:'Yesterday'},
{value:'thisWeek',label:'This Week'},{value:'lastWeek',label:'Last Week'},
{value:'thisMonth',label:'This Month'},{value:'lastMonth',label:'Last Month'},
{value:'60days',label:'Last 60 Days'},{value:'90days',label:'Last 90 Days'},
{value:'custom',label:'Custom Range…'}
];
export type DateSelection={preset:DatePreset;range:DateRange};
export function DateRangeFilter({value,onChange}:{value:DateSelection;onChange:(value:DateSelection)=>void}){
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState<DateRange>(value.range);
 const valid=Boolean(draft.start&&draft.end&&draft.start<=draft.end);
 function select(preset:DatePreset){
   if(preset==='custom'){setDraft(value.range);setEditing(true);return;}
   setEditing(false);
   onChange({preset,range:presetRange(preset,businessToday())});
 }
 return <div className="date-range-control">
   <label className="date-preset-label"><CalendarDays size={17} aria-hidden="true"/>
    <select aria-label="Dashboard date range" value={editing?'custom':value.preset} onChange={event=>select(event.target.value as DatePreset)}>
     {choices.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
    </select>
   </label>
   <span className="range-summary" aria-live="polite">{formatRange(value.range)}</span>
   {value.preset==='custom'&&!editing&&<button type="button" className="date-edit" onClick={()=>{setDraft(value.range);setEditing(true)}}>Edit range</button>}
   {editing&&<div className="date-custom-panel">
     <div className="date-custom-fields">
      <label>From<input type="date" aria-label="Custom range start" value={draft.start} onChange={e=>setDraft({...draft,start:e.target.value})}/></label>
      <label>To<input type="date" aria-label="Custom range end" value={draft.end} min={draft.start||undefined} onChange={e=>setDraft({...draft,end:e.target.value})}/></label>
     </div>
     {!valid&&<p role="alert" className="date-error">Start date must not be after end date.</p>}
     <div className="date-custom-actions">
      <button type="button" className="date-cancel" onClick={()=>setEditing(false)}>Cancel</button>
      <button type="button" className="date-apply" disabled={!valid} onClick={()=>{onChange({preset:'custom',range:draft});setEditing(false)}}>Apply range</button>
     </div>
   </div>}
 </div>;
}
