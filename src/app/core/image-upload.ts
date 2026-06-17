import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { AuthService } from './auth';
import { ApiService } from './api';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  template: `
    <div class="iu">
      @if (value) {
        <div class="iu-preview">
          <img [src]="value" alt="Selected image">
          <button type="button" class="iu-remove" (click)="clear()" aria-label="Remove image">✕</button>
        </div>
      }
      <div class="iu-controls">
        <label class="iu-btn">
          {{ uploading() ? 'Uploading…' : (value ? 'Replace image' : 'Upload image') }}
          <input type="file" accept="image/*" (change)="onPick($event)" [disabled]="uploading()" hidden>
        </label>
        @if (error()) { <span class="iu-err">{{ error() }}</span> }
      </div>
    </div>
  `,
  styles: [`
    .iu { display: flex; flex-direction: column; gap: 10px; }
    .iu-preview { position: relative; width: fit-content; }
    .iu-preview img { max-height: 130px; max-width: 100%; border-radius: 4px; border: 1px solid var(--steel-200); display: block; }
    .iu-remove { position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; border-radius: 50%; border: none; background: rgba(12,14,17,.8); color: #fff; cursor: pointer; font-size: .8rem; }
    .iu-remove:hover { background: var(--red); }
    .iu-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .iu-btn { display: inline-block; font-family: var(--font-display); text-transform: uppercase; letter-spacing: .04em; font-size: .82rem; padding: 9px 18px; border: 1px solid var(--steel-200); border-radius: 2px; cursor: pointer; color: var(--steel-700); transition: border-color .15s, color .15s; }
    .iu-btn:hover { border-color: var(--blue); color: var(--blue); }
    .iu-err { color: var(--red); font-size: .85rem; }
  `],
})
export class ImageUpload {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  uploading = signal(false);
  error = signal('');

  private auth = inject(AuthService);
  private api = inject(ApiService);

  async onPick(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const token = this.auth.token;
    if (!file || !token) return;
    this.uploading.set(true);
    this.error.set('');
    try {
      const { url } = await this.api.uploadImage(file, token);
      this.value = url;
      this.valueChange.emit(url);
    } catch (err: any) {
      this.error.set(err.message || 'Upload failed.');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  clear() {
    this.value = '';
    this.valueChange.emit('');
  }
}
