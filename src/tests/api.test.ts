import {afterEach,describe,expect,it,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {allRecords,request,sumMoney} from '../api';
const client={auth:{getSession:vi.fn(async()=>({data:{session:{access_token:'test-user-token'}},error:null}))}} as unknown as SupabaseClient;
afterEach(()=>vi.unstubAllGlobals());

describe('database API client',()=>{
  it('sends the user token with JSON mutations',async()=>{
    const fetch=vi.fn(async()=>new Response(JSON.stringify({id:'saved'}),{status:201}));
    vi.stubGlobal('fetch',fetch);
    expect(await request('/api/v1/daily-sales',client,{method:'POST',body:'{}'})).toEqual({id:'saved'});
    const options=fetch.mock.calls[0] as unknown as [string,RequestInit];
    expect(new Headers(options[1].headers).get('Authorization')).toBe('Bearer test-user-token');
    expect(new Headers(options[1].headers).get('Content-Type')).toBe('application/json');
  });
  it('does not silently fall back to demo data after failure',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>{throw new TypeError('Network failed');}));
    await expect(request('/api/v1/daily-sales',client)).rejects.toThrow('Cannot reach the API');
  });
  it('surfaces backend validation and permissions errors',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({detail:'Insufficient permissions'}),{status:403})));
    await expect(request('/api/v1/expenses',client)).rejects.toThrow('Insufficient permissions');
  });
  it('never sends an unauthenticated data request when a session is missing',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    const signedOut={auth:{getSession:async()=>({data:{session:null},error:null})}} as unknown as SupabaseClient;
    await expect(request('/api/v1/daily-sales',signedOut)).rejects.toThrow('session has expired');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('loads later pages rather than silently truncating dashboard totals',async()=>{
    const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(Array.from({length:500},(_,id)=>({id}))))).mockResolvedValueOnce(new Response(JSON.stringify([{id:500}])));
    vi.stubGlobal('fetch',fetch);
    const rows=await allRecords('/api/v1/daily-sales?start=2026-01-01',client,new AbortController().signal);
    expect(rows).toHaveLength(501);
    expect(fetch.mock.calls[1][0]).toContain('start=2026-01-01&offset=500&limit=500');
  });
  it('fails the whole load if a later page fails',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(Array(500).fill({})))).mockResolvedValueOnce(new Response(JSON.stringify({detail:'Database unavailable'}),{status:503})));
    await expect(allRecords('/api/v1/daily-sales',client,new AbortController().signal)).rejects.toThrow('Database unavailable');
  });
});

describe('money totals',()=>{
  it('sums decimal API amounts and signed cash movements in cents',()=>{
    expect(sumMoney(['620.12','920.25','310.08'])).toBe(1850.45);
    expect(sumMoney(['75.10',-40.05])).toBe(35.05);
    expect(sumMoney(['0.10','0.20'])).toBe(0.30);
    expect(sumMoney([])).toBe(0);
  });
});
