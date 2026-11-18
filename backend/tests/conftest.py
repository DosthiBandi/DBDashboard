import os

# Never use a developer's configured Supabase database during automated tests.
os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['SUPABASE_URL'] = ''
os.environ['SUPABASE_PUBLISHABLE_KEY'] = ''
os.environ['SUPABASE_ANON_KEY'] = ''
os.environ['DEV_BEARER_TOKEN'] = ''
os.environ['DEV_USER_ID'] = ''
