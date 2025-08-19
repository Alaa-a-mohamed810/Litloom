import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription , combineLatest } from 'rxjs';
import { TrackerService , ReadingSession } from '../../tracker-service';
import { LibraryService } from '../../shared/library';
import { Book } from '../../shared/book.model';
import { RouterLink } from '@angular/router';

interface HeatCell {
  date: string;
  minutes: number;
  intensity: number; // 0..4
}

@Component({
  selector: 'app-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tracker.html',
  styleUrls: ['./tracker.css']
})
export class TrackerComponent implements OnInit, OnDestroy {
  // tracker data
  sessions: ReadingSession[] = [];
   visibleSessions: ReadingSession[] = [];   // ← use this in the table
  orphansCount = 0;
  totalMinutes = 0;
  totalPages = 0;
  totalSessions = 0;

  // settings
  dailyGoalMinutes = 30;
  goalToday = { goal: 30, minutes: 0, percent: 0 };
  currentStreak = 0;

  // heatmap
  heatmap: HeatCell[] = [];

  // form model
  newDate = this.isoToday();
  newMinutes: number | null = null;
  newPages: number | null = null;
  selectedBookId: string = '';
  newNotes = '';

  // books
  myBooks: Book[] = [];

  // dropdown state
  bookMenuOpen = false;

  private sub = new Subscription();

  constructor(
    private tracker: TrackerService,
    private library: LibraryService
  ) {}

  ngOnInit() {
    // subscribe to your library’s books
    this.sub.add(
      this.library.books$.subscribe(list => {
        this.myBooks = list ?? [];
        if (this.selectedBookId && !this.myBooks.find(b => b.id === this.selectedBookId)) {
          this.selectedBookId = '';
        }
      })
    );

    // sessions
    this.sub.add(
      this.tracker.sessions$.subscribe(list => {
        this.sessions = list;
        const totals = this.tracker.getTotals(list);
        this.totalMinutes = totals.minutes;
        this.totalPages = totals.pages;
        this.totalSessions = totals.sessions;
        this.refreshDerived();
      })
    );

    // settings
    this.sub.add(
      this.tracker.settings$.subscribe(s => {
        this.dailyGoalMinutes = s.dailyGoalMinutes;
        this.refreshDerived();
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  // ---------- Add / Remove ----------
  addSession() {
    if (!this.newMinutes || this.newMinutes <= 0) return;
    const chosen = this.myBooks.find(b => b.id === this.selectedBookId);

    this.tracker.addSession({
      date: this.newDate,
      minutes: this.newMinutes,
      pages: this.newPages ?? undefined,
      bookId: chosen?.id,
      bookTitle: chosen?.title,
      notes: this.newNotes?.trim() || undefined
    });

    // reset quick-add (keep date)
    this.newMinutes = null;
    this.newPages = null;
    this.selectedBookId = '';
    this.newNotes = '';
  }

  removeSession(id: string) {
    this.tracker.removeSession(id);
  }

  setDailyGoal(mins: number) {
    this.tracker.setDailyGoalMinutes(mins);
  }

  // ---------- Dropdown helpers ----------
  get selectedBook(): Book | undefined {
    return this.myBooks.find(b => b.id === this.selectedBookId);
  }

  toggleBookMenu() {
    this.bookMenuOpen = !this.bookMenuOpen;
  }

  closeBookMenu() {
    this.bookMenuOpen = false;
  }

  // add these inside TrackerComponent
openBookMenu(ev?: Event) {
  ev?.preventDefault();
  ev?.stopPropagation();
  this.bookMenuOpen = true;
}

chooseBook(id: string, ev?: Event) {
  ev?.preventDefault();
  ev?.stopPropagation();
  this.selectedBookId = id;
  this.bookMenuOpen = false; // close immediately
}


  getBookCover(id?: string): string | undefined {
    if (!id) return undefined;
    const b = this.myBooks.find(x => x.id === id);
    return (b as any)?.coverUrl as string | undefined;
  }

  // Close menu if user clicks outside dropdown
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement;
    if (!target.closest('.book-select')) this.bookMenuOpen = false;
  }

  // ---------- visuals ----------
  private refreshDerived() {
    this.goalToday = this.tracker.goalProgressToday();
    this.currentStreak = this.tracker.getCurrentStreak();
    this.heatmap = this.buildHeatmap(42);
  }

  private buildHeatmap(days: number): HeatCell[] {
    const map = this.tracker.getDailyMinutesMap(days);
    const result: HeatCell[] = [];
    let max = 0;
    map.forEach(v => (max = Math.max(max, v)));
    const scale = (v: number) => {
      if (v === 0) return 0;
      if (max <= 10) return 1;
      const r = v / max;
      if (r < 0.25) return 1;
      if (r < 0.5) return 2;
      if (r < 0.75) return 3;
      return 4;
    };
    map.forEach((minutes, date) => {
      result.push({ date, minutes, intensity: scale(minutes) });
    });
    return result;
  }

  private isoToday(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
