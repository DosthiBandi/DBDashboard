from decimal import Decimal
import pytest
import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db import Base, get_db
from app.auth import Principal, principal
from app.config import settings, Settings
from app.models import Profile

@pytest.fixture
def workspace():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    actor = Principal('test-user', 'owner')
    def db():
        with Session(engine) as session:
            yield session
    app.dependency_overrides[get_db] = db
    app.dependency_overrides[principal] = lambda: actor
    with TestClient(app) as client:
        yield client, actor, engine
    app.dependency_overrides.clear()
    engine.dispose()


def test_health():
    assert TestClient(app).get('/health').json()['status'] == 'ok'


def test_sales_require_auth():
    assert TestClient(app).get('/api/v1/daily-sales').status_code == 401


def test_public_config_only_returns_publishable_configuration(monkeypatch):
    monkeypatch.setattr(settings, 'supabase_url', 'https://example.supabase.co')
    monkeypatch.setattr(settings, 'supabase_publishable_key', 'sb_publishable_test')
    response = TestClient(app).get('/api/v1/auth/config')
    assert response.json() == {'url': 'https://example.supabase.co', 'publishable_key': 'sb_publishable_test'}
    assert 'database_url' not in response.text.lower()


def test_missing_auth_configuration_is_actionable():
    response = TestClient(app).get('/api/v1/auth/config')
    assert response.status_code == 503
    assert 'SUPABASE_PUBLISHABLE_KEY' in response.json()['detail']


def test_sales_persist_and_totals_exclude_movements_and_dues(workspace):
    client, _, _ = workspace
    payload = {'business_date': '2026-11-13', 'cash_sales': '620.12', 'card_sales': '920.25', 'digital_cash_sales': '310.08', 'cash_in': '75', 'cash_out': '40', 'amount_due': '120', 'notes': 'Test only'}
    created = client.post('/api/v1/daily-sales', json=payload)
    assert created.status_code == 201
    assert Decimal(created.json()['total_sales']) == Decimal('1850.45')
    rows = client.get('/api/v1/daily-sales?start=2026-11-01&end=2026-11-30').json()
    assert rows[0]['id'] == created.json()['id']
    assert rows[0]['notes'] == 'Test only'
    assert client.get('/api/v1/daily-sales?start=2026-10-01&end=2026-10-31').json() == []
    assert client.post('/api/v1/daily-sales', json=payload).status_code == 409
    summary = client.get('/api/v1/summary').json()
    assert Decimal(str(summary['total_sales'])) == Decimal('1850.45')


def test_invalid_sale_is_rejected(workspace):
    client, _, _ = workspace
    assert client.post('/api/v1/daily-sales', json={'business_date': '2026-11-13', 'cash_sales': -2}).status_code == 422


@pytest.mark.parametrize('path', ['/api/v1/daily-sales', '/api/v1/expenses', '/api/v1/summary'])
def test_reversed_date_range_is_rejected(workspace, path):
    client, _, _ = workspace
    assert client.get(path+'?start=2026-11-30&end=2026-11-01').status_code == 422


def test_staff_cannot_write_or_read_expenses(workspace):
    client, actor, _ = workspace
    actor.role = 'staff'
    assert client.get('/api/v1/daily-sales').status_code == 200
    assert client.get('/api/v1/expenses').status_code == 403
    assert client.post('/api/v1/daily-sales', json={'business_date': '2026-11-13'}).status_code == 403
    assert client.post('/api/v1/expenses', json={'expense_date':'2026-11-13','vendor':'Test','category':'Test','payment_method':'Cash','amount':'1'}).status_code == 403


def test_expense_persists(workspace):
    client, actor, _ = workspace
    actor.role = 'manager'
    response = client.post('/api/v1/expenses', json={'expense_date':'2026-11-13','vendor':'Test','category':'Groceries','payment_method':'Cash','amount':'10.25','notes':'Test only'})
    assert response.status_code == 201
    assert client.get('/api/v1/expenses').json()[0]['id'] == response.json()['id']


def test_catering_payments_do_not_add_to_daily_revenue(workspace):
    client, _, _ = workspace
    response = client.post('/api/v1/catering', json={'customer_name':'Test Customer','phone':'000','event_date':'2026-11-15','headcount':10,'items':[{'meal_type':'Other','item_name':'Test Item','quantity':'2','unit_price':'100','prepared_by':'Test'}]})
    assert response.status_code == 201
    order_id = response.json()['id']
    payment = {'payment_date':'2026-11-13','amount':'75','method':'Cash'}
    paid = client.post(f'/api/v1/catering/{order_id}/payments',json=payment)
    assert paid.status_code == 201
    assert Decimal(paid.json()['balance']) == Decimal('125')
    assert client.post(f'/api/v1/catering/{order_id}/payments',json={**payment,'amount':'126'}).status_code == 422
    assert client.get('/api/v1/catering').json()[0]['payments'][0]['amount'] == '75.00'
    assert client.get('/api/v1/summary').json()['total_sales'] == 0


