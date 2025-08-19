import { Component, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth-service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './error.html',
  styleUrl: './error.css',
})
export class ErrorComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  goBack() {
    if (history.length > 1) history.back();
    else this.router.navigateByUrl('/home');
  }
}
