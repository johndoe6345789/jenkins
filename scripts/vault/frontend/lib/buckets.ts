import type { Credential } from './types'

export interface ServiceBucket {
  name: string
  app_url?: string
  repo_path?: string
  users: Credential[]
}

export interface GroupBucket {
  group: string
  services: ServiceBucket[]
}

export function buildBuckets(items: Credential[]): GroupBucket[] {
  const groupOrder: string[] = []
  const groupMap = new Map<string, Map<string, ServiceBucket>>()

  for (const item of items) {
    const grp = item.group ?? ''
    const svc = item.service_name ?? item.name
    if (!groupMap.has(grp)) {
      groupOrder.push(grp)
      groupMap.set(grp, new Map())
    }
    const svcMap = groupMap.get(grp)!
    if (!svcMap.has(svc)) {
      svcMap.set(svc, {
        name: svc, app_url: item.app_url,
        repo_path: item.repo_path, users: [],
      })
    }
    svcMap.get(svc)!.users.push(item)
  }

  return groupOrder.map(grp => ({
    group: grp,
    services: Array.from(groupMap.get(grp)!.values()),
  }))
}