def test_pagination_is_stable(workspace):
    client, _, _ = workspace
    for day in ['2026-11-12', '2026-11-13']:
        assert client.post('/api/v1/daily-sales',json={'business_date':day}).status_code == 201
    assert client.get('/api/v1/daily-sales?limit=1').json()[0]['business_date'] == '2026-11-13'
    assert client.get('/api/v1/daily-sales?limit=1&offset=1').json()[0]['business_date'] == '2026-11-12'
    assert client.get('/api/v1/daily-sales?offset=-1').status_code == 422


def test_valid_auth_user_still_requires_profile(workspace, monkeypatch):
    client, _, engine = workspace
    del app.dependency_overrides[principal]
    monkeypatch.setattr(settings, 'supabase_url', 'https://example.supabase.co')
    monkeypatch.setattr(settings, 'supabase_publishable_key', 'sb_publishable_test')
    original_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={'id':'auth-user'}))
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: original_client(transport=transport, **kwargs))
    headers = {'Authorization':'Bearer test-session-token'}
    assert client.get('/api/v1/me',headers=headers).status_code == 403
    with Session(engine) as db:
        db.add(Profile(user_id='auth-user',role='manager'))
        db.commit()
    assert client.get('/api/v1/me',headers=headers).json() == {'user_id':'auth-user','role':'manager'}


def test_invalid_auth_token_is_rejected(workspace, monkeypatch):
    client, _, _ = workspace
    del app.dependency_overrides[principal]
    monkeypatch.setattr(settings, 'supabase_url', 'https://example.supabase.co')
    monkeypatch.setattr(settings, 'supabase_publishable_key', 'sb_publishable_test')
    original_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(401, json={'message':'Invalid token'}))
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: original_client(transport=transport, **kwargs))
    assert client.get('/api/v1/me',headers={'Authorization':'Bearer invalid'}).status_code == 401


def test_config_rejects_secret_key_and_database_url_as_project_url():
    with pytest.raises(ValueError):
        Settings(_env_file=None, supabase_publishable_key='sb_secret_do_not_expose')
    with pytest.raises(ValueError):
        Settings(_env_file=None, supabase_url='postgresql://private')


def test_multiple_catering_items_have_integer_prices_and_preparers(workspace):
    client, _, _ = workspace
    payload = {'customer_name':'Test Customer','phone':'000','event_date':'2026-11-15','headcount':10,'items':[
        {'meal_type':'Other','item_name':'Item A','quantity':'2','unit_price':100,'prepared_by':'Chef'},
        {'meal_type':'Other','item_name':'Item B','quantity':'3','unit_price':25,'prepared_by':'Person 1'},
    ]}
    response = client.post('/api/v1/catering', json=payload)
    assert response.status_code == 201
    assert Decimal(response.json()['order_total']) == Decimal('275')
    listed = client.get('/api/v1/catering').json()[0]
    assert len(listed['items']) == 2
    assert [item['unit_price'] for item in listed['items']] == [100, 25]
    assert [item['prepared_by'] for item in listed['items']] == ['Chef', 'Person 1']
    payload['items'][0]['unit_price'] = '100.50'
    assert client.post('/api/v1/catering',json=payload).status_code == 422


@pytest.mark.parametrize('holder', ['Owner 1', 'Owner 2', 'Zelle', 'Bank'])
def test_payment_holders_persist_without_changing_sales_totals(workspace, holder):
    client, _, _ = workspace
    sale = client.post('/api/v1/daily-sales',json={'business_date':'2026-11-13','cash_sales':'10','payment_holder':holder})
    assert sale.status_code == 201
    assert sale.json()['payment_holder'] == holder
    assert client.get('/api/v1/daily-sales').json()[0]['payment_holder'] == holder
    order = client.post('/api/v1/catering',json={'customer_name':'Test','phone':'000','event_date':'2026-11-15','headcount':1,'items':[{'meal_type':'Other','item_name':'Test','quantity':1,'unit_price':100,'prepared_by':'Chef'}]}).json()
    paid = client.post(f"/api/v1/catering/{order['id']}/payments",json={'payment_date':'2026-11-13','amount':'25','method':'Cash','payment_holder':holder})
    assert paid.status_code == 201
    assert paid.json()['payments'][0]['payment_holder'] == holder
    assert client.get('/api/v1/catering').json()[0]['payments'][0]['payment_holder'] == holder
    assert client.get('/api/v1/summary').json()['total_sales'] == 10
    assert Decimal(paid.json()['balance']) == Decimal('75')


def test_invalid_holder_is_rejected_and_legacy_records_are_unassigned(workspace):
    client, _, _ = workspace
    assert client.post('/api/v1/daily-sales',json={'business_date':'2026-11-13','payment_holder':'Unknown'}).status_code == 422
    created = client.post('/api/v1/daily-sales',json={'business_date':'2026-11-13'})
    assert created.status_code == 201
    assert created.json()['payment_holder'] is None


