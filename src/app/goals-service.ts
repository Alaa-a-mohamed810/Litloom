import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type GoalType = 'minutesDaily' | 'pagesMonthly';

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  target: number;     // minutes for daily, pages for monthly
  createdAt: string;  // ISO date
  archived?: boolean; // completed/hidden from active list
}

const LS_KEY = 'litloom.goals.v1';

function makeId(): string {
  // Prefer crypto.randomUUID in modern browsers
  // @ts-ignore
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return 'goal_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function toIso(d = new Date()): string {
  return d.toISOString();
}

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly _goals = new BehaviorSubject<Goal[]>(this._load());
  /** All goals (active + archived), newest first */
  readonly goals$ = this._goals.asObservable();

  /** Only active goals */
  readonly active$ = this.goals$.pipe(
    map(list => list.filter(g => !g.archived))
  );

  /** Only archived/completed goals */
  readonly completed$ = this.goals$.pipe(
    map(list => list.filter(g => !!g.archived))
  );

  // ---------- CRUD ----------

  /** Original add signature you already use */
  add(goal: Omit<Goal, 'id' | 'createdAt'>) {
    const clean = this._validateForAdd(goal);
    const g: Goal = {
      id: makeId(),
      createdAt: toIso(),
      ...clean
    };
    const list = [g, ...this._goals.value];
    this._save(this._sort(list));
  }

  /** Convenience helper */
  addGoal(title: string, type: GoalType, target: number) {
    this.add({ title: title.trim(), type, target: Math.max(1, Math.floor(Number(target) || 0)) });
  }

  update(id: string, patch: Partial<Goal>) {
    const list = this._goals.value.map(g => {
      if (g.id !== id) return g;
      const next: Goal = { ...g, ...patch };
      // basic safety on updates
      if (next.title) next.title = String(next.title).trim();
      if (next.target != null) next.target = Math.max(1, Math.floor(Number(next.target) || 0));
      return next;
    });
    this._save(this._sort(list));
  }

  remove(id: string) {
    const list = this._goals.value.filter(g => g.id !== id);
    this._save(list);
  }

  // ---------- Friendly helpers ----------

  archive(id: string)   { this.update(id, { archived: true  }); }
  unarchive(id: string) { this.update(id, { archived: false }); }
  updateTitle(id: string, title: string) { this.update(id, { title: title?.trim() || 'Untitled goal' }); }
  setTarget(id: string, target: number)  { this.update(id, { target: Math.max(1, Math.floor(target || 0)) }); }

  /** Replace the whole set (useful for imports/migrations) */
  replaceAll(goals: Goal[]) {
    const cleaned = goals.map(g => this._sanitize(g));
    this._save(this._sort(cleaned));
  }

  /** Clear everything */
  clearAll() {
    this._save([]);
  }

  // ---------- Internal ----------

  private _save(list: Goal[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    this._goals.next(list);
  }

  private _load(): Goal[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const list: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];
      return this._sort(list.map(x => this._sanitize(x as Goal)));
    } catch {
      return [];
    }
  }

  private _sort(list: Goal[]): Goal[] {
    // newest first by createdAt, fallback by id
    return [...list].sort((a, b) => {
      const ta = a.createdAt || '';
      const tb = b.createdAt || '';
      if (ta !== tb) return tb.localeCompare(ta);
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  private _validateForAdd(input: Omit<Goal, 'id' | 'createdAt'>): Omit<Goal, 'id' | 'createdAt'> {
    const title = (input.title ?? '').trim() || 'Untitled goal';
    const type: GoalType = (input.type === 'pagesMonthly' ? 'pagesMonthly' : 'minutesDaily');
    const target = Math.max(1, Math.floor(Number(input.target) || 0));
    const archived = !!input.archived;
    return { title, type, target, archived };
    }

  private _sanitize(g: Goal): Goal {
    return {
      id: g?.id || makeId(),
      title: (g?.title ?? 'Untitled goal').trim(),
      type: g?.type === 'pagesMonthly' ? 'pagesMonthly' : 'minutesDaily',
      target: Math.max(1, Math.floor(Number(g?.target) || 0)),
      createdAt: g?.createdAt || toIso(),
      archived: !!g?.archived
    };
  }
}
