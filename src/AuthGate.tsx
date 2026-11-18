import {useEffect,useState,type FormEvent,type ReactNode} from 'react';
import {createClient,type SupabaseClient,type Session} from '@supabase/supabase-js';
import {request} from './api';

export function AuthGate({children}:{children:(client:SupabaseClient,session:Session)=>ReactNode}) {
  const [client,setClient]=useState<SupabaseClient|null>(null);
  const [session,setSession]=useState<Session|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;
    let unsubscribe:(()=>void)|undefined;
    const controller=new AbortController();
    setLoading(true);setError('');
    request<{url:string;publishable_key:string}>('/api/v1/auth/config',undefined,{signal:controller.signal}).then(async config=>{
      await request('/health/ready',undefined,{signal:controller.signal});
      if (!active) return;
      const supabase=createClient(config.url,config.publishable_key);
      setClient(supabase);
      const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{
        if (active) {setSession(next);setLoading(false);}
      });
      unsubscribe=()=>{subscription.unsubscribe();supabase.auth.stopAutoRefresh();};
    }).catch(e=>{if(active){setError(e.message);setLoading(false);}});
    return ()=>{active=false;controller.abort();unsubscribe?.();};
  },[retry]);
  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!client)return;
    const fields=new FormData(event.currentTarget);
    setBusy(true);setError('');
    try {
      const {error}=await client.auth.signInWithPassword({email:String(fields.get('email')),password:String(fields.get('password'))});
      if(error)throw error;
    } catch(e){setError(e instanceof Error?e.message:'Sign-in failed.');}
    finally{setBusy(false);}
  }
  if(client&&session) return children(client,session);
  return <main className="auth-page"><section className="auth-card"><h1>Dosthi Bandi</h1><p>Sign in to your restaurant workspace.</p>
    {loading?<p role="status">Checking sign-in and database connection…</p>:<>
      {error&&<p className="error-message" role="alert">{error}</p>}
      {client?<form onSubmit={login}><label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><small>Use an account provisioned by the workspace owner.</small></form>:<button className="primary" onClick={()=>setRetry(x=>x+1)}>Retry connection</button>}
    </>}
  </section></main>;
}