def test_database_readiness_checks_the_actual_schema(workspace):
    client, _, _ = workspace
    response = client.get('/health/ready')
    assert response.status_code == 200
    assert response.json() == {'status':'ready','database':'connected','schema':'compatible'}


def test_database_readiness_identifies_missing_tables(workspace):
    client, _, engine = workspace
    from sqlalchemy import text
    with engine.begin() as connection:
        connection.execute(text('DROP TABLE catering_payments'))
    response = client.get('/health/ready')
    assert response.status_code == 503
    assert 'schema.sql' in response.json()['detail']


def test_database_readiness_identifies_missing_columns(workspace):
    client, _, engine = workspace
    from sqlalchemy import text
    with engine.begin() as connection:
        connection.execute(text('ALTER TABLE daily_sales RENAME TO legacy_daily_sales'))
        connection.execute(text('CREATE TABLE daily_sales (id VARCHAR(36) PRIMARY KEY)'))
    response = client.get('/health/ready')
    assert response.status_code == 503
    assert 'migrations' in response.json()['detail']


def test_database_readiness_identifies_legacy_decimal_item_prices(workspace):
    client, _, engine = workspace
    from sqlalchemy import MetaData, Numeric
    from app.models import CateringItem
    metadata = MetaData()
    for table in Base.metadata.sorted_tables:
        table.to_metadata(metadata)
    legacy_items = metadata.tables['catering_items']
    legacy_items.c.unit_price.type = Numeric(12, 2)
    with engine.begin() as connection:
        CateringItem.__table__.drop(connection)
        legacy_items.create(connection)
    response = client.get('/health/ready')
    assert response.status_code == 503
    assert 'integer-price migration' in response.json()['detail']


def test_database_readiness_does_not_expose_connection_errors(workspace):
    client, _, _ = workspace
    from sqlalchemy.exc import OperationalError
    def unavailable_db():
        raise OperationalError('SELECT private',{},Exception('password=never-print-this'))
        yield
    app.dependency_overrides[get_db] = unavailable_db
    response = client.get('/health/ready')
    assert response.status_code == 503
    assert 'never-print-this' not in response.text
    assert 'SELECT private' not in response.text


def test_catering_event_date_range_is_inclusive_and_preserves_earlier_payments(workspace):
    client, actor, _ = workspace
    for day in ['2026-11-17','2026-11-18','2026-11-20','2026-11-21']:
        response=client.post('/api/v1/catering',json={'customer_name':'Sample '+day,'phone':'000','event_date':day,'headcount':1,'items':[{'meal_type':'Other','item_name':'Sample','quantity':1,'unit_price':100,'prepared_by':'Chef'}]})
        assert response.status_code==201
        if day=='2026-11-18':
            paid=client.post(f"/api/v1/catering/{response.json()['id']}/payments",json={'payment_date':'2026-11-01','amount':'25','method':'Zelle','payment_holder':'Zelle'})
            assert paid.status_code==201
    actor.role='staff'
    response=client.get('/api/v1/catering?start=2026-11-18&end=2026-11-20')
    assert response.status_code==200
    assert [order['event_date'] for order in response.json()]==['2026-11-20','2026-11-18']
    assert Decimal(response.json()[1]['paid_total'])==Decimal('25')
    assert response.json()[1]['payments'][0]['payment_date']=='2026-11-01'
    assert len(client.get('/api/v1/catering?start=2026-11-18&end=2026-11-18').json())==1
    assert client.get('/api/v1/catering?start=2026-12-01&end=2026-12-31').json()==[]
    assert len(client.get('/api/v1/catering').json())==4
    assert client.get('/api/v1/catering?start=2026-11-20&end=2026-11-18').status_code==422


@pytest.mark.parametrize('payer',['Owner 1','Owner 2'])
def test_cash_out_payer_is_independent_of_cash_collection_holder(workspace,payer):
    client,_,_=workspace
    created=client.post('/api/v1/daily-sales',json={'business_date':'2026-11-18','cash_sales':'100','payment_holder':'Owner 2','cash_out':'25.10','cash_out_holder':payer})
    assert created.status_code==201
    row=client.get('/api/v1/daily-sales').json()[0]
    assert row['payment_holder']=='Owner 2'
    assert row['cash_out_holder']==payer
    assert Decimal(row['cash_out'])==Decimal('25.10')
    assert Decimal(row['total_sales'])==Decimal('100')


def test_missing_cash_out_holder_stays_unassigned_and_invalid_holder_is_rejected(workspace):
    client,_,_=workspace
    row=client.post('/api/v1/daily-sales',json={'business_date':'2026-11-18','cash_out':'25','payment_holder':'Owner 1'}).json()
    assert row['cash_out_holder'] is None
    assert client.post('/api/v1/daily-sales',json={'business_date':'2026-11-19','cash_out':'25','cash_out_holder':'Zelle'}).status_code==422
