# Execution Plan — Round 28: Ultimate DENTE Dental CRM Medical Suite, 3D Visiograph, Telephony & Clinical Protocols Overhaul

## Mission
Deliver production-grade, strongly typed, 10-theme harmonized clinical and diagnostic features for Round 28.

## Milestones & Decomposition

### Milestone 1: Baseline Quality Gate & Architecture Reconnaissance
- Run baseline verification: `npm run check:encoding`, `node scripts/check-css-tokens.mjs`, `npm run typecheck`, and `npm test`.
- Audit existing DICOM/imaging components (`apps/web/src/components/dicom/`, `DicomViewerModal.tsx`, `apps/web/src/components/imaging/`, etc.).
- Audit existing Telephony / Call Center components (`apps/web/src/components/telephony/`, `CallCenterHub.tsx`, etc.).
- Audit existing Endodontics, Implantology, and Clinical Protocols (`apps/web/src/components/clinical/`, `packages/shared/src/`).

### Milestone 2: R1 — 3D Visiograph, CBCT & Panoramic AI Diagnostic Studio
- **MPR Viewers & Panoramic Curve**:
  * Multi-Planar Reconstruction (Axial, Coronal, Sagittal) with linked crosshairs, slice navigation, zoom, pan, window/level presets (Bone, Soft Tissue, Enamel, Pulp).
  * Panoramic curve reconstruction: dental arch spline sampling and reconstructed panoramic projection strip.
- **Nerve Canal Tracing & 3D Implant Safety**:
  * Mandibular nerve canal tracing (`N. mandibularis` / inferior alveolar nerve) with 3D Bezier curve / polyline pathing and safe safety margin envelope (2.0 mm buffer).
  * 3D implant positioning with Misch D1–D4 bone density classification and collision warning if within safety zone of nerve or adjacent tooth roots.
- **AI Pathology Detection & Odontogram Sync**:
  * Automated bounding box / heatmap pathology tags (caries, periapical radiolucency / granuloma / cyst, horizontal/vertical bone resorption).
  * 1-Click sync to odontogram: transfer diagnosed pathologies to anatomical tooth numbers and surfaces.

### Milestone 3: R2 — Clinical Telephony & Instant Call Center Reception Hub
- **Real-Time WebRTC / SIP Call Popup**:
  * Floating call HUD with incoming/outgoing/active states, caller ID identification against patient database, duration timer, mute/hold/transfer actions.
  * Auto-focus patient EMR / card upon incoming call with one-click quick appointment booking drawer.
- **Audio Recording Playback, Transcription & AI Sentiment Analysis**:
  * Waveform audio player with playback speed controls (0.75x - 2x) and seekable timestamps.
  * Full speech-to-text transcript with speaker separation (Receptionist vs Patient).
  * AI sentiment tagger (Positive, Neutral, Anxious, Agitated, Dissatisfied) and clinical key-intent extraction.
- **Omnichannel Messengers & 1-Click Reminders**:
  * Instant WhatsApp / Telegram / SMS reminder trigger toggles with customized template variables.

### Milestone 4: R3 — Advanced Endodontics & Implant Surgical Workflow
- **Multi-Canal Apex Locator Log**:
  * Canal tracking per tooth root (MB1, MB2, DB, P, M, D, etc.): Working Length (mm), Reference Point (incisal/cusp), MAF (Master Apical File), Taper (.02, .04, .06), Obturation technique (Cold Lateral, Warm Vertical / System B, Bioceramic Sealer).
- **Surgical Implant Protocol**:
  * Implant insertion torque log (Ncm), ISQ (Implant Stability Quotient 1-100 via resonance frequency analysis), drill protocol sequence (pilot, shaping, dense bone tap), healing abutment tracker (diameter, collar height, torque).

### Milestone 5: R4 — Universal Multi-Theme Visual Quality & 4-State Visual Proofs
- Ensure 0 CSS token regressions across all 10 themes (`default`, `midnight`, `emerald`, `cyber-xray`, `nordic-frost`, `warm-sand`, `solar-amber`, `royal-amethyst`, `crimson-ruby`, `tokyo-neon`).
- Verify WCAG AAA compliance and high-contrast clinical readability.
- Multi-theme and 4-State visual screenshots (PC Dark, PC Light, Mobile Dark, Mobile Light).

### Milestone 6: Quality Gates & Victory Audit
- Complete monorepo typecheck: `npm run typecheck`
- Unit tests: `npm test -w @dental/web` and `npm test -w @dental/shared`
- CSS token check: `node scripts/check-css-tokens.mjs`
- Encoding check: `npm run check:encoding`
- Mounting test: `panelsAreMounted.test.ts`
- Independent Victory Audit invocation.
