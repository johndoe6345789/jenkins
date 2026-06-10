'use client'
import createCache from '@emotion/cache'
import { useServerInsertedHTML } from 'next/navigation'
import { CacheProvider } from '@emotion/react'
import { useState, type ReactNode } from 'react'

export function ThemeRegistry({ children }: { children: ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const c = createCache({ key: 'mui' })
    c.compat = true
    const prevInsert = c.insert.bind(c)
    let inserted: string[] = []
    c.insert = (...args: Parameters<typeof prevInsert>) => {
      const serialized = args[1]
      if (c.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name)
      }
      return prevInsert(...args)
    }
    const flush = () => {
      const pending = inserted
      inserted = []
      return pending
    }
    return { cache: c, flush }
  })

  useServerInsertedHTML(() => {
    const names = flush()
    if (!names.length) return null
    let styles = ''
    for (const name of names) styles += cache.inserted[name]
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    )
  })

  return <CacheProvider value={cache}>{children}</CacheProvider>
}
