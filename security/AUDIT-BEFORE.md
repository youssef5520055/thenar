# Thenar Pre-Remediation Security Audit (AUDIT-BEFORE.md)

**Date**: November 6, 2026  
**Auditor**: Antigravity Security & Hardening Team  
**Repository**: `youssef5520055/thenar` (Private)  
**Baseline Git Commit**: `v0.1.0-demo` tag (`main` branch)  
**Remediation Branch**: `security/fix-dependencies-2026-11`

---

## 1. Executive Summary

A comprehensive pre-remediation security audit was conducted across all monorepo subsystems:
- Frontend Client: `apps/web` (React 18, Vite 5, Tailwind CSS, HashRouter)
- Hardware Gateway: `apps/gateway` (Node.js 22, Express, SQLite via better-sqlite3, ws WebSocket)
- ML Enrollment Microservice: `apps/enrollment` (Python 3.12, FastAPI, scikit-learn, One-Class SVM)
- Hardware Simulator: `apps/device-sim` (TypeScript / tsx)
- Shared Monorepo Packages: `packages/contracts`, `packages/engine`
- Container and Orchestration: `docker-compose.yml`

The audit identified **2 moderate vulnerabilities reported by GitHub Dependabot & npm audit**, along with **5 architecture and implementation security findings** requiring immediate hardening prior to production deployment.

Importantly, deep static and reachability analysis confirms that **neither of the 2 Dependabot CVEs is exploitable within the current Thenar architecture**. Nevertheless, in alignment with defense-in-depth principles and clean-audit requirements, both will be patched through a managed upgrade to `react-router` and `react-router-dom` `7.18.5`.

---

## 2. GitHub Dependabot & npm Audit Findings

