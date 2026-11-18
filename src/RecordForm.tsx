import {useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {X} from 'lucide-react';
import {businessToday} from './dateRanges';
import {request,paymentHolders,defaultPreparers,money,type CateringOrder,type Item} from './api';
export type RecordKind='sale'|'expense'|'catering'|'payment';
const titles:Record<RecordKind,string>={sale:'New Daily Sale',expense:'New Expense',catering:'New Catering Order',payment:'Record Catering Payment'};

export function RecordForm({kind,client,orders,onClose,onSaved}:{kind:RecordKind;client:SupabaseClient;orders:CateringOrder[];onClose:()=>void;onSaved:()=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [items,setItems]=useState<Item[]>([{meal_type:'Other',item_name:'',size:'',quantity:1,unit_price:0,prepared_by:''}]);
  const [dirty,setDirty]=useState(false);
  const [cashOut,setCashOut]=useState('0');
  function close(){if(!busy&&(!dirty||window.confirm('Discard this unsaved record?')))onClose();}
  function field(label:string,name:string,type='text',required=true,defaultValue?:string) {
    return <label key={name}>{label}<input name={name} type={type} required={required} defaultValue={defaultValue} onChange={name==='cash_out'?event=>setCashOut(event.target.value):undefined} min={type==='number'?'0':undefined} step={type==='number'?'0.01':undefined}/></label>;
  }
  function itemField(index:number,key:keyof Item,label:string,type='text') {
    return <label key={key}>{label}<input type={type} required={key==='item_name'||key==='meal_type'||type==='number'} min={key==='quantity'?'0.01':type==='number'?'0':undefined} step={key==='unit_price'?'1':type==='number'?'0.01':undefined} max={key==='unit_price'?2147483647:undefined} value={items[index][key]} onChange={event=>setItems(old=>old.map((item,i)=>i===index?{...item,[key]:key==='unit_price'?Number(event.target.value):event.target.value}:item))}/></label>;
  }
  const preparers=Array.from(new Set([...defaultPreparers,...orders.flatMap(order=>order.items.map(item=>item.prepared_by)).filter(Boolean)]));
  const holderField=<label>Payment held by<select name="payment_holder" required defaultValue=""><option value="" disabled>Select holder or account</option>{paymentHolders.map(holder=><option key={holder}>{holder}</option>)}</select></label>;
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    const values=Object.fromEntries(new FormData(event.currentTarget));
    let path='',payload:unknown;
    if(kind==='sale'){
      path='/api/v1/daily-sales';
      payload={...values,cash_out_holder:values.cash_out_holder||null,cash_at_box:values.cash_at_box||null,open_orders:values.open_orders||null,closed_orders:values.closed_orders||null};
    }else if(kind==='expense'){path='/api/v1/expenses';payload=values;}
    else if(kind==='catering'){path='/api/v1/catering';payload={...values,email:values.email||null,items};}
    else {path=`/api/v1/catering/${encodeURIComponent(String(values.order_id))}/payments`;const {order_id,...payment}=values;payload=payment;}
    setBusy(true);setError('');
    try{await request(path,client,{method:'POST',body:JSON.stringify(payload)});onSaved();}
    catch(e){setError(e instanceof Error?e.message:'Could not save this record.');setBusy(false);}
  }
  return <div className="overlay"><section className="drawer" role="dialog" aria-modal="true" aria-labelledby="record-title"><div className="drawer-head"><h2 id="record-title">{titles[kind]}</h2><button aria-label="Close form" disabled={busy} onClick={close}><X/></button></div>
    <p>This saves a record to the configured database. Cash movements and customer dues do not increase sales revenue.</p>
    <form onSubmit={save} onChange={()=>setDirty(true)}><fieldset disabled={busy}>
      {kind==='sale'&&<>
        {field('Business date','business_date','date',true,businessToday())}{holderField}<p>This holder applies to the daily record. Split ownership of individual payments is not tracked here.</p>
        {field('Cash sales ($)','cash_sales','number',true,'0')}{field('Card sales ($)','card_sales','number',true,'0')}{field('Digital cash sales ($)','digital_cash_sales','number',true,'0')}
        {field('Other cash in ($)','cash_in','number',true,'0')}{field('Cash out ($)','cash_out','number',true,'0')}{field('Counted cash at box ($)','cash_at_box','number',false)}
        <label>Cash out paid by<select name="cash_out_holder" required={Number(cashOut)>0} defaultValue=""><option value="">Select payer</option><option>Owner 1</option><option>Owner 2</option></select></label>
        {field('Customer amount due ($)','amount_due','number',true,'0')}{field('Open orders','open_orders','number',false)}{field('Closed orders','closed_orders','number',false)}
      </>}
      {kind==='expense'&&<>
        {field('Expense date','expense_date','date',true,businessToday())}{field('Vendor','vendor')}{field('Category','category','text',true,'Groceries')}{field('Amount ($)','amount','number')}
        <label>Payment method<select name="payment_method" required><option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Other</option></select></label>
        <p>Receipt uploads are not available yet. Cash expenses are not automatically posted as cash-out movements.</p>
      </>}
      {kind==='catering'&&<>
        {field('Customer name','customer_name')}{field('Phone','phone','tel')}{field('Email','email','email',false)}{field('Event date','event_date','date',true,businessToday())}{field('Guest count','headcount','number')}
        {items.map((_item,index)=><div className="item-fields" key={index}><strong>Item {index+1}</strong>{itemField(index,'meal_type','Meal type')}{itemField(index,'item_name','Item name')}{itemField(index,'size','Size')}{itemField(index,'quantity','Quantity','number')}{itemField(index,'unit_price','Price ($ per unit, whole dollars)','number')}<label>Prepared by<select required value={items[index].prepared_by} onChange={event=>setItems(old=>old.map((item,i)=>i===index?{...item,prepared_by:event.target.value}:item))}><option value="" disabled>Select preparer</option>{preparers.map(person=><option key={person}>{person}</option>)}</select></label><span>Item total: {money(Number(items[index].quantity)*items[index].unit_price)}</span>{items.length>1&&<button type="button" onClick={()=>setItems(old=>old.filter((_,i)=>i!==index))}>Remove item</button>}</div>)}
        <button type="button" onClick={()=>{setItems(old=>[...old,{meal_type:'Other',item_name:'',size:'',quantity:1,unit_price:0,prepared_by:''}]);setDirty(true);}}>Add item</button>
        <p>Deposits and later payments can be recorded separately in Catering → Payments.</p>
      </>}
      {kind==='payment'&&<>
        <label>Catering order<select name="order_id" required defaultValue=""><option value="" disabled>Select an order</option>{orders.filter(order=>Number(order.balance)>0).map(order=><option key={order.id} value={order.id}>{order.customer_name} · {order.event_date}</option>)}</select></label>
        {field('Payment date','payment_date','date',true,businessToday())}{field('Amount ($)','amount','number')}
        {holderField}<label>Payment method<select name="method" required><option>Cash</option><option>Card</option><option>Zelle</option><option>Bank Transfer</option><option>Other</option></select></label>
      </>}
      {(kind==='sale'||kind==='expense')&&<label>Notes<textarea name="notes" rows={4}/></label>}
    </fieldset>{error&&<p className="error-message" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Saving…':'Save record'}</button><button type="button" disabled={busy} onClick={close}>Cancel</button></form>
  </section></div>;
}
