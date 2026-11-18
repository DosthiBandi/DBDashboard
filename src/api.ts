import type {SupabaseClient} from '@supabase/supabase-js';

export const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
export type Role = 'owner' | 'manager' | 'staff';
export type Money = string | number;
export const paymentHolders=['Owner 1','Owner 2','Zelle','Bank'] as const;
export type PaymentHolder=typeof paymentHolders[number];
export const defaultPreparers=['Chef','Sh','A','Md'];
export type Sale = {id:string; business_date:string; cash_sales:Money; card_sales:Money; digital_cash_sales:Money; total_sales:Money; cash_in:Money; cash_out:Money; cash_out_holder:'Owner 1'|'Owner 2'|null; cash_at_box:Money|null; amount_due:Money; payment_holder:PaymentHolder|null; notes:string};
export type Expense = {id:string; expense_date:string; vendor:string; category:string; amount:Money; payment_method:string; notes:string; receipt_path:string|null};
export type Item = {meal_type:string; item_name:string; size:string; quantity:Money; unit_price:number; prepared_by:string};
export type Payment = {payment_date:string; amount:Money; method:string; payment_holder:PaymentHolder|null};
export type CateringOrder = {id:string; customer_name:string; phone:string; email:string|null; event_date:string; headcount:number; status:string; items:Item[]; payments:Payment[]; order_total:Money; paid_total:Money; balance:Money};

export async function request<T>(path:string, client?:SupabaseClient, options:RequestInit={}):Promise<T> {
  const headers = new Headers(options.headers);
  if (client) {
    const {data:{session},error} = await client.auth.getSession();
    if (error || !session) throw new Error('Your session has expired. Please sign in again.');
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  if (options.body) headers.set('Content-Type','application/json');
  let response:Response;
  try { response = await fetch(apiBase + path, {...options, headers, signal:options.signal ?? AbortSignal.timeout(20000)}); }
  catch(error) {
    if (options.signal?.aborted) throw error;
    throw new Error('Cannot reach the API. Check that the backend is running and CORS_ORIGINS includes this browser address.');
  }
  const body = await response.json().catch(()=>null);
  if (!response.ok) {
    const detail = body?.detail;
    throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e:{loc:string[];msg:string})=>`${e.loc.slice(1).join('.')}: ${e.msg}`).join('; ') : 'The request failed. Please try again.');
  }
  return body as T;
}

export async function allRecords<T>(path:string, client:SupabaseClient, signal:AbortSignal):Promise<T[]> {
  const result:T[]=[];
  for (let offset=0;;offset+=500) {
    const page=await request<T[]>(`${path}${path.includes('?')?'&':'?'}offset=${offset}&limit=500`,client,{signal});
    result.push(...page);
    if (page.length<500) return result;
  }
}
export const money=(value:Money)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
export const cents=(value:Money)=>Math.round(Number(value)*100);
export const sumMoney=(values:Money[])=>values.reduce<number>((total,value)=>total+cents(value),0)/100;
