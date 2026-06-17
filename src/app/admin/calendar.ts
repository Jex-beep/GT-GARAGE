import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth';
import { ApiService, Task } from '../core/api';

interface Cell { date: string; day: number; inMonth: boolean; isToday: boolean; tasks: Task[]; }

@Component({
  selector: 'app-calendar-view',
  imports: [FormsModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarView implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);

  tasks = signal<Task[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');

  private today = new Date();
  view = signal({ y: this.today.getFullYear(), m: this.today.getMonth() }); // m: 0–11

  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  selectedDate = signal<string>('');                              // YYYY-MM-DD
  form = { id: null as string | null, title: '', notes: '', done: false };

  monthLabel = computed(() => {
    const { y, m } = this.view();
    return new Date(y, m, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  });

  selectedDateLabel = computed(() => {
    const d = this.selectedDate();
    return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  });

  private byDate = computed(() => {
    const map = new Map<string, Task[]>();
    for (const t of this.tasks()) {
      const arr = map.get(t.due_date) || [];
      arr.push(t);
      map.set(t.due_date, arr);
    }
    return map;
  });

  weeks = computed<Cell[][]>(() => {
    const { y, m } = this.view();
    const map = this.byDate();
    const todayStr = this.iso(this.today);
    const startWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const cells: Cell[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevDays - i;
      const date = this.iso(new Date(y, m - 1, d));
      cells.push({ date, day: d, inMonth: false, isToday: false, tasks: map.get(date) || [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = this.iso(new Date(y, m, d));
      cells.push({ date, day: d, inMonth: true, isToday: date === todayStr, tasks: map.get(date) || [] });
    }
    let next = 1;
    while (cells.length % 7 !== 0) {
      const date = this.iso(new Date(y, m + 1, next));
      cells.push({ date, day: next, inMonth: false, isToday: false, tasks: map.get(date) || [] });
      next++;
    }
    const weeks: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  });

  selectedTasks = computed(() => this.byDate().get(this.selectedDate()) || []);

  async ngOnInit() { await this.load(); }

  private iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async load() {
    const t = this.auth.token; if (!t) return;
    this.loading.set(true); this.error.set('');
    try { this.tasks.set(await this.api.listTasks(t)); }
    catch (e: any) { this.error.set(e.message || 'Could not load tasks.'); }
    finally { this.loading.set(false); }
  }

  prevMonth() { const { y, m } = this.view(); this.view.set(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }); }
  nextMonth() { const { y, m } = this.view(); this.view.set(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }); }
  goToday() { this.view.set({ y: this.today.getFullYear(), m: this.today.getMonth() }); }

  selectDay(date: string) { this.selectedDate.set(date); this.resetForm(); this.error.set(''); }
  closeDay() { this.selectedDate.set(''); this.resetForm(); }

  startEdit(t: Task) { this.form = { id: t.id, title: t.title, notes: t.notes || '', done: t.done }; }
  resetForm() { this.form = { id: null, title: '', notes: '', done: false }; }

  async saveTask() {
    const token = this.auth.token; if (!token) return;
    if (!this.form.title.trim()) { this.error.set('Task needs a title.'); return; }
    this.saving.set(true); this.error.set('');
    const payload = {
      title: this.form.title.trim(),
      notes: this.form.notes.trim() || null,
      due_date: this.selectedDate(),
      done: this.form.done,
    };
    try {
      if (this.form.id) await this.api.updateTask(this.form.id, payload, token);
      else await this.api.createTask(payload, token);
      this.resetForm();
      await this.load();
    } catch (e: any) { this.error.set(e.message || 'Could not save task.'); }
    finally { this.saving.set(false); }
  }

  async toggleDone(t: Task) {
    const token = this.auth.token; if (!token) return;
    this.tasks.update((l) => l.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    try { await this.api.updateTask(t.id, { done: !t.done }, token); }
    catch {
      this.tasks.update((l) => l.map((x) => (x.id === t.id ? { ...x, done: t.done } : x)));
      this.error.set('Could not update task.');
    }
  }

  async removeTask(t: Task) {
    const token = this.auth.token; if (!token) return;
    if (!confirm(`Delete "${t.title}"? This cannot be undone.`)) return;
    try {
      await this.api.deleteTask(t.id, token);
      this.tasks.update((l) => l.filter((x) => x.id !== t.id));
    } catch (e: any) { this.error.set(e.message || 'Could not delete.'); }
  }
}
