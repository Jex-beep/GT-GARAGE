import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigations } from './navigations/navigations';
import { Footer } from './footer/footer';
import { StickyCta } from './sticky-cta/sticky-cta';
import { ApiService } from './core/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navigations, Footer, StickyCta],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('GTGARAGE');
  private api = inject(ApiService);

  ngOnInit() {
    // Wake the free-tier backend as soon as the site loads, so it's ready by
    // the time the visitor reaches the booking form.
    this.api.warmup();
  }
}
