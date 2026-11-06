import * as React from "react"
import { useThenarStore } from "../store/useThenarStore"

export type OrbState = "idle" | "gesture" | "accept" | "reject" | "lockout" | "fault"

type Rgb = [number, number, number]

const LIGHT = (() => {
  const v = [0.5, -0.72, 0.48]
  const l = Math.hypot(v[0], v[1], v[2])
  return [v[0] / l, v[1] / l, v[2] / l]
})()

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

/**
 * Fibonacci spiral on a sphere with a little jitter, an uneven radius and a dither threshold
 * that decides how lit it must be before it shows. Packed as x, y, z, r, u.
 */
function fibSphere(n: number, seed: number) {
  const rnd = mulberry32(seed)
  const out = new Float32Array(n * 5)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2
    const r = Math.sqrt(1 - y * y)
    const th = golden * i + (rnd() - 0.5) * 0.35
    out[i * 5] = Math.cos(th) * r
    out[i * 5 + 1] = y
    out[i * 5 + 2] = Math.sin(th) * r
    const j = rnd()
    out[i * 5 + 3] = 1 + j * j * j * 0.16 - 0.015
    out[i * 5 + 4] = rnd()
  }
  return out
}

/** Rotate a point by yaw (around y) then pitch (around x). */
function rotate(x: number, y: number, z: number, cy: number, sy: number, cx: number, sx: number, out: number[]) {
  const x1 = x * cy + z * sy
  const z1 = -x * sy + z * cy
  out[0] = x1
  out[1] = y * cx - z1 * sx
  out[2] = y * sx + z1 * cx
}

function shade(x: number, y: number, z: number) {
  const lit = x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]
  return { lit, density: 0.1 + 0.9 * smooth(-0.7, 0.75, lit) }
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

