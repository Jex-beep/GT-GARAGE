import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** Line-art SVG icons (stroke = currentColor). Use: <app-icon name="wrench" /> */
const PATHS: Record<string, string> = {
  wrench:   `<path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.6 2.6-2.5-.5-.5-2.5 2.6-2.6z"/>`,
  gear:     `<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.1-2.9H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.1-2.9l-.1-.1A2 2 0 1 1 7 5.2l.1.1a1.7 1.7 0 0 0 1.9.3H9A1.7 1.7 0 0 0 10 4V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z"/>`,
  brake:    `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/>`,
  bolt:     `<path d="M13 2 4.5 13.5H10l-1 8.5L19.5 10H13l1-8z"/>`,
  snowflake:`<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/><path d="M12 5.5 9.5 4M12 5.5 14.5 4M12 18.5 9.5 20M12 18.5 14.5 20"/>`,
  droplet:  `<path d="M12 3.2C12 3.2 5.5 9 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9 12 3.2 12 3.2z"/>`,
  shock:    `<rect x="9.5" y="2.5" width="5" height="5" rx="1"/><path d="M12 7.5v2M9.5 11h5M9.5 13.5h5M9.5 16h5M12 18v3.5"/>`,
  toolbox:  `<rect x="2.5" y="8" width="19" height="12.5" rx="1.5"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2.5 13h19M9.5 13v2M14.5 13v2"/>`,
  clipboard:`<rect x="6" y="4.5" width="12" height="16" rx="1.5"/><path d="M9 4.5V3.5h6v1M9.5 10.5h5M9.5 14h3.5"/>`,
  search:   `<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>`,
  car:      `<path d="M3 13.5l2-5.2A2 2 0 0 1 6.9 7h10.2a2 2 0 0 1 1.9 1.3l2 5.2M3 13.5v4.5h2.5M21 13.5v4.5h-2.5M3 13.5h18"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/>`,
  shield:   `<path d="M12 3l7 3v5c0 4.6-3 7.8-7 9-4-1.2-7-4.4-7-9V6l7-3z"/><path d="m9 12 2 2 4-4.5"/>`,
  tools:    `<path d="M3 21l5.5-5.5"/><path d="M14.5 4.2a3.4 3.4 0 0 1 4.8 4.8l-2.4-.7-1.2 1.2-2.1-2.1 1.2-1.2-.3-2z"/><path d="M14 10 8.5 15.5"/>`,
  card:     `<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M2.5 10h19M6.5 14.5h4"/>`,
  pin:      `<path d="M12 21s-6.5-5.4-6.5-10.5A6.5 6.5 0 0 1 18.5 10.5C18.5 15.6 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>`,
  chat:     `<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>`,
  award:    `<circle cx="12" cy="9" r="5.2"/><path d="M8.5 13.2 7 21l5-2.6L17 21l-1.5-7.8"/>`,
  heart:    `<path d="M12 20.3S4.5 15.5 4.5 9.9C4.5 7.3 6.4 5.5 8.7 5.5c1.5 0 2.7.8 3.3 1.9.6-1.1 1.8-1.9 3.3-1.9 2.3 0 4.2 1.8 4.2 4.4 0 5.6-7.5 10.4-7.5 10.4z"/>`,
  calendar: `<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8.5 3v4M15.5 3v4"/>`,
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<span class="ico" [innerHTML]="svg"></span>`,
  styles: [`:host{display:inline-flex;width:1.5em;height:1.5em;color:inherit}.ico{display:inline-flex;width:100%;height:100%}`],
})
export class Icon {
  private san = inject(DomSanitizer);
  svg: SafeHtml = '';

  @Input({ required: true }) set name(n: string) {
    const path = PATHS[n] || '';
    this.svg = this.san.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`,
    );
  }
}
