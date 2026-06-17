import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

/** Counts a number up from 0 when scrolled into view. */
@Directive({ selector: '[appCounter]' })
export class CounterDirective implements OnInit {
  @Input('appCounter') target = 0;
  @Input() duration = 1400;
  private el = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    const node = this.el.nativeElement as HTMLElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.textContent = this.target.toLocaleString();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          io.unobserve(node);
          this.animate(node);
        }
      });
    }, { threshold: 0.6 });
    io.observe(node);
  }

  private animate(node: HTMLElement): void {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / this.duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      node.textContent = Math.round(ease * this.target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
