import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { Observable } from 'rxjs';
import { QuotesService, Quote } from '../quotes-service';

@Component({
  selector: 'app-quotes',
  imports: [CommonModule],
  templateUrl: './quotes.html',
  styleUrl: './quotes.css',
  animations: [
    trigger('panel', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px) scale(.98)' }),
        animate('140ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('120ms ease-in', style({ opacity: 0, transform: 'translateY(8px) scale(.98)' }))
      ])
    ])
  ]
})
export class Quotes implements OnInit { // ✅ updated class name
  private quotesService = inject(QuotesService);

  open = false;
  quote$!: Observable<Quote>;
  isRotating = false;
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  async ngOnInit() {
    await this.quotesService.init(); // fetch from DummyJSON
    this.quote$ = this.quotesService.currentQuote$;
    this.isRotating = this.quotesService.isRotating();
  }

  toggle(){ this.open = !this.open; }
  close(){ this.open = false; }

  next(){ this.quotesService.next(); }
  prev(){ this.quotesService.prev(); }
  random(){ this.quotesService.random(); }

  toggleRotate(){
    this.isRotating
      ? this.quotesService.stopAutoRotate()
      : this.quotesService.startAutoRotate();
    this.isRotating = this.quotesService.isRotating();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent){
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      this.toggle();
    }
  }
}