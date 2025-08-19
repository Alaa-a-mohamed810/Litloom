import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { StoreComponent } from './store/store';
import { CartComponent } from './cart/cart';
import { SideNavbar } from './side-navbar/side-navbar';
import { Library } from './library/library';
import { MyBooksComponent } from './library/my-books/my-books';
import { TrackerComponent } from './library/tracker/tracker';
import { GoalsComponent } from './library/goals/goals';
import { StatsComponent } from './library/stats/stats';
import { Login } from './login/login';
import { Register } from './register/register';
import { ProfileComponent } from './profile/profile';
import { guestGuard, guestMatch } from './guest-guard';
import { authGuard } from './auth-guard';
import { ErrorComponent } from './error/error';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Public
  { path: 'home', component: HomeComponent },
  { path: 'store', component: StoreComponent },
  { path: 'snavbar', component: SideNavbar },
  { path: 'error', component: ErrorComponent},

  // Guest-only (❗ keep only these, no duplicates above)
  { path: 'login',    canMatch: [guestMatch], canActivate: [guestGuard], component: Login },
  { path: 'register', canMatch: [guestMatch], canActivate: [guestGuard], component: Register },

  // Protected
  { path: 'cart', canActivate: [authGuard], component: CartComponent },
  { path: 'profile', canActivate: [authGuard], component: ProfileComponent },
  {
    path: 'library',
    canActivate: [authGuard],
    component: Library,
    children: [
      { path: '', redirectTo: 'all', pathMatch: 'full' },
      { path: 'all', component: MyBooksComponent },
      { path: 'tracker', component: TrackerComponent },
      { path: 'goals', component: GoalsComponent },
      { path: 'stats', component: StatsComponent }
    ]
  },

  // Fallback
  { path: '**', component: ErrorComponent }
];
