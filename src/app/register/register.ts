import { Component, inject, signal } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../auth-service';
import { IntentService } from '../intent-service';
import { StoreService } from '../store-service';
import { LibraryService } from '../shared/library';
import { Book as LibraryBook } from '../shared/book.model';

@Component({
  selector: 'register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIf],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private intent = inject(IntentService);
  private store = inject(StoreService);
  private library = inject(LibraryService);

  name = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit() {
    if (this.loading()) return; // avoid double submit
    this.error.set(null);

    const name = this.name.trim();
    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (!email || !password) {
      this.error.set('Please enter an email and password.');
      return;
    }

    this.loading.set(true);

    this.auth
      .register({ email, password, name: name || undefined })
      .subscribe({
        next: () => {
          // 1) Resume any saved intent (same logic as login)
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

          // 2) No intent -> go to intended page or Profile (nice onboarding)
          const redirect = this.route.snapshot.queryParamMap.get('redirectUrl') || '/profile';
          this.router.navigateByUrl(redirect);
        },
        error: (err) => {
          this.error.set('Registration failed. Please check your inputs.');
          this.loading.set(false);
          console.error(err);
        }
      });
  }
}
