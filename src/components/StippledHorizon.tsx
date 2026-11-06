import * as React from "react"
import { useThenarStore } from "../store/useThenarStore"

type Rgb = [number, number, number]

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function horizonPoints(n: number, seed: number) {
  const rnd = mulberry32(seed)
  const out = new Float32Array(n * 5)
  for (let i = 0; i < n; i++) {
    const g = Math.sqrt(-2 * Math.log(1 - rnd() * 0.999)) * 0.42
    const a = Math.PI + rnd() * Math.PI
    out[i * 5] = Math.cos(a) * g
    out[i * 5 + 1] = Math.sin(a) * g
    out[i * 5 + 2] = rnd()
    out[i * 5 + 3] = 0.4 + rnd() * 0.6
    out[i * 5 + 4] = rnd()
  }
  return out
}

function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const n = parseInt(h.slice(0, 6), 16)
  if (!Number.isFinite(n) || h.length < 6) return [128, 128, 128]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function ramp(a: Rgb, b: Rgb, steps: number) {
  const out: string[] = []
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 1 : i / (steps - 1)
    out.push("rgb(" + Math.round(a[0] + (b[0] - a[0]) * t) + "," + Math.round(a[1] + (b[1] - a[1]) * t) + "," + Math.round(a[2] + (b[2] - a[2]) * t) + ")")
  }
  return out
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function makeBuckets(colors: number, alphas: number) {
  const b: number[][] = []
  for (let i = 0; i < colors * alphas; i++) b.push([])
  return {
    colors,
    alphas,
    add(c: number, a: number, x: number, y: number, s: number) {
      b[c * alphas + a].push(x, y, s)
    },
    flush(ctx: CanvasRenderingContext2D, palette: string[]) {
      for (let c = 0; c < colors; c++)
        for (let a = 0; a < alphas; a++) {
          const list = b[c * alphas + a]
          if (!list.length) continue
          ctx.fillStyle = palette[c]
          ctx.globalAlpha = (a + 1) / alphas
          for (let i = 0; i < list.length; i += 3) {
            const s = list[i + 2]
            ctx.fillRect(list[i] - s / 2, list[i + 1] - s / 2, s, s)
          }
          list.length = 0
        }
      ctx.globalAlpha = 1
    },
  }
}

function sizeCanvas(wrap: HTMLElement, canvas: HTMLCanvasElement) {
  const r = wrap.getBoundingClientRect()
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(r.width))
  const h = Math.max(1, Math.round(r.height))
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = w + "px"
  canvas.style.height = h + "px"
  return { w, h, dpr }
}

function useOnScreen(ref: { current: Element | null }, margin = "80px") {
  const [on, setOn] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setOn(true)
      return
    }
    const io = new IntersectionObserver((es) => setOn(es[es.length - 1].isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])
  return on
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof matchMedia !== "function") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduced
}

interface StippledHorizonProps {
  accent?: string
  dark?: boolean
}

export const StippledHorizon: React.FC<StippledHorizonProps> = ({
  accent = "#1aa59a",
  dark: darkProp,
}) => {
  const wrapRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const on = useOnScreen(wrapRef, "80px")
  const reduced = useReducedMotion()
  const { theme } = useThenarStore()
  const dark = darkProp !== undefined ? darkProp : theme === "dark"

  React.useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const grey: Rgb = dark ? [110, 110, 104] : [140, 140, 134]
    const warm = hexToRgb(accent)
    const colors = ramp(grey, warm, 12)
    const buckets = makeBuckets(colors.length, 4)
    const pts = horizonPoints(6000, 5)
    let W = 0
    let H = 0
    let dpr = 1
    const resize = () => {
      const s = sizeCanvas(wrap, canvas)
      W = s.w
      H = s.h
      dpr = s.dpr
    }
    resize()
    let px = -1e4
    let py = -1e4
    let raf = 0
    let running = false

    const draw = (now: number) => {
      const t = now / 1000
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const sx0 = Math.min(W * 0.6, 700)
      const glow = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, Math.min(W * 0.4, 420))
      glow.addColorStop(0, "rgba(" + warm[0] + "," + warm[1] + "," + warm[2] + "," + (dark ? 0.22 : 0.16) + ")")
      glow.addColorStop(1, "rgba(" + warm[0] + "," + warm[1] + "," + warm[2] + ",0)")
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)
      const sy0 = H * 1.9
      const rr = 110
      for (let i = 0; i < pts.length / 5; i++) {
        const o = i * 5
        const life = reduced ? 0.5 : (pts[o + 2] + t * 0.05 * pts[o + 3]) % 1
        const gx = pts[o]
        const gy = pts[o + 1] - (reduced ? 0 : life * 0.04)
        const rad = Math.hypot(gx, gy)
        let x = W / 2 + gx * sx0
        let y = H + gy * sy0 * 0.5
        if (y < -4) continue
        const dx = x - px
        const dy = y - py
        const d2 = dx * dx + dy * dy
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2)
          const f = (1 - d / rr) * (1 - d / rr) * 22
          x += (dx / d) * f
          y += (dy / d) * f
        }
        const tw = reduced ? 0.8 : Math.sin(life * Math.PI)
        const a = tw * (1 - smooth(0.2, 0.95, rad)) * (0.55 + 0.45 * (1 - smooth(0, 0.35, rad)))
        if (a < 0.04) continue
        const ci = Math.min(colors.length - 1, Math.round((1 - smooth(0.03, 0.5, rad)) * (colors.length - 1)))
        buckets.add(ci, Math.min(3, Math.floor(a * 3.999)), x, y, 0.9 + pts[o + 4] * 0.8)
      }
      buckets.flush(ctx, colors)
    }
    const loop = (now: number) => {
      draw(now)
      if (running) raf = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      px = e.clientX - r.left
      py = e.clientY - r.top
      if (reduced) draw(performance.now())
    }
    const onLeave = () => {
      px = py = -1e4
      if (reduced) draw(performance.now())
    }
    const host = wrap.parentElement || wrap
    host.addEventListener("pointermove", onMove)
    host.addEventListener("pointerleave", onLeave)
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      resize()
      if (!running) draw(performance.now())
    }) : null
    if (ro) ro.observe(wrap)
    draw(performance.now())
    if (on && !reduced) {
      running = true
      raf = requestAnimationFrame(loop)
    }
    return () => {
      running = false
      cancelAnimationFrame(raf)
      if (ro) ro.disconnect()
      host.removeEventListener("pointermove", onMove)
      host.removeEventListener("pointerleave", onLeave)
    }
  }, [accent, dark, reduced, on])

  return (
    <div ref={wrapRef} className="sol-horizon" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}

export default StippledHorizon
