import type { Metadata } from 'next'

// Root pass-through: ogni route group ((frontend), (app), (payload)) gestisce
// il proprio documento html/body — Payload in (payload) richiede RootLayout dedicato.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
