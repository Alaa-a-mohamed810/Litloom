import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CartService {
   private cart: any[] = [];

  getCart() {
    return this.cart;
  }

  addToCart(book: any) {
    this.cart.push(book);
  }

  getCartCount() {
    return this.cart.length;
  }
}
