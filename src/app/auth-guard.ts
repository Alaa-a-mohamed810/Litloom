import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service'; 

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // allow if already logged in
  if (auth.isAuthenticated) return true;

  // otherwise send to /login and remember where we wanted to go
  return router.createUrlTree(['/login'], {
    queryParams: { redirectUrl: state.url }
  });
};
