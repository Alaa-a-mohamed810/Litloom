// src/app/library-service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Book } from './shared/book.model';
import { UserStorageService } from './user-storage-service';
import { AuthService } from './auth-service';

export type ReadingStatus = 'unread' | 'reading' | 'finished';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private storage = inject(UserStorageService);
  private auth = inject(AuthService);

  private readonly LIB_KEY = 'library';

  // state
  private itemsSubject = new BehaviorSubject<Book[]>(
    this.storage.get<Book[]>(this.LIB_KEY, [])
  );

  /** Observable list of books in the user’s library */
  public readonly list$ = this.itemsSubject.asObservable();

  /** Backward-compat alias (some code might still import `books$`) */
  public readonly books$ = this.list$;

  /** Derived counts for quick UI badges */
  public readonly counts$ = this.list$.pipe(
    map(books => ({
      total: books.length,
      reading: books.filter(b => b.status === 'reading').length,
      finished: books.filter(b => b.status === 'finished').length,
      favorites: books.filter(b => b.favorite).length
    }))
  );

  constructor() {
    // When the logged-in user changes, load that user's library
    this.auth.currentUser$.subscribe(() => {
      const data = this.storage.get<Book[]>(this.LIB_KEY, []);
      this.itemsSubject.next(data);
    });
  }

  /** Snapshot getter */
  list(): Book[] {
    return [...this.itemsSubject.value];
  }

  /** Add a book if not already present (by id) */
  add(book: Book): void {
    const items = this.list();
    const id = String(book.id);
    if (!items.some(b => String(b.id) === id)) {
      items.push(book);
      this.commit(items);
    }
  }

  /** Remove by id */
  remove(id: string | number): void {
    const items = this.list().filter(b => String(b.id) !== String(id));
    this.commit(items);
  }

  /** Toggle favorite */
  toggleFavorite(id: string | number): void {
    const items = this.list().map(b =>
      String(b.id) === String(id) ? { ...b, favorite: !b.favorite } : b
    );
    this.commit(items);
  }

  /** Set reading status */
  setStatus(id: string | number, status: ReadingStatus): void {
    const items = this.list().map(b =>
      String(b.id) === String(id) ? { ...b, status } : b
    );
    this.commit(items);
  }

  /** Update any book fields */
  update(id: string | number, partial: Partial<Book>): void {
    const items = this.list().map(b =>
      String(b.id) === String(id) ? { ...b, ...partial } : b
    );
    this.commit(items);
  }

  /** Clear the library for the current user */
  clear(): void {
    this.commit([]);
  }

  /** Persist + emit */
  private commit(items: Book[]) {
    this.itemsSubject.next(items);
    this.storage.set(this.LIB_KEY, items); // saved under litloom:<email>:library
  }
}
