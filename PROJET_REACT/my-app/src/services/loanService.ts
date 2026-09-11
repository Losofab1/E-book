import { api } from './api'
import type { Loan } from './types'

export const loanService = {
  getAll() {
    return api.get<Loan[]>('/loans')
  },

  getByUser(email: string) {
    return api.get<Loan[]>(`/loans/user/${email}`)
  },

  create(payload: Partial<Loan>) {
    return api.post<Loan>('/loans', payload)
  },

  returnLoan(id: string) {
    return api.patch<Loan>(`/loans/${id}/return`)
  },
}
