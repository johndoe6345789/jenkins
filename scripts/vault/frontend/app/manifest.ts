import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vault',
    short_name: 'Vault',
    description: 'Credential vault',
    start_url: '/vault',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d0d1a',
    theme_color: '#7c6ff7',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
