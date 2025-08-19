// src/app/profile-service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Match your current structure:
// - AuthService lives at ./auth-service (per your login.ts import)
import { AuthService } from './auth-service';
// - UserStorageService lives under ./services/
import { UserStorageService } from './user-storage-service'; 

export interface Profile {
  name?: string;
  avatarUrl?: string; // data URL or http(s) URL
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private storage = inject(UserStorageService);
  private auth = inject(AuthService);

  private readonly KEY = 'profile';

  private subject = new BehaviorSubject<Profile>(
    this.storage.get<Profile>(this.KEY, {})
  );
  /** Observable profile for bindings */
  profile$ = this.subject.asObservable();

  constructor() {
    // Reload profile whenever the logged-in user changes
    this.auth.currentUser$.subscribe(() => {
      const p = this.storage.get<Profile>(this.KEY, {});
      this.subject.next(p);
    });
  }

  /** Snapshot */
  get value(): Profile {
    return this.subject.value;
  }

  /** Replace entire profile */
  set(profile: Profile) {
    const sanitized = this.clean(profile);
    this.subject.next(sanitized);
    this.storage.set(this.KEY, sanitized); // saved under litloom:<email>:profile
  }

  /** Partial update */
  update(patch: Partial<Profile>) {
    this.set({ ...this.value, ...patch });
  }

  setName(name?: string) {
    this.update({ name: (name ?? '').trim() || undefined });
  }

  setAvatarUrl(avatarUrl?: string) {
    this.update({ avatarUrl: avatarUrl || undefined });
  }

  clear() {
    this.set({});
  }

  // --- helpers ---
  private clean(p: Profile): Profile {
    return {
      name: p.name ? String(p.name).trim() : undefined,
      avatarUrl: p.avatarUrl ? String(p.avatarUrl).trim() : undefined,
    };
  }
}
