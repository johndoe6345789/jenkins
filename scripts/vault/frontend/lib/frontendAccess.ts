import frontendLinks from './frontend-links.json'
import type { Credential } from './types'

const key = (value: string) => value.toLowerCase()

function publicAccess(
  service: typeof frontendLinks.services[number],
): Credential {
  return {
    name: `${service.name}-public-access`,
    service_name: service.name,
    username: 'public',
    badge: 'no login',
    password: 'No login required',
    rotate_url: '',
    app_url: service.url,
    group: service.group,
    source: 'catalog',
  }
}

export function buildFrontendAccess(
  frontendItems: Credential[],
  allItems: Credential[],
): Credential[] {
  return frontendLinks.services.flatMap(service => {
    const serviceKey = key(service.name)
    const local = frontendItems.filter(
      item => key(item.service_name) === serviceKey,
    )
    const stored = local.length
      ? local
      : allItems.filter(item => key(item.service_name) === serviceKey)
    if (!stored.length) return [publicAccess(service)]
    return stored.map(item => ({
      ...item,
      service_name: service.name,
      group: service.group,
      app_url: service.url,
    }))
  })
}
