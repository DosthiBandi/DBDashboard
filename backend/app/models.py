import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import String, ForeignKey, Date, DateTime, Numeric, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def uid(): return str(uuid.uuid4())
def utcnow(): return datetime.now(timezone.utc)

class Profile(Base):
    __tablename__ = "profiles"
    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="staff")

class DailySale(Base):
    __tablename__ = "daily_sales"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    business_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    cash_sales: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False, default=0)
    card_sales: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False, default=0)
    digital_cash_sales: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False, default=0)
    cash_in: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False, default=0)
    cash_out: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False, default=0)
    cash_at_box: Mapped[Decimal | None] = mapped_column(Numeric(12,2))
    open_orders: Mapped[int | None] = mapped_column(Integer)
    closed_orders: Mapped[int | None] = mapped_column(Integer)
    amount_due: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Expense(Base):
    __tablename__ = "expenses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    vendor: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(40), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    receipt_path: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class CateringOrder(Base):
    __tablename__ = "catering_orders"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200))
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    headcount: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="new")
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    items: Mapped[list["CateringItem"]] = relationship(back_populates="order", cascade="all, delete-orphan", lazy="selectin")
    payments: Mapped[list["CateringPayment"]] = relationship(back_populates="order", cascade="all, delete-orphan", lazy="selectin")

class CateringItem(Base):
    __tablename__ = "catering_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    order_id: Mapped[str] = mapped_column(ForeignKey("catering_orders.id"), nullable=False)
    meal_type: Mapped[str] = mapped_column(String(60), nullable=False)
    item_name: Mapped[str] = mapped_column(String(160), nullable=False)
    size: Mapped[str] = mapped_column(String(50), default="")
    quantity: Mapped[Decimal] = mapped_column(Numeric(10,2), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False)
    prepared_by: Mapped[str] = mapped_column(String(120), default="")
    order: Mapped["CateringOrder"] = relationship(back_populates="items")

class CateringPayment(Base):
    __tablename__ = "catering_payments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    order_id: Mapped[str] = mapped_column(ForeignKey("catering_orders.id"), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12,2), nullable=False)
    method: Mapped[str] = mapped_column(String(40), nullable=False)
    external_reference: Mapped[str | None] = mapped_column(String(120))
    order: Mapped["CateringOrder"] = relationship(back_populates="payments")

class SyncCheckpoint(Base):
    __tablename__ = "sync_checkpoints"
    source: Mapped[str] = mapped_column(String(50), primary_key=True)
    cursor: Mapped[str] = mapped_column(String(300), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class ExternalEvent(Base):
    __tablename__ = "external_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    external_id: Mapped[str] = mapped_column(String(200), nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint("source","external_id",name="uq_external_event"),)
