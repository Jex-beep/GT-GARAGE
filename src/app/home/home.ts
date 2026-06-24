import { Component, OnInit, signal, inject, ElementRef, NgZone, DestroyRef, afterNextRender } from '@angular/core';
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
  private host = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  constructor(private api: ApiService) {
    // Browser-only: wire the hero's cursor-tilt + parallax + scroll motion.
    afterNextRender(() => this.initHeroMotion());
  }

  safe(html: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(html || ''); }

  /**
   * Drives the hero's CSS custom properties (--px/--py from the pointer, --sy
   * from scroll) so the gauge tilts in 3D, layers parallax, and the copy fades
   * out on scroll. Listeners run outside Angular (no change-detection churn),
   * are rAF-throttled, respect prefers-reduced-motion, and clean up on destroy.
   */
  private initHeroMotion() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = this.host.nativeElement.querySelector('.hero') as HTMLElement | null;
    if (!hero) return;

    let px = 0, py = 0, pRaf = 0, sRaf = 0;
    const applyPointer = () => { pRaf = 0; hero.style.setProperty('--px', px.toFixed(3)); hero.style.setProperty('--py', py.toFixed(3)); };
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!pRaf) pRaf = requestAnimationFrame(applyPointer);
    };
    const onLeave = () => { px = py = 0; hero.style.setProperty('--px', '0'); hero.style.setProperty('--py', '0'); };
    const onScroll = () => {
      if (sRaf) return;
      sRaf = requestAnimationFrame(() => { sRaf = 0; hero.style.setProperty('--sy', String(window.scrollY)); });
    };

    this.zone.runOutsideAngular(() => {
      hero.addEventListener('mousemove', onMove, { passive: true });
      hero.addEventListener('mouseleave', onLeave);
      window.addEventListener('scroll', onScroll, { passive: true });
    });

    this.destroyRef.onDestroy(() => {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      if (pRaf) cancelAnimationFrame(pRaf);
      if (sRaf) cancelAnimationFrame(sRaf);
    });
  }

  async ngOnInit() {
    this.seo.update({
      title: 'GT Garage — Honest Auto Repair in Mabalacat, Pampanga',
      description: 'Trusted auto repair in Mabalacat, Pampanga since 2016. Diagnostics, brakes, transmission, aircon and tune-ups for all makes and models. Book online — Maya accepted.',
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
