import { api } from './api'
import type { CoordinateUpdatePayload, Profile } from './types'

export const profileService = {
  getMe() {
    return api.get<Profile>('/auth/profile')
  },

  updateMe(payload: Partial<Profile>) {
    return api.put<Profile>('/auth/profile', payload)
  },

  updateCoordinates(payload: CoordinateUpdatePayload) {
    return api.patch<Profile>('/users/profile/coordinates', payload)
  },
}
