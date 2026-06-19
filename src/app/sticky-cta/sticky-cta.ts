import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Persistent mobile booking CTA — fixed to the bottom of the viewport.
 * Conversion lever for local/mobile traffic: a primary action always in reach.
 * Hidden on the booking page itself and the admin area.
 */
@Component({
  selector: 'app-sticky-cta',
  imports: [RouterLink],
  templateUrl: './sticky-cta.html',
  styleUrl: './sticky-cta.css',
})
export class StickyCta {
  private router = inject(Router);
  show = signal(true);

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects.split('?')[0];
        // Don't show on the booking form or staff admin
        this.show.set(!(url.startsWith('/book') || url.startsWith('/admin')));
      });
  }
}
