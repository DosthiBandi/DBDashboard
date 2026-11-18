import {paymentHolders,sumMoney,type CateringOrder,type Money,type Sale} from './api';

type PaymentGroup='cash'|'zelle'|'bank'|'other';
function paymentGroup(method:string):PaymentGroup {
  const normalized=method.trim().toLowerCase().replace(/[\s_-]+/g,'');
  return normalized==='cash'?'cash':normalized==='zelle'?'zelle':['bank','banktransfer'].includes(normalized)?'bank':'other';
}

export function summarizeCateringOrders(orders:CateringOrder[]) {
  const groups:Record<'cash'|'zelle'|'bank'|'other',Money[]>={cash:[],zelle:[],bank:[],other:[]};
  for(const order of orders)for(const payment of order.payments){
    const group=paymentGroup(payment.method);
    groups[group].push(payment.amount);
  }
  return {
    orderTotal:sumMoney(orders.map(order=>order.order_total)),
    paid:sumMoney(orders.map(order=>order.paid_total)),
    due:sumMoney(orders.map(order=>order.balance)),
    cash:sumMoney(groups.cash),zelle:sumMoney(groups.zelle),bank:sumMoney(groups.bank),other:sumMoney(groups.other),
  };
}

export function summarizeCateringHolders(orders:CateringOrder[]) {
  const buckets=new Map<string,Record<PaymentGroup,Money[]>>();
  const empty=():Record<PaymentGroup,Money[]>=>({cash:[],zelle:[],bank:[],other:[]});
  for(const holder of [...paymentHolders,'Not recorded'])buckets.set(holder,empty());
  for(const order of orders)for(const payment of order.payments){
    const holder=payment.payment_holder?.trim()||'Not recorded';
    if(!buckets.has(holder))buckets.set(holder,empty());
    buckets.get(holder)![paymentGroup(payment.method)].push(payment.amount);
  }
  return Array.from(buckets,([holder,groups])=>({
    holder,cash:sumMoney(groups.cash),zelle:sumMoney(groups.zelle),bank:sumMoney(groups.bank),other:sumMoney(groups.other),
    total:sumMoney([...groups.cash,...groups.zelle,...groups.bank,...groups.other]),
  }));
}

export function summarizeHolderCollections(orders:CateringOrder[],sales:Sale[]) {
  const rows=new Map(summarizeCateringHolders(orders).map(row=>[row.holder,{...row,dailyCash:0,cashOut:0}]));
  const daily=new Map<string,Money[]>(),payouts=new Map<string,Money[]>();
  for(const sale of sales){
    const holder=sale.payment_holder?.trim()||'Not recorded';
    const payer=sale.cash_out_holder?.trim()||'Not recorded';
    daily.set(holder,[...(daily.get(holder)||[]),sale.cash_sales]);
    payouts.set(payer,[...(payouts.get(payer)||[]),sale.cash_out]);
  }
  for(const holder of new Set([...daily.keys(),...payouts.keys()])){
    if(!rows.has(holder))rows.set(holder,{holder,cash:0,zelle:0,bank:0,other:0,total:0,dailyCash:0,cashOut:0});
    rows.get(holder)!.dailyCash=sumMoney(daily.get(holder)||[]);
    rows.get(holder)!.cashOut=sumMoney(payouts.get(holder)||[]);
  }
  return Array.from(rows.values());
}
