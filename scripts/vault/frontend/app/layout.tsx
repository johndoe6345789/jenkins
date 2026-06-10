import type { ReactNode } from 'react'
import { ThemeRegistry } from '../lib/ThemeRegistry'
import { Providers } from '../lib/Providers'

export const metadata = { title: 'Vault' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <Providers>{children}</Providers>
        </ThemeRegistry>
      </body>
    </html>
  )
}
