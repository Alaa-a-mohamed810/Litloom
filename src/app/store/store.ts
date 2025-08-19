import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { BookService, Book } from '../book-service';
import { StoreService } from '../store-service';

// ⬇️ Shared Library glue
import { LibraryService } from '../shared/library';                
import { Book as LibraryBook } from '../shared/book.model';        
import { BookDialog } from '../shared/book-dialog/book-dialog';

// ⬇️ Auth + Intent
import { AuthService } from '../auth-service'; 
import { IntentService } from '../intent-service';

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CommonModule, FormsModule, BookDialog],
  templateUrl: './store.html',
  styleUrls: ['./store.css']
})
export class StoreComponent implements OnInit {
  books: Book[] = [];
  filteredBooks: Book[] = [];
  searchTerm = '';

  currentPage = 1;
  itemsPerPage = 12;
  selectedBook: LibraryBook | null = null;

  // inject services
  private router = inject(Router);
  private auth = inject(AuthService);
  private intent = inject(IntentService);

  constructor(
    private bookService: BookService,
    private storeService: StoreService,
    private library: LibraryService
  ) {}

  ngOnInit() {
    this.bookService.getBooks().subscribe(data => {
      this.books = data ?? [];
      this.filteredBooks = [...this.books];
    });
  }

  /* ---------------- Book details dialog ---------------- */
  openDetails(p: any) {
    this.selectedBook = {
      id: String(p.id ?? p.isbn ?? p.sku ?? Date.now()),
      title: p.title,
      author: p.author ?? (Array.isArray(p.authors) ? p.authors.join(', ') : 'Unknown'),
      coverUrl: p.thumbnail ?? p.image ?? p.coverUrl,
      description: p.description,
      status: 'unread',
      favorite: false
    };
  }

  closeDetails() { this.selectedBook = null; }

  onAddToLibraryFromDialog(book: LibraryBook) {
    // Gate by auth; remember intent if guest
    if (!this.auth.isAuthenticated) {
      this.intent.set({
        type: 'add_to_library',
        data: { libraryBook: book },
        redirectTo: '/library'
      });
      this.router.navigate(['/login'], { queryParams: { redirectUrl: '/library' } });
      this.closeDetails();
      return;
    }

    this.library.add(book);
    this.closeDetails();
  }

  onAddToCartFromDialog(book: LibraryBook) {
    // Your cart expects the store Book shape; LibraryBook is close enough for demo
    if (!this.auth.isAuthenticated) {
      this.intent.set({
        type: 'add_to_cart',
        data: { book }, // we’ll handle this shape when resuming
        redirectTo: '/cart'
      });
      this.router.navigate(['/login'], { queryParams: { redirectUrl: '/cart' } });
      this.closeDetails();
      return;
    }

    this.storeService.addToCart(book as any);
    this.closeDetails();
  }

  /* ---------------- Search & Pagination ---------------- */
  searchBooks() {
    const term = (this.searchTerm || '').toLowerCase();
    this.filteredBooks = this.books.filter(book =>
      (book.title?.toLowerCase() ?? '').includes(term) ||
      (book.genre?.toLowerCase() ?? '').includes(term) ||
      (Array.isArray(book.authors) && book.authors.some(a => (a?.toLowerCase() ?? '').includes(term)))
    );
    this.currentPage = 1;
  }

  paginatedBooks() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredBooks.slice(startIndex, startIndex + this.itemsPerPage);
  }

  totalPages() {
    return Math.ceil(this.filteredBooks.length / this.itemsPerPage || 1);
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  /* ---------------- Images ---------------- */
  replaceWithPlaceholder(event: Event, book: Book) {
    const placeholder = 'assets/images/book.image.png';
    const img = event.target as HTMLImageElement;

    // Prevent infinite loop if placeholder also fails
    if (!img.src.includes('book.image.png')) {
      img.src = placeholder;                 // update DOM image
      (book as any).image = placeholder;     // update model so pagination/search works
    }
  }

  /* ---------------- Store ops ---------------- */
  addToCart(book: Book) {
    if (!this.auth.isAuthenticated) {
      this.intent.set({
        type: 'add_to_cart',
        data: { book },
        redirectTo: '/cart'
      });
      this.router.navigate(['/login'], { queryParams: { redirectUrl: '/cart' } });
      return;
    }
    this.storeService.addToCart(book);
  }

  /* ---------------- Library ops ---------------- */
  addToLibrary(book: Book) {
    const mapped = this.mapToLibraryBook(book);

    if (!this.auth.isAuthenticated) {
      this.intent.set({
        type: 'add_to_library',
        data: { libraryBook: mapped },
        redirectTo: '/library'
      });
      this.router.navigate(['/login'], { queryParams: { redirectUrl: '/library' } });
      return;
    }

    this.library.add(mapped);
    // Optionally show a toast/snackbar here
  }

  /** Map your Store Book → shared LibraryBook model safely */
  private mapToLibraryBook(b: Book): LibraryBook {
    const id =
      String((b as any).id ?? (b as any).isbn ?? (b as any).sku ??
        `${b.title}-${(b.authors?.[0] || 'unknown')}`.toLowerCase().replace(/\s+/g, '-'));

    const coverUrl =
      (b as any).image ||
      (b as any).thumbnail ||
      (b as any).cover ||
      (b as any).picture ||
      undefined;

    const author =
      Array.isArray(b.authors) && b.authors.length
        ? b.authors.join(', ')
        : (b as any).author || 'Unknown';

    return {
      id,
      title: b.title,
      author,
      coverUrl,
      description: (b as any).description ?? undefined,
      status: 'unread',
      favorite: false
    };
  }
}
