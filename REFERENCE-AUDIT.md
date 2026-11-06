# REFERENCE AUDIT: "stipple-orb-landing" (Variant: "lagoon")

Source URL: `https://21stdev-my-components-one.vercel.app/#stipple-orb-landing/lagoon`  
Author: `Kedhareswer` (21st.dev template / component id: 1209)  
Original Repository: `Kedhareswer/21stdev-my-components/components/stipple-orb-landing`

---

## 1. Color Palette Tokens ("lagoon")

The reference design system uses a tranquil, high-precision architectural palette consisting of natural mineral grey base papers, deep pine-teal primary buttons, a luminous lagoon seafoam accent (`#1aa59a`), and pastel tint accents (mint, cream, sky).

### Lagoon Variant Core Variables
- `--sol-accent`: `#1aa59a` (Luminous deep lagoon cyan/teal)
- `--sol-button`: `#123b3a` (Deep forest-teal / dark lagoon button surface)
- `--sol-on-button`: `#ffffff`
- `--sol-mint`: `#d2efe9` (Light seafoam tint)
- `--sol-cream`: `#efeccd` (Soft pearl/cream tint)
- `--sol-sky`: `#d3e6f3` (Subtle pale sky tint)

### Surface & Neutral Tokens (Light Mode — Default in Reference)
- `--sol-paper`: `#efefed` (Quiet tactile light grey background)
- `--sol-panel`: `#e8e8e5` (Recessed secondary container background)
- `--sol-card`: `#f8f8f6` (Clean elevated card white/paper surface)
- `--sol-ink`: `#141414` (Near-black high contrast text)
- `--sol-soft`: `#4a4a47` (Mid-tone secondary text)
- `--sol-muted`: `#9a9a95` (Tertiary captions, timestamps, and borders)
- `--sol-line`: `rgba(20, 20, 20, 0.09)` (Subtle division rules)
- `--sol-line2`: `rgba(20, 20, 20, 0.16)` (Stronger active borders)
- `--sol-shadow`: `0 1px 2px rgba(20,20,20,.06), 0 8px 24px -12px rgba(20,20,20,.18)`
- `--sol-dotc`: `rgba(20, 20, 20, 0.16)`

### Surface & Neutral Tokens (Dark Mode)
- `--sol-paper`: `#111111`
- `--sol-panel`: `#171717`
- `--sol-card`: `#1d1d1c`
- `--sol-ink`: `#f1f1ee`
- `--sol-soft`: `#c2c2bd`
- `--sol-muted`: `#7d7d78`
- `--sol-line`: `rgba(255, 255, 255, 0.08)`
- `--sol-line2`: `rgba(255, 255, 255, 0.15)`
- `--sol-shadow`: `0 1px 2px rgba(0,0,0,.4), 0 10px 30px -14px rgba(0,0,0,.7)`
- `--sol-dotc`: `rgba(255, 255, 255, 0.14)`

---

## 2. Typography

- **Body & Display Family**:
  `"Inter", "Inter Tight", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  - Headings: Clean geometric sans, tracking `-0.02em` to `-0.04em`, italicized accent words via `*word*` markdown syntax rendering in soft muted tone or serif italic touch.
  - Body: 14px–15px, line-height 1.5, letter-spacing `-0.01em`.
- **Monospace Family**:
  `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`
  - Used for numerical tags, tickers, telemetry badges, labels, and metrics.
- **Arabic Typography**:
  `"IBM Plex Sans Arabic", "Cairo", sans-serif` (matches the geometric neutral rhythm of Inter).

---

## 3. The Signature Stipple Orb Component

- **Rendering Engine**: HTML5 2D Canvas with bucketed batch rendering (`buckets.flush(ctx, colors)`).
- **Dot Distribution**: Fibonacci sphere sampling (`fibSphere(n, 11)`), dynamically scaling point count $N$ from $5,000$ to $15,000$ points based on viewport width:
  $$N = \text{round}\left(\min\left(15000, \max\left(5000, \frac{W \times H}{24}\right)\right)\right)$$
- **Color Ramp**: 18-step gradient from neutral shadow grey `[118, 118, 112]` to warm accent `[26, 165, 154]` into highlight hot white/cyan `[56, 215, 204]`.
- **Lighting Direction**: Upper-right directional illumination `LIGHT = [-0.62, -0.62, 0.48]` with radial ambient glow under the lit cap:
  `radialGradient` centered at $(cx + 0.55 R \cdot L_x, cy + 0.55 R \cdot L_y)$.
- **Interactions**:
  1. *Idle Spin*: Continuous smooth yaw rotation with velocity damping ($vel \to auto$ with $dt \times 1.6$).
  2. *Drag*: Dragging the sphere imparts rotational yaw and pitch inertia with natural momentum decay.
  3. *Pointer Proximity Parting*: Pointer cursor coordinates $(px, py)$ part dots within radial distance $rad = R \times 0.38$ via inverse quadratic displacement $(1 - d/rad)^2$, creating an elastic interactive wake.
  4. *Click Ripple*: Clicking generates expanding shockwave ripples ($r(t) = v \cdot t$) across the sphere surface that elevate dot lightness and displacement.
  5. *Reduced Motion*: Respected by setting $auto = 0$ when `prefers-reduced-motion` is active.

---

## 4. Spacing, Borders & Radius Scale

- **Max Content Width**: `1180px` (`.sol-wrap`)
- **Corner Radii**:
  - Small pills & badges: `9999px`
  - Interactive buttons: `8px`
  - Cards & panels: `16px` (`--sol-card` containers)
  - Modals & dialogs: `20px`
- **Borders**: Crisp $1\text{px}$ hairline rules using `var(--sol-line)` and `var(--sol-line2)`.
- **Spacing Scale**: 4px base modular scale (`4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px`).

---

## 5. Components & Layout Patterns

1. **Sticky Header / Nav (`.sol-nav`)**:
   - Blurred glass background with 1px border.
   - Brand mark with circular stipple glyph.
   - Minimalist text links (`Athletes`, `How it works`, `FAQ` $\to$ routed to Thenar navigation).
   - Right action pill button + Theme toggle (`.sol-icon-btn`) + Lang switcher.
2. **Hero Composition**:
   - Giant Stipple Orb hero graphic centered/anchored at top.
   - Big typographic statement with italicized contrasting accent words.
   - Lead paragraph with understated copy.
   - Primary action button + Social proof avatar cluster (`Joined by 640+ backers`).
   - Partner mark strip (`.sol-backers`).
3. **Thesis / Live Flow Diagram Section**:
   - Central visual loop: Backers pooling into income streams.
   - Interactive stream list with icon glyphs and animated monetary tickers.
4. **Calculators & Split Path Panels (`.sol-paths`)**:
   - Segmented toggle (`For backers` vs `For athletes`).
   - Slider control (`Range` / model parameters).
   - Data summary metrics and check-bullet lists.
5. **How it Works Vignettes (`.sol-steps`)**:
   - 3-column numbered card sequence with minimalist iconography and clean explanations.
6. **Story Carousel (`.sol-stories`)**:
   - Carousel cards with sparkline growth charts, revenue breakdown badges, and profile metrics.
7. **Two-Column Accordion FAQ (`.sol-faq`)**:
   - Categorized expanding FAQ items with hairline borders.
8. **Stippled Horizon Footer (`.sol-footer`)**:
   - Canvas-rendered stippled wavy horizon line that fades into the page background.
   - Brand manifesto tagline and sub-links.
