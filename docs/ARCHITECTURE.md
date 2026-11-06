# Thenar System Architecture

## 1. Executive Summary & Design Principles

Thenar is a smart-safe handle telemetry and dual-gate behavioral biometrics system.

```mermaid
graph TD
    subgraph HARDWARE_LAYER["1. Physical Handle / Device Simulator"]
        ESP32["ESP32 Microcontroller<br/>(Dual-Core FreeRTOS)"]
        HX711["Load Cell + HX711<br/>(Grip Force @ 80-100Hz)"]
        MPU["MPU-6050 6-DoF IMU<br/>(Angular Velocity & Accel)"]
        R503["R503 Fingerprint Scanner<br/>(On-module Minutiae Match)"]
        Bolt["Fail-Secure Solenoid Deadbolt<br/>(Mechanically Independent)"]

        HX711 & MPU & R503 --> ESP32
        ESP32 -->|12V MOSFET Pulse| Bolt
    end

    subgraph GATEWAY_LAYER["2. Gateway Service (Node.js + Express + WebSocket)"]
        GW_REST["REST API v1<br/>(Port 3000)"]
        GW_WS["WebSocket Server<br/>(/ws/device & /ws/live)"]
        DB[(SQLite WAL Database<br/>thenar.sqlite)]

        GW_WS <--> DB
        GW_REST <--> DB
    end

    subgraph ENROLLMENT_LAYER["3. Offline Enrollment Toolchain (Python FastAPI)"]
        FASTAPI["FastAPI Service<br/>(Port 8000)"]
        SKLEARN["scikit-learn LedoitWolf<br/>(Shrinkage Covariance + LOO Tau)"]
        FASTAPI --- SKLEARN
    end

    subgraph CLIENT_LAYER["4. Companion Web App (React 18 + Zustand)"]
        WEB["React 18 Single Page App<br/>(Vite @ Port 5173)"]
        STORE["Zustand Store<br/>(useThenarStore.ts)"]
        FALLBACK["In-Browser Mock Fallback<br/>(@thenar/engine)"]

        WEB <--> STORE
        STORE -.->|Offline Fallback| FALLBACK
    end

    ESP32 ==>|WebSocket Frame Stream & Attempts| GW_WS
    ESP32 -->|REST Heartbeats| GW_REST
    GW_REST <-->|POST /fit Proxy| FASTAPI
    STORE <==>|Live Telemetry & Notifications| GW_WS
    STORE <-->|REST API Queries| GW_REST
```

### Core Architecture Rules:
1. **Decision Authority**: The unlock decision is made **ON THE DEVICE (ESP32)**. The Gateway NEVER decides to unlock.
2. **Fail-Secure Independence**: The handle is mechanically independent of the solenoid deadbolt. On power failure, software crash, or sensor disconnection, the bolt remains mechanically extended.
3. **Zero Raw Fingerprint Transmission**: Only the scalar outcome (`accept`/`reject` + template ID) is transmitted. Raw minutiae and templates never leave the biometric module.
4. **Experiment vs Normal Mode**: Normal mode stores scalar attempt metrics and per-feature deviations for rejects only. Raw 100 Hz kinematic frames are stored in SQLite **only** when `experimentMode: true`.
5. **Resilient Degradation**: If the Gateway is unreachable, the Companion Web App smoothly activates the in-browser fallback engine with an "Offline Demo Mode" indicator, ensuring presentations are never interrupted.
