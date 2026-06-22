import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Trao AI Travel Planner | Smart Multi-User Itinerary Builder',
  description: 'Design custom, day-by-day travel itineraries and packing checklists with AI Weather-Aware Packing Assistant, budget estimates, and hotel recommendation engines.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
