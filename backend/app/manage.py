"""Explicit database setup; never runs during API startup."""
import argparse
import sys
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from .db import Base, engine, SessionLocal
from .models import Profile  # imports all application tables
from .readiness import check_database, SchemaNotReady


def init_db():
    # A transaction keeps new tables and their Data API restrictions atomic.
    with engine.begin() as connection:
        Base.metadata.create_all(connection)
        if connection.dialect.name == 'postgresql':
            roles = set(connection.execute(text("SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')")).scalars())
            for table in Base.metadata.sorted_tables:
                name = connection.dialect.identifier_preparer.quote(table.name)
                connection.execute(text(f'ALTER TABLE {name} ENABLE ROW LEVEL SECURITY'))
                for role in roles:
                    connection.execute(text(f'REVOKE ALL ON TABLE {name} FROM {role}'))
    print('Application tables initialized. Browser Data API access is disabled; use FastAPI.')


def provision(user_id: str, role: str):
    UUID(user_id)  # prevent accidental use of an email or fabricated identifier
    with SessionLocal() as session:
        existing = session.get(Profile, user_id)
        if existing and existing.role != role:
            raise ValueError('Account already provisioned with a different role; role changes require a separate administrative review')
        if not existing:
            session.add(Profile(user_id=user_id, role=role))
            session.commit()
    print('Account provisioned.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('init-db', help='Create missing tables and restrict Supabase Data API access')
    commands.add_parser('check-db', help='Check connection and schema without reading business records or changing tables')
    profile = commands.add_parser('provision-user', help='Grant an existing Supabase Auth user access')
    profile.add_argument('--user-id', required=True)
    profile.add_argument('--role', choices=['owner', 'manager', 'staff'], required=True)
    args = parser.parse_args()
    try:
        if args.command == 'init-db':
            init_db()
        elif args.command == 'check-db':
            with engine.connect() as connection:
                check_database(connection)
            print('Database connected. All eight application tables have the required columns and catering prices use integers.')
        else:
            provision(args.user_id, args.role)
    except SQLAlchemyError:
        print('Database operation failed. Check DATABASE_URL, network access, credentials and schema. No connection details printed.', file=sys.stderr)
        raise SystemExit(1) from None
    except (ValueError, SchemaNotReady) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
