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

export interface FrontendEntry {
  name: string
  group: string
  url: string
  repo_path?: string
}

export function buildBuckets(
  items: Credential[],
  catalog: FrontendEntry[] = [],
): GroupBucket[] {
  const groupOrder: string[] = []
  const groupMap = new Map<string, Map<string, ServiceBucket>>()

  for (const entry of catalog) {
    if (!groupMap.has(entry.group)) {
      groupOrder.push(entry.group)
      groupMap.set(entry.group, new Map())
    }
    groupMap.get(entry.group)!.set(entry.name, {
      name: entry.name,
      app_url: entry.url,
      repo_path: entry.repo_path,
      users: [],
    })
  }

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
    const bucket = svcMap.get(svc)!
    bucket.app_url ??= item.app_url
    bucket.repo_path ??= item.repo_path
    bucket.users.push(item)
  }

  return groupOrder.map(grp => ({
    group: grp,
    services: Array.from(groupMap.get(grp)!.values()),
  }))
}
