import { api } from './api'
import type { ApiResponse, CoordinateUpdatePayload, Profile } from './types'

export const profileService = {
  getMe() {
    return api.get<ApiResponse<Profile>>('/auth/profile')
  },

  updateMe(payload: Partial<Profile>) {
    return api.put<ApiResponse<Profile>>('/auth/profile', payload)
  },

  updateCoordinates(payload: CoordinateUpdatePayload) {
    return api.patch<ApiResponse<Profile>>('/users/profile/coordinates', payload)
  },
}
