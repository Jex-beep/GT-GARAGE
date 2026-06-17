import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface BookingPayload {
  customer_name: string; phone: string; email: string;
  problem: string; preferred_date: string; time_slot: string;
  recaptcha_token: string;
}
export interface Service { name: string; description: string; price_from: string; image_url?: string | null; }
// Full service row used by the admin editor
export interface ServiceFull {
  id: string; name: string; description: string; price_from: string;
  sort_order: number; image_url: string | null;
}
export interface BlogPost {
  id: string; title: string; slug: string; excerpt: string;
  body: string; cover_url: string | null; published_at: string | null;
}
export interface Booking {
  id: string; created_at: string; customer_name: string; phone: string;
  email: string; problem: string; preferred_date: string; time_slot: string;
  status: 'new' | 'confirmed' | 'done';
}

// PATCH response may carry the result of the confirmation email
export interface BookingUpdate extends Booking {
  email_sent?: boolean | null;
  email_error?: string | null;
}

// Admin calendar task
export interface Task {
  id: string;
  title: string;
  notes: string | null;
  due_date: string;   // YYYY-MM-DD
  done: boolean;
  created_at: string;
}

// Public, customer-facing view of a booking (safe subset of fields)
export interface BookingStatus {
  id: string;
  customer_name: string;
  preferred_date: string;
  time_slot: string;
  status: 'new' | 'confirmed' | 'done';
  admin_note: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  async createBooking(payload: BookingPayload): Promise<{ id: string }> {
    const res = await fetch(`${this.base}/api/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking failed');
    return data;
  }

  async trackBooking(id: string): Promise<BookingStatus> {
    const res = await fetch(`${this.base}/api/bookings/track/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking not found');
    return data;
  }

  async lookupBooking(email: string, phone: string): Promise<BookingStatus> {
    const res = await fetch(`${this.base}/api/bookings/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No booking found');
    return data;
  }

  async getServices(): Promise<Service[]> {
    const res = await fetch(`${this.base}/api/services`);
    if (!res.ok) throw new Error('Could not load services');
    return res.json();
  }

  // Public blog list — backend returns published posts only when no token is sent
  async getPostsPublic(): Promise<BlogPost[]> {
    const res = await fetch(`${this.base}/api/posts`);
    if (!res.ok) throw new Error('Could not load posts');
    return res.json();
  }

  async getBookings(token: string): Promise<Booking[]> {
    const res = await fetch(`${this.base}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new Error('Not authorized');
    if (!res.ok) throw new Error('Could not load bookings');
    return res.json();
  }

  async updateBookingStatus(
    id: string,
    status: Booking['status'],
    token: string,
    message?: string,
  ): Promise<BookingUpdate> {
    const res = await fetch(`${this.base}/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(message != null ? { status, message } : { status }),
    });
    if (!res.ok) throw new Error('Could not update booking');
    return res.json();
  }

  // ── SERVICES CMS (admin) ──────────────────────────────────────────────
  async listServicesAdmin(token: string): Promise<ServiceFull[]> {
    const res = await fetch(`${this.base}/api/services/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Could not load services');
    return res.json();
  }

  async createService(payload: Partial<ServiceFull>, token: string): Promise<ServiceFull> {
    return this.write('POST', `/api/services`, payload, token, 'Could not create service');
  }

  async updateService(id: string, payload: Partial<ServiceFull>, token: string): Promise<ServiceFull> {
    return this.write('PATCH', `/api/services/${id}`, payload, token, 'Could not update service');
  }

  async deleteService(id: string, token: string): Promise<void> {
    await this.del(`/api/services/${id}`, token, 'Could not delete service');
  }

  // ── BLOG CMS (admin) ──────────────────────────────────────────────────
  async listPostsAdmin(token: string): Promise<BlogPost[]> {
    const res = await fetch(`${this.base}/api/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Could not load posts');
    return res.json();
  }

  async createPost(payload: Partial<BlogPost>, token: string): Promise<BlogPost> {
    return this.write('POST', `/api/posts`, payload, token, 'Could not create post');
  }

  async updatePost(id: string, payload: Partial<BlogPost>, token: string): Promise<BlogPost> {
    return this.write('PATCH', `/api/posts/${id}`, payload, token, 'Could not update post');
  }

  async deletePost(id: string, token: string): Promise<void> {
    await this.del(`/api/posts/${id}`, token, 'Could not delete post');
  }

  // ── CALENDAR TASKS (admin) ────────────────────────────────────────────
  async listTasks(token: string): Promise<Task[]> {
    const res = await fetch(`${this.base}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Could not load tasks');
    return res.json();
  }

  async createTask(payload: Partial<Task>, token: string): Promise<Task> {
    return this.write('POST', `/api/tasks`, payload, token, 'Could not create task');
  }

  async updateTask(id: string, payload: Partial<Task>, token: string): Promise<Task> {
    return this.write('PATCH', `/api/tasks/${id}`, payload, token, 'Could not update task');
  }

  async deleteTask(id: string, token: string): Promise<void> {
    await this.del(`/api/tasks/${id}`, token, 'Could not delete task');
  }

  // ── IMAGE UPLOAD (admin) ──────────────────────────────────────────────
  async uploadImage(file: File, token: string): Promise<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${this.base}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets multipart boundary
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Image upload failed');
    return data;
  }

  // ── shared helpers ────────────────────────────────────────────────────
  private async write<T>(method: 'POST' | 'PATCH', path: string, payload: unknown, token: string, fallback: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || fallback);
    return data;
  }

  private async del(path: string, token: string, fallback: string): Promise<void> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || fallback);
    }
  }
}
