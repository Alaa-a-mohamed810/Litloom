// src/app/shared/library.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Book } from './book.model';

const STORAGE_KEY = 'litloom.library.v1';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly _books$ = new BehaviorSubject<Book[]>(this.load());
  readonly books$ = this._books$.asObservable();

  // ------- Core operations -------
  add(book: Book) {
    const books = this._books$.value;
    if (books.some(b => b.id === book.id)) return; // de-dupe
    const next = [{ ...book, status: book.status ?? 'unread', addedAt: new Date().toISOString() }, ...books];
    this._books$.next(next);
    this.save(next);
  }

  remove(id: string) {
    const next = this._books$.value.filter(b => b.id !== id);
    this._books$.next(next);
    this.save(next);
  }

  update(id: string, patch: Partial<Book>) {
    const next = this._books$.value.map(b => (b.id === id ? { ...b, ...patch } : b));
    this._books$.next(next);
    this.save(next);
  }

  clear() {
    this._books$.next([]);
    this.save([]);
  }

  // ------- Helpers -------
  toggleFavorite(id: string) {
    const item = this._books$.value.find(b => b.id === id);
    if (!item) return;
    this.update(id, { favorite: !item.favorite });
  }

  setStatus(id: string, status: Book['status']) {
    this.update(id, { status });
  }

  // Derived counts (handy for chips)
  counts$ = this.books$.pipe(
    map(list => ({
      total: list.length,
      reading: list.filter(b => b.status === 'reading').length,
      finished: list.filter(b => b.status === 'finished').length,
      favorites: list.filter(b => b.favorite).length,
    }))
  );

  // ------- Persistence -------
  private load(): Book[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Book[]) : [];
    } catch {
      return [];
    }
  }

  private save(next: Book[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  }
}
