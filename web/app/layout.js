import './globals.css'

export const metadata = {
  title: 'MockJ-Go - JSON Mock API Server',
  description: 'Create temporary JSON endpoints instantly',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}