import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kiroku — メモとToDoをひとつに',
  description: '考えを整理し、毎日を軽やかに進めるためのメモ＆ToDoアプリ',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>
}
