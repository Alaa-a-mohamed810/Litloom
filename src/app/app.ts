import { Component, signal, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import * as AOS from 'aos';

import { TopNavbarComponent } from './top-navbar/top-navbar';
import { Quotes } from './quotes/quotes';
import { filter } from 'rxjs';
import { AuthService } from './auth-service'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, TopNavbarComponent, Quotes, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  protected readonly title = signal('litloom');

  // hide navbar on /library routes
  hideNavbar = false;

  constructor(
    private router: Router,
    private auth: AuthService 
  ) {}

  ngOnInit(): void {
    AOS.init();

    // rehydrate auth session on first load/refresh
    this.auth.restoreSession(); 

    // hide navbar on /library and its children
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.hideNavbar = e.urlAfterRedirects.startsWith('/library');
      });
  }
}
