import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {summarizeCateringOrders,summarizeCateringHolders,summarizeHolderCollections} from '../cateringSummary';
import {CateringDashboardContent} from '../CateringDashboard';
import type {CateringOrder,Sale} from '../api';
const range={start:'2026-11-18',end:'2026-11-18'};
const order:CateringOrder={id:'sample',customer_name:'Sample customer',phone:'000',email:null,event_date:'2026-11-18',headcount:10,status:'new',items:[],order_total:'1000',paid_total:'350.30',balance:'649.70',payments:[
  {payment_date:'2026-11-01',amount:'100.10',method:'Cash',payment_holder:'Owner 1'},
  {payment_date:'2026-11-10',amount:'75.20',method:'Zelle',payment_holder:'Owner 2'},
  {payment_date:'2026-11-18',amount:'150',method:'Bank Transfer',payment_holder:'Bank'},
  {payment_date:'2026-11-18',amount:'25',method:'Card',payment_holder:'Owner 1'},
]};
describe('catering dashboard amounts',()=>{
  it('includes earlier deposits and reconciles payment-method cards with paid totals',()=>{
    const summary=summarizeCateringOrders([order]);
    expect(summary).toEqual({orderTotal:1000,paid:350.30,due:649.70,cash:100.10,zelle:75.20,bank:150,other:25});
    expect(Math.round((summary.cash+summary.zelle+summary.bank+summary.other)*100)).toBe(Math.round(summary.paid*100));
  });
  it('keeps holder labels separate from payment methods and includes unknown methods in other',()=>{
    const summary=summarizeCateringOrders([{...order,payments:[
      {payment_date:'2026-11-18',amount:'30',method:'Cash',payment_holder:'Zelle'},
      {payment_date:'2026-11-18',amount:'20',method:'Unclassified',payment_holder:'Bank'},
    ],paid_total:'50',balance:'950'}]);
    expect(summary.cash).toBe(30);expect(summary.zelle).toBe(0);expect(summary.bank).toBe(0);expect(summary.other).toBe(20);
  });
  it('normalizes bank transfer spellings and sums multiple orders',()=>{
    const second={...order,id:'second',order_total:'500',paid_total:'10',balance:'490',payments:[{payment_date:'2026-11-18',amount:'10',method:' bank-transfer ',payment_holder:null}]};
    const summary=summarizeCateringOrders([order,second]);
    expect(summary.orderTotal).toBe(1500);expect(summary.paid).toBe(360.30);expect(summary.due).toBe(1139.70);expect(summary.bank).toBe(160);
  });
  it('shows customer orders, paid, due, method cards and the date basis',()=>{
    const html=renderToStaticMarkup(<CateringDashboardContent orders={[order]} range={range} loading={false} error="" onRetry={()=>{}}/>);
    for(const text of ['Sample customer','Amount paid','Amount due','Cash received','Zelle received','Bank received','$350.30','$649.70','Event dates:','earlier deposits'])expect(html).toContain(text);
  });
  it('shows zero only for a successfully loaded empty range',()=>{
    const html=renderToStaticMarkup(<CateringDashboardContent orders={[]} range={range} loading={false} error="" onRetry={()=>{}}/>);
    expect(html).toContain('No catering orders for the selected event dates.');expect(html).toContain('$0.00');
  });
  it('never displays stale totals or zero amounts when loading or unavailable',()=>{
    for(const [loading,error] of [[true,''],[false,'Catering request failed']] as const){
      const html=renderToStaticMarkup(<CateringDashboardContent orders={[order]} range={range} loading={loading} error={error} onRetry={()=>{}}/>);
      expect(html).not.toContain('$0.00');expect(html).not.toContain('$350.30');expect(html).not.toContain('Sample customer');
      expect(html).toContain(loading?'Loading catering orders':'Retry catering');
    }
  });
});


