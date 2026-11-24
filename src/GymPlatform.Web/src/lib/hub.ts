import { useEffect, useRef, useState } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import { currentAccessToken, refreshSession } from './api'
import type { CanteenOrder } from './commerce'

export type HubStatus = 'connecting' | 'live' | 'reconnecting' | 'offline'

/**
 * Live-Verbindung zum Bistro. `join` Läuft nach jeder (Wieder-)Verbindung (Beitritt zur Filial-/Bestellgruppe).
 * Bei Verbindungsabbruch automatische Wiederverbindung; die Seite lädt außerdem alle 20 Sekunden neu von der API.
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

/** Kurzer Piepton bei neuer / fertiger Bestellung (ohne Audiodatei) */
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
  } catch { /* Browser hat es nicht erlaubt */ }
}
