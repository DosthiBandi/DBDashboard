import {useEffect,useState,type ReactNode} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {allRecords,money,sumMoney,type CateringOrder,type Sale} from './api';
import {formatRange,type DateRange} from './dateRanges';
import {CateringOrders} from './CateringOrders';
import {summarizeCateringOrders,summarizeHolderCollections} from './cateringSummary';

export function CateringDashboard({client,range,sales,salesLoading,salesError,salesSummary,salesInsights}:{client:SupabaseClient;range:DateRange;sales:Sale[];salesLoading:boolean;salesError:string;salesSummary?:ReactNode;salesInsights?:ReactNode}){
  const [orders,setOrders]=useState<CateringOrder[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setOrders([]);
    const params=new URLSearchParams(range);
    allRecords<CateringOrder>(`/api/v1/catering?${params}`,client,controller.signal).then(next=>{
      if(!controller.signal.aborted)setOrders(next);
    }).catch(error=>{if(!controller.signal.aborted)setError(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[client,range.start,range.end,retry]);
  return <CateringDashboardContent orders={orders} range={range} loading={loading} error={error} sales={sales} salesLoading={salesLoading} salesError={salesError} salesSummary={salesSummary} salesInsights={salesInsights} onRetry={()=>setRetry(value=>value+1)}/>;
}

export function CateringDashboardContent({orders,range,loading,error,onRetry,sales=[],salesLoading=false,salesError='',salesSummary,salesInsights}:{orders:CateringOrder[];range:DateRange;loading:boolean;error:string;onRetry:()=>void;sales?:Sale[];salesLoading?:boolean;salesError?:string;salesSummary?:ReactNode;salesInsights?:ReactNode}){
  const ready=!loading&&!error;
  const totals=summarizeCateringOrders(orders);
  const dailyReady=!salesLoading&&!salesError;
  const holders=summarizeHolderCollections(orders,dailyReady?sales:[]);
  const dailyCash=sumMoney(sales.map(sale=>sale.cash_sales)),cashOut=sumMoney(sales.map(sale=>sale.cash_out));
  const cards=[['Order total',totals.orderTotal],['Amount paid',totals.paid],['Amount due',totals.due],['Cash received',totals.cash],['Zelle received',totals.zelle],['Bank received',totals.bank],['Card / other received',totals.other]] as const;
  return <><div className={salesSummary?'dashboard-summary-grid':'dashboard-summary-single'}>{salesSummary}<section className="panel dashboard-catering" aria-labelledby="dashboard-catering-title">
    <div className="panel-heading"><div><h2 id="dashboard-catering-title">Catering</h2><p>Orders and payments · Event dates: {formatRange(range)}</p></div>{ready&&<strong className="catering-order-total">Order total: {money(totals.orderTotal)}</strong>}</div>

    <p className="catering-summary-note">Paid amounts include earlier deposits received for orders in this event-date range. Catering collections remain separate from daily sales to avoid double counting.</p>
    {loading&&<p className="catering-state" role="status">Loading catering orders…</p>}
    {error&&<div className="error-message" role="alert"><p>{error}</p><button onClick={onRetry}>Retry catering</button></div>}
    <div className="stats catering-stats">{(salesSummary?[['Orders',orders.length],['Amount paid',totals.paid],['Amount due',totals.due],['Cash received',totals.cash],['Zelle received · Digital Cash',totals.zelle],['Bank received',totals.bank],['Card / other received',totals.other]]:cards).map(([label,value])=><div className="stat" key={label}><span>{label}</span><strong>{ready?(label==='Orders'?String(value):money(value)):'—'}</strong></div>)}</div>
    </section></div>{salesInsights&&<div className="dashboard-secondary-grid">{salesInsights}</div>}
    {ready&&<section className="panel holder-breakdown dashboard-holder-section" aria-labelledby="catering-holder-title">
      <div className="panel-heading"><div><h3 id="catering-holder-title">Collections by holder</h3><p>Catering uses event dates; daily sales and cash out use business dates in the selected range. Transfers and current cash balances are not tracked here.</p></div></div>
      <p className="catering-summary-note">Daily cash is grouped by Payment held by; cash out is grouped by Cash out paid by. Sources are shown separately to avoid counting a catering payment twice if it is also in daily sales.</p>{salesLoading&&<p className="catering-state" role="status">Loading daily sales cash…</p>}{salesError&&<p className="error-message" role="alert">Daily sales cash and cash out are unavailable. Retry the daily sales request above.</p>}<div className="table-wrap"><table><thead><tr><th>Holder / account</th><th>Catering cash</th><th>Daily sales cash</th><th>Cash out</th><th>Catering Zelle</th><th>Catering bank</th><th>Catering card / other</th><th>Total catering received</th></tr></thead><tbody>{holders.map(row=><tr key={row.holder}><td data-label="Holder / account">{row.holder}</td><td data-label="Catering cash">{money(row.cash)}</td><td data-label="Daily sales cash">{dailyReady?money(row.dailyCash):'—'}</td><td data-label="Cash out">{dailyReady?money(row.cashOut):'—'}</td><td data-label="Catering Zelle">{money(row.zelle)}</td><td data-label="Catering bank">{money(row.bank)}</td><td data-label="Catering card / other">{money(row.other)}</td><td data-label="Total catering received">{money(row.total)}</td></tr>)}</tbody><tfoot><tr><td data-label="Holder / account">Total</td><td data-label="Catering cash">{money(totals.cash)}</td><td data-label="Daily sales cash">{dailyReady?money(dailyCash):'—'}</td><td data-label="Cash out">{dailyReady?money(cashOut):'—'}</td><td data-label="Catering Zelle">{money(totals.zelle)}</td><td data-label="Catering bank">{money(totals.bank)}</td><td data-label="Catering card / other">{money(totals.other)}</td><td data-label="Total catering received">{money(totals.paid)}</td></tr></tfoot></table></div>
    </section>}
    {ready&&<section className="panel dashboard-recent-orders"><div className="panel-heading"><div><h2>Recent Catering Orders</h2><p>Event dates: {formatRange(range)}</p></div><span>{orders.length} orders</span></div>{orders.length?<CateringOrders orders={orders} query=""/>:<p className="empty">No catering orders for the selected event dates.</p>}</section>}
  </>;
}