describe('collections by holder',()=>{
  it('splits cash between different owners, keeps digital methods separate and retains unassigned receipts',()=>{
    const split={...order,paid_total:'200.65',payments:[
      {payment_date:'2026-11-01',amount:'100.10',method:'Cash',payment_holder:'Owner 1' as const},
      {payment_date:'2026-11-02',amount:'50.20',method:'Cash',payment_holder:'Owner 2' as const},
      {payment_date:'2026-11-03',amount:'10.05',method:'Cash',payment_holder:'Owner 1' as const},
      {payment_date:'2026-11-04',amount:'20.10',method:'Zelle',payment_holder:'Owner 2' as const},
      {payment_date:'2026-11-05',amount:'5.20',method:'Cash',payment_holder:null},
      {payment_date:'2026-11-06',amount:'15',method:'Bank Transfer',payment_holder:'Bank' as const},
    ]};
    const holders=summarizeCateringHolders([split]);
    expect(holders.find(row=>row.holder==='Owner 1')).toEqual({holder:'Owner 1',cash:110.15,zelle:0,bank:0,other:0,total:110.15});
    expect(holders.find(row=>row.holder==='Owner 2')).toEqual({holder:'Owner 2',cash:50.20,zelle:20.10,bank:0,other:0,total:70.30});
    expect(holders.find(row=>row.holder==='Not recorded')?.cash).toBe(5.20);
    expect(holders.find(row=>row.holder==='Bank')?.bank).toBe(15);
    const totals=summarizeCateringOrders([split]);
    const cents=(values:number[])=>values.reduce((sum,value)=>sum+Math.round(value*100),0);
    expect(cents(holders.map(row=>row.cash))).toBe(Math.round(totals.cash*100));
    expect(cents(holders.map(row=>row.total))).toBe(Math.round(totals.paid*100));
  });
  it('shows holder names and cash breakdown in the dashboard',()=>{
    const html=renderToStaticMarkup(<CateringDashboardContent orders={[order]} range={range} loading={false} error="" onRetry={()=>{}}/>);
    for(const text of ['Collections by holder','Owner 1','Owner 2','Not recorded','Total catering received'])expect(html).toContain(text);
    expect(html).toContain('Transfers and current cash balances are not tracked here.');
  });
  it('does not show a zero-valued holder breakdown while data is unavailable',()=>{
    const html=renderToStaticMarkup(<CateringDashboardContent orders={[]} range={range} loading={false} error="Unavailable" onRetry={()=>{}}/>);
    expect(html).not.toContain('Collections by holder');
  });
});


const sale:Sale={id:'daily-test',business_date:'2026-11-18',cash_sales:'300.15',card_sales:'400',digital_cash_sales:'100',total_sales:'800.15',cash_in:'20',cash_out:'25.10',cash_out_holder:'Owner 1',payment_holder:'Owner 2',cash_at_box:null,amount_due:'0',notes:''};
describe('cash by source and payout holder',()=>{
  it('attributes received cash and cash out independently and keeps the sources separate',()=>{
    const rows=summarizeHolderCollections([order],[sale]);
    expect(rows.find(row=>row.holder==='Owner 1')?.cash).toBe(100.10);
    expect(rows.find(row=>row.holder==='Owner 1')?.cashOut).toBe(25.10);
    expect(rows.find(row=>row.holder==='Owner 1')?.dailyCash).toBe(0);
    expect(rows.find(row=>row.holder==='Owner 2')?.dailyCash).toBe(300.15);
    expect(rows.find(row=>row.holder==='Owner 2')?.cashOut).toBe(0);
    // Catering totals never absorb daily sales or cash movements.
    expect(rows.find(row=>row.holder==='Owner 1')?.total).toBe(125.10);
  });
  it('keeps historical cash out without a payer under Not recorded',()=>{
    const rows=summarizeHolderCollections([],[{...sale,payment_holder:'Owner 1',cash_out_holder:null}]);
    expect(rows.find(row=>row.holder==='Owner 1')?.cashOut).toBe(0);
    expect(rows.find(row=>row.holder==='Not recorded')?.cashOut).toBe(25.10);
  });
  it('renders both cash source columns and the payout column',()=>{
    const html=renderToStaticMarkup(<CateringDashboardContent orders={[order]} range={range} loading={false} error="" onRetry={()=>{}} sales={[sale]}/>);
    for(const text of ['Catering cash','Daily sales cash','Cash out','$300.15','$25.10'])expect(html).toContain(text);
  });
  it('keeps daily amounts unavailable when their request fails while showing catering totals',()=>{
    const html=renderToStaticMarkup(<CateringDashboardContent orders={[order]} range={range} loading={false} error="" onRetry={()=>{}} sales={[sale]} salesError="Unavailable"/>);
    expect(html).toContain('Daily sales cash and cash out are unavailable');
    expect(html).not.toContain('$300.15');expect(html).not.toContain('$25.10');expect(html).toContain('$350.30');
  });
});
