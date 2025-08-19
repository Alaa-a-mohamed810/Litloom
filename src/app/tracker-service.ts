import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export interface ReadingSession {
  id: string;
  /** ISO date: 'YYYY-MM-DD' (local date, no time) */
  date: string;
  minutes: number;
  pages?: number;
  /** Optional links to My Books (lightweight so we don't depend on another service) */
  bookId?: string;
  bookTitle?: string;
  notes?: string;
}

export interface TrackerSettings {
  dailyGoalMinutes: number;
}

const SESSIONS_KEY = 'litloom.tracker.sessions';
const SETTINGS_KEY = 'litloom.tracker.settings';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function uuid(): string {
  // Works in modern browsers, fallback otherwise
  // @ts-ignore
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

@Injectable({ providedIn: 'root' })
export class TrackerService {
  private _sessions = new BehaviorSubject<ReadingSession[]>(this.loadSessions());
  readonly sessions$ = this._sessions.asObservable();

  private _settings = new BehaviorSubject<TrackerSettings>(this.loadSettings());
  readonly settings$ = this._settings.asObservable();

  // --------------- Persistence ---------------
  private loadSessions(): ReadingSession[] {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as ReadingSession[];
      // basic sanitize
      return Array.isArray(arr) ? arr.filter(s => s?.id && s?.date && s?.minutes >= 0) : [];
    } catch {
      return [];
    }
  }

  private saveSessions(list: ReadingSession[]) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  }

  private loadSettings(): TrackerSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { dailyGoalMinutes: 30 };
      const obj = JSON.parse(raw) as TrackerSettings;
      return {
        dailyGoalMinutes: Number(obj.dailyGoalMinutes) > 0 ? Math.floor(Number(obj.dailyGoalMinutes)) : 30,
      };
    } catch {
      return { dailyGoalMinutes: 30 };
    }
  }

  private saveSettings(s: TrackerSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  // --------------- CRUD ---------------
  addSession(input: {
    date?: string;
    minutes: number;
    pages?: number;
    bookId?: string;
    bookTitle?: string;
    notes?: string;
  }) {
    const list = [...this._sessions.value];
    const session: ReadingSession = {
      id: uuid(),
      date: input.date ?? todayIso(),
      minutes: Math.max(0, Math.floor(Number(input.minutes) || 0)),
      pages: input.pages != null ? Math.max(0, Math.floor(Number(input.pages))) : undefined,
      bookId: input.bookId,
      bookTitle: input.bookTitle?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
    list.push(session);
    // sort by date desc then id (stable-ish)
    list.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
    this._sessions.next(list);
    this.saveSessions(list);
    return session;
  }

  updateSession(id: string, patch: Partial<ReadingSession>) {
    const list = this._sessions.value.map(s => (s.id === id ? { ...s, ...patch } : s));
    this._sessions.next(list);
    this.saveSessions(list);
  }

  removeSession(id: string) {
    const list = this._sessions.value.filter(s => s.id !== id);
    this._sessions.next(list);
    this.saveSessions(list);
  }

  clearAll() {
    this._sessions.next([]);
    this.saveSessions([]);
  }

  // --------------- Settings ---------------
  setDailyGoalMinutes(mins: number) {
    const settings = { ...this._settings.value, dailyGoalMinutes: Math.max(5, Math.floor(mins || 0)) };
    this._settings.next(settings);
    this.saveSettings(settings);
  }

  // --------------- Derived metrics ---------------
  getTotals(list = this._sessions.value) {
    const minutes = list.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
    const pages = list.reduce((sum, s) => sum + (Number(s.pages) || 0), 0);
    return { minutes, pages, sessions: list.length };
  }

  /** Map YYYY-MM-DD -> total minutes that day (last `days` days including today) */
  getDailyMinutesMap(days = 42) {
    const map = new Map<string, number>();
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    // initialize range with zeros
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      map.set(this.toIso(d), 0);
    }
    // accumulate
    for (const s of this._sessions.value) {
      if (!map.has(s.date)) continue;
      map.set(s.date, (map.get(s.date) || 0) + (Number(s.minutes) || 0));
    }
    return map;
  }

  /** Current streak of consecutive days (ending today) with >0 minutes */
  getCurrentStreak(): number {
    let streak = 0;
    const map = this.getDailyMinutesMap(365); // up to a year
    const today = this.toIso(new Date());
    // walk backwards from today
    const d = new Date(today);
    while (true) {
      const iso = this.toIso(d);
      const mins = map.get(iso) || 0;
      if (mins > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  goalProgressToday() {
    const goal = this._settings.value.dailyGoalMinutes;
    const today = this.toIso(new Date());
    const minutes = this._sessions.value
      .filter(s => s.date === today)
      .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
    const percent = goal > 0 ? Math.min(100, Math.round((minutes / goal) * 100)) : 0;
    return { goal, minutes, percent };
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ============ NEW: Shared selectors for Goals/Tracker ============

  /** Public helper: ISO date for "today" (local) */
  isoToday(d: Date = new Date()): string {
    return this.toIso(d);
  }

  /** Observable of minutes for a specific ISO date (yyyy-mm-dd) */
  minutesForDate$(iso: string) {
    return this.sessions$.pipe(
      map(list =>
        list
          .filter(s => s.date === iso)
          .reduce((sum, s) => sum + (s.minutes || 0), 0)
      )
    );
  }

  /** Observable of total pages for a given month (0-based month index, full year) */
  pagesForMonth$(year: number, monthIndex0: number) {
    return this.sessions$.pipe(
      map(list =>
        list
          .filter(s => {
            if (s.pages == null) return false;
            const [yy, mm] = (s.date || '').split('-').map(Number);
            return yy === year && (mm - 1) === monthIndex0;
          })
          .reduce((sum, s) => sum + (s.pages || 0), 0)
      )
    );
  }

  /** Convenience: minutes read today (reactive) */
  minutesToday$() {
    return this.minutesForDate$(this.isoToday());
  }

  /** Convenience: pages read in the current month (reactive) */
  pagesThisMonth$() {
    const now = new Date();
    return this.pagesForMonth$(now.getFullYear(), now.getMonth());
  }
}
