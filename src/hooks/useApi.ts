// Hook di fetch con stati loading/ok/error + retry. Le pagine non chiamano mai fetch direttamente.

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

export type ApiState<T> =
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'ok'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: Error }

export function useApi<T>(fn: (signal: AbortSignal) => Promise<T>, deps: DependencyList, enabled = true) {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return
    const ac = new AbortController()
    setState((s) => ({ status: 'loading', data: s.data }))
    fnRef
      .current(ac.signal)
      .then((data) => {
        if (!ac.signal.aborted) setState({ status: 'ok', data })
      })
      .catch((error: Error) => {
        if (ac.signal.aborted || error.name === 'AbortError') return
        setState((s) => ({ status: 'error', error, data: s.data }))
      })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled])

  const retry = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, retry }
}
