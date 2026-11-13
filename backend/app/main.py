from datetime import date
from decimal import Decimal
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .db import get_db
from .config import settings
from .auth import Principal, require
from .models import DailySale, Expense, CateringOrder, CateringItem, CateringPayment
from .schemas import SaleIn, SaleOut, ExpenseIn, ExpenseOut, CateringIn, CateringOut, CateringPaymentIn

app = FastAPI(title="Dosthi Bandi Dashboard API",version="0.1.0")
app.add_middleware(CORSMiddleware,allow_origins=[s.strip() for s in settings.cors_origins.split(",") if s.strip()],allow_methods=["GET","POST"],allow_headers=["Authorization","Content-Type"])

@app.get("/health")
def health(): return {"status":"ok","service":"dbdashboard-api"}

def sale_out(s: DailySale):
    return SaleOut.model_validate({**{c.name:getattr(s,c.name) for c in s.__table__.columns}, "total_sales":s.cash_sales+s.card_sales+s.digital_cash_sales})

@app.get("/api/v1/daily-sales",response_model=list[SaleOut])
def sales(start:date|None=None,end:date|None=None,db:Session=Depends(get_db),_p:Principal=Depends(require("owner","manager","staff"))):
    stmt=select(DailySale).order_by(DailySale.business_date.desc()).limit(500)
    if start: stmt=stmt.where(DailySale.business_date>=start)
    if end: stmt=stmt.where(DailySale.business_date<=end)
    return [sale_out(x) for x in db.scalars(stmt)]

@app.post("/api/v1/daily-sales",response_model=SaleOut,status_code=201)
def create_sale(payload:SaleIn,db:Session=Depends(get_db),p:Principal=Depends(require("owner","manager"))):
    obj=DailySale(**payload.model_dump(),created_by=p.user_id);db.add(obj)
    try: db.commit()
    except IntegrityError:
        db.rollback();raise HTTPException(409,"A sales entry already exists for this business date")
    db.refresh(obj);return sale_out(obj)

@app.get("/api/v1/expenses",response_model=list[ExpenseOut])
def expenses(start:date|None=None,end:date|None=None,db:Session=Depends(get_db),_p:Principal=Depends(require("owner","manager"))):
    stmt=select(Expense).order_by(Expense.expense_date.desc()).limit(500)
    if start:stmt=stmt.where(Expense.expense_date>=start)
    if end:stmt=stmt.where(Expense.expense_date<=end)
    return list(db.scalars(stmt))

@app.post("/api/v1/expenses",response_model=ExpenseOut,status_code=201)
def create_expense(payload:ExpenseIn,db:Session=Depends(get_db),p:Principal=Depends(require("owner","manager"))):
    obj=Expense(**payload.model_dump(),created_by=p.user_id);db.add(obj);db.commit();db.refresh(obj);return obj

def catering_out(o:CateringOrder):
    total=sum((i.quantity*i.unit_price for i in o.items),Decimal(0))
    paid=sum((p.amount for p in o.payments),Decimal(0))
    return CateringOut.model_validate({"id":o.id,"customer_name":o.customer_name,"phone":o.phone,"email":o.email,"event_date":o.event_date,"headcount":o.headcount,"status":o.status,"items":o.items,"payments":o.payments,"order_total":total,"paid_total":paid,"balance":total-paid})

@app.get("/api/v1/catering",response_model=list[CateringOut])
def catering(db:Session=Depends(get_db),_p:Principal=Depends(require("owner","manager","staff"))):
    return [catering_out(o) for o in db.scalars(select(CateringOrder).order_by(CateringOrder.event_date.desc()).limit(200))]

@app.post("/api/v1/catering",response_model=CateringOut,status_code=201)
def create_catering(payload:CateringIn,db:Session=Depends(get_db),p:Principal=Depends(require("owner","manager"))):
    fields=payload.model_dump(exclude={"items"});o=CateringOrder(**fields,created_by=p.user_id)
    o.items=[CateringItem(**item.model_dump()) for item in payload.items]
    db.add(o);db.commit();db.refresh(o);return catering_out(o)

@app.post("/api/v1/catering/{order_id}/payments",response_model=CateringOut,status_code=201)
def add_catering_payment(order_id:str,payload:CateringPaymentIn,db:Session=Depends(get_db),_p:Principal=Depends(require("owner","manager"))):
    o=db.get(CateringOrder,order_id)
    if not o:raise HTTPException(404,"Catering order not found")
    due=sum((i.quantity*i.unit_price for i in o.items),Decimal(0))-sum((p.amount for p in o.payments),Decimal(0))
    if payload.amount>due:raise HTTPException(422,"Payment exceeds outstanding balance")
    o.payments.append(CateringPayment(**payload.model_dump()));db.commit();db.refresh(o);return catering_out(o)

@app.get("/api/v1/summary")
def summary(start:date|None=None,end:date|None=None,db:Session=Depends(get_db),_p:Principal=Depends(require("owner","manager"))):
    stmt=select(DailySale)
    if start:stmt=stmt.where(DailySale.business_date>=start)
    if end:stmt=stmt.where(DailySale.business_date<=end)
    entries=list(db.scalars(stmt));cash=sum((s.cash_sales for s in entries),Decimal(0));card=sum((s.card_sales for s in entries),Decimal(0));digital=sum((s.digital_cash_sales for s in entries),Decimal(0))
    return {"cash_sales":cash,"card_sales":card,"digital_cash_sales":digital,"total_sales":cash+card+digital,"record_count":len(entries),"complete_pnl":False,"note":"Cash movements and catering payments are not added to revenue. P&L is not available without reconciled costs."}
