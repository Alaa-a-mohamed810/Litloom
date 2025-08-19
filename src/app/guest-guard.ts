// src/app/guest-guard.ts
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth-service';

const toHome = (): UrlTree => inject(Router).createUrlTree(['/home']);

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  // Debug – remove after verifying
  console.log('[guestGuard] isAuthenticated?', auth.isAuthenticated);
  return auth.isAuthenticated ? toHome() : true;
};

export const guestMatch: CanMatchFn = () => {
  const auth = inject(AuthService);
  // Debug – remove after verifying
  console.log('[guestMatch] isAuthenticated?', auth.isAuthenticated);
  return auth.isAuthenticated ? toHome() : true;
};
