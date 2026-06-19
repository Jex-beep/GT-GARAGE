import { Component, OnInit, signal, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../core/reveal';
import { CounterDirective } from '../core/counter';
import { Icon } from '../core/icon';
import { SeoService } from '../core/seo';
import { ApiService, Service } from '../core/api';

interface HomeService extends Service { img?: string; icon?: string; }

const FALLBACK_SERVICES: HomeService[] = [
  {
    name: 'General Repair & Diagnostics',
    description: 'We scan and diagnose first — no guesswork, no wasted parts. You only pay for what your car actually needs.',
    price_from: 'Ask us',
    img: '/engine_of_a_car.jpg',
    icon: 'wrench',
  },
  {
    name: 'Brake Service',
    description: 'Pads, rotors, drums and fluid. Everything that keeps you and the car in front of you safe.',
    price_from: 'Ask us',
    img: '/break-of-a-car.jpg',
    icon: 'brake',
  },
  {
    name: 'Transmission & Maintenance',
    description: 'Automatic flush, filter change and full leak check using the right machine for the job.',
    price_from: 'Ask us',
    img: '/automatic-transmition-flush-macchine.jpg',
    icon: 'gear',
  },
];

@Component({
  selector: 'app-home',
  imports: [RouterLink, RevealDirective, CounterDirective, Icon],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  services = signal<HomeService[]>([]);
  loading = signal(true);

  // Makes we service — scrolls as a marquee. Repeated so each group is wide
  // enough to fill any screen (prevents a visible gap at the loop point).
  private makes = ['TOYOTA', 'MITSUBISHI', 'HONDA', 'NISSAN', 'FORD', 'HYUNDAI', 'ISUZU', 'SUZUKI', 'KIA', 'MAZDA'];
  marqueeRow = [...this.makes, ...this.makes, ...this.makes];

  private sanitizer = inject(DomSanitizer);
  private seo = inject(SeoService);
  constructor(private api: ApiService) {}

  safe(html: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(html || ''); }

  async ngOnInit() {
    this.seo.update({
      title: 'GT Garage — Honest Auto Repair in Mabalacat, Pampanga',
      description: 'Trusted auto repair in Mabalacat, Pampanga since 2021. Diagnostics, brakes, transmission, aircon and tune-ups for all makes and models. Book online — Maya accepted.',
      path: '/',
    });
    try {
      const raw = await this.api.getServices();
      this.services.set(raw.length ? raw : FALLBACK_SERVICES);
    } catch {
      this.services.set(FALLBACK_SERVICES);
    } finally {
      this.loading.set(false);
    }
  }
}
