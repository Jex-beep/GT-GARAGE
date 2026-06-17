import { Component, OnInit, signal, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../core/reveal';
import { Icon } from '../core/icon';
import { SeoService } from '../core/seo';
import { ApiService, Service } from '../core/api';

interface SvcRow extends Service { icon?: string; }

const FALLBACK_SERVICES: SvcRow[] = [
  { icon: 'wrench', name: 'General Repair & Diagnostics', description: 'Full computer scan and hands-on inspection before any work begins. We tell you what we find — no pressure, no inflated list.', price_from: 'Ask us' },
  { icon: 'brake', name: 'Brake Service', description: 'Pads, rotors, drums, calipers and brake fluid exchange. Everything that keeps you safe when it matters most.', price_from: 'Ask us' },
  { icon: 'gear', name: 'Transmission Service', description: 'Automatic transmission flush using the proper machine, filter replacement, and full leak inspection.', price_from: 'Ask us' },
  { icon: 'bolt', name: 'Electrical & Tune-Up', description: 'Spark plugs, sensors, wiring faults, and battery health. Proper diagnosis before any parts are replaced.', price_from: 'Ask us' },
  { icon: 'snowflake', name: 'Air-con Service', description: 'Regas, leak detection, condenser and evaporator check. Cold aircon — the way it should be.', price_from: 'Ask us' },
  { icon: 'droplet', name: 'Oil Change & Fluid Service', description: 'Correct oil grade for your engine, oil filter, and full under-hood fluid check in one visit.', price_from: 'Ask us' },
  { icon: 'shock', name: 'Suspension & Steering', description: 'Shock absorbers, ball joints, tie rods, and alignment check. Smooth ride, straight tracking.', price_from: 'Ask us' },
  { icon: 'toolbox', name: 'Preventive Maintenance', description: 'PMS packages keeping your car in top shape between major services. Filters, belts, lights, and more.', price_from: 'Ask us' },
];

@Component({
  selector: 'app-services',
  imports: [RouterLink, RevealDirective, Icon],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services implements OnInit {
  services = signal<SvcRow[]>([]);
  loading = signal(true);

  faqOpen = signal<number | null>(0);

  private sanitizer = inject(DomSanitizer);
  private seo = inject(SeoService);
  constructor(private api: ApiService) {}

  safe(html: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(html || ''); }

  async ngOnInit() {
    this.seo.update({
      title: 'Auto Repair Services — GT Garage Mabalacat',
      description: 'Brakes, transmission, diagnostics, aircon, electrical, oil change, suspension and preventive maintenance. All makes and models — proper diagnosis before any repair.',
      path: '/services',
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

  toggleFaq(i: number) {
    this.faqOpen.set(this.faqOpen() === i ? null : i);
  }

  pad(n: number): string { return n < 10 ? '0' + n : '' + n; }
}
