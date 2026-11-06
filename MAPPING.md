# MAPPING: Reference Component $\to$ Thenar Companion App

This mapping document translates the entire visual vocabulary, components, layout patterns, and interaction paradigms of the reference design system (**"stipple-orb-landing" / "lagoon"**) into the **Thenar** smart-safe behavioral biometrics companion application.

---

## 1. Global Visual & Architectural Mapping

| Reference Element / Token | Reference Meaning | Thenar Meaning & Implementation |
| :--- | :--- | :--- |
| **Theme / Palette** | "lagoon" (`#1aa59a` accent, `#123b3a` dark button, `#d2efe9` mint) | **Lagoon Security Palette**: Primary biometric accent = `#1aa59a`, deep safe steel = `#123b3a`, pass mint = `#d2efe9`, fault red = `#d1495b`. |
| **Top Hero Circle (`Orb`)** | Decorative stippled financial asset sphere with drag/part/ripple | **The Thenar Stipple Biometric Core**: Stippled interactive sphere representing the continuous sensor field of the handle (grip force + IMU coordinates). Drag to inspect rotation vectors, cursor parts dots, click triggers tactile ripple. Binds to `orbState` (`idle`, `gesture`, `accept`, `reject`, `lockout`, `fault`). |
| **Stippled Horizon (`Horizon`)** | Canvas wave horizon at page bottom | **Mechanical Strike Horizon**: Stippled canvas landscape at footer representing the micro-surface texture of the safe deadbolt strike plate. |
| **Brand Name / Mark** | "Tideline" / wave logo | **"Thenar"** with the official project circular sensor emblem at `/public/logo.png` & `/public/favicon.png`. |
| **Navigation (`.sol-nav`)** | Athletes / How it works / FAQ + "Request access" button | **System Header**: Routes (Dashboard, Live, Log, Profile, Analytics, Attack, Settings) + Physical State chip + Language (EN/AR) + Theme Toggle + Bell Notification Center. |
| **Avatars & Social Proof** | "Joined by 640+ backers" + athlete faces | **Hardware Telemetry Link**: ESP32 Online badge, Wi-Fi RSSI (`-58 dBm`), 100 Hz sampling indicator, and Uptime telemetry. |
| **Partner Badges (`.sol-backers`)** | VC & Sponsor logos ("Seabright Fund", "Harrow & Lune") | **Hardware Gating Modules**: "HX711 Load Cell (24-bit ADC)", "MPU-6050 (6-DoF IMU)", "Optical Biometric Scanner", "Fail-Secure 12V Solenoid". |
| **Cards & Panels (`.sol-card`, `.sol-panel`)** | Soft tactile paper cards with 1px hairlines and generous padding | **Biometric Telemetry Panels**: Housing the physical lock mechanism SVG, streaming charts, attempt cards, and parameter z-score deviation bars. |

---

## 2. Screen-by-Screen Component Mapping

### 2.1 Screen 1: Dashboard (`/`)
- **Reference Hero**: Stipple Orb + Headline + "Start backing" CTA $\to$ **Thenar Hero**: Interactive Stipple Orb (binding to real-time gesture states) + Headline (`*Dual-Gate Physical Security,* Built for the Safe Handle`) + Primary action buttons: `"Simulate Owner Unlock"` (`.sol-btn`) and `"Simulate Failed Attempt"`.
- **Reference Thesis / Ring Diagram**: Backers pooling into income streams $\to$ **Physical Safe Lock Mechanism & Pipeline**:
  - Interactive SVG diagram showing safe door chassis, solenoid electromagnetic coil, fail-secure bolt horizontal retraction, and reed switch.
  - 5-step gesture pipeline (`Touch & Scan` $\to$ `Grip Build-up` $\to$ `Handle Rotation` $\to$ `Release & Return` $\to$ `Dual-Gate Decision`) replacing the monetary streams.
- **Reference Path Cards / Backer Stats**: 4-column cards with monetary metrics $\to$ **Telemetry State Vector Cards**:
  - Door reed switch state (`Closed` / `Open Ajar`).
  - Solenoid state (`Idle OFF` / `Energized ON`).
  - Deadbolt state (`Secured Extended` / `Unlocked Retracted`).
  - Consecutive failure counter (`x / N` before lockout).
- **Reference Story Snippets**: Recent athlete profiles $\to$ **Recent 5 Access Attempts**: Compact cards with timestamp, Gate 1 fingerprint status, Gate 2 score $s(x)$ vs $\tau$, and decision badge.

### 2.2 Screen 2: Live Session (`/live`)
- **Reference Calculators / Interactive Sliders**: Tuning income share agreements $\to$ **Live Telemetry Console**:
  - Start / Stop Capture controls, playback speed selector (`0.5x`, `1.0x`, `2.0x`), and `"Inject Sensor Fault"` arming button.
  - Channel health indicator pills (HX711, Gyroscope, Accelerometer, Fingerprint Scanner) styled with lagoon mint/soft badges.
- **Reference Sparkline & Progress Visuals**: Monthly earning bars $\to$ **Reusable Multi-Channel `LiveChart`**:
  - High-frequency 100 Hz synchronized streaming curves: Force $F(t)$ in amber/lagoon, Gyro $|\omega(t)|$ in sky blue, Accel $|a(t)|$ in soft purple.
  - Shaded physiological phase bands (P1 Build-up, P2 Handle Rotation, P3 Spring Return).
