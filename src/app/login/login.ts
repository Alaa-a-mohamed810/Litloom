import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../auth-service';
import { IntentService } from '../intent-service';
import { StoreService } from '../store-service';
import { LibraryService } from '../shared/library';
import { Book as LibraryBook } from '../shared/book.model';

@Component({
  selector: 'login',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private intent = inject(IntentService);
  private store = inject(StoreService);
  private library = inject(LibraryService);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  // NEW: session/notice banner
  notice = signal<string | null>(null);

  constructor() {
    const session = this.route.snapshot.queryParamMap.get('session');
      if (session === 'expired') this.notice.set('Your session expired. Please sign in again.');
       else if (session === 'logout') this.notice.set('You have been logged out.');

  }

  onSubmit() {
    this.error.set(null);
    this.loading.set(true);

    this.auth.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: () => {
        // 1) See if we saved an action for after login
        const intent = this.intent.consume();
        if (intent) {
          if (intent.type === 'add_to_cart') {
            const book = (intent.data as any)?.book;
            if (book) this.store.addToCart(book);
            this.router.navigateByUrl(intent.redirectTo || '/cart');
            return;
          }
          if (intent.type === 'add_to_library') {
            const lb = (intent.data as any)?.libraryBook as LibraryBook | undefined;
            if (lb) this.library.add(lb);
            this.router.navigateByUrl(intent.redirectTo || '/library');
            return;
          }
        }

        // 2) No saved intent → go to intended page or /home
        const redirect = this.route.snapshot.queryParamMap.get('redirectUrl') || '/home';
        this.router.navigateByUrl(redirect);
      },
      error: (err) => {
        this.error.set('Login failed. Check your email & password.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }
}
