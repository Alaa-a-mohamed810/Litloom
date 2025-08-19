
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { TrackerService, ReadingSession } from '../../tracker-service'; // ← adjust if needed
import { FormsModule } from '@angular/forms';

type Timeframe = '7d' | '12w';

interface BarPoint {
  label: string;
  value: number;
  pct: number; // 0..100 for column height
}

interface PieSlice {
  label: string;
  minutes: number;
  color: string;
  pct: number; // 0..100 (rounded)
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, RouterLink,FormsModule],
  templateUrl: './stats.html',
  styleUrls: ['./stats.css'],
})
export class StatsComponent implements OnInit, OnDestroy {
  private sub = new Subscription();

  // raw
  sessions: ReadingSession[] = [];

  // KPIs (old names)
  totalMinutes = 0;
  totalPages = 0;
  longestStreak = 0;
  avgDailyMinutes = 0; // 30d avg

  // compare to goal (optional)
  dailyGoalMinutes = 30;
  cmpAvg7d = 0;
  cmpPercentOfGoal = 0;

  // activity chart
  timeframe: Timeframe = '7d';
  last7Bars: BarPoint[] = [];
  last12WeeksBars: BarPoint[] = [];

  // donut (top books)
  genrePie: PieSlice[] = [];
  genreStops = '';

  constructor(private tracker: TrackerService) {}

  ngOnInit(): void {
    this.sub.add(
      combineLatest([this.tracker.sessions$, this.tracker.settings$]).subscribe(
        ([sessions, settings]) => {
          this.sessions = Array.isArray(sessions) ? sessions : [];
          this.dailyGoalMinutes = Math.max(1, settings?.dailyGoalMinutes ?? 30);

          // KPIs
          this.totalMinutes = this.sessions.reduce((s, x) => s + (x.minutes || 0), 0);
          this.totalPages = this.sessions.reduce((s, x) => s + (x.pages || 0), 0);
          this.longestStreak = this.tracker.getCurrentStreak();
          this.avgDailyMinutes = this.avgDailyMinutesOver(this.sessions, 30, true);

          // charts
          this.last7Bars = this.buildLast7DaysBars(this.sessions);
          this.last12WeeksBars = this.buildLast12WeeksBars(this.sessions);

          // compare to goal
          const avg7 = this.avgDailyMinutesOver(this.sessions, 7, false);
          this.cmpAvg7d = Math.round(avg7);
          this.cmpPercentOfGoal = Math.min(100, Math.round((avg7 / this.dailyGoalMinutes) * 100));

          // donut
          const { slices, stops } = this.buildTopBooksDonut(this.sessions);
          this.genrePie = slices;
          this.genreStops = stops;
        }
      )
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ---------------- UI ----------------
  switchFrame(tf: Timeframe) {
    this.timeframe = tf;
  }

  // ------------- helpers --------------

  /** Average per day over last `days`. If fillEmptyDays=true, divides by `days`, else divides by count of days that had data. */
  private avgDailyMinutesOver(list: ReadingSession[], days: number, fillEmptyDays: boolean): number {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    const startIso = this.toIso(start);
    const endIso = this.toIso(end);

    const map = new Map<string, number>();
    // init zeros if fillEmptyDays
    if (fillEmptyDays) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        map.set(this.toIso(d), 0);
      }
    }
    for (const s of list) {
      if (s.date >= startIso && s.date <= endIso) {
        map.set(s.date, (map.get(s.date) || 0) + (s.minutes || 0));
      }
    }

    const vals = Array.from(map.values());
    if (fillEmptyDays) {
      const total = vals.reduce((a, b) => a + b, 0);
      return Math.round(total / days);
    } else {
      // only days with data
      const present = vals.filter(v => v > 0);
      const denom = present.length || days;
      const total = vals.reduce((a, b) => a + b, 0);
      return total / denom;
    }
  }

