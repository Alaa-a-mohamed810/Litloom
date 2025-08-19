// src/app/shared/book.model.ts
export interface Book {
  id: string;                     // unique (use your store product id)
  title: string;
  author?: string;
  coverUrl?: string;              // image URL or assets path
  description?: string;

  // Library metadata (optional but useful)
  status?: 'unread' | 'reading' | 'finished';
  favorite?: boolean;
  addedAt?: string;               // ISO timestamp when added
}

/** Optional helper: map a generic store product to Book */
export function toBook(p: {
  id: string | number;
  title: string;
  author?: string;
  thumbnail?: string;
  image?: string;
  description?: string;
}): Book {
  return {
    id: String(p.id),
    title: p.title,
    author: p.author ?? 'Unknown',
    coverUrl: p.thumbnail ?? p.image ?? undefined,
    description: p.description ?? undefined,
    status: 'unread',
  };
}
