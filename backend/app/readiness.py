"""Read-only database checks; never create tables or read business records."""
from sqlalchemy import Integer, inspect, text
from sqlalchemy.engine import Connection
from .db import Base
from . import models  # register all application tables


class SchemaNotReady(Exception):
    pass


def check_database(connection: Connection):
    connection.execute(text("SELECT 1"))
    inspector = inspect(connection)
    # The ORM uses unqualified names, so inspect the same default schema used
    # by its SELECTs rather than accepting tables it cannot actually address.
    available = set(inspector.get_table_names())
    for table in Base.metadata.sorted_tables:
        if table.name not in available:
            raise SchemaNotReady("Database tables are missing. Apply backend/sql/schema.sql to the configured database.")
        columns = {column["name"]: column for column in inspector.get_columns(table.name)}
        if set(table.columns.keys()) - columns.keys():
            raise SchemaNotReady("Database columns are outdated. Apply the SQL migrations in backend/sql/migrations before using this app.")
        if table.name == "catering_items" and not isinstance(columns["unit_price"]["type"], Integer):
            raise SchemaNotReady("Catering prices need the integer-price migration: backend/sql/migrations/001_catering_prices_and_payment_holders.sql.")
    return {"status": "ready", "database": "connected", "schema": "compatible"}
