import { useState, useEffect } from 'react'

const LG_BREAKPOINT = 1024

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`)
    const onChange = () => setIsDesktop(mql.matches)
    mql.addEventListener('change', onChange)
    setIsDesktop(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
