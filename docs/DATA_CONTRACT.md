# Thenar Data Contract Specification (v1)

This document specifies the single source of truth for all data structures exchanged between the ESP32 / Device Simulator, Gateway API, Enrollment Service, and Companion Web App.

---

## 1. Device Object (`Device`)
Represents physical or simulated micro-controller hardware state.

| Field | Type | Description |
|---|---|---|
| `deviceId` | string | Unique hardware identifier (e.g. `thenar_esp32_dev_01`) |
| `firmwareVersion` | string | Firmware semantic version (e.g. `v1.0.0-esp32`) |
| `hardwareRevision` | string | PCB revision tag (e.g. `rev-B`) |
| `wifiSsid` | string | Connected local wireless access point |
| `rssi` | number | Signal strength in dBm (-120 to 0) |
| `ip` | string | Assigned IPv4 address |
| `uptimeSec` | number | Time in seconds since micro-controller boot |
| `online` | boolean | True if heartbeats received within last 15s |

---

## 2. Lock Status Object (`LockStatus`)
Represents the electromechanical deadbolt and door state machine.

| Field | Type | Description |
|---|---|---|
| `door` | `"closed" \| "open"` | Magnetic reed switch state |
| `bolt` | `"extended" \| "retracted"` | Solenoid deadbolt physical position |
| `solenoid` | `"off" \| "on"` | 12V MOSFET coil energization state |
| `state` | `LockState` | `idle`, `gesture`, `accept`, `reject`, `timeout`, `fault`, `lockout`, `door_open`, `relocking` |
| `failureCount` | number | Consecutive failed attempt counter |
| `lockoutUntil` | `number \| null` | UTC millisecond timestamp when penalty expires |

---

## 3. Attempt Record (`Attempt`)
Represents a completed biometric access attempt.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique attempt identifier (e.g. `att_sim_1730840000`) |
| `sessionId` | string | Telemetry session grouping identifier |
| `ts` | number | UTC millisecond timestamp of attempt completion |
| `fingerprint` | `{ result, templateId }` | Gate 1 outcome (`accept`, `reject`, `capture_fail`) |
| `score` | `number \| null` | Gate 2 behavioral score $s(x) = -D_M(x)$ |
| `tau` | number | Calibrated decision threshold $\tau$ |
| `decision` | `"accept" \| "reject" \| "timeout" \| "invalid"` | Dual-gate final decision |
| `failureCounterAfter`| number | Counter state immediately following this attempt |
| `durations` | `{ touchMs, timeToPeakForceMs, rotationMs, totalMs }` | Physical phase duration breakdown |
| `featureDeviations`| `[{ name, z }]` | Top z-score deviations for rejected attempts |
| `flags` | `string[]` | Operational anomaly flags (e.g. `gate1_spoof_suspected`) |
| `role` | `"genuine" \| "impostor" \| "imitation" \| "unknown"` | Ground truth label |
| `experimentSession`| `"S1" \| "S2" \| "S3" \| "S4"` | Protocol session tag (optional) |

---

## 4. Telemetry Frame (`Frame`)
Recorded exclusively in **experiment mode** (`experimentMode: true`).

| Field | Type | Description |
|---|---|---|
| `sessionId` | string | Associated recording session |
| `tUs` | number | Elapsed microsecond counter from gesture onset |
| `force` | number | Calibrated load cell force in Newtons |
| `gx, gy, gz` | number | MPU-6050 gyroscope angular velocity (deg/s) |
| `ax, ay, az` | number | MPU-6050 linear acceleration ($m/s^2$) |

---

## 5. Model Export (`ModelExport`)
Output of the Python Ledoit-Wolf statistical shrinkage fitting pipeline.

| Field | Type | Description |
|---|---|---|
| `schemaVersion` | `1` | Data contract version |
| `modelType` | `"mahalanobis_shrinkage"` | Classifier algorithm type |
| `featureNames` | `string[]` | 16 canonical feature names in array order |
| `mean` | `number[]` | Standardized feature means |
| `covInv` | `number[][]` | Inverted precision / covariance matrix ($16 \times 16$) |
| `scalingMean` | `number[]` | Feature centering parameters |
| `scalingStd` | `number[]` | Feature scaling parameters |
| `tau` | number | Leave-one-out calibrated decision threshold |
