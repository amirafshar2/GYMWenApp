import { useEffect, useState } from 'react'

const cache = new Map<string, Promise<unknown>>()

/** بارگذاری ساده با کش در حافظه (هر endpoint یک بار در هر بازدید). */
export function useData<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>()
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    let alive = true
    if (!cache.has(key)) cache.set(key, load())
    ;(cache.get(key) as Promise<T>)
      .then((d) => alive && setData(d))
      .catch((e) => { cache.delete(key); if (alive) setError(e) })
    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, loading: data === undefined && !error }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
