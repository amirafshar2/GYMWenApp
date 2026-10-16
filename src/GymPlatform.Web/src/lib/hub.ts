import { useEffect, useRef, useState } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import { currentAccessToken, refreshSession } from './api'
import type { CanteenOrder } from './commerce'

export type HubStatus = 'connecting' | 'live' | 'reconnecting' | 'offline'

/**
 * اتصال لحظه‌ای به بوفه. `join` بعد از هر اتصال یا اتصال دوباره اجرا می‌شود (عضویت در گروه شعبه/سفارش).
 * اگر اتصال قطع شود، خودکار دوباره وصل می‌شود؛ صفحه هم هر ۲۰ ثانیه یک‌بار از API تازه می‌کند.
 */
export function useCanteenHub(join: ((c: HubConnection) => Promise<void>) | null, onOrder: (o: CanteenOrder) => void) {
  const [status, setStatus] = useState<HubStatus>('connecting')
  const handler = useRef(onOrder)
  const joinRef = useRef(join)
  useEffect(() => { handler.current = onOrder; joinRef.current = join })
  const enabled = join !== null

  useEffect(() => {
    if (!enabled) return
    const conn = new HubConnectionBuilder()
      .withUrl('/hubs/canteen', {
        accessTokenFactory: async () => currentAccessToken() ?? (await refreshSession())?.accessToken ?? '',
        headers: { 'X-KG-Client': 'web' },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000, 30000])
      .configureLogging(LogLevel.Warning)
      .build()
    conn.on('OrderChanged', (o: CanteenOrder) => handler.current(o))
    conn.onreconnecting(() => setStatus('reconnecting'))
    conn.onreconnected(async () => { setStatus('live'); await joinRef.current?.(conn) })
    conn.onclose(() => setStatus('offline'))
    let stopped = false
    ;(async () => {
      try {
        await conn.start()
        if (stopped) return
        await joinRef.current?.(conn)
        setStatus('live')
      } catch { if (!stopped) setStatus('offline') }
    })()
    return () => { stopped = true; if (conn.state !== HubConnectionState.Disconnected) void conn.stop() }
  }, [enabled])

  return status
}

/** بوق کوتاه برای سفارش تازه / آماده شدن (بدون فایل صوتی) */
export function beep(times = 1) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
      const t = ctx.currentTime + i * 0.25
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      o.start(t); o.stop(t + 0.22)
    }
    setTimeout(() => void ctx.close(), times * 300 + 200)
  } catch { /* مرورگر اجازه نداد */ }
}
