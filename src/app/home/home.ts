import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule,RouterLink,RouterLinkActive],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  testimonials = [
  {
    text: 'LitLoom made me fall in love with books again!',
    img: 'https://i.pravatar.cc/80?img=1',
    name: 'Sarah A.',
    role: 'Book Enthusiast'
  },
  {
    text: 'Perfect for tracking and planning my reading goals.',
    img: 'https://i.pravatar.cc/80?img=2',
    name: 'Ahmed R.',
    role: 'College Student'
  },
  {
    text: 'Clean, organized and helpful. Highly recommend LitLoom.',
    img: 'https://i.pravatar.cc/80?img=3',
    name: 'Leila M.',
    role: 'Literature Teacher'
  },
  {
    text: "One of the best apps for book tracking I've ever used.",
    img: 'https://i.pravatar.cc/80?img=4',
    name: 'John K.',
    role: 'Reader'
  },
  {
    text: "It's so motivating to visually track my reading progress!",
    img: 'https://i.pravatar.cc/80?img=5',
    name: 'Maya B.',
    role: 'Content Creator'
  },
  {
    text: "Finally, an elegant way to manage my growing book list.",
    img: 'https://i.pravatar.cc/80?img=6',
    name: 'Tariq N.',
    role: 'Avid Reader'
  }
];

  currentIndex = 0;
  visibleCards = 3;
  intervalId: any;

  ngOnInit(): void {
    this.testimonials = [...this.testimonials, ...this.testimonials];
    this.intervalId = setInterval(() => {
      this.currentIndex++;
      if (this.currentIndex > this.testimonials.length - this.visibleCards) {
        this.currentIndex = 0;
      }
    }, 4000);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}



