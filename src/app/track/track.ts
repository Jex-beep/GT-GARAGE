import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RevealDirective } from '../core/reveal';
import { SeoService } from '../core/seo';
import { ApiService, BookingStatus } from '../core/api';

@Component({
  selector: 'app-track',
  imports: [FormsModule, RouterLink, RevealDirective],
  templateUrl: './track.html',
  styleUrl: './track.css',
})
export class Track implements OnInit {
  email = '';
  phone = '';
  loading = signal(false);
  error = signal('');
  result = signal<BookingStatus | null>(null);

  private seo = inject(SeoService);
  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.seo.update({
      title: 'Track Your Booking — GT Garage',
      description: "Check your GT Garage booking status. Enter the email and phone you used to book, or open your tracking link, to see if it's confirmed.",
      path: '/track',
      noindex: true,   // customer-specific lookups — keep out of search results
    });
    // If the customer opened a direct tracking link (/track/:id), load it straight away
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadById(id);
  }

  async loadById(id: string) {
    this.loading.set(true);
    this.error.set('');
    try {
      this.result.set(await this.api.trackBooking(id));
    } catch (e: any) {
      this.error.set(e.message || 'Could not find that booking.');
    } finally {
      this.loading.set(false);
    }
  }

  async lookup() {
    this.error.set('');
    if (!this.email.trim() || !this.phone.trim()) {
      this.error.set('Please enter both your email and phone number.');
      return;
    }
    this.loading.set(true);
    try {
      this.result.set(await this.api.lookupBooking(this.email.trim(), this.phone.trim()));
    } catch (e: any) {
      this.result.set(null);
      this.error.set(e.message || 'No booking found.');
    } finally {
      this.loading.set(false);
    }
  }

  reset() {
    this.result.set(null);
    this.error.set('');
    this.email = '';
    this.phone = '';
  }

  // Step index for the progress tracker: new=0, confirmed=1, done=2
  stepIndex(s: BookingStatus['status']): number {
    return s === 'done' ? 2 : s === 'confirmed' ? 1 : 0;
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

  longDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  }
}
