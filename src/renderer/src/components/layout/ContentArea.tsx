import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export function ContentArea(): JSX.Element {
  const location = useLocation()

  // Animate only when switching top-level modules (e.g. diary → blog).
  // Diary-internal navigation (list → detail → edit, or switching entries)
  // keeps the shell mounted and swaps only the right-hand panel, so the
  // whole page does not fade/slide and its state is preserved.
  const moduleKey = location.pathname.split('/')[1] || 'root'

  return (
    <main className="flex-1 overflow-auto bg-mica-light dark:bg-mica-dark smooth-theme">
      <AnimatePresence mode="wait">
        <motion.div
          key={moduleKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
