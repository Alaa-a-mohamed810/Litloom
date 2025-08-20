import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StoreService } from '../store-service';
import { AuthService } from '../auth-service';
import { ProfileService } from '../profile-service';
import { UserStorageService } from '../user-storage-service';

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [RouterModule, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './top-navbar.html',
  styleUrls: ['./top-navbar.css']
})
export class TopNavbarComponent implements OnInit {
  cartCount = 0;

  constructor(
    public auth: AuthService,              // used in template
    private storeService: StoreService,
    private router: Router,
    public profile: ProfileService,        // used in template
    private userStorage: UserStorageService
  ) {}

  ngOnInit() {
    this.storeService.cartCount$.subscribe(count => (this.cartCount = count));
    this.auth.restoreSession();            // hydrate on refresh
  }

  // --- SEARCH HELPERS ---

  /** Navigate to /store, optionally with ?q=query, then close offcanvas if open. */
  goToStore(query?: string) {
    const q = (query || '').trim();
    const extras = q ? { queryParams: { q } } : undefined;

    this.router.navigate(['/store'], extras);
    this.closeOffcanvasIfOpen();
  }

  /**
   * On focus, auto-navigate to /store on small screens (or when forced).
   * This gives a smooth mobile flow: tap search → land on Store with the search bar ready.
   */
  goToStoreOnFocus(forceMobile = false) {
    if (forceMobile || window.innerWidth < 992) {
      this.goToStore();
    }
  }

  /** Close Bootstrap offcanvas if it's open (mobile). Safe fallback if JS API isn't available. */
  private closeOffcanvasIfOpen() {
    const el = document.getElementById('litloomOffcanvas');
    if (!el) return;

    // Use Bootstrap Offcanvas API if present (e.g., window.bootstrap.Offcanvas)
    const anyWin = window as any;
    const Offcanvas = anyWin?.bootstrap?.Offcanvas;
    if (Offcanvas) {
      const inst = Offcanvas.getInstance(el) || new Offcanvas(el);
      try { inst.hide(); } catch {}
    } else {
      // Fallback: remove classes/backdrop
      el.classList.remove('show');
      document.body.classList.remove('offcanvas-open');
      const backdrop = document.querySelector('.offcanvas-backdrop');
      if (backdrop) backdrop.remove();
    }
  }

  // --- AUTH ---

  logout() {
    // 1) Drop auth first so nothing persists after this
    this.auth.logout();

    // 2) Clear only in-memory UI (badge/streams). Storage remains untouched.
    this.storeService.clearCartInMemory();

    // 3) Navigate to login
    this.router.navigate(['/login'], { queryParams: { session: 'logout' } });
  }
}
