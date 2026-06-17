import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private client: SupabaseClient;
  session = signal<Session | null>(null);

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.client.auth.getSession().then(({ data }) => this.session.set(data.session));
    this.client.auth.onAuthStateChange((_e, session) => this.session.set(session));
  }
  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }
  async signOut(): Promise<void> { await this.client.auth.signOut(); this.session.set(null); }
  get token(): string | null { return this.session()?.access_token ?? null; }
  get isLoggedIn(): boolean { return !!this.session(); }
}
