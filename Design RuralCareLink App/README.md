# RuralCareLink

**An offline-first, low-bandwidth telemedicine continuity layer for rural India.**

RuralCareLink is a PHC-side resilience layer designed for Primary Health Centres and Health & Wellness Centres in low-connectivity regions. It is **not** a replacement for eSanjeevani — it is interoperable with eSanjeevani and ABDM, designed for future integration with national telemedicine systems.

---

## Problem Statement

Rural PHCs in India operate in areas with unreliable or absent internet connectivity. Existing telemedicine platforms such as eSanjeevani require active internet for all clinical workflows. When connectivity fails, patient data is lost, consultations cannot proceed, and health workers are left without support.

RuralCareLink addresses this gap as a **PHC-side continuity layer** — capturing patient data, vitals, and consultation requests locally, then syncing to the server when connectivity returns.

---

## Proposed Solution

RuralCareLink provides the following core capabilities:

1. **Patient Registration** — register patients with demographic and health ID (Aadhaar/ABHA) details, offline
2. **Vitals Capture** — log temperature, BP, SpO₂, pulse, weight, and blood sugar at the point of care
3. **Adaptive Consultation Mode Switching** — supports video → audio → chat fallback based on available bandwidth
4. **Offline Local Storage** — all data is stored locally using IndexedDB when internet is unavailable
5. **Sync When Internet Returns** — queued records are uploaded in batch with clientId-based deduplication on reconnect

**Interoperability:**
- Designed to be interoperable with eSanjeevani and ABDM
- Future integration target: national telemedicine systems and ABDM health records exchange
- No official government integration is currently implemented — this is a prototype for demonstration and proposal purposes

**Doctor Dashboard:**
- Prototype implementation for demonstration
- Trial interface showing case review workflow
- Future target: full integration with national telemedicine system doctor-side workflows

---

## Tech Stack

- **Frontend:** React, Vite, TypeScript
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL
- **Auth:** JWT with role-based access (Health Worker / Doctor)
- **i18n:** English, Hindi, Marathi, Kannada (database-driven)
- **Offline Sync:** REST API with clientId deduplication

---

## Running the project

See [README-RUN.md](./README-RUN.md) for full setup instructions.

```bash
npm run dev:all   # starts both frontend (port 5173) and backend (port 4000)
```