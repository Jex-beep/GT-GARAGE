import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BlogPost } from './api';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient;
  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }
  async getPosts(): Promise<BlogPost[]> {
    const { data, error } = await this.client
      .from('posts')
      .select('id, title, slug, excerpt, body, cover_url, published_at')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false });
    if (error) throw error;
    return data as BlogPost[];
  }
}
