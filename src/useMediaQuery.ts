import { useEffect, useState } from 'react'

// Subscribes to a CSS media query and re-renders when it flips. Used to pick
// the desktop shell vs the mobile column at runtime (resizing the window
// switches layouts live).
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    m.addEventListener('change', on)
    setMatches(m.matches)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

// The Overview screen gets a dedicated desktop layout at this width; below it
// the app stays on its mobile column with the bottom tab bar.
export const useIsDesktop = () => useMediaQuery('(min-width: 900px)')
