import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth';
import { ApiService, BlogPost } from '../core/api';
import { RichEditor } from '../core/rich-editor';
import { ImageUpload } from '../core/image-upload';

interface PostForm {
  title: string; slug: string; excerpt: string; body: string;
  cover_url: string; cover_alt: string; published: boolean;
}

@Component({
  selector: 'app-blog-editor',
  imports: [FormsModule, RichEditor, ImageUpload],
  templateUrl: './blog-editor.html',
  styleUrl: './editor.css',
})
export class BlogEditor implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);

  items = signal<BlogPost[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  showForm = signal(false);
  editingId = signal<string | null>(null);
  private editingPublishedAt: string | null = null;

  form: PostForm = this.blank();

  async ngOnInit() { await this.load(); }

  private blank(): PostForm {
    return { title: '', slug: '', excerpt: '', body: '', cover_url: '', cover_alt: '', published: false };
  }

  async load() {
    const t = this.auth.token; if (!t) return;
    this.loading.set(true); this.error.set('');
    try { this.items.set(await this.api.listPostsAdmin(t)); }
    catch (e: any) { this.error.set(e.message || 'Could not load posts.'); }
    finally { this.loading.set(false); }
  }

  startAdd() {
    this.form = this.blank();
    this.editingPublishedAt = null;
    this.editingId.set(''); this.showForm.set(true); this.error.set('');
  }

  startEdit(p: BlogPost) {
    this.form = {
      title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body,
      cover_url: p.cover_url ?? '', cover_alt: p.cover_alt ?? '', published: !!p.published_at,
    };
    this.editingPublishedAt = p.published_at;
    this.editingId.set(p.id); this.showForm.set(true); this.error.set('');
  }

  cancel() { this.showForm.set(false); this.editingId.set(null); }

  // Auto-fill slug from the title while typing (only if slug is empty/untouched)
  onTitle() {
    if (!this.editingId() || !this.form.slug) {
      this.form.slug = this.slugify(this.form.title);
    }
  }

  private slugify(s: string): string {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async save() {
    const t = this.auth.token; if (!t) return;
    const f = this.form;
    if (!f.title.trim() || !f.excerpt.trim() || !f.body.trim()) {
      this.error.set('Title, excerpt and body are required.'); return;
    }
    const slug = (f.slug.trim() || this.slugify(f.title));
    if (!/^[a-z0-9-]+$/.test(slug)) { this.error.set('Slug can only contain lowercase letters, numbers and dashes.'); return; }

    // Toggle publish state: keep original publish date when re-saving an already-published post
    let published_at: string | null = null;
    if (f.published) published_at = this.editingPublishedAt || new Date().toISOString();

    const payload = {
      title: f.title.trim(), slug, excerpt: f.excerpt.trim(), body: f.body.trim(),
      cover_url: f.cover_url.trim() || null,
      cover_alt: f.cover_url.trim() ? (f.cover_alt.trim() || null) : null,
      published_at,
    };

    this.saving.set(true); this.error.set('');
    try {
      const id = this.editingId();
      if (id) await this.api.updatePost(id, payload, t);
      else await this.api.createPost(payload, t);
      this.showForm.set(false); this.editingId.set(null);
      await this.load();
    } catch (e: any) { this.error.set(e.message || 'Could not save post.'); }
    finally { this.saving.set(false); }
  }

  async remove(p: BlogPost) {
    const t = this.auth.token; if (!t) return;
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await this.api.deletePost(p.id, t);
      this.items.update((l) => l.filter((x) => x.id !== p.id));
    } catch (e: any) { this.error.set(e.message || 'Could not delete.'); }
  }

  formatDate(iso: string | null): string {
    if (!iso) return 'Draft';
    return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
