import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CateringOrders,filterOrders} from '../CateringOrders';
import type {CateringOrder} from '../api';
const orders:CateringOrder[]=[{id:'test',customer_name:'Test customer',phone:'000',email:null,event_date:'2026-11-20',headcount:10,status:'new',order_total:'275',paid_total:'25',balance:'250',payments:[],items:[
  {meal_type:'Other',item_name:'Item A',quantity:2,size:'trays',unit_price:100,prepared_by:'Chef'},
  {meal_type:'Other',item_name:'Item B',quantity:3,size:'trays',unit_price:25,prepared_by:'Person 1'},
]}];
describe('catering item lists',()=>{
  it('renders both items with their prices and preparers under one order',()=>{
    const html=renderToStaticMarkup(<CateringOrders orders={orders} query=""/>);
    expect(html.match(/<details/g)).toHaveLength(1);
    for(const text of ['Item A','Item B','Chef','Person 1','$100.00','$25.00','$200.00','$75.00'])expect(html).toContain(text);
  });
  it('finds an order by an item name or its preparer',()=>{
    expect(filterOrders(orders,'Item B')).toHaveLength(1);
    expect(filterOrders(orders,'person 1')).toHaveLength(1);
    expect(filterOrders(orders,'missing')).toHaveLength(0);
  });
});
