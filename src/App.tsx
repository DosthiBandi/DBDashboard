import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {DateRangeFilter,type DateSelection} from './DateRangeFilter';
import {businessToday,presetRange} from './dateRanges';
import {LayoutDashboard,ClipboardList,CalendarDays,ChartNoAxesCombined,Settings,Menu,Plus,Search} from 'lucide-react';
import {AuthGate} from './AuthGate';
import {allRecords,request,money,sumMoney,type Sale,type Expense,type CateringOrder,type Role} from './api';
import {RecordForm,type RecordKind} from './RecordForm';
import {CateringOrders,filterOrders} from './CateringOrders';
import {CateringDashboard} from './CateringDashboard';

type Section='Overview'|'Operations'|'Catering'|'Insights'|'Settings';
const sections:Section[]=['Overview','Operations','Catering','Insights','Settings'];
const icons=[LayoutDashboard,ClipboardList,CalendarDays,ChartNoAxesCombined,Settings];
const tabs:Record<Section,string[]>={Overview:['Dashboard','Daily Sales','Cash','Daily Close'],Operations:['Orders','Expenses','Inventory'],Catering:['Orders','Payments'],Insights:['Reports','P&L','Exports'],Settings:['Integrations','WhatsApp','Clover','Users']};
type Dataset={headers:string[];rows:string[][]};
const unavailable:Record<string,string>={Orders:'Clover orders are not connected yet.',Inventory:'Inventory records are not implemented yet.','Daily Close':'Daily closing and cash reconciliation are not implemented yet.',Reports:'Reporting is not implemented yet.','P&L':'P&L requires reconciled costs and is not available yet.',Exports:'Exports are not implemented yet.',Integrations:'The app uses the configured API database. Clover and WhatsApp integrations are not connected.',WhatsApp:'WhatsApp ingestion is not connected.',Clover:'Clover synchronization is not connected.',Users:'User management is not available in the app. An administrator must provision accounts.'};

