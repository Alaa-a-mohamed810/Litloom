import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SideNavbar } from '../side-navbar/side-navbar';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule,RouterModule,SideNavbar],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class Library {

}
