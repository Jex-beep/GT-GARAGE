import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

export interface SeoData {
  title: string;
  description: string;
  path?: string;          // e.g. '/services'
  image?: string;         // absolute or site-relative
  type?: 'website' | 'article';
  noindex?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private titleSvc = inject(Title);
  private doc = inject(DOCUMENT);

  private site = environment.siteUrl.replace(/\/$/, '');
  private defaultImage = `${this.site}/gt-garrage-office.jpg`;

  /** Set all per-page SEO tags in one call. */
  update(data: SeoData): void {
    const url = this.site + (data.path ?? '');
    const image = this.toAbsolute(data.image) || this.defaultImage;

    this.titleSvc.setTitle(data.title);
    this.name('description', data.description);
    this.name('robots', data.noindex ? 'noindex, nofollow' : 'index, follow');
    this.setCanonical(url);

    // Open Graph (Facebook, Messenger, etc.)
    this.property('og:title', data.title);
    this.property('og:description', data.description);
    this.property('og:url', url);
    this.property('og:type', data.type ?? 'website');
    this.property('og:image', image);
    this.property('og:site_name', 'GT Garage');
    this.property('og:locale', 'en_PH');

    // Twitter
    this.name('twitter:card', 'summary_large_image');
    this.name('twitter:title', data.title);
    this.name('twitter:description', data.description);
    this.name('twitter:image', image);
  }

  /** Inject (or replace) a JSON-LD structured-data block by id. */
  setJsonLd(id: string, data: unknown): void {
    this.clearJsonLd(id);
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.text = JSON.stringify(data);
    this.doc.head.appendChild(script);
  }

  clearJsonLd(id: string): void {
    this.doc.getElementById(id)?.remove();
  }

  private name(key: string, content: string): void {
    this.meta.updateTag({ name: key, content });
  }
  private property(key: string, content: string): void {
    this.meta.updateTag({ property: key, content });
  }
  private setCanonical(url: string): void {
    let link = this.doc.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
  private toAbsolute(img?: string): string | undefined {
    if (!img) return undefined;
    return /^https?:\/\//.test(img) ? img : this.site + (img.startsWith('/') ? img : '/' + img);
  }
}
