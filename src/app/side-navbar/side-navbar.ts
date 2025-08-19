import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthService } from '../auth-service';
import { ProfileService } from '../profile-service';

@Component({
  selector: 'app-side-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-navbar.html',
  styleUrl: './side-navbar.css'
})
export class SideNavbar {
  @Input() collapsed = false;
  @HostBinding('class.collapsed') get isCollapsed() { return this.collapsed; }

  constructor(
    public auth: AuthService,
    public profile: ProfileService
  ) {}

  toggle() { this.collapsed = !this.collapsed; }
}
