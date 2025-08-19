import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoreService } from '../store-service';
import { AuthService } from '../auth-service'; 
import { ProfileService } from '../profile-service';
import { FormsModule } from '@angular/forms';
import { UserStorageService } from '../user-storage-service';

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [RouterModule, RouterLink, RouterLinkActive, CommonModule,FormsModule],
  templateUrl: './top-navbar.html',
  styleUrls: ['./top-navbar.css'] 
})
export class TopNavbarComponent implements OnInit {
  cartCount = 0;

  constructor(
    public auth: AuthService,       // public so template can read (auth.currentUser$ | async)
    private storeService: StoreService,
    private router: Router,
    public profile: ProfileService,
     private userStorage: UserStorageService,
  ) {}

  ngOnInit() {
    this.storeService.cartCount$.subscribe(count => this.cartCount = count);

    // If you didn’t call restoreSession() in the root, this ensures navbar hydrates on refresh:
    this.auth.restoreSession();
  }

  logout() {
  // 1) Drop auth first so nothing gets saved after this
  this.auth.logout();

  // 2) Clear only in-memory UI (badge/streams). Storage is untouched.
  this.storeService.clearCartInMemory();
  // If you add a similar clearInMemory() in LibraryService, call it here too.

  // 3) Navigate to login
  this.router.navigate(['/login'], { queryParams: { session: 'logout' } });
}


}
