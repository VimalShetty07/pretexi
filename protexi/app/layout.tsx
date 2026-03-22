import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Protexi — UK Sponsor Compliance, Simplified',
  description: 'Keep every sponsored worker record current, catch visa and document deadlines early, and stay audit-ready without spreadsheet chaos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
