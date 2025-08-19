import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Book } from '../book.model';

@Component({
  selector: 'app-book-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-dialog.html',
  styleUrls: ['./book-dialog.css']
})
export class BookDialog {
  @Input() book: Book | null = null;
  @Output() close = new EventEmitter<void>();


  // close on ESC
  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }

  backdropClick(ev: MouseEvent) {
    // only close if they clicked the backdrop, not the dialog itself
    if ((ev.target as HTMLElement).classList.contains('bd__backdrop')) {
      this.close.emit();
    }
  }
}
