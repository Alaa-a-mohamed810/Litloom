// src/app/services/user-storage.service.ts
import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth-service'; 

const APP_PREFIX = 'litloom';

@Injectable({ providedIn: 'root' })
export class UserStorageService {
  private auth = inject(AuthService);

  /** Build a namespaced key like: litloom:<email>:<key> */
  private k(key: string): string {
    const email = this.auth.currentUser?.email?.toLowerCase() || 'guest';
    return `${APP_PREFIX}:${email}:${key}`;
  }

  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.k(key));
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.k(key), JSON.stringify(value));
    } catch {}
  }

  remove(key: string): void {
    try { localStorage.removeItem(this.k(key)); } catch {}
  }

  /** Wipe all keys for the current user (prefix match) */
  clearUserSpace(): void {
    try {
      const email = this.auth.currentUser?.email?.toLowerCase() || 'guest';
      const prefix = `${APP_PREFIX}:${email}:`;
      const toDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) toDelete.push(k);
      }
      toDelete.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}
