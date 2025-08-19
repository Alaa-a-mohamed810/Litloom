import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, CartItem } from '../store-service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent implements OnInit {
  items: CartItem[] = [];
  subtotal = 0;

  constructor(private store: StoreService) {}

  ngOnInit() {
    this.store.cartItems$.subscribe(items => {
      this.items = items;
      this.subtotal = this.store.getTotal();
    });
  }

  trackByBookId(_i: number, item: CartItem) {
    return item.book.id;
  }

  inc(item: CartItem) {
    this.store.increment(item.book.id);
  }

  dec(item: CartItem) {
    this.store.decrement(item.book.id);
  }

  remove(item: CartItem) {
    this.store.removeFromCart(item);
  }

  clear() {
    this.store.clearCart();
  }

  onImgError(e: Event) {
    const img = e.target as HTMLImageElement;
    const placeholder = 'assets/book-covers/placeholder.jpg';
    if (!img.src.includes('placeholder.jpg')) {
      img.src = placeholder;
    }
  }
}