- **Reference Approval Banner**: Success notice $\to$ **Dual-Gate Verification Verdict Panel**:
  - Gate 1 Fingerprint match verification card.
  - Gate 2 Behavioral score $s(x)$ vs $\tau$ animated gauge bar.
  - Final Boolean logic verdict (`FP ACCEPTED AND s(x) >= tau`).

### 2.3 Screen 3: Attempt Log (`/log`)
- **Reference Table / Directory**: Listing athletes and funding rounds $\to$ **Physical Attempt Audit Log**:
  - Clean table (desktop) / cards (mobile) with timestamp, session ID (S1–S4), Gate 1 status, $s(x)$, $\tau$, decision, failure counter, and action buttons.
  - Filter toolbar with outcome pills (`All`, `Accept`, `Reject`, `Lockout`) and search bar.
  - CSV and JSON export buttons in the reference button style.
- **Reference Modal / Detail Drawer**: Athlete bio & breakdown $\to$ **Attempt Telemetry Decomposition Drawer**:
  - Extracted 16-D kinematic feature parameters.
  - Horizontal $z$-score deviation bar chart showing standard deviation distance from owner baseline with $\pm 2.0\sigma$ tolerance limits.
  - Interactive Replay button opening the raw 100 Hz signal playback in `LiveChart`.

### 2.4 Screen 4: Enrollment & Profile (`/profile`)
- **Reference Form / Stepped Wizard**: "Request Access" 3-step application $\to$ **Owner Enrollment & Calibration Wizard**:
  - Step 1: Internal Safe Service Switch toggle with warning notice.
  - Step 2: Record $N$ training trials (with real-time progress indicator).
  - Step 3: Regularized covariance matrix fitting animation.
  - Step 4: Operating threshold $\tau$ percentile slider (calibrated on genuine leave-one-out scores).
  - Step 5: Freeze & export profile to ESP32 flash memory.
- **Reference Analytics Cards**: Yield curve & return distributions $\to$ **Empirical Calibration Visuals**:
  - Genuine enrollment score histogram with vertical $\tau$ cutoff reference line.
  - Asymptotic model stability curve vs trial count ($3 \to 30$ trials).
  - Danger zone: Wipe owner profile with confirmation dialog.

### 2.5 Screen 5: Analytics (`/analytics`)
- **Reference Data Tables & Comparison Matrices**: Model performance tables $\to$ **Graduation Project Thesis Benchmark Tables (R1–R5)**:
  - All metrics render with neutral placeholder `—` and intentional skeleton/empty states.
  - Table R1: Model Comparison (M1 Mahalanobis, M2 One-Class SVM, M3 k-NN, M4 Supervised baseline).
  - Table R2: Sensor Modality Ablation (Force only, Motion only, Dual-modal).
  - Table R3: Adversarial Threat Scenarios (A1 Naive, A2 Mimicry L1/L2, Compromised FP).
  - Table R4: ESP32 System Resource & Latency Profiles.
  - Table R5: Participant-Level Analysis.
  - Empty ROC frame (with diagonal chance line) and empty DET frame with `"Pending final evaluation"` watermarks in the reference's quiet minimalist aesthetic.

### 2.6 Screen 6: Attack Simulator (`/attack`)
- **Reference Comparison Panels**: Investor tier options $\to$ **Adversarial Scenario Selection Cards**:
  - A1 Casual Impostor (Naive).
  - A2 Observer / Mimicry Level 1.
  - A2 Informed Mimicry Level 2 (Pessimistic).
- **Reference Switch / Toggle**: Investment mode switch $\to$ **Silicone Fingerprint Bypass Toggle**:
  - Toggle `"Assume Fingerprint Gate Accepted"` simulating physical silicone spoof.
- **Reference Live Overlay**: Comparing projections $\to$ **Signal Overlay in `LiveChart`**:
  - Dashed red attacker kinematic signal plotted directly over the solid shaded genuine owner profile envelope.
  - Gate 2 behavioral defense stopping power verdict banner and $z$-score anomaly bars.

### 2.7 Screen 7: Settings (`/settings`)
- **Reference Account & Preferences Panels**: Terms & settings $\to$ **Hardware Security Policies & Companion Preferences**:
  - Consecutive failures before lockout slider and escalating lockout toggle.
  - Solenoid hold interval slider.
  - Wi-Fi telemetry link info with test reconnection button.
  - Data privacy guarantee statement (zero raw biometric templates stored).
  - Language toggle (EN / AR) and Dark / Light mode toggle.
  - Factory seed demo reset button.

---

## 3. Lexical Cleanliness Rule

Every single token, heading, button label, tooltip, and copy block from the reference's financial domain (`invest`, `raise`, `athlete`, `sponsor`, `podium`, `prize money`, `endorsement`, `equity`, `cap table`, `share of income`, `dividend`, etc.) is **strictly replaced** with authentic Thenar domain terminology (`telemetry`, `dual-gate`, `sensor`, `load cell`, `solenoid`, `bolt`, `fingerprint`, `Mahalanobis`, `gyroscope`, `jerk`, `lockout`, `calibration`, `adversary`, etc.).
Zero old-domain strings remain.
