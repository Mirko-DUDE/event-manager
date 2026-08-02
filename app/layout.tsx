// Root pass-through: ogni route group ((frontend), (app), (payload)) gestisce
// il proprio documento html/body — Payload in (payload) richiede RootLayout dedicato.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
