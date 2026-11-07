# SocialHub Enterprise OS — Known Technical Limitations

**Version:** 2.0  
**Status:** Living Document  

---

## 1. Browser-Based Screenshot & Screen Capture Limitations

### The Hard Technical Boundary
The web browser runs within an unprivileged client sandbox enforced by modern operating systems (Windows, macOS, Linux, Android, iOS). Because of this design:
1. **No Kernel Hooks:** The browser engine cannot inspect, intercept, or disable kernel-level operating-system screen grabbers (e.g., Windows Snipping Tool, macOS Screenshot Daemon, OBS Studio, Greenshot).
2. **Physical Photography:** No software running on a computer can prevent an individual from photographing physical monitors with an external smartphone camera.

### Our Engineering Defense & Trade-Offs
- **Dynamic Forensic Watermarking:** By permanently rendering high-contrast, semi-transparent employee identification (`EMP-XXXX`, Name, IP, Live Timestamp) across all confidential data surfaces, any leaked photograph or capture immediately implicates the offending employee.
- **Event Interception:** We intercept known browser-level shortcuts (`PrintScreen`, `Win+Shift+S`, `Cmd+Shift+3/4`, `Ctrl+P`, `Ctrl+S`, `F12`) and overwrite the clipboard, but treat this as a deterrent and alerting mechanism rather than an absolute block.
- **Auditing Transparency:** Security incident logs mark suspected capture attempts for administrator review without making unfounded false-positive claims of malice.

---

## 2. Meta Graph API (Instagram & Facebook) Constraints

1. **Account Type Requirements:**
   - Meta Graph API strictly requires Instagram accounts to be **Professional Business or Creator accounts** connected to a published Facebook Page. Personal Instagram accounts cannot be published to or managed via Graph API.
2. **Rate Limits & Throttling:**
   - Meta enforces a rolling 24-hour publishing limit (typically 25–50 API-published posts per Instagram account).
   - Our BullMQ workers enforce platform-side rate-limit throttles and exponential backoff to avoid account suspension.
3. **Media Container Encoding:**
   - Instagram video publishing requires an asynchronous 2-step container generation process (`create_container` -> poll container status -> `publish`). Videos must strictly match supported aspect ratios (1:1, 4:5, 9:16) and bitrates.
4. **Token Expiration & Refresh:**
   - Long-lived user access tokens expire after approximately 60 days. The platform must perform automatic background token health sweeps and notify managers 7 days prior to expiry.

---

## 3. Scope & Architectural Boundaries

1. **Single-Organization Scope:**
   - Version 2.0 does not support cross-organization multi-tenancy, tenant billing, or tenant self-provisioning. All records carry an `organization_id` solely for clean data partitioning.
2. **No End-to-End Encryption (E2EE) for Internal Messaging:**
   - Company-managed messaging utilizes TLS in transit and KMS encryption at rest. It does not implement client-side E2EE because enterprise governance, compliance retention, legal discovery, and keyword DLP filtering require authorized server-side evaluation.
3. **Web-Only Initial Platform:**
   - Version 2.0 is deployed as a responsive web application. Native desktop wrappers (Electron/Tauri) and mobile apps (React Native) are planned for Version 3.0.
