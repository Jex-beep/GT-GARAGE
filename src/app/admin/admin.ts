import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth';
import { SeoService } from '../core/seo';
import { ApiService, Booking } from '../core/api';
import { ServicesEditor } from './services-editor';
import { BlogEditor } from './blog-editor';
import { CalendarView } from './calendar';

type Filter = 'all' | 'new' | 'confirmed' | 'done';
type Tab = 'bookings' | 'services' | 'blog' | 'calendar';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, ServicesEditor, BlogEditor, CalendarView],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  // ── Section tabs ──
  tab = signal<Tab>('bookings');
  // ── Auth ──
  email = '';
  password = '';
  busy = signal(false);

  // ── Data ──
  loading = signal(false);
  error = signal('');
  notice = signal('');   // transient success / warning banner
  bookings = signal<Booking[]>([]);

  // ── Filters ──
  filters: Filter[] = ['all', 'new', 'confirmed', 'done'];
  activeFilter = signal<Filter>('all');

  visible = computed(() => {
    const f = this.activeFilter();
    const list = this.bookings();
    return f === 'all' ? list : list.filter((b) => b.status === f);
  });

  // ── Status counts for the dashboard summary ──
  counts = computed(() => {
    const list = this.bookings();
    return {
      all: list.length,
      new: list.filter((b) => b.status === 'new').length,
      confirmed: list.filter((b) => b.status === 'confirmed').length,
      done: list.filter((b) => b.status === 'done').length,
    };
  });

  // ── Confirm modal ──
  confirmTarget = signal<Booking | null>(null);
  confirmMessage = '';
  confirming = signal(false);

  private seo = inject(SeoService);
  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.seo.update({ title: 'Admin — GT Garage', description: 'Staff area.', path: '/admin', noindex: true });
    if (this.auth.isLoggedIn) this.load();
  }

  async login() {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.signIn(this.email, this.password);
      this.password = '';
      await this.load();
    } catch (e: any) {
      this.error.set(e.message || 'Sign in failed.');
    } finally {
      this.busy.set(false);
    }
  }

  async logout() {
    await this.auth.signOut();
    this.bookings.set([]);
  }

  async load() {
    const token = this.auth.token;
    if (!token) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.bookings.set(await this.api.getBookings(token));
    } catch (e: any) {
      this.error.set(e.message || 'Could not load bookings.');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Confirm flow (opens modal so the admin can add a note) ──
  openConfirm(b: Booking) {
    this.confirmMessage = '';
    this.confirmTarget.set(b);
  }

  closeConfirm() {
    this.confirmTarget.set(null);
    this.confirmMessage = '';
  }

  async doConfirm() {
    const b = this.confirmTarget();
    const token = this.auth.token;
    if (!b || !token) return;

    this.confirming.set(true);
    this.notice.set('');
    try {
      const updated = await this.api.updateBookingStatus(
        b.id, 'confirmed', token, this.confirmMessage.trim() || undefined,
      );
      // Strip any extra fields before storing the booking row
      const { email_sent, email_error, ...booking } = updated;
      this.bookings.update((list) => list.map((x) => (x.id === b.id ? booking : x)));
      this.closeConfirm();
      this.notice.set(`Booking confirmed — ${b.customer_name} can now see it on their tracking page.`);
    } catch {
      this.error.set('Could not confirm that booking. Please try again.');
    } finally {
      this.confirming.set(false);
    }
  }

  // ── Plain status change (done / revert) — no email ──
  async setStatus(b: Booking, status: Booking['status']) {
    const token = this.auth.token;
    if (!token || status === b.status) return;

    // Route "confirmed" through the modal so a note can be attached
    if (status === 'confirmed') {
      this.openConfirm(b);
      return;
    }

    const previous = b.status;
    this.bookings.update((list) => list.map((x) => (x.id === b.id ? { ...x, status } : x)));
    try {
      await this.api.updateBookingStatus(b.id, status, token);
    } catch {
      this.bookings.update((list) => list.map((x) => (x.id === b.id ? { ...x, status: previous } : x)));
      this.error.set('Could not update that booking. Please try again.');
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  formatLongDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  slotLabel(slot: string): string {
    const map: Record<string, string> = {
      '08:00-10:00': '8:00 – 10:00 AM',
      '10:00-12:00': '10:00 AM – 12:00 NN',
      '13:00-15:00': '1:00 – 3:00 PM',
      '15:00-17:00': '3:00 – 5:00 PM',
    };
    return map[slot] || slot;
  }
}
