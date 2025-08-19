// src/app/store-service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Book } from './book-service';

// ⬇️ NEW: per-user namespaced storage + current user stream
import { UserStorageService } from './user-storage-service'; 
import { AuthService } from './auth-service'; 

export interface CartItem {
  book: Book;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly STORAGE_KEY = 'cart';
  private cart: CartItem[] = [];

  // Streams for live updates across the app (navbar, cart page, etc.)
  private cartItemsSource = new BehaviorSubject<CartItem[]>([]);
  cartItems$ = this.cartItemsSource.asObservable();

  private cartCountSource = new BehaviorSubject<number>(0);
  cartCount$ = this.cartCountSource.asObservable();

  private cartTotalSource = new BehaviorSubject<number>(0);
  cartTotal$ = this.cartTotalSource.asObservable();

  constructor(
    private storage: UserStorageService,   // ⬅️ namespaced by user email
    private auth: AuthService              // ⬅️ to reload when user changes
  ) {
    this.loadCart();

    // When the logged-in user changes, load that user's cart
    this.auth.currentUser$.subscribe(() => {
      this.loadCart();
    });
  }

  /* ---------- Public API ---------- */

  addToCart(book: Book, qty: number = 1) {
    const existing = this.cart.find(i => i.book.id === book.id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.cart.push({ book, qty });
    }
    this.saveCart();
  }

  getCart(): CartItem[] {
    return this.cart;
  }

  setQty(bookId: number, qty: number) {
    if (qty <= 0) {
      this.removeById(bookId);
      return;
    }
    const item = this.cart.find(i => i.book.id === bookId);
    if (item) {
      item.qty = qty;
      this.saveCart();
    }
  }

  increment(bookId: number) {
    const item = this.cart.find(i => i.book.id === bookId);
    if (item) {
      item.qty += 1;
      this.saveCart();
    }
  }

  decrement(bookId: number) {
    const item = this.cart.find(i => i.book.id === bookId);
    if (!item) return;
    if (item.qty > 1) {
      item.qty -= 1;
      this.saveCart();
    } else {
      this.removeById(bookId);
    }
  }

  removeFromCart(item: CartItem) {
    this.cart = this.cart.filter(i => i.book.id !== item.book.id);
    this.saveCart();
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
  }

  clearCartInMemory() {
    this.cart = [];
    this.recalc();                   // updates streams, no storage writes
  }

  getTotal(): number {
    return this.cart.reduce((sum, i) => sum + (Number(i.book.price) || 0) * i.qty, 0);
  }

  /* ---------- Internals ---------- */

  private removeById(bookId: number) {
    this.cart = this.cart.filter(i => i.book.id !== bookId);
    this.saveCart();
  }

  private saveCart() {
  // Only persist to per-user storage when authenticated
  if (this.auth.isAuthenticated) {
    this.storage.set(this.STORAGE_KEY, this.cart); // litloom:<email>:cart
  }
  this.recalc();
}




  private loadCart() {
  // Logged-out: no cart
  if (!this.auth.isAuthenticated) {
    this.cart = [];
    this.recalc();
    return;
  }

  // Logged-in: load the per-user, namespaced cart only
  const data = this.storage.get<CartItem[]>(this.STORAGE_KEY, []);
  this.cart = Array.isArray(data) ? data : [];
  this.recalc();
}


  private recalc() {
    // Emit items
    this.cartItemsSource.next([...this.cart]);

    // Emit total item count (sum of qty)
    const count = this.cart.reduce((sum, i) => sum + i.qty, 0);
    this.cartCountSource.next(count);

    // Emit cost total
    const total = this.getTotal();
    this.cartTotalSource.next(total);
  }
}
