# Thenar REST & WebSocket API Catalog (v1)

Base URL: `http://localhost:3000/api/v1`  
Interactive Documentation: `http://localhost:3000/api/docs`

---

## 1. REST Endpoints Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/status` | Public | Returns current `Device` and `LockStatus` |
| `POST` | `/status` | `x-device-token` | Ingests device heartbeat & state update |
| `GET` | `/attempts` | Public | Paginated list of attempts (`?outcome=`, `?limit=`) |
| `GET` | `/attempts/:id` | Public | Detailed attempt record with feature deviations |
| `GET` | `/attempts/:id/frames` | Public | Telemetry frames (returns 404 in non-experiment mode) |
| `POST` | `/attempts` | `x-device-token` | Ingests attempt decision from device |
| `POST` | `/frames/batch` | `x-device-token` | Ingests high-rate frames in experiment mode |
| `GET` | `/settings` | Public | System settings (`nFailuresBeforeLockout`, `experimentMode`) |
| `PUT` | `/settings` | Public | Updates settings & pushes config to devices via WS |
| `GET` | `/profile` | Public | Enrolled profile metadata |
| `POST` | `/profile/enroll` | Public | Proxies to Python `/fit` and saves model |
| `POST` | `/profile/reset` | Public | Clears owner biometric profile (`confirm: "RESET_PROFILE"`) |
| `GET` | `/notifications` | Public | Audit log and security alerts |
| `POST` | `/notifications/:id/read` | Public | Marks notification as read |
| `GET` | `/export/attempts` | Public | Export attempts audit log (`?format=csv\|json`) |
| `GET` | `/export/attempts/:id/frames` | Public | Export frames for an attempt (`?format=csv\|json`) |
| `POST` | `/demo/simulate` | Public | Triggers server-side simulator scenario |
| `POST` | `/demo/reset` | Public | Resets SQLite database and seeds ~40 attempts |
| `GET` | `/analytics/summary` | Public | Returns honest null placeholders |
| `GET` | `/health` | Public | Service health check |

---

## 2. Example curl Ingest Request

```bash
curl -X POST http://localhost:3000/api/v1/attempts \
  -H "Content-Type: application/json" \
  -H "x-device-token: thenar-device-secret-2026" \
  -d '{
    "id": "att_manual_01",
    "sessionId": "sess_lab_01",
    "ts": 1730840000000,
    "fingerprint": { "result": "accept", "templateId": 1 },
    "score": -2.35,
    "tau": -3.85,
    "decision": "accept",
    "failureCounterAfter": 0,
    "durations": {
      "touchMs": 380,
      "timeToPeakForceMs": 840,
      "rotationMs": 620,
      "totalMs": 2150
    },
    "featureDeviations": [],
    "flags": ["manual_curl_test"],
    "role": "genuine"
  }'
```

---

## 3. WebSocket Streams

### 3.1 App Live Stream (`/ws/live`)
Connect: `ws://localhost:3000/ws/live` (No token required).  
Messages broadcasted:
- `status`: `{ type: "status", data: { device, lock } }`
- `frame`: `{ type: "frame", attemptId: string, frames: Frame[] }` (batched ~10 Hz)
- `decision`: `{ type: "decision", attempt: Attempt }`
- `notification`: `{ type: "notification", notification: Notification }`

### 3.2 Device Telemetry Ingest Stream (`/ws/device`)
Connect: `ws://localhost:3000/ws/device?token=thenar-device-secret-2026`  
(Requires valid device token).
- Receives: `config` messages from Gateway when settings change.
- Transmits: `heartbeat`, `status`, `frame`, `attempt`.
