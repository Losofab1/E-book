import { api } from './api'
import type { Book } from './types'

export const bookService = {
  getAll() {
    return api.get<Book[]>('/books')
  },

  getById(id: string) {
    return api.get<Book>(`/books/${id}`)
  },

  create(payload: Partial<Book>) {
    return api.post<Book>('/books', payload)
  },

  update(id: string, payload: Partial<Book>) {
    return api.put<Book>(`/books/${id}`, payload)
  },

  remove(id: string) {
    return api.delete(`/books/${id}`)
  },
}
