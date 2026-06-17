import { Component, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigations',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navigations.html',
  styleUrl: './navigations.css',
})
export class Navigations {
  menuOpen = signal(false);
  scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 20);
  }

  toggle() {
    this.menuOpen.update((v) => !v);
    document.documentElement.style.overflow = this.menuOpen() ? 'hidden' : '';
  }

  close() {
    this.menuOpen.set(false);
    document.documentElement.style.overflow = '';
  }
}
