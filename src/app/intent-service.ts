import { Injectable } from '@angular/core';

type IntentType = 'add_to_cart' | 'add_to_library';
export interface ActionIntent<T = any> {
  type: IntentType;
  data: T;                 // payload you need to complete the action (e.g., bookId, qty)
  redirectTo: string;      // where to go after completing it (e.g., '/cart' or '/library')
  expiresAt?: number;      // optional TTL to avoid stale intents
}

const KEY = 'litloom_intent';

@Injectable({ providedIn: 'root' })
export class IntentService {
  /** Save a pending action for after login */
  set<T>(intent: ActionIntent<T>, ttlMinutes = 20): void {
    const expiresAt = Date.now() + ttlMinutes * 60_000;
    const withTtl = { ...intent, expiresAt };
    try { sessionStorage.setItem(KEY, JSON.stringify(withTtl)); } catch {}
  }

  /** Read the pending action without clearing it */
  peek<T = any>(): ActionIntent<T> | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ActionIntent<T>;
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        this.clear();
        return null;
      }
      return parsed;
    } catch {
      this.clear();
      return null;
    }
  }

  /** Read and clear (consume) the pending action */
  consume<T = any>(): ActionIntent<T> | null {
    const value = this.peek<T>();
    if (value) this.clear();
    return value;
  }

  clear(): void {
    try { sessionStorage.removeItem(KEY); } catch {}
  }
}