export default function App(){return <AuthGate>{(client,session)=><Workspace key={session.user.id} client={client}/>}</AuthGate>;}
function Workspace({client}:{client:SupabaseClient}) {
  const [section,setSection]=useState<Section>('Overview'),[tab,setTab]=useState('Dashboard');
  const [drawer,setDrawer]=useState<RecordKind|null>(null),[menu,setMenu]=useState(false),[query,setQuery]=useState('');
  const [dateSelection,setDateSelection]=useState<DateSelection>(()=>({preset:'thisMonth',range:presetRange('thisMonth',businessToday())}));
  const [role,setRole]=useState<Role|null>(null),[roleError,setRoleError]=useState('');
  const [sales,setSales]=useState<Sale[]>([]),[expenses,setExpenses]=useState<Expense[]>([]),[orders,setOrders]=useState<CateringOrder[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[notice,setNotice]=useState('');
  const canWrite=role==='owner'||role==='manager';
  const needsSales=section==='Overview'&&['Dashboard','Daily Sales','Cash'].includes(tab);
  const needsExpenses=section==='Operations'&&tab==='Expenses';
  const needsCatering=section==='Catering';
  const restricted=(needsExpenses&&!canWrite)||(section==='Insights'&&role!=='owner')||(section==='Settings'&&role!=='owner');
  useEffect(()=>{
    const controller=new AbortController();setRoleError('');
    request<{role:Role}>('/api/v1/me',client,{signal:controller.signal}).then(me=>setRole(me.role)).catch(e=>{if(!controller.signal.aborted){setRoleError(e.message);setLoading(false);}});
    return ()=>controller.abort();
  },[client,revision]);
  useEffect(()=>{
    const controller=new AbortController();
    setSales([]);setExpenses([]);setOrders([]);setError('');
    if(!role)return ()=>controller.abort();
    if(restricted||!(needsSales||needsExpenses||needsCatering)){setLoading(false);return ()=>controller.abort();}
    setLoading(true);
    const range=new URLSearchParams(dateSelection.range).toString();
    const load=needsSales?allRecords<Sale>(`/api/v1/daily-sales?${range}`,client,controller.signal).then(setSales):needsExpenses?allRecords<Expense>(`/api/v1/expenses?${range}`,client,controller.signal).then(setExpenses):allRecords<CateringOrder>('/api/v1/catering',client,controller.signal).then(setOrders);
    load.catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[client,role,restricted,needsSales,needsExpenses,needsCatering,dateSelection.range.start,dateSelection.range.end,revision]);
  function go(next:Section){setSection(next);setTab(tabs[next][0]);setMenu(false);setQuery('');setNotice('');}
  async function signOut(){const {error}=await client.auth.signOut();if(error)setNotice('Sign-out failed. Please try again.');}
  const ready=!!role&&!loading&&!error&&!roleError;
  const totals={cash:sumMoney(sales.map(s=>s.cash_sales)),card:sumMoney(sales.map(s=>s.card_sales)),digital:sumMoney(sales.map(s=>s.digital_cash_sales)),sales:sumMoney(sales.map(s=>s.total_sales)),cashNet:sumMoney(sales.flatMap(s=>[s.cash_in,-Number(s.cash_out)]))};
  const cards=[['Total Sales',totals.sales],['Cash Sales',totals.cash],['Card Sales',totals.card],['Digital Cash Sales',totals.digital],['Cash In / Out (net)',totals.cashNet]] as const;
  let dataset:Dataset|undefined;
  if(needsSales&&tab==='Daily Sales')dataset={headers:['Date','Cash sales','Card sales','Digital sales','Total sales','Cash out','Cash out paid by','Due recorded','Payment held by','Notes'],rows:sales.map(s=>[s.business_date,money(s.cash_sales),money(s.card_sales),money(s.digital_cash_sales),money(s.total_sales),money(s.cash_out),s.cash_out_holder||'Not recorded',money(s.amount_due),s.payment_holder||'Not recorded',s.notes||'—'])};
  if(needsSales&&tab==='Cash')dataset={headers:['Date','Cash sales','Other cash in','Cash out','Cash out paid by','Counted cash at box','Notes'],rows:sales.map(s=>[s.business_date,money(s.cash_sales),money(s.cash_in),money(s.cash_out),s.cash_out_holder||'Not recorded',s.cash_at_box===null?'Not counted':money(s.cash_at_box),s.notes||'—'])};
  if(needsExpenses)dataset={headers:['Date','Vendor','Category','Method','Amount','Receipt','Notes'],rows:expenses.map(e=>[e.expense_date,e.vendor,e.category,e.payment_method,money(e.amount),e.receipt_path?'Recorded; preview unavailable':'No receipt',e.notes||'—'])};
  if(needsCatering&&tab==='Orders')dataset={headers:['Customer','Event date','Guests','Order total','Paid','Balance','Status'],rows:orders.map(o=>[o.customer_name,o.event_date,String(o.headcount),money(o.order_total),money(o.paid_total),money(o.balance),o.status])};
  if(needsCatering&&tab==='Payments')dataset={headers:['Customer','Payment date','Method','Amount','Payment held by'],rows:orders.flatMap(o=>o.payments.map(p=>[o.customer_name,p.payment_date,p.method,money(p.amount),p.payment_holder||'Not recorded']))};
  const visibleOrderCount=filterOrders(orders,query).length;
  const rows=(dataset?.rows||[]).filter(row=>row.join(' ').toLowerCase().includes(query.toLowerCase()));
  const newKind:RecordKind|null=section==='Overview'&&['Dashboard','Daily Sales','Cash'].includes(tab)?'sale':needsExpenses?'expense':needsCatering?(tab==='Orders'?'catering':'payment'):null;
  const maxSales=Math.max(1,...sales.map(s=>Number(s.total_sales)));
  return <div className="app"><aside className={'sidebar '+(menu?'show':'')}><div className="brand">Dosthi <b>Bandi</b><small>RESTAURANT OPERATIONS</small></div><div className="nav-caption">WORKSPACE</div><nav>{sections.map((s,i)=>{const Icon=icons[i];return <button key={s} className={'nav-item '+(section===s?'active':'')} onClick={()=>go(s)}><Icon size={18}/>{s}</button>;})}</nav><div className="sidebar-bottom">{role?`${role} workspace`:'Checking access…'}<button className="sign-out" onClick={signOut}>Sign out</button></div></aside>
  <main><header className="top"><button className="hamburger" aria-label="Toggle navigation" onClick={()=>setMenu(!menu)}><Menu/></button><div><div className="breadcrumb">Dosthi Bandi / {section}</div><h1>{section==='Overview'?'Restaurant overview':section}</h1></div><div className="top-actions">{(section==='Overview'||needsExpenses)&&<DateRangeFilter value={dateSelection} onChange={setDateSelection}/>}<button className="mobile-sign-out" onClick={signOut}>Sign out</button></div></header>
  <div className="content"><div className="connection-banner">Database records via API · {role||'Checking access'}</div>{notice&&<p role="status">{notice}</p>}<div className="tabs">{tabs[section].map(t=><button key={t} className={tab===t?'selected':''} onClick={()=>{setTab(t);setQuery('');setNotice('');}}>{t}</button>)}</div>
    {(error||roleError)&&<div className="error-message" role="alert"><p>{roleError||error}</p><button onClick={()=>setRevision(x=>x+1)}>Retry</button></div>}
    {loading&&!roleError&&<p role="status">Loading database records…</p>}
    {restricted&&role&&<section className="panel empty">This section is not available for your role.</section>}
    {!restricted&&section==='Overview'&&tab==='Dashboard'?<>
      <div className="dashboard-actions">{canWrite&&ready&&<button className="primary" onClick={()=>setDrawer('sale')}><Plus size={16}/>New Daily Sale</button>}</div>
      {role&&<CateringDashboard key={`${dateSelection.range.start}:${dateSelection.range.end}:${revision}`} client={client} range={dateSelection.range} sales={sales} salesLoading={loading} salesError={error||roleError}
        salesSummary={<section className="panel daily-sales-summary" aria-labelledby="daily-sales-heading">
          <div className="panel-heading"><div><h2 id="daily-sales-heading">Daily Sales</h2><p>Sales from recorded daily operations</p></div><strong className="daily-sales-total">Total Sales: {ready?money(totals.sales):'—'}</strong></div>
          <div className="stats daily-summary-stats">{cards.slice(1).map(([name,value])=><div className="stat" key={name}><span>{name}</span><strong>{ready?money(value):'—'}</strong></div>)}</div>
        </section>}
        salesInsights={<>
          <section className="panel sales-chart-panel"><div className="panel-heading"><h2>Sales overview</h2><span>Recorded sales in selected range</span></div><div className="chart">{ready&&sales.length?[...sales].reverse().map(s=><div key={s.id} title={`${s.business_date}: ${money(s.total_sales)}`}><span style={{height:Math.max(1,Number(s.total_sales)/maxSales*100)+'%'}}/><small>{s.business_date.slice(5)}</small></div>):<p className="no-range-data">{ready?'No sales records in this range.':'Sales data unavailable.'}</p>}</div></section>
          <section className="panel dashboard-key-summary"><div className="panel-heading"><h2>Key summary</h2></div><div className="summary-rows">{cards.map(([name,value])=><div key={name}><span>{name}</span><strong>{ready?money(value):'—'}</strong></div>)}</div></section>
          <section className="panel dashboard-integrations"><div className="panel-heading"><h2>Integrations & reconciliation</h2></div><div className="activity"><p>Cash reconciliation <em>Not implemented</em></p><p>Clover sync <em>Not connected</em></p><p>WhatsApp processing <em>Not connected</em></p></div></section>
        </>}/>}
      <p className="dashboard-footnote">Sales totals include recorded days only. Catering deposits are tracked separately and are not added again to daily sales. Catering uses event dates; received payments include earlier deposits.</p>
    </>:
    !restricted&&<section className="panel"><div className="panel-heading"><div><h2>{section==='Catering'?'Catering '+tab:tab}</h2><p>{dataset?'Records from the configured database':'Feature status'}</p></div><div className="tools">{dataset&&<label className="search"><Search size={15}/><input aria-label="Search records" placeholder="Search records" value={query} onChange={e=>setQuery(e.target.value)}/></label>}{canWrite&&newKind&&ready&&<button className="primary" onClick={()=>setDrawer(newKind)}><Plus size={16}/>{newKind==='payment'?'Record payment':'New record'}</button>}</div></div>
      {dataset&&ready?<>{needsCatering&&tab==='Orders'?<CateringOrders orders={orders} query={query}/>:<div className="table-wrap"><table><thead><tr>{dataset.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td className={dataset!.headers[j]==='Notes'?'notes-cell':''} data-label={dataset!.headers[j]} key={j}>{v}</td>)}</tr>)}</tbody></table>{rows.length===0&&<div className="empty">{query?'No matching records.':'No records yet.'}</div>}</div>}<footer className="table-footer">Showing {needsCatering&&tab==='Orders'?visibleOrderCount:rows.length} records{needsCatering?' · All event dates':''}</footer></>:!dataset&&<div className="empty">{unavailable[tab]||'This feature is not implemented yet.'}</div>}
    </section>}
  </div></main>{drawer&&<RecordForm kind={drawer} client={client} orders={orders} onClose={()=>setDrawer(null)} onSaved={()=>{setDrawer(null);setNotice('Record saved.');setRevision(x=>x+1);}}/>}</div>;
}