function useOnScreen(ref: { current: Element | null }, margin = "0px") {
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

interface StippleOrbProps {
  accent?: string
  dark?: boolean
  label?: string
  orbState?: OrbState
}

export const StippleOrb: React.FC<StippleOrbProps> = ({
  accent = "#1aa59a",
  dark: darkProp,
  label = "Thenar biometric sensor field",
  orbState = "idle",
}) => {
  const wrapRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const [touched, setTouched] = React.useState(false)
  const on = useOnScreen(wrapRef, "120px")
  const reduced = useReducedMotion()
  const { theme } = useThenarStore()
  const isDark = darkProp !== undefined ? darkProp : theme === "dark"

  // Subtle tint adjustment based on orbState without altering geometry
  let activeAccent = accent
  if (orbState === "accept") {
    activeAccent = "#10b981" // emerald pass
  } else if (orbState === "reject" || orbState === "fault" || orbState === "lockout") {
    activeAccent = "#d1495b" // crimson reject
  }

  const api = React.useRef({ nudge: (_d: number) => {}, ripple: () => {} })

  // Trigger subtle effect when orbState transitions
  React.useEffect(() => {
    if (orbState === "accept") {
      api.current.ripple()
    } else if (orbState === "gesture") {
      api.current.nudge(1.2)
    } else if (orbState === "reject" || orbState === "fault") {
      api.current.nudge(-1.8)
    }
  }, [orbState])

  React.useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const grey: Rgb = isDark ? [118, 118, 112] : [126, 126, 120]
    const warm = hexToRgb(activeAccent)
    const hot: Rgb = [Math.min(255, warm[0] + 30), Math.min(255, warm[1] + 50), Math.min(255, warm[2] + 50)]
    const colors = ramp(grey, warm, 14).concat(ramp(warm, hot, 3).slice(1))
    const buckets = makeBuckets(colors.length, 5)
    let W = 0
    let H = 0
    let dpr = 1
    let pts = fibSphere(10, 7)
    let n = 0
    const resize = () => {
      const s = sizeCanvas(wrap, canvas)
      W = s.w
      H = s.h
      dpr = s.dpr
      const want = Math.round(Math.min(15000, Math.max(5000, (W * H) / 24)))
      if (want !== n) {
        n = want
        pts = fibSphere(n, 11)
      }
    }
    resize()

    const st = {
      yaw: 0.9,
      pitch: -0.32,
      vel: 0.12,
      auto: reduced ? 0 : 0.12,
      drag: false,
      moved: 0,
      lx: 0,
      ly: 0,
      lt: 0,
      px: -1e4,
      py: -1e4,
      hover: 0,
      hoverTo: 0,
      ripples: [] as { x: number; y: number; t: number }[],
    }
    const tmp = [0, 0, 0]
    let last = performance.now()
    let raf = 0
    let running = false

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!st.drag) {
        st.vel += (st.auto - st.vel) * Math.min(1, dt * 1.6)
        st.yaw += st.vel * dt
      }
      st.hover += (st.hoverTo - st.hover) * Math.min(1, dt * 6)
      st.ripples = st.ripples.filter((r) => now - r.t < 1600)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const R = Math.min(W, H) * 0.43
      const cx = W / 2
      const cy = H / 2
      const cyw = Math.cos(st.yaw)
      const syw = Math.sin(st.yaw)
      const cp = Math.cos(st.pitch)
      const sp = Math.sin(st.pitch)
      const rad = Math.max(70, R * 0.38)
      const rad2 = rad * rad
      const base = Math.max(1.05, R / 210)
      // a faint haze under the lit cap, so the dense side reads as a glow, not just dots
      const gx = cx + LIGHT[0] * R * 0.55
      const gy = cy + LIGHT[1] * R * 0.55
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 1.05)
      glow.addColorStop(0, "rgba(" + warm[0] + "," + warm[1] + "," + warm[2] + "," + (isDark ? 0.16 : 0.13) + ")")
      glow.addColorStop(1, "rgba(" + warm[0] + "," + warm[1] + "," + warm[2] + ",0)")
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2)
      ctx.fill()

      for (let i = 0; i < n; i++) {
        const o = i * 5
        rotate(pts[o], pts[o + 1], pts[o + 2], cyw, syw, cp, sp, tmp)
        const x = tmp[0]
        const y = tmp[1]
        const z = tmp[2]
        const k = pts[o + 3]
        let sx = cx + x * R * k
        let sy = cy + y * R * k
        const sh = shade(x, y, z)
        let lit = sh.lit
        let alpha = (sh.density - pts[o + 4]) * 5
        if (alpha <= 0.02) continue
        if (alpha > 1) alpha = 1
        // the far side shows through, faintly
        if (z < 0) alpha *= 0.08 + 0.22 * (1 + z)

        // ripples run across the surface from where it was clicked
        for (let r = 0; r < st.ripples.length; r++) {
          const rp = st.ripples[r]
          const age = (now - rp.t) / 1000
          const front = age * R * 1.25
          const d = Math.hypot(sx - rp.x, sy - rp.y)
          const band = Math.exp(-Math.pow((d - front) / (R * 0.09), 2)) * (1 - age / 1.6)
          if (band > 0.01 && z > -0.2) {
            sx += x * band * R * 0.07
            sy += y * band * R * 0.07
            lit += band * 0.9
            alpha = Math.min(1, alpha + band * 0.6)
          }
        }

        // the pointer parts the dots
        if (st.hover > 0.01 && z > -0.1) {
          const dx = sx - st.px
          const dy = sy - st.py
          const d2 = dx * dx + dy * dy
          if (d2 < rad2 && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const f = (1 - d / rad) * (1 - d / rad) * st.hover * R * 0.09
            sx += (dx / d) * f
            sy += (dy / d) * f
            lit += (1 - d / rad) * st.hover * 0.35
          }
        }

        const t = smooth(-0.25, 0.7, lit)
        const ci = Math.min(colors.length - 1, Math.round(t * 13 + Math.max(0, lit - 1.05) * 6))
        const ai = Math.min(4, Math.floor(alpha * 4.999))
        const size = base * (0.7 + 0.7 * (z * 0.5 + 0.5)) * (0.8 + pts[o + 4] * 0.4)
        buckets.add(ci, ai, sx, sy, size)
      }
      buckets.flush(ctx, colors)
    }

    const loop = (now: number) => {
      draw(now)
      if (running) raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    // under reduced motion nothing runs on its own: one frame, and one per interaction
    const kick = () => {
      if (!reduced) return
      draw(performance.now())
    }

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top]
    }
    const onDown = (e: PointerEvent) => {
      const [x, y] = local(e)
      st.drag = true
      st.moved = 0
      st.lx = x
      st.ly = y
      st.lt = performance.now()
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {}
    }
    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e)
      st.px = x
      st.py = y
      st.hoverTo = e.pointerType === "mouse" || st.drag ? 1 : 0
      if (st.drag) {
        const now = performance.now()
        const dx = x - st.lx
        const dy = y - st.ly
        st.moved += Math.abs(dx) + Math.abs(dy)
        st.yaw += dx * 0.008
        st.pitch = Math.max(-1.1, Math.min(1.1, st.pitch + dy * 0.005))
        const dts = Math.max(0.008, (now - st.lt) / 1000)
        st.vel = st.vel * 0.6 + ((dx * 0.008) / dts) * 0.4
        st.lx = x
        st.ly = y
        st.lt = now
        if (st.moved > 6) setTouched(true)
      }
      kick()
    }
    const onUp = (e: PointerEvent) => {
      if (!st.drag) return
      st.drag = false
      if (st.moved < 6) {
        const [x, y] = local(e)
        st.ripples.push({ x, y, t: performance.now() })
        setTouched(true)
      }
      if (e.pointerType !== "mouse") st.hoverTo = 0
      st.vel = Math.max(-4, Math.min(4, st.vel))
      kick()
    }
    const onLeave = () => {
      st.hoverTo = 0
      kick()
    }
    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", onUp)
    canvas.addEventListener("pointercancel", onUp)
    canvas.addEventListener("pointerleave", onLeave)

    api.current = {
      nudge: (d: number) => {
        st.vel += d
        if (reduced) st.yaw += d * 0.6
        setTouched(true)
        kick()
      },
      ripple: () => {
        st.ripples.push({ x: W * 0.62, y: H * 0.36, t: performance.now() })
        setTouched(true)
        kick()
      },
    }

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      resize()
      if (!running) draw(performance.now())
    }) : null
    if (ro) ro.observe(wrap)
    const onVis = () => {
      if (document.hidden) stop()
      else if (on && !reduced) start()
    }
    document.addEventListener("visibilitychange", onVis)

    draw(performance.now())
    if (on && !reduced) start()

    return () => {
      stop()
      if (ro) ro.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("pointercancel", onUp)
      canvas.removeEventListener("pointerleave", onLeave)
    }
  }, [activeAccent, isDark, reduced, on])

  return (
    <div
      ref={wrapRef}
      className="sol-orb"
      role="img"
      tabIndex={0}
      aria-label={label + ". Drag to spin, click to send a ripple. With the keyboard, arrow keys spin it and Enter sends a ripple."}
      data-touched={touched ? "" : undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault()
          api.current.nudge(e.key === "ArrowLeft" ? -1.2 : 1.2)
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          api.current.ripple()
        }
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="sol-orb-hint sol-mono" aria-hidden="true">
        <i />
        Drag to spin
      </span>
    </div>
  )
}

export default StippleOrb
