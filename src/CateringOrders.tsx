import {money,type CateringOrder} from './api';

export function filterOrders(orders:CateringOrder[],query:string){
  const search=query.trim().toLowerCase();
  return orders.filter(order=>[order.customer_name,order.event_date,String(order.headcount),order.status,money(order.order_total),money(order.paid_total),money(order.balance),...order.items.flatMap(item=>[item.item_name,item.meal_type,item.prepared_by])].join(' ').toLowerCase().includes(search));
}

export function CateringOrders({orders,query}:{orders:CateringOrder[];query:string}){
  const visible=filterOrders(orders,query);
  if(!visible.length)return <div className="empty">{query?'No matching orders.':'No orders yet.'}</div>;
  return <div className="catering-orders">{visible.map(order=><details key={order.id} className="catering-order">
    <summary><strong>{order.customer_name}</strong><span>Event: {order.event_date}</span><span>{order.items.length} items · {order.headcount} guests</span><span>Total: {money(order.order_total)}</span><span>Paid: {money(order.paid_total)}</span><span>Due: {money(order.balance)}</span><span className="status">{order.status}</span><span className="expand-label">View items ▾</span></summary>
    <div className="table-wrap"><table><caption>Items for {order.customer_name}</caption><thead><tr><th>Item</th><th>Quantity / size</th><th>Price ($ per unit)</th><th>Prepared by</th><th>Item total</th></tr></thead><tbody>{order.items.map((item,index)=><tr key={index}><td data-label="Item">{item.item_name}</td><td data-label="Quantity / size">{item.quantity} {item.size}</td><td data-label="Price ($ per unit)">{money(item.unit_price)}</td><td data-label="Prepared by">{item.prepared_by||'Not assigned'}</td><td data-label="Item total">{money(Number(item.quantity)*item.unit_price)}</td></tr>)}</tbody></table></div>
  </details>)}</div>;
}
