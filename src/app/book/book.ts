import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../core/reveal';
import { SeoService } from '../core/seo';
import { ApiService, BookingPayload } from '../core/api';
import { environment } from '../../environments/environment';

declare const grecaptcha: any;

@Component({
  selector: 'app-book',
  imports: [FormsModule, RouterLink, RevealDirective],
  templateUrl: './book.html',
  styleUrl: './book.css',
})
export class Book implements OnInit {
  model: Omit<BookingPayload, 'recaptcha_token'> = {
    customer_name: '', phone: '', email: '', problem: '', preferred_date: '', time_slot: '',
  };
  today = new Date().toISOString().split('T')[0];
  sending = signal(false);
  done = signal(false);
  error = signal('');
  lastName = signal('');
  bookingId = signal('');
  copied = signal(false);

  private seo = inject(SeoService);
  constructor(private api: ApiService) {}

  ngOnInit() {
    this.seo.update({
      title: 'Book a Service — GT Garage Mabalacat',
      description: "Describe your car's problem and pick a time. We'll confirm your slot — usually the same day. All makes and models. Maya accepted.",
      path: '/book',
    });
    if (environment.recaptchaSiteKey && !document.querySelector('#recaptcha-script')) {
      const s = document.createElement('script');
      s.id = 'recaptcha-script';
      s.src = `https://www.google.com/recaptcha/api.js?render=${environment.recaptchaSiteKey}`;
      document.head.appendChild(s);
    }
  }

  private validate(): string | null {
    const m = this.model;
    if (m.customer_name.trim().length < 2) return 'Please enter your name.';
    if (!/^(\+?63|0)9\d{9}$/.test(m.phone.trim())) return 'Please enter a valid PH mobile number.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email.trim())) return 'Please enter a valid email.';
    if (m.problem.trim().length < 10) return 'Please describe the problem in a bit more detail.';
    if (!m.preferred_date) return 'Please pick a preferred date.';
    if (!m.time_slot) return 'Please choose a time slot.';
    return null;
  }

  private async getToken(): Promise<string> {
    if (!environment.recaptchaSiteKey || typeof grecaptcha === 'undefined') return 'dev';
    return new Promise((resolve) => {
      grecaptcha.ready(() => {
        grecaptcha.execute(environment.recaptchaSiteKey, { action: 'booking' }).then(resolve);
      });
    });
  }

  async submit() {
    this.error.set('');
    const problem = this.validate();
    if (problem) { this.error.set(problem); return; }
    this.sending.set(true);
    try {
      const token = await this.getToken();
      const res = await this.api.createBooking({ ...this.model, recaptcha_token: token });
      this.lastName.set(this.model.customer_name.split(' ')[0]);
      this.bookingId.set(res.id);
      this.done.set(true);
    } catch (e: any) {
      this.error.set(e.message || 'Something went wrong. Please try again.');
    } finally {
      this.sending.set(false);
    }
  }

  get trackUrl(): string {
    return `${location.origin}/track/${this.bookingId()}`;
  }

  get reference(): string {
    return this.bookingId().slice(0, 8).toUpperCase();
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(this.trackUrl);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      /* clipboard may be blocked; the link is still visible to copy manually */
    }
  }

  reset() {
    this.model = { customer_name: '', phone: '', email: '', problem: '', preferred_date: '', time_slot: '' };
    this.done.set(false); this.error.set(''); this.bookingId.set('');
  }
}
