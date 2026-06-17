import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth';
import { ApiService, ServiceFull } from '../core/api';
import { RichEditor } from '../core/rich-editor';
import { ImageUpload } from '../core/image-upload';

interface SvcForm { name: string; description: string; price_from: string; sort_order: number; image_url: string; }

@Component({
  selector: 'app-services-editor',
  imports: [FormsModule, RichEditor, ImageUpload],
  templateUrl: './services-editor.html',
  styleUrl: './editor.css',
})
export class ServicesEditor implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);

  items = signal<ServiceFull[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  showForm = signal(false);
  editingId = signal<string | null>(null);

  form: SvcForm = this.blank();

  async ngOnInit() { await this.load(); }

  private blank(): SvcForm { return { name: '', description: '', price_from: 'Ask us', sort_order: 0, image_url: '' }; }

  async load() {
    const t = this.auth.token; if (!t) return;
    this.loading.set(true); this.error.set('');
    try { this.items.set(await this.api.listServicesAdmin(t)); }
    catch (e: any) { this.error.set(e.message || 'Could not load services.'); }
    finally { this.loading.set(false); }
  }

  startAdd() { this.form = this.blank(); this.editingId.set(''); this.showForm.set(true); this.error.set(''); }

  startEdit(s: ServiceFull) {
    this.form = { name: s.name, description: s.description, price_from: s.price_from, sort_order: s.sort_order ?? 0, image_url: s.image_url ?? '' };
    this.editingId.set(s.id); this.showForm.set(true); this.error.set('');
  }

  cancel() { this.showForm.set(false); this.editingId.set(null); }

  async save() {
    const t = this.auth.token; if (!t) return;
    if (!this.form.name.trim() || !this.form.description.trim() || !this.form.price_from.trim()) {
      this.error.set('Name, description and price are required.'); return;
    }
    this.saving.set(true); this.error.set('');
    const payload = {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      price_from: this.form.price_from.trim(),
      sort_order: Number(this.form.sort_order) || 0,
      image_url: this.form.image_url.trim() || null,
    };
    try {
      const id = this.editingId();
      if (id) await this.api.updateService(id, payload, t);
      else await this.api.createService(payload, t);
      this.showForm.set(false); this.editingId.set(null);
      await this.load();
    } catch (e: any) { this.error.set(e.message || 'Could not save.'); }
    finally { this.saving.set(false); }
  }

  async remove(s: ServiceFull) {
    const t = this.auth.token; if (!t) return;
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    try {
      await this.api.deleteService(s.id, t);
      this.items.update((l) => l.filter((x) => x.id !== s.id));
    } catch (e: any) { this.error.set(e.message || 'Could not delete.'); }
  }

  // Plain-text preview for the list (description may contain HTML)
  plain(html: string): string {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
