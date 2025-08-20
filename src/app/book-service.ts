import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment'; 

export interface Book {
  id: number;
  title: string;
  genre: string;
  authors: string[];   // keep your shape
  isbn: string;
  description: string;
  price: number;
  image: string;       // e.g. "assets/images/book.image.png" (relative, no leading /)
}

@Injectable({ providedIn: 'root' })
export class BookService {
  // In dev: environment.booksUrl = "/api/books"  (proxied to http://localhost:3000/books)
  // In prod: environment.booksUrl = "assets/books.json"  (served by GitHub Pages)
  constructor(private http: HttpClient) {}

  getBooks(): Observable<Book[]> {
    return this.http.get<any>(environment.booksUrl).pipe(
      map((data: any) => {
        // Handle both shapes:
        //  1) Array:            [ { ...book }, ... ]
        //  2) Wrapped object:   { books: [ ... ] }
        const arr = Array.isArray(data) ? data : (data?.books ?? []);
        // Ensure every item matches your interface keys
        return arr as Book[];
      })
    );
  }
}
