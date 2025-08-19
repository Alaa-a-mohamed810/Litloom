import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import { LibraryService } from '../../shared/library';
import { Book } from '../../shared/book.model';
import { BookDialog } from '../../shared/book-dialog/book-dialog';

type Filter = 'all' | 'reading' | 'finished' | 'unread' | 'favorites';

@Component({
  selector: 'app-my-books',
  standalone: true,
  imports: [CommonModule, FormsModule, BookDialog],
  templateUrl: './my-books.html',
  styleUrls: ['./my-books.css']
})
export class MyBooksComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  books$!: Observable<Book[]>;
  counts$!: Observable<{ total: number; reading: number; finished: number; favorites: number }>;
  filtered$!: Observable<Book[]>; // assigned in constructor

  public readonly filter$ = new BehaviorSubject<Filter>('all');

  // add-new dropdown state
  showAdd = false;
  newBook: Partial<Book> = { title: '', author: '', coverUrl: '', description: '' };
  previewDataUrl: string | null = null;
  loadingImage = false;

  // dialog state
  selectedBook: Book | null = null;

  constructor(public library: LibraryService) {
    // Support either the new service (list$) or your old one (books$)
    const source$ = (this.library as any).list$ ?? (this.library as any).books$;
    this.books$ = source$ as Observable<Book[]>;

    // compute counts from books$
    this.counts$ = this.books$.pipe(
      map(books => ({
        total: books.length,
        reading: books.filter(b => b.status === 'reading').length,
        finished: books.filter(b => b.status === 'finished').length,
        favorites: books.filter(b => b.favorite).length
      }))
    );

    // create filtered$ AFTER books$ is set
    this.filtered$ = combineLatest([this.filter$, this.books$]).pipe(
      map(([f, books]) => {
        switch (f) {
          case 'favorites': return books.filter(b => b.favorite);
          case 'reading':   return books.filter(b => b.status === 'reading');
          case 'finished':  return books.filter(b => b.status === 'finished');
          case 'unread':    return books.filter(b => (b.status ?? 'unread') === 'unread');
          default:          return books;
        }
      })
    );
  }

  // NEW: used by the filter buttons in the template
  setFilter = (f: Filter) => this.filter$.next(f);

  // library actions
  toggleFavorite(id: string) { this.library.toggleFavorite(id); }
  setStatus(id: string, s: Book['status']) { this.library.setStatus(id, s); }
  remove(id: string) { this.library.remove(id); }

  // add-new dropdown
  addNewBook() { this.showAdd = !this.showAdd; }

  onFileChosen(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loadingImage = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewDataUrl = String(reader.result);
      this.loadingImage = false;
    };
    reader.onerror = () => { this.loadingImage = false; };
    reader.readAsDataURL(file);
  }

  submitNewBook() {
    const title = (this.newBook.title || '').trim();
    if (!title) { alert('Please enter a title.'); return; }

    const coverUrl = this.previewDataUrl || (this.newBook.coverUrl || '').trim() || undefined;
    const author = (this.newBook.author || '').trim() || 'Unknown';
    const description = (this.newBook.description || '').trim() || undefined;
    const id = this.makeId(title, author);

    this.library.add({ id, title, author, coverUrl, description, status: 'unread', favorite: false });

    // reset & close
    this.newBook = { title: '', author: '', coverUrl: '', description: '' };
    this.previewDataUrl = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
    this.showAdd = false;
  }

  // dialog handlers
  openDetails(b: Book) { this.selectedBook = b; }
  closeDetails() { this.selectedBook = null; }
  onAddToLibraryFromDialog(b: Book) { this.library.setStatus(b.id, 'reading'); this.closeDetails(); }
  onAddToCartFromDialog(_b: Book) { this.closeDetails(); }

  private makeId(title: string, author: string) {
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${slug(title)}-${slug(author)}-${Date.now().toString(36)}`;
  }
}
