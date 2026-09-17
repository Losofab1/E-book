import { api } from './services/api'
export type AppNotification = { id: string; type: string; message: string; book?: string; createdAt: number; read: boolean }
export const getNotificationsForUser = async (): Promise<AppNotification[]> => (await api.get<AppNotification[]>('/notifications')).data
export const markNotificationRead = async (id: string) => api.patch(`/notifications/${id}/read`)
