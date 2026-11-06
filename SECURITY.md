# Security Policy

## Supported Versions

The Thenar project is currently in active graduation prototype development. Security updates are applied to the active development branches and tagged releases.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

As Thenar is a graduation research and prototype system operating under a **private repository**, please report any suspected vulnerabilities or security disclosures privately to the core development team rather than opening public issues or pull requests.

### Disclosure Protocol
1. **Direct Communication**: Send an email detailing the vulnerability, reproduction steps, affected subsystems (Gateway, Web Companion, Enrollment Microservice, or Device Firmware), and potential exploit impact to:
   - Primary Maintainer: `youssef5520055` (GitHub)
2. **Private Resolution**: The maintainers will acknowledge receipt within 48 hours, replicate the issue in an isolated development environment, and coordinate a fix on a private `security/*` branch.
3. **Coordinated Release**: A patch release will be tagged and merged following validation through our automated security pipeline (`npm audit`, `pip-audit`, and unit test gates).

## Security Architecture Highlights
- **Decision on Device**: Biometric unlock decisions are executed locally on the ESP32 hardware handle. The Gateway and Companion Web App never make autonomous unlock decisions.
- **Fail-Secure Architecture**: Solenoid bolts remain mechanically deadlocked during power loss or system failure.
- **Zero Raw Minutiae / Templates in Cloud**: Fingerprint sensor minutiae are kept within isolated sensor flash. No raw fingerprint images or biometric templates are transmitted to or stored within the companion gateway database.
- **Constant-Time Verification**: Device tokens and authorization headers are compared using cryptographically secure constant-time comparisons (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- **Sanitized Data Exports**: CSV exports strictly sanitize cell data against Formula Injection (CWE-1236).
