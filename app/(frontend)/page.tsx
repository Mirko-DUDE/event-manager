import Link from 'next/link'

import { Button } from '@/components/ui/button'

import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Event Manager</p>
      <h1 className={styles.heading}>Seleziona un&apos;area</h1>
      <div className={styles.actions}>
        <Button asChild variant="default" className={styles.btnDefault}>
          <Link href="/app">Event Manager App</Link>
        </Button>
        <Button asChild variant="outline" className={styles.btnOutline}>
          <Link href="/admin">Admin</Link>
        </Button>
      </div>
    </div>
  )
}