  private buildLast7DaysBars(list: ReadingSession[]): BarPoint[] {
    const today = new Date();
    const labels: string[] = [];
    const map = new Map<string, number>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = this.toIso(d);
      labels.push(this.shortDay(d)); // Mon, Tue
      map.set(iso, 0);
    }
    for (const s of list) {
      if (map.has(s.date)) {
        map.set(s.date, (map.get(s.date) || 0) + (s.minutes || 0));
      }
    }
    const values = Array.from(map.values());
    const max = Math.max(1, ...values);
    return values.map((v, i) => ({
      label: labels[i],
      value: v,
      pct: Math.round((v / max) * 100),
    }));
  }

  private buildLast12WeeksBars(list: ReadingSession[]): BarPoint[] {
    // last 12 full weeks, Monday→Sunday
    const weeks: { start: Date; end: Date; label: string }[] = [];
    let cursorEnd = this.endOfWeek(new Date());

    for (let i = 0; i < 12; i++) {
      const start = this.startOfWeek(cursorEnd);
      const label = this.weekLabel(start);
      weeks.unshift({ start, end: cursorEnd, label });
      const prev = new Date(start);
      prev.setDate(start.getDate() - 1);
      cursorEnd = this.endOfWeek(prev);
    }

    const sums = weeks.map(() => 0);
    for (const s of list) {
      for (let i = 0; i < weeks.length; i++) {
        const w = weeks[i];
        if (s.date >= this.toIso(w.start) && s.date <= this.toIso(w.end)) {
          sums[i] += (s.minutes || 0);
          break;
        }
      }
    }

    const max = Math.max(1, ...sums);
    return sums.map((v, i) => ({
      label: weeks[i].label, // e.g. Wk 34
      value: v,
      pct: Math.round((v / max) * 100),
    }));
  }

  private buildTopBooksDonut(list: ReadingSession[]): { slices: PieSlice[]; stops: string } {
    // minutes per bookTitle (fallback "Unknown")
    const acc = new Map<string, number>();
    for (const s of list) {
      const key = (s.bookTitle || 'Unknown').trim() || 'Unknown';
      acc.set(key, (acc.get(key) || 0) + (s.minutes || 0));
    }
    const entries = Array.from(acc.entries()).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 5);
    const other = entries.slice(5).reduce((sum, [, v]) => sum + v, 0);

    const total = Math.max(1, top.reduce((s, [, v]) => s + v, 0) + other);
    const palette = ['#0ea5a3', '#fb923c', '#60a5fa', '#f59e0b', '#a78bfa', '#94a3b8'];

    const slices: PieSlice[] = [
      ...top.map(([label, minutes], i) => ({
        label,
        minutes,
        color: palette[i % palette.length],
        pct: Math.round((minutes / total) * 100),
      })),
      ...(other > 0
        ? [
            {
              label: 'Other',
              minutes: other,
              color: palette[palette.length - 1],
              pct: Math.round((other / total) * 100),
            },
          ]
        : []),
    ];

    // conic-gradient stops: "color start% end%, ..."
    let cursor = 0;
    const stops: string[] = [];
    for (const s of slices) {
      const start = cursor;
      const end = cursor + s.pct;
      stops.push(`${s.color} ${start}% ${end}%`);
      cursor = end;
    }

    return { slices, stops: stops.join(', ') };
  }

  // ---------- date helpers ----------
  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private shortDay(d: Date): string {
    try {
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    } catch {
      // fallback
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[d.getDay()];
    }
  }

  private startOfWeek(d: Date): Date {
    // Monday as first day
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = (x.getDay() + 6) % 7; // 0=Mon..6=Sun
    x.setDate(x.getDate() - day);
    return x;
  }

  private endOfWeek(d: Date): Date {
    const s = this.startOfWeek(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }

  private weekLabel(start: Date): string {
    // "Wk NN"
    const oneJan = new Date(start.getFullYear(), 0, 1);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((start.getTime() - oneJan.getTime()) / msPerDay);
    const week = Math.floor((diffDays + ((oneJan.getDay() + 6) % 7)) / 7) + 1;
    return `Wk ${week}`;
  }
}
