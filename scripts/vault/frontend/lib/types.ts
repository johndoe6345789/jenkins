export interface Credential {
  name: string
  service_name: string
  username: string
  badge: string
  password: string
  rotate_url: string
  app_url?: string
  repo_path?: string
  group?: string
  source?: 'manifest' | 'custom'
}

export type TargetsPayload = Record<string, Credential[]>

export type ToastType = 'success' | 'error'

export interface ToastItem {
  id: number
  msg: string
  type: ToastType
}
