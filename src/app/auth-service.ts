import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { LoginResponse, Session, User } from './auth.types';

const AUTH_BASE = 'https://reqres.in/api';
const REQRES_API_KEY = 'reqres-free-v1'; // demo header—optional
const STORAGE_KEY = 'litloom_auth';

type LoginPayload = { email: string; password: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private tokenSubject = new BehaviorSubject<string | null>(null);
  token$ = this.tokenSubject.asObservable();

  private userSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.userSubject.asObservable();

  get token() { return this.tokenSubject.value; }
  get currentUser() { return this.userSubject.value; }
  get isAuthenticated() { return !!this.token; } // ✅ use token presence

  // Optional demo header for ReqRes
  private headers = new HttpHeaders({ 'x-api-key': REQRES_API_KEY });

  constructor() {
    // ✅ hydrate from localStorage on startup so guards have the right state
    this.restoreSession();
  }

  login(payload: LoginPayload): Observable<User> {
    const url = `${AUTH_BASE}/login`;
    return this.http.post<LoginResponse>(url, payload, { headers: this.headers }).pipe(
      map(res => {
        const user: User = { email: payload.email };
        const session: Session = { token: res.token, user };
        this.persist(session);
        return user;
      })
    );
  }

  // POST https://reqres.in/api/register -> { id, token }
  register(payload: { email: string; password: string; name?: string }): Observable<User> {
    const url = `${AUTH_BASE}/register`;
    return this.http.post<{ id: number; token: string }>(url, payload, { headers: this.headers }).pipe(
      map(res => {
        const user: User = { id: res.id, email: payload.email, name: payload.name };
        const session: Session = { token: res.token, user };
        this.persist(session);
        return user;
      })
    );
  }

  logout(): void {
    this.tokenSubject.next(null);
    this.userSubject.next(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  restoreSession(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const sess = JSON.parse(raw) as Session;
      this.tokenSubject.next(sess.token);
      this.userSubject.next(sess.user);
    } catch {
      this.logout();
    }
  }

  private persist(session: Session) {
    this.tokenSubject.next(session.token);
    this.userSubject.next(session.user);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch {}
  }
}
