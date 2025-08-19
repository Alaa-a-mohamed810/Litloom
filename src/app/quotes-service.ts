import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, map, switchMap, takeUntil, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface Quote { text: string; author?: string | null }

@Injectable({ providedIn: 'root' })
export class QuotesService {
  private http = inject(HttpClient);

  // 👇 Hardcoded Fake API (DummyJSON)
  private API_URL = 'https://dummyjson.com/quotes?limit=50';

  // State
  private quotes$ = new BehaviorSubject<Quote[]>([]);
  private activeIndex$ = new BehaviorSubject<number>(0);
  private rotating = false;
  private stop$ = new Subject<void>();

  // Public stream: current quote
  currentQuote$: Observable<Quote> = this.activeIndex$.pipe(
    switchMap(i =>
      this.quotes$.pipe(
        map(list => list.length ? list[i % list.length] : ({ text: 'Loading quotes…', author: '' }))
      )
    )
  );

  // Init from API
  async init() {
    const savedIndex = Number(localStorage.getItem('quote:index') ?? 0);
    const savedMuted = localStorage.getItem('quote:muted') === '1';

    try {
      const raw: any = await firstValueFrom(this.http.get(this.API_URL));
      // DummyJSON shape: { quotes: [{ quote, author }, ...] }
      const list: Quote[] = Array.isArray(raw?.quotes)
        ? raw.quotes.map((r: any) => ({ text: r?.quote, author: r?.author }))
        : [];
      this.quotes$.next(list);
    } catch {
      this.quotes$.next([]);
    }

    this.setIndex(savedIndex);
    if (!savedMuted) this.startAutoRotate(); // start auto-rotation by default
  }

  // Controls
  next()  { const L=this.quotes$.value.length; if(L) this.setIndex((this.activeIndex$.value+1)%L); }
  prev()  { const L=this.quotes$.value.length; if(L) this.setIndex((this.activeIndex$.value-1+L)%L); }
  random(){ const L=this.quotes$.value.length; if(L) this.setIndex(Math.floor(Math.random()*L)); }

  // Auto-rotation
  startAutoRotate(ms=10000){
    if (this.rotating) return;
    this.rotating = true;
    interval(ms).pipe(takeUntil(this.stop$)).subscribe(() => this.next());
    localStorage.setItem('quote:muted','0');
  }
  stopAutoRotate(){
    if (!this.rotating) return;
    this.rotating = false;
    this.stop$.next();
    localStorage.setItem('quote:muted','1');
  }
  isRotating(){ return this.rotating; }

  // Helper
  private setIndex(i:number){ this.activeIndex$.next(i); localStorage.setItem('quote:index', String(i)); }
}
