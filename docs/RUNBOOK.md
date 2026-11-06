# Thenar Operations Runbook & Committee Demo Script

## 1. Quick Startup

To run the entire system locally with one command:

```bash
npm run dev:all
```

Or run individual micro-services in separate terminals:
- **Terminal 1 (Python Enrollment)**: `apps\enrollment\.venv\Scripts\python.exe -m uvicorn apps.enrollment.src.main:app --port 8000`
- **Terminal 2 (Gateway Express + WS)**: `npm run dev:gateway`
- **Terminal 3 (Companion Web App)**: `npm run dev:web`
- **Terminal 4 (Device Simulator)**: `npm run sim -- --scenario=owner-unlock`

---

## 2. The 5-Minute Committee Presentation Demo Script

Follow this exact sequence in front of the examination committee:

### Step 1: Baseline Architecture & System Status (0:00 - 1:00)
1. Open [http://localhost:5173](http://localhost:5173).
2. Point out the **Header Status Chip**: show that it indicates `Gateway: Online (API & WS)` and Wi-Fi signal `-58 dBm`.
3. Show the **3D Stipple Orb** reacting smoothly to mouse drag and physics inertia.
4. Show the **Lock Mechanism SVG**: Solenoid is off, bolt extended, door closed.

### Step 2: Genuine Owner Unlock (1:00 - 2:00)
1. In the Dashboard or Live Session screen, click **"Simulate Owner Unlock"**.
2. Point to the oscilloscope: observe the 3 live channels (Grip Force $F_z$, Gyro Yaw $\omega_z$, and Accel).
3. Point out the Dual-Gate outcome:
   - Gate 1: Fingerprint accepted.
   - Gate 2: Behavioral score $s(x) \approx -2.3 \ge \tau (-3.85)$.
4. Watch the animated Solenoid Deadbolt retract for 5 seconds and listen to the success chime.

### Step 3: Spoofed Fingerprint Attack Demonstration (2:00 - 3:00)
1. Navigate to the **Attack Simulator** (`/#/attack`).
2. Select the **"Silicone / Gelatin Fingerprint Replica"** scenario.
3. Click **"Execute Attack Vector"**.
4. Point out the critical engineering proof:
   - Gate 1 was **BYPASSED** (Fingerprint Match = True).
   - Gate 2 behavioral stopping power **REPELLED** the attack ($s(x) = -9.8 < \tau$).
   - The solenoid remained de-energized, bolt stayed locked in strike, and a security warning toast was logged!

### Step 4: Escalating Security Lockout (3:00 - 4:00)
1. Run 5 consecutive impostor attempts:
   ```bash
   npm run sim -- --scenario=impostor --count=5
   ```
2. Watch the failure counter increment: `1/5`, `2/5` ... `5/5`.
3. The system enters **LOCKOUT**: the banner turns red, and the escalating countdown begins ($30 \times 2^0 = 30\text{s}$).
4. Refresh the browser: point out that the lockout countdown **persists** across reboots because the timestamp is saved in flash / SQLite.

### Step 5: Audit Log, Replay & CSV Export (4:00 - 5:00)
1. Navigate to **Attempt Log** (`/#/log`).
2. Filter by `REJECT` or search for specific attempts.
3. Click an attempt to open the drawer: explain the per-feature z-score deviations.
4. Click **"Replay Telemetry"** to re-render the 100 Hz kinematic curve.
5. Click **"Export CSV"**: download the audit log and open it to show the stable column schema.

---

## 3. Database Reset & Recovery

To reset the database back to initial seed data:

```bash
# Via curl
curl -X POST http://localhost:3000/api/v1/demo/reset

# Or via Settings UI
# Click "Reset to Factory Defaults" in the Settings screen
```
