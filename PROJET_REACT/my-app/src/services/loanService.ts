import { api } from './api'
import type { Loan } from './types'

export const loanService = {
  getAll() {
    return api.get<Loan[]>('/digital/loans')
  },

  getByUser() {
    return api.get<Loan[]>('/digital/loans')
  },

  create(payload: Partial<Loan>) {
    return api.post<Loan>('/digital/loans', payload)
  },

  returnLoan(id: string) {
    return api.patch<Loan>(`/digital/loans/${id}/return`)
  },

  extendLoan(id: string, dueAt: string) {
    return api.patch<Loan>(`/digital/loans/${id}/extend`, { dueAt })
  },
}
