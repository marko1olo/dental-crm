# Competitive Voice and CRM Audit

Date: 2026-05-15

## What We Must Beat

The product cannot win by being another scheduler with patient cards. Existing dental systems already cover scheduling, charting, treatment planning, billing, documents, imaging links, reports, and office workflows.

The weak spot to attack is the tired-doctor workflow:
- the doctor should not choose STT vendors during treatment;
- dictation must not be lost after refresh, offline mode, or provider failure;
- AI must not pretend to sign or diagnose;
- specialty noise must stay out of the doctor's current specialty;
- migration from old systems must be preview-first, not destructive.

## Competitor Signals

Dentrix markets all-in-one practice management, AI diagnostics, voice-powered charting, voice perio/restorative charting, treatment planning, imaging integrations, eServices, productivity/reporting, IT/security, backup/recovery, and clinical charting tooling.

Open Dental markets broad dental practice features and a clinical chart module with tooth-chart centered workflows. It is a strong baseline for practical clinic operations, not a narrow voice assistant.

Cloud STT providers are not enough by themselves:
- Groq is attractive for fast OpenAI-compatible Whisper STT, but short requests can waste the 10-second minimum billed duration and uploads need chunk discipline.
- Cloudflare Workers AI Whisper is useful as an edge option and has simple REST access, but it still needs account/token setup and billing/legal review.
- OpenAI, Deepgram, AssemblyAI, Azure, Google, and Hugging Face should remain interchangeable lanes behind our server, never exposed as treatment-screen choices.

## Product Countermove

Build the voice/AI layer as a continuity system, not a novelty button:

1. One doctor-facing action: type, browser voice, or server STT all land in the same dictation field.
2. Local autosave happens immediately.
3. Server draft autosave stores the current transcript and editable EMR fields before acceptance.
4. Audio chunks queue in IndexedDB and server chunks can be assembled by `recordingId`.
5. Chunk policy avoids tiny Groq requests and exposes dedupe/overlap targets.
6. Adjacent transcripts are tail-deduplicated before appending to the doctor's note.
7. Deterministic specialty parser works offline for therapy, prosthetics, surgery, orthodontics, periodontology, hygiene/prevention, pediatric dentistry, implantology, radiology, and general exams.
8. Optional neural polish is server-only and guarded against added tooth/diagnosis facts.
9. Final EMR acceptance stays a separate doctor action with revision, receipt, and audit.

## Current Implementation Evidence

- `/api/speech/status` exposes provider, fallback, key-pool counts, timeout/cooldown, chunking, dedupe, polish, and setup hints without secrets.
- `/api/speech/transcribe-chunk` routes Groq/OpenAI/Deepgram/AssemblyAI/Cloudflare through the API server.
- `/api/speech/recordings/recovery` reports incomplete recordings after refresh/offline retry.
- `/api/visits/:visitId/draft/autosave` stores pre-acceptance server drafts.
- Visit UI keeps vendor details in Settings and leaves the doctor with a compact dictation/work note flow.

## Sources

- Dentrix product/features: https://www.dentrix.com/products/dentrix
- Dentrix voice charting: https://multi-stage.dentrix.com/dental-solutions/dental-care-acceptance-and-delivery/streamline-clinical-charting/
- Open Dental features: https://www.opendental.com/site/features.html
- Open Dental chart module: https://www.opendental.com/manual/chart.html
- Groq Speech to Text: https://console.groq.com/docs/speech-to-text
- Cloudflare Workers AI Whisper: https://developers.cloudflare.com/workers-ai/models/whisper
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
