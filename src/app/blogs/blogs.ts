import { Component, OnInit, signal, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RevealDirective } from '../core/reveal';
import { SeoService } from '../core/seo';
import { ApiService, BlogPost } from '../core/api';

@Component({
  selector: 'app-blogs',
  imports: [RouterLink, RevealDirective],
  templateUrl: './blogs.html',
  styleUrl: './blogs.css',
})
export class Blogs implements OnInit {
  posts = signal<BlogPost[]>([]);
  selected = signal<BlogPost | null>(null);
  loading = signal(true);

  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);

  constructor(private api: ApiService) {}

  // Body is rich HTML authored in the admin editor (trusted)
  safe(html: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(html || ''); }

  async ngOnInit() {
    try { this.posts.set(await this.api.getPostsPublic()); }
    catch { this.posts.set([]); }
    finally { this.loading.set(false); }

    // Select the post that matches the URL slug; react to navigation between
    // /blogs and /blogs/:slug (the component is reused across both routes)
    this.route.paramMap.subscribe((pm) => {
      const slug = pm.get('slug');
      const post = slug ? this.posts().find((p) => p.slug === slug) ?? null : null;
      this.selected.set(post);
      this.applySeo(post);
      window.scrollTo(0, 0);
    });
  }

  private applySeo(post: BlogPost | null) {
    if (post) {
      this.seo.update({
        title: `${post.title} — GT Garage`,
        description: post.excerpt,
        path: `/blogs/${post.slug}`,
        image: post.cover_url || undefined,
        type: 'article',
      });
      this.seo.setJsonLd('blog-post', {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: post.cover_url || undefined,
        datePublished: post.published_at,
        author: { '@type': 'Organization', name: 'GT Garage' },
        publisher: { '@type': 'Organization', name: 'GT Garage' },
        mainEntityOfPage: `${(window.location.origin)}/blogs/${post.slug}`,
      });
    } else {
      this.seo.clearJsonLd('blog-post');
      this.seo.update({
        title: 'Car Care Blog — GT Garage Mabalacat',
        description: 'Maintenance tips, common fixes and straight talk about keeping your car healthy — from the people who work on them.',
        path: '/blogs',
      });
    }
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