### Finding DEP-01: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration
- **Advisory ID**: [GHSA-337j-9hxr-rhxg](https://github.com/remix-run/react-router/security/advisories/GHSA-337j-9hxr-rhxg)
- **CVE**: CVE-2026-53666
- **Severity**: Moderate (CVSS 3.1: 6.1 / `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N`)
- **CWE**: CWE-470 (Use of Externally-Controlled Input to Select Classes or Code)
- **Affected Packages**: `react-router` >= 6.4.0, < 7.18.0
- **Current Version in Monorepo**: `6.30.6` (transitive via `react-router-dom@6.29.0`)
- **First Patched Version**: `7.18.0` (Targeting `7.18.5`)
- **Reachability Analysis in Thenar**: **NOT REACHABLE (Inert)**
  - *Rationale*: Thenar is a purely static client-side single-page application (SPA) bundled with Vite and running client-side with `<HashRouter>`.
  - *Proof*: The official RemiX/React Router advisory specifies:
    > "This does not impact your application if you are using Declarative Mode. This only impacts Framework Mode and Data Mode applications doing manual SSR/hydration."
  - Thenar contains zero Server-Side Rendering (SSR), React Server Components (RSC), or `deserializeErrors` hydration calls.
- **Planned Fix**: Bump `react-router` and `react-router-dom` in `package.json` and `apps/web/package.json` to `^7.18.5`, regenerate `package-lock.json`, and verify clean runtime routing.

---

### Finding DEP-02: Open Redirect via Backslash in `<Link>` and `useNavigate`
- **Advisory ID**: [GHSA-wrjc-x8rr-h8h6](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6)
- **CVE**: CVE-2026-53669
- **Severity**: Moderate (CVSS 4.0: 5.1 / `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:L/VA:N/SC:L/SI:L/SA:N`)
- **CWE**: CWE-601 (URL Redirection to Untrusted Site)
- **Affected Packages**: `react-router` >= 6.0.0, < 7.18.0
- **Current Version in Monorepo**: `6.30.6` (transitive via `react-router-dom@6.29.0`)
- **First Patched Version**: `7.18.0` (Targeting `7.18.5`)
- **Reachability Analysis in Thenar**: **NOT REACHABLE (Inert)**
  - *Rationale*: The bypass occurs when attacker-supplied paths or query parameters are directly supplied to `<Link to={...}>` or `useNavigate(userInput)`.
  - *Proof*: All navigation paths in Thenar are static string literals defined in internal application routes:
    - `"/"` (Dashboard)
    - `"/live"` (Live Session)
    - `"/log"` (Attempt Log)
    - `"/profile"` (Enrollment)
    - `"/analytics"` (Analytics)
    - `"/attack"` (Attack Simulator)
    - `"/settings"` (Settings)
  - No user parameters or external URLs are ever passed to routing primitives.
- **Planned Fix**: Upgraded along with DEP-01 to `react-router-dom@7.18.5`.

---

## 3. Subsystem Hardening Findings & Technical Debt

### Finding SEC-01: CSV Formula Injection (CWE-1236) in Attempt Log Export
- **File**: `apps/gateway/src/routes/export.ts` and `apps/web/src/pages/AttemptLog.tsx`
- **Severity**: Medium
- **Description**: Export endpoints serialize attempt details (e.g. `subjectId`, `attemptId`, or free-form notes) directly into CSV strings. If an adversary submits a biometric attempt with a `subjectId` or note beginning with `=`, `+`, `-`, `@`, `\t`, or `\r`, spreadsheet applications (Microsoft Excel, LibreOffice Calc) could execute arbitrary formulas or DDE commands upon viewing the downloaded CSV.
- **Planned Fix**: Implement cell sanitization helper `sanitizeCsvField()` that prepends an apostrophe (`'`) to any string field starting with dangerous formula characters before serialization.

---

### Finding SEC-02: Overly Permissive CORS Configuration in FastAPI Microservice
- **File**: `apps/enrollment/src/main.py`
- **Severity**: Medium
- **Description**: `CORSMiddleware` in `apps/enrollment` specifies:
  ```python
  allow_origins=["*"],
  allow_credentials=True,
  ```
  Allowing wildcard `*` with `allow_credentials=True` violates standard browser security policies and could allow malicious cross-origin websites to query the enrollment and training microservice if the browser is on the same local network.
- **Planned Fix**: Restrict `allow_origins` to explicit localhost development origins (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`).

---

### Finding SEC-03: Missing Rate Limiting on Gateway Ingestion Endpoints
- **File**: `apps/gateway/src/server.ts`
- **Severity**: Medium
- **Description**: While `apps/gateway` enforces constant-time bearer token authentication on `/api/v1/attempts/ingest` and `/ws/device`, there is no volumetric rate-limiting middleware. A compromised device or network attacker with token access could flood the gateway with spoofed biometric samples, degrading the SQLite database performance.
- **Planned Fix**: Integrate `express-rate-limit` middleware on `/api/v1/attempts/ingest` and `/api/v1/auth` endpoints.

---

### Finding SEC-04: Unpinned Python Dependencies & Missing Requirements File
- **File**: `apps/enrollment/requirements.txt`
- **Severity**: Low / Hygiene
- **Description**: `apps/enrollment` lacked an explicit, pinned `requirements.txt` file specifying exact dependency versions for reproducible, secure builds across environments and CI runners.
- **Planned Fix**: Generate `apps/enrollment/requirements.txt` with locked versions for FastAPI, Uvicorn, scikit-learn, numpy, scipy, and test runners.

---

### Finding SEC-05: Missing Container Dockerfiles & CI Security Automation
- **File**: `docker-compose.yml`, `.github/workflows/ci.yml`, `.github/dependabot.yml`
- **Severity**: Medium / Governance
- **Description**:
  1. `docker-compose.yml` referenced `apps/*/Dockerfile`, but the actual Dockerfile definitions were absent from the tree.
  2. The repository lacked an automated GitHub Actions CI workflow to enforce linting, unit testing, contrast testing, and security auditing on pull requests.
  3. No `.github/dependabot.yml` configuration existed to group and manage weekly security updates.
  4. No `SECURITY.md` vulnerability reporting policy existed.
- **Planned Fix**:
  - Add hardened multi-stage Dockerfiles (`node:22.14.0-alpine3.21`, `python:3.12.9-slim-bookworm`) with non-root security contexts.
  - Add `.github/dependabot.yml` configured for npm and pip ecosystems.
  - Add `.github/workflows/ci.yml` running linting, TypeScript checks, Vitest, pytest, and contrast auditing.
  - Add root `SECURITY.md` with private vulnerability disclosure guidelines.

---

## 4. Secrets & Credentials Scan

- **Tooling**: `gitleaks detect --no-git` + git commit history inspection
- **Result**: **0 Secrets Detected**.
- **Verified Safe**:
  - `.env` files are excluded in `.gitignore`.
  - `.env.example` contains only benign placeholders (`thenar-device-secret-2026`).
  - No private keys, cloud tokens, database credentials, or real biometric templates exist in repository source or commit history.

---

## 5. Audit Baseline Matrix

| Subsystem | Component | Baseline Version | Identified Vulnerabilities | Status |
|:---|:---|:---|:---|:---|
| **Web** | `react-router` / `react-router-dom` | `6.30.6` / `6.29.0` | GHSA-337j-9hxr-rhxg, GHSA-wrjc-x8rr-h8h6 | Upgrading to 7.18.5 |
| **Web** | CSV Export | Custom inline | CSV Formula Injection (CWE-1236) | Sanitizing fields |
| **Gateway** | Express API | Express 4.21.2 | No rate limiting on ingest | Adding express-rate-limit |
| **Gateway** | Device Auth | Bearer Token | Verified safe (`timingSafeEqual`) | Pass |
| **Enrollment** | FastAPI CORS | CORS Wildcard `*` | Overly permissive origin policy | Whitelisting localhost |
| **Enrollment** | Python Deps | Unpinned | Dependency drift risk | Pinned `requirements.txt` |
| **Infra** | Dockerfiles | Absent | Build failure in compose | Authoring hardened Dockerfiles |
| **Governance** | Dependabot & CI | Absent | Lack of automated CI gate | Authoring workflows & policies |

---

*This document serves as the formal security baseline prior to applying fixes on branch `security/fix-dependencies-2026-11`.*
