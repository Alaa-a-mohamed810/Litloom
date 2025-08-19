import { Component, inject } from '@angular/core';
import { CommonModule} from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProfileService } from '../profile-service';
import { AuthService } from '../auth-service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent {
  private profileSvc = inject(ProfileService);
  public auth = inject(AuthService); // to show current email

  name = '';
  avatarPreview: string | null = null;
  loadingImage = false;

  constructor() {
    // hydrate local fields from current profile
    this.profileSvc.profile$.subscribe(p => {
      this.name = p?.name ?? '';
      this.avatarPreview = p?.avatarUrl ?? null;
    });
  }

  onFileChosen(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loadingImage = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = String(reader.result);
      this.loadingImage = false;
    };
    reader.onerror = () => { this.loadingImage = false; };
    reader.readAsDataURL(file);
  }

  save() {
    this.profileSvc.set({
      name: this.name.trim() || undefined,
      avatarUrl: this.avatarPreview || undefined
    });
    // optional: toast/snackbar here
  }

  removeAvatar() {
    this.avatarPreview = null;
    this.profileSvc.set({ name: this.name.trim() || undefined, avatarUrl: undefined });
  }

  clear() {
    this.name = '';
    this.avatarPreview = null;
    this.profileSvc.clear();
  }
}

