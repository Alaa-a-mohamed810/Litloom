import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { GoalsService, Goal, GoalType } from '../../goals-service';     // ← adjust path if needed
import { TrackerService, ReadingSession } from '../../tracker-service'; // ← adjust path if needed
import { RouterLink } from '@angular/router';

/** The shape the template expects for active goals */
interface DisplayGoal extends Goal {
  /** 0–100 */
  percent: number;
  /** current value for this period (mins or pages) */
  primaryValue: number;
  /** helper text below KPI */
  subtitle: string;
}

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './goals.html',
  styleUrls: ['./goals.css']
})
export class GoalsComponent implements OnInit, OnDestroy {
  // UI state (form)
  showAdd = false;
  newTitle = '';
  newType: GoalType = 'minutesDaily';
  newTarget: number | null = 30;

  // Lists for the template
  goals: DisplayGoal[] = [];       // active goals with computed fields
  completed: Goal[] = [];          // archived goals

  private sub = new Subscription();


  constructor(
    private goalsSvc: GoalsService,
    private tracker: TrackerService
  ) {}

  ngOnInit(): void {
    /**
     * React to goals and tracker sessions together.
     * We map active goals to DisplayGoal with live progress.
     */
    this.sub.add(
      combineLatest([this.goalsSvc.active$, this.tracker.sessions$]).subscribe(
        ([activeGoals, sessions]) => {
          this.goals = activeGoals.map(g => this.computeDisplayGoal(g, sessions));
        }
      )
    );

    // Archived/completed list
    this.sub.add(
      this.goalsSvc.completed$.subscribe(done => {
        this.completed = done;
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // --------------------- Add / Edit / Archive ---------------------

  addGoal(): void {
    const title = (this.newTitle || '').trim() || 'Untitled goal';
    const type = this.newType;
    const target = Math.max(1, Math.floor(Number(this.newTarget) || 0));
    this.goalsSvc.add({ title, type, target });

    // reset form
    this.newTitle = '';
    this.newType = 'minutesDaily';
    this.newTarget = 30;
    this.showAdd = false;
  }

  editTitle(g: Goal, newTitle: string): void {
    this.goalsSvc.updateTitle(g.id, newTitle);
  }

  archive(g: Goal): void {
    this.goalsSvc.archive(g.id);
  }

  unarchive(g: Goal): void {
    this.goalsSvc.unarchive(g.id);
  }

  remove(g: Goal): void {
    this.goalsSvc.remove(g.id);
  }

  // --------------------- Ring helpers for template ---------------------

  circumference(r: number): number {
    return 2 * Math.PI * r;
  }

  dashOffset(percent: number, r: number): number {
    const c = this.circumference(r);
    const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
    return c * (1 - p / 100);
  }
  clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
  }

  trackById(_i: number, g: Goal | DisplayGoal) {
    return g.id;
  }

  // --------------------- Calculations ---------------------

  private computeDisplayGoal(goal: Goal, sessions: ReadingSession[]): DisplayGoal {
    if (goal.type === 'minutesDaily') {
      const today = this.isoToday();
      const minutesToday = sessions
        .filter(s => s.date === today)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);

      const percent = this.toPercent(minutesToday, goal.target);
      const subtitle = 'Today';

      return {
        ...goal,
        percent,
        primaryValue: minutesToday,
        subtitle
      };
    }

    // pagesMonthly
    const { start, end } = this.currentMonthRangeIso();
    const pagesThisMonth = sessions
      .filter(s => s.date >= start && s.date <= end)
      .reduce((sum, s) => sum + (Number(s.pages) || 0), 0);

    const percent = this.toPercent(pagesThisMonth, goal.target);
    const subtitle = this.monthLabel();

    return {
      ...goal,
      percent,
      primaryValue: pagesThisMonth,
      subtitle
    };
  }

  private toPercent(value: number, target: number): number {
    if (!target || target <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
  }

  private isoToday(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private currentMonthRangeIso(): { start: string; end: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: this.toIso(start), end: this.toIso(end) };
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private monthLabel(): string {
    const now = new Date();
    return now.toLocaleString(undefined, { month: 'long' });
  }
}
