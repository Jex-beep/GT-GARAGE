import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

/**
 * Scroll-reveal directive.
 *   appReveal            → fade-up (default)
 *   appReveal="left"     → slide in from left
 *   appReveal="right"    → slide in from right
 *   appReveal="scale"    → scale up
 *   appReveal="fade"     → opacity only
 *   [revealDelay]="120"  → stagger delay in ms
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective implements OnInit {
  @Input('appReveal') variant: '' | 'up' | 'left' | 'right' | 'scale' | 'fade' = '';
  @Input() revealDelay = 0;

  private el = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    const node = this.el.nativeElement;
    node.classList.add('reveal');
    if (this.variant && this.variant !== 'up') node.classList.add('reveal-' + this.variant);
    if (this.revealDelay) node.style.transitionDelay = `${this.revealDelay}ms`;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            node.classList.add('in');
            io.unobserve(node);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(node);
  }
}
