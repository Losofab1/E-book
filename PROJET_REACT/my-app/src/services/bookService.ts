import { api } from './api'
import type { Book } from './types'

const BOOK_CACHE_TTL = 30 * 1000

let bookCache: { all: Book[] | null; pub: Book[] | null; atAll: number; atPub: number } = {
  all: null,
  pub: null,
  atAll: 0,
  atPub: 0,
}
let allPending: Promise<Book[]> | null = null
let pubPending: Promise<Book[]> | null = null

export const clearBookCache = () => {
  bookCache = { all: null, pub: null, atAll: 0, atPub: 0 }
  allPending = null
  pubPending = null
}

async function fetchAllBooks(): Promise<Book[]> {
  if (bookCache.all && Date.now() - bookCache.atAll < BOOK_CACHE_TTL) return bookCache.all
  if (!allPending) {
    allPending = api.get<Book[]>('/books').then((r) => {
      bookCache = { ...bookCache, all: r.data, atAll: Date.now() }
      return r.data
    }).finally(() => { allPending = null })
  }
  return allPending
}

async function fetchPublicBooks(): Promise<Book[]> {
  if (bookCache.pub && Date.now() - bookCache.atPub < BOOK_CACHE_TTL) return bookCache.pub
  if (!pubPending) {
    pubPending = api.get<Book[]>('/public/books').then((r) => {
      bookCache = { ...bookCache, pub: r.data, atPub: Date.now() }
      return r.data
    }).finally(() => { pubPending = null })
  }
  return pubPending
}

export const bookService = {
  getAll() {
    // Même forme que axios ({ data }) + déduplication des appels simultanés.
    return fetchAllBooks().then((data) => ({ data }) as { data: Book[] })
  },

  getPublic() {
    return fetchPublicBooks().then((data) => ({ data }) as { data: Book[] })
  },

  getById(id: string) {
    return api.get<Book>(`/books/${id}`)
  },

  create(payload: Partial<Book>) {
    clearBookCache()
    return api.post<Book>('/books', payload).finally(() => clearBookCache())
  },

  update(id: string, payload: Partial<Book>) {
    clearBookCache()
    return api.put<Book>(`/books/${id}`, payload).finally(() => clearBookCache())
  },

  remove(id: string) {
    clearBookCache()
    return api.delete(`/books/${id}`).finally(() => clearBookCache())
  },

  importCsv(file: File) {
    const data = new FormData()
    data.append('file', file)
    // Ne pas forcer Content-Type : axios génère la boundary multipart.
    clearBookCache()
    return api.post<{ importedCount: number }>('/books/import', data).finally(() => clearBookCache())
  },
}
