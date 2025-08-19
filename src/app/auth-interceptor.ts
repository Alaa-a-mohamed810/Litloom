import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth-service'; 

const REQRES_ORIGIN = 'https://reqres.in/api';
const REQRES_API_KEY = 'reqres-free-v1';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  let clone = req;

  // Attach Bearer token to your local API calls (through /api proxy)
  if (req.url.startsWith('/api') && auth.token) {
    clone = req.clone({
      setHeaders: { Authorization: `Bearer ${auth.token}` }
    });
  }

  // Attach ReqRes free API key to public fake auth calls
  if (req.url.startsWith(REQRES_ORIGIN)) {
    clone = clone.clone({
      setHeaders: { 'x-api-key': REQRES_API_KEY }
    });
  }

  return next(clone).pipe(
    catchError((err: any) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { session: 'expired' } });
      }
      return throwError(() => err);
    })
  );
};
