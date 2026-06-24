import {
  Component, ElementRef, Input, Output, EventEmitter,
  AfterViewInit, OnDestroy, ViewChild, inject,
} from '@angular/core';
import Quill from 'quill';
import { AuthService } from './auth';
import { ApiService } from './api';

// Make Quill emit inline styles for alignment so formatting survives outside the editor
const AlignStyle = Quill.import('attributors/style/align') as any;
Quill.register(AlignStyle, true);

@Component({
  selector: 'app-rich-editor',
  standalone: true,
  template: `<div class="re-wrap"><div #host></div></div>`,
  styles: [`
    .re-wrap { background: #fff; border-radius: 2px; }
    :host ::ng-deep .ql-toolbar { border-color: var(--steel-200); border-radius: 2px 2px 0 0; background: var(--paper); }
    :host ::ng-deep .ql-container { border-color: var(--steel-200); border-radius: 0 0 2px 2px; font-family: var(--font-body); font-size: 1rem; }
    :host ::ng-deep .ql-editor { min-height: 160px; line-height: 1.7; color: var(--steel-900); }
    :host ::ng-deep .ql-editor.compact { min-height: 90px; }
    :host ::ng-deep .ql-editor img { display: block; width: 100%; max-width: 480px; aspect-ratio: 16 / 10; height: auto; object-fit: cover; margin: 1.2em auto; border-radius: 8px; border: 1px solid var(--steel-100); box-shadow: 0 10px 24px rgba(20,24,29,.18); }
    :host ::ng-deep .ql-snow .ql-stroke { stroke: var(--steel-700); }
    :host ::ng-deep .ql-snow.ql-toolbar button:hover .ql-stroke,
    :host ::ng-deep .ql-snow .ql-toolbar button.ql-active .ql-stroke { stroke: var(--blue-deep); }
  `],
})
export class RichEditor implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  @Input() value = '';
  @Input() compact = false;
  @Input() placeholder = 'Write here…';
  @Output() valueChange = new EventEmitter<string>();

  private quill?: Quill;
  private auth = inject(AuthService);
  private api = inject(ApiService);

  ngAfterViewInit(): void {
    const toolbar = this.compact
      ? [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], [{ align: [] }], ['link'], ['clean']]
      : [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['link', 'image'],
          ['clean'],
        ];

    this.quill = new Quill(this.host.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder,
      modules: { toolbar: { container: toolbar, handlers: { image: () => this.uploadInlineImage() } } },
    });

    if (this.compact) this.quill.root.classList.add('compact');
    if (this.value) this.quill.clipboard.dangerouslyPasteHTML(this.value);

    this.quill.on('text-change', () => {
      const empty = this.quill!.getText().trim().length === 0 &&
        this.quill!.root.querySelectorAll('img').length === 0;
      this.valueChange.emit(empty ? '' : this.quill!.root.innerHTML);
    });
  }

  ngOnDestroy(): void { this.quill = undefined; }

  private uploadInlineImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      const token = this.auth.token;
      if (!file || !token || !this.quill) return;
      const range = this.quill.getSelection(true);
      // placeholder text while uploading
      this.quill.insertText(range.index, 'Uploading image…', 'italic', true);
      try {
        const { url } = await this.api.uploadImage(file, token);
        this.quill.deleteText(range.index, 'Uploading image…'.length);
        this.quill.insertEmbed(range.index, 'image', url, 'user');
        // Ask the admin to describe every image (alt text) for screen readers + SEO
        const alt = (window.prompt(
          'Describe this image (alt text) — helps screen readers and SEO:', '') || '').trim();
        if (alt) this.quill.formatText(range.index, 1, 'alt', alt, 'user');
        this.quill.setSelection(range.index + 1, 0);
      } catch {
        this.quill.deleteText(range.index, 'Uploading image…'.length);
        alert('Image upload failed. Please try again.');
      }
    };
    input.click();
  }
}
