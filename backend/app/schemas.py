from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class Model(BaseModel):
    model_config = ConfigDict(from_attributes=True, validate_default=True)

PaymentHolder = Literal["Owner 1", "Owner 2", "Zelle", "Bank"]

class SaleIn(Model):
    business_date: date
    cash_sales: Decimal = Field(default=0, ge=0)
    card_sales: Decimal = Field(default=0, ge=0)
    digital_cash_sales: Decimal = Field(default=0, ge=0)
    cash_in: Decimal = Field(default=0, ge=0)
    cash_out: Decimal = Field(default=0, ge=0)
    cash_out_holder: Literal["Owner 1", "Owner 2"] | None = None
    cash_at_box: Decimal | None = Field(default=None, ge=0)
    open_orders: int | None = Field(default=None, ge=0)
    closed_orders: int | None = Field(default=None, ge=0)
    amount_due: Decimal = Field(default=0, ge=0)
    payment_holder: PaymentHolder | None = None
    notes: str = ""
class SaleOut(SaleIn):
    id: str
    created_by: str
    total_sales: Decimal

class ExpenseIn(Model):
    expense_date: date
    vendor: str = Field(min_length=1,max_length=200)
    category: str = Field(min_length=1,max_length=80)
    amount: Decimal = Field(gt=0)
    payment_method: str = Field(min_length=1,max_length=40)
    notes: str = ""
    receipt_path: str | None = None
class ExpenseOut(ExpenseIn):
    id: str
    created_by: str

class CateringItemIn(Model):
    meal_type: str = Field(min_length=1)
    item_name: str = Field(min_length=1)
    size: str = ""
    quantity: Decimal = Field(gt=0)
    unit_price: int = Field(ge=0, le=2147483647)
    prepared_by: str = Field(default="", max_length=120)
class CateringPaymentIn(Model):
    payment_date: date
    amount: Decimal = Field(gt=0)
    method: str = Field(min_length=1)
    payment_holder: PaymentHolder | None = None
    external_reference: str | None = None
class CateringIn(Model):
    customer_name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    email: str | None = None
    event_date: date
    headcount: int = Field(gt=0)
    status: str = "new"
    items: list[CateringItemIn] = Field(min_length=1)
class CateringOut(Model):
    id: str
    customer_name: str
    phone: str
    email: str | None
    event_date: date
    headcount: int
    status: str
    items: list[CateringItemIn]
    payments: list[CateringPaymentIn]
    order_total: Decimal
    paid_total: Decimal
    balance: Decimal
