# Speech Transcription Plan

Date: 2026-05-16

## Product Goal

Voice must reduce the doctor's load, not create a new fragile workflow.

The visit screen should keep one primary path:
1. doctor speaks or types;
2. raw transcript is preserved;
3. deterministic parser drafts structured EMR fields;
4. optional model polish fixes punctuation and sectioning only;
5. doctor reviews and saves;
6. final signing stays separate.

## Provider Order

Recommended pilot order:
1. Browser `SpeechRecognition` as zero-key, zero-server-load helper where available.
2. Groq Whisper for the first cloud speech-recognition pilot when `GROQ_API_KEY` or a `GROQ_API_KEYS` pool is available.
3. OpenAI transcription if the same server-side AI worker is already used for careful text polish.
4. Deepgram only when real streaming and live assistant behavior are needed.
5. AssemblyAI for long async recordings and after-visit transcription.
6. Cloudflare Workers AI Whisper as the second wired cloud fallback when `CLOUDFLARE_ACCOUNT_ID` and a token pool are configured.
7. Azure AI Speech / Google Cloud Speech-to-Text only when a clinic already has that cloud contract or wants to use free-tier experiments with clear billing boundaries.
8. Hugging Face Inference Providers as a research lane for comparing open-source ASR models, not as the default medical production lane.
9. iOS/Android native speech in the future mobile shell when it can send `localTranscript` without uploading raw audio to our server.
10. Whisper.cpp or Vosk for an offline desktop/local-clinic module.

Current product catalog is exposed in Settings -> AI as `speechProviders`.

Current Visit implementation:
- the Visit dictation area has an optional browser voice button;
- recognized text is appended to the same autosaved transcript textarea;
- unsupported browser/microphone errors become warnings, not blockers;
- server/local speech recording uses `MediaRecorder` chunks when `/api/speech/status` says a cloud key pool or local module is configured;
- server speech recording can still start when the source is missing, all keys are cooling down, or the workstation is offline; in that case audio chunks are written to the local queue first, and the client must not flush/delete audio-only chunks until `/api/speech/status` reports `serverTranscriptionCurrentlyAvailable=true`;
- failed server chunks are saved into a local browser queue and retried when the connection returns;
- pending audio chunks are stored in IndexedDB first with append/delete semantics; legacy `localStorage` is only a small fallback and must fail loudly instead of silently truncating earlier audio;
- the Visit screen keeps one doctor-facing server recognition action and falls back to the same local normalizer offline;
- the doctor can always keep typing and save the reviewed EMR draft.

## Key Handling

Provider keys never belong in the browser, mobile client, repository, screenshots, logs, or sample data.

Server environment variables:
- `DENTAL_SPEECH_ENV_FILE=C:\path\to\old-project\backend\.env`
- `DENTAL_EXTRA_ENV_FILES=C:\path\one\.env;C:\path\two\.env`
- `DENTAL_SPEECH_PROVIDER=browser|groq|openai|deepgram|assemblyai|cloudflare|local`
- `DENTAL_SPEECH_FALLBACK_LIMIT=2`
- `DENTAL_SPEECH_KEY_RETRY_LIMIT=3`
- `DENTAL_SPEECH_PROVIDER_TIMEOUT_MS=45000`
- `DENTAL_SPEECH_RATE_LIMIT_COOLDOWN_MS=60000`
- `DENTAL_SPEECH_ERROR_COOLDOWN_MS=30000`
- `DENTAL_SPEECH_AUTH_COOLDOWN_MS=600000`
- `DENTAL_SPEECH_KEY_HEALTH_FILE=.data/speech-key-health.json` persists only key fingerprints/cooldowns/failure counters, never raw keys; set to `off` to disable the restart-safe cooldown cache.
- `DENTAL_SPEECH_KEY_HEALTH_TTL_MS=2592000000` prunes old key-health fingerprints after 30 days by default.
- `GROQ_API_KEYS` or `GROQ_API_KEY_1..N` for random speech-recognition key rotation.
- `GROQ_API_KEY`
- `OPENAI_API_KEYS` or `OPENAI_API_KEY_1..N`
- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEYS` or `DEEPGRAM_API_KEY_1..N`
- `DEEPGRAM_API_KEY`
- `ASSEMBLYAI_API_KEYS` or `ASSEMBLYAI_API_KEY_1..N`
- `ASSEMBLYAI_API_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `HUGGINGFACE_API_TOKEN`
- `DENTAL_SPEECH_NEURAL_POLISH=on` only when the clinic explicitly enables model-based transcript cleanup.
- `DENTAL_SPEECH_POLISH_PROVIDER=openai|groq|custom`
- `DENTAL_SPEECH_POLISH_BASE_URL` for a custom OpenAI-compatible endpoint.
- `DENTAL_SPEECH_POLISH_API_KEY` for a dedicated single polish key, or the provider key pool already used on the server. Groq/OpenAI polish uses `GROQ_API_KEYS` / `GROQ_API_KEY_1..N` or `OPENAI_API_KEYS` / `OPENAI_API_KEY_1..N` with the same random rotation, cooldown, timeout, and fingerprint-only persistence as speech recognition.
- `DENTAL_SPEECH_POLISH_MODEL`
- `DENTAL_SPEECH_POLISH_MAX_CHARS`
- `DENTAL_STT_DENTAL_PROMPT=off` disables the speech terminology prompt pack when a clinic wants provider-default transcription.
- `DENTAL_STT_PROMPT_MAX_CHARS` caps the prompt context sent to prompt-capable speech providers.
- `DENTAL_STT_CUSTOM_TERMS` appends clinic-specific terms, brands, doctors, and material spellings to the server-side prompt.
- `DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL` or `DENTAL_LOCAL_WHISPER_URL` points to a local/private LAN Whisper.cpp-compatible transcription endpoint. If only the base URL is provided, the API appends `/v1/audio/transcriptions`.
- `DENTAL_VOSK_TRANSCRIBE_URL` or `DENTAL_VOSK_URL` points to a local/private LAN Vosk HTTP wrapper endpoint that accepts multipart audio and returns `text`/`transcript` or Vosk-style `result` words.
- Optional `DENTAL_LOCAL_WHISPER_HEALTH_URL` / `DENTAL_VOSK_HEALTH_URL` can override the local module health endpoint. Otherwise the gateway derives `/health` from the base/transcribe URL.
- `serverTranscriptionEnabled=true` for local Whisper/Vosk means the URL is configured; `serverTranscriptionCurrentlyAvailable=true` now requires a fresh successful health probe. A dead local module keeps audio in IndexedDB/local recovery instead of flushing chunks into a failed workstation process.
- `DENTAL_LOCAL_STT_TIMEOUT_MS=25000` caps local module requests so a stuck workstation process cannot block the visit workflow.
- `DENTAL_LOCAL_STT_PROBE_TIMEOUT_MS=900` and `DENTAL_LOCAL_STT_PROBE_TTL_MS=7000` tune the non-audio health probe cache for local Whisper/Vosk modules.
- `DENTAL_ALLOW_REMOTE_LOCAL_BRIDGES=true` is required before the API will probe non-local/non-private local module hosts.

The API exposes one internal route:
- `POST /api/speech/transcribe-chunk`
- `GET /api/speech/gateway-health`
- `GET /api/speech/providers/runtime`
- `POST /api/speech/recording-strategy`
- `GET /api/speech/recordings/recovery`
- `GET /api/system/local-bridges/readiness`
- `GET /api/system/local-bridges/use-plans`

That route receives clinic-authenticated chunks, forwards to the selected provider, and returns transcript segments with timestamps and confidence metadata when available.

Implemented gateway:
- API startup loads `.env.local`, `.env`, and optional `DENTAL_SPEECH_ENV_FILE` / `DENTAL_EXTRA_ENV_FILES` paths without overwriting scalar process env. If `.env.local` declares extra env files, the loader follows them in a second pass; multi-key lists such as `GROQ_API_KEYS` are merged and de-duplicated across files so old project keys do not need to be copied into the repository.
- `GET /api/speech/status` returns active provider, whether a server key is configured, recommended chunk length, size limit, retention mode, and warnings.
- `GET /api/speech/status` also returns `requestedProviderId`, `providerSelectionMode`, `configuredProviderIds`, `fallbackProviderIds`, `serverTranscriptionCurrentlyAvailable`, `nextSetupStep`, `polishPolicy`, `promptPolicy`, and safe `keyPool` counts, so Settings can explain setup without exposing keys.
- `GET /api/speech/gateway-health` returns a non-secret health report for admins: active/fallback providers, total configured/available/cooling-down keys, timeout/retry policy, dental prompt state, deterministic parser state, provider health levels, and redacted key fingerprints with cooldown/failure counters.
- `GET /api/speech/providers/runtime` returns a provider-by-provider admin matrix with connector type, configured/available/cooling-down key counts, required/missing server-setting counts, and next setup step; it is not a doctor workflow and never returns secret values or raw environment variable names.
- `POST /api/speech/recording-strategy` returns the recommended capture path for the current context: server chunked, browser live, offline queue, local transcript only, or async long recording.
- `GET /api/speech/recordings/recovery` returns a compact server-side recovery index: recording id, chunks received, missing chunk indexes, provider/status counts, transcript preview, and next recovery action. It now requires `visitId` or `patientId`, because unscoped recovery is a PHI leak.
- `POST /api/speech/transcribe-chunk` accepts `recordingId`, `chunkIndex`, `mimeType`, optional `audioBase64`, optional `localTranscript`, source, visit/patient ids, language, and specialty.
- `POST /api/speech/transcribe-chunk` persists a doctor-facing quality object for every chunk: `clear`, `review`, `empty`, or `failed`, plus provider confidence when available, word/character counts, duration/byte signals, provider warnings, and a non-blocking next action.
- `POST /api/speech/transcribe-chunk` sends a short dental prompt pack to Groq Whisper and OpenAI Transcribe. The prompt improves terms such as FDI notation, RVG/OPG/CBCT, E.max, zirconia, abutment, sinus-lift, Air Flow, iTero, Medit, and 3Shape, but explicitly says to transcribe verbatim and never diagnose, summarize, infer, or add facts.
- `POST /api/speech/polish-transcript` normalizes dictation before EMR drafting without adding facts. It always runs deterministic cleanup first. Optional neural polish is server-only, disabled by default, accepted only after length/tooth-number/diagnosis-code guards, and shares OpenAI/Groq key-pool rotation/cooldown with speech recognition. A failed neural polish never blocks saving because deterministic text is kept.
- `GET /api/speech/chunks?recordingId=...` returns saved transcript chunks for audit/debug. Calls without `recordingId` return no transcript chunks; a global PHI list is not exposed. Active `patientId` and `visitId` query values further scope recovery to the current visit.
- `GET /api/speech/recordings/:recordingId/assemble` rebuilds the recording transcript from saved chunks, returns received/missing chunk indexes, provider labels, statuses, quality counts, and warnings. The route now requires active `patientId` or `visitId`, so a stale or collided recording id cannot append another visit's text.
- Groq and OpenAI use OpenAI-compatible audio transcription endpoints through the API server; Groq requests `verbose_json` so Whisper segment metadata can contribute confidence and quality warnings when present.
- Deepgram uses pre-recorded audio transcription for chunks; full live streaming can be added later when the chair-side assistant needs partial results.
- AssemblyAI uses upload + transcript polling for short chunks; longer recordings should become async jobs.
- If `DENTAL_SPEECH_PROVIDER` is unset but a wired provider key exists, the gateway auto-selects the first configured provider in pilot order. If the requested provider is unavailable but another wired key exists, it falls back without blocking the doctor.
- On provider errors, one audio chunk first rotates through available keys for the active provider up to `DENTAL_SPEECH_KEY_RETRY_LIMIT`; 429, auth, timeout, transient network, and 5xx failures cool down only the failing key.
- Speech-recognition key cooldowns persist to `DENTAL_SPEECH_KEY_HEALTH_FILE` by fingerprint only, so an API restart does not immediately reuse a rate-limited or auth-failing key.
- If provider-local key retries still fail, the same chunk can try the configured fallback provider chain up to `DENTAL_SPEECH_FALLBACK_LIMIT`; raw audio is still discarded after forwarding.
- Cloudflare Workers AI Whisper is wired server-side through Workers AI REST when `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_API_TOKENS` are present.
- Local Whisper.cpp can now receive `/api/speech/transcribe-chunk` through an OpenAI-compatible local/private LAN module URL. No cloud speech-recognition key is required.
- Local Vosk can now receive `/api/speech/transcribe-chunk` through a clinic-owned HTTP wrapper. Native Vosk websocket/gRPC remains a module implementation detail outside the treatment UI.
- Local Whisper.cpp/Vosk URLs no longer make the module "currently available" by themselves. `/api/speech/status`, `/api/speech/providers/runtime`, and `/api/speech/gateway-health` use the same cached health probe before allowing queued audio flush.
- `/api/system/local-bridges/readiness` now checks optional local Whisper.cpp/Vosk health URLs without sending audio. It reports ready, unreachable, misconfigured, blocked, or not configured, and Settings -> Audit keeps this as admin diagnostics rather than a treatment-screen choice.
- `/api/system/local-bridges/use-plans` now decides the safe current dictation path: local recognition module when ready, otherwise server recognition when a key pool is available, otherwise browser/typed transcript plus deterministic parser and local queue. The output is admin diagnostics; the Visit screen stays one workflow.
- Azure, Google, Hugging Face, and native mobile speech are cataloged as future/provider-choice lanes; they do not appear as doctor-facing choices during treatment.
- raw audio is discarded after provider forwarding; transcript chunks, provider label, byte length, status, quality object, warnings, and timestamps are persisted in prototype state.
- deterministic speech polish handles common recognition cleanup such as КТ/ОПТГ/RVG/CBCT, Air Flow, коффердам, anesthesia typos, section headings, and spoken FDI tooth numbers from 11 to 48.
- deterministic visit draft assembly now returns a compact quality gate: ready/review/needs-more-dictation, confidence, specialty, detected FDI teeth, parser signals, missing critical fields, and next safe action. This must remain a warning and never block the doctor from saving.

## 2026-05-18 Reliability Hardening Delta

- Provider/STT failure text returned to chunk warnings is now clinic-readable: provider label plus a bounded recovery reason such as source timeout, temporary request limit, rejected server access, temporary source failure, rejected audio fragment, or unstable connection. Raw provider classes such as `rate_limited`, `http_N`, and `provider_error` stay out of doctor/API warnings.
- `GET /api/speech/recordings/recovery` and `GET /api/speech/recordings/:recordingId/assemble` now return `400` unless `visitId` or `patientId` is present.
- Speech key cooldown/failure/success state now persists by `providerId:fingerprint` only in `DENTAL_SPEECH_KEY_HEALTH_FILE`, with no raw key values.
- Local Whisper/Vosk availability now uses a cached health probe; a configured but stopped module reports enabled/not-currently-available and leaves queued audio local until the module answers.
- Smoke checks passed: key-health persistence produced no raw-key leak, unscoped recovery returned `400`, unscoped assemble returned `400`, scoped empty recovery/assemble still returned valid contracts.
- The Visit screen shows a compact status strip for local autosave, server draft sync, queued voice audio, and recovery state. It must stay glanceable and non-blocking; detailed provider matrices remain in Settings.
- optional OpenAI-compatible neural polish can use OpenAI, Groq, or a custom gateway. It is an editor, not a doctor: if it fails, expands too much, removes too much, or adds tooth/diagnosis codes, the API keeps deterministic text and returns a warning.
- Neural polish failures and `/api/speech/polish-transcript` validation errors must be clinic-readable. The route keeps deterministic text and local parsing as the recovery path; it must not return raw zod issue text, provider error classes, HTTP tokens, upstream messages, or secret-bearing diagnostics.
- `/api/speech/recording-strategy`, `/api/speech/transcribe-chunk`, and `/api/speech/polish-transcript` now own public invalid-payload copy at the route boundary. Bad strategy/chunk/polish bodies return one operator action and must not expose raw zod `issues`, parser paths, speech DTO keys, or request-body diagnostics before provider, queue, or clinical-scope logic runs.
- Speech clinical-scope failures on chunk upload, chunk audit, recovery, and assembly now return stable `SpeechClinicalScopeError` plus a Russian operator message. Missing scope, missing records, and visit/patient mismatches must not expose `visitId`, `patientId`, `request.query`, helper names, or null/undefined route internals.
- Speech prompt and deterministic draft warnings are doctor-facing Russian copy. Disabled dental prompt packs, custom clinic term packs, local draft parser warnings, and damaged audio chunks must not expose environment variable names, parser ids, `base64`, byte limits, or transport jargon.
- deterministic offline cleanup also normalizes common prosthetic/implant/hygiene terms such as E.max, zirconia, metal-ceramic, PMMA, veneers, inlay/onlay/overlay, endocrown, abutment, gingiva former, sinus-lift, bone grafting, surgical guide, iTero, Medit, and 3Shape, so poor speech recognition does not force a cloud model for basic dental vocabulary.

## Low-Load Recording Strategy

Default is chunked recording, not one huge upload.

Current anti-loss rule:
- every audio chunk is written to IndexedDB before upload, even when the server speech provider is ready;
- the local queue entry is removed only after `/api/speech/transcribe-chunk` returns successfully;
- retry is safe because the server accepts chunks idempotently by `recordingId + chunkIndex`, locks a whole recording to one visit/patient/source/language identity, rejects mismatched chunks with `409`, and the Visit UI deduplicates applied chunk text by the same key.
- idempotency is upgrade-safe: if an earlier server chunk was `failed`, `needs_provider_key`, empty, or lower-quality, a later retry for the same `recordingId + chunkIndex` may replace it with better text/quality; a worse retry cannot erase already usable transcript text. If visit, patient, source, or language do not match, the retry is rejected as an identity conflict.

Client:
- use `MediaRecorder` with WebM/Opus where available;
- cut chunks by silence, hard time limit, and max byte size;
- current smart chunking policy comes from `/api/speech/status`: min chunk, max chunk, silence window, RMS threshold, and monitor interval;
- chunk policy also exposes a text dedupe window and an overlap target: browser MediaRecorder deduplicates boundary transcripts today, while native/mobile recorders can later add real audio pre-roll;
- the current product strategy comes from `/api/speech/recording-strategy`, so offline/local-only/long-recording paths are explicit and testable instead of hidden UI assumptions;
- default min chunk is 10 seconds, because Groq's official speech-pricing/docs mention a 10-second minimum billed length per request;
- if Web Audio analysis is unavailable, recording falls back to time-only `MediaRecorder` chunks instead of blocking the doctor;
- even when Web Audio silence detection is active, `MediaRecorder` runs with a hard timeslice so a background tab cannot produce one oversized blob;
- keep a small overlap between adjacent chunks to avoid clipped words;
- store pending chunks in IndexedDB until the server confirms receipt; queue writes are append-only and ACK cleanup deletes one chunk id, avoiding clear-and-rewrite races while MediaRecorder uploads run concurrently;
- if the active gateway is offline, not configured, or all fallback keys are cooling down, keep audio-only chunks in IndexedDB and show a warning; do not send them to `/api/speech/transcribe-chunk` just to receive `needs_provider_key`, because the server intentionally does not persist raw audio after forwarding;
- any queued item with `audioBase64` stays local until `/api/speech/status` reports a currently available server/local recognizer, even if the item also has local fallback text; text fallback must not cause the browser to delete recoverable audio before recognition can run;
- when an offline chunk flushes after a visit or clinic switch, the client must compare the returned `chunk.visitId` with the currently open visit before appending transcript text or assembling the recording for the visible card;
- reject oversized browser blobs before base64 conversion;
- transcript clear is destructive, so the Visit screen keeps an immediate undo snapshot instead of making the accidental empty draft the only local state;
- Visit and Settings expose browser continuity separately from provider health: local draft writes, IndexedDB audio queue, service-worker/PWA shell, Cache Storage, quota, and queued sync counts are checked without showing speech-vendor complexity to the doctor;
- after recording stop or queue flush, reconcile the active recording from server chunks; duplicate chunk indexes are not appended twice to the Visit transcript;
- adjacent recognized text is appended through tail deduplication so repeated words at chunk boundaries do not clutter the doctor's draft;
- Settings can inspect the latest recovery rows so a refreshed browser can see whether server chunks are complete, quality-review, missing, failed, or transcript-empty;
- store the current visible transcript in local draft state immediately;
- sync the current transcript and editable EMR fields to `/api/visits/:visitId/draft/autosave` as a server-side draft snapshot before the doctor accepts the final EMR;
- never block typing or saving if speech recognition fails.

## 2026-05-18 Groq Chunk Floor

- Groq speech chunk timing is now enforced, not just recommended: even if env sets `DENTAL_SPEECH_MIN_CHUNK_MS`, `DENTAL_SPEECH_MAX_CHUNK_MS`, or `DENTAL_SPEECH_RECOMMENDED_CHUNK_MS` below 10 seconds, `/api/speech/status` normalizes Groq to a 10-second floor.
- The server returns a public warning when it clamps chunk timing, so Settings can explain why the doctor is not sending tiny voice fragments.
- Smoke: `npm run smoke:speech-groq-chunk-floor` uses a synthetic key and low chunk env values, does not call Groq, and verifies `minChunkMs=10000`, `recommendedChunkMs=10000`, strategy chunk `10000`, and a visible Groq floor warning.

## 2026-05-18 Key Rotation Smoke

- `npm run smoke:speech-key-rotation` creates a synthetic Groq key pool through `GROQ_API_KEYS`, `GROQ_API_KEY_1`, and a duplicate `GROQ_API_KEY`, then verifies de-duplication into three server-only candidates.
- The smoke forces a 429 on the first selected key and a timeout on the second selected key, then verifies that each failed key enters cooldown and the next attempt can select another available key without calling Groq.
- The same smoke writes key-health state to a temporary file and reads it back to prove the persisted cache contains provider fingerprints, cooldown counters, and sanitized errors only. Raw keys, authorization headers, query API keys, and OpenAI-style `sk-...` tokens must not appear.

Server:
- accept chunks idempotently by `recordingId + chunkIndex`;
- expose recording assembly so a doctor/admin can recover a transcript even after a browser refresh or partial retry;
- expose `chunkingPolicy` so clients can tune chunking without redeploying the web app;
- do not persist raw audio by default after transcription;
- keep raw transcript, polished draft, provider, model, timestamps, and warnings;
- keep pre-acceptance visit draft snapshots separate from signed/accepted EMR revisions;
- reject oversized chunks before provider forwarding;
- redact secrets from all errors and logs.

Use full-recording upload only for short recordings, post-visit transcription, or explicit admin/debug flows.

## Offline Behavior

Offline must still help:
- typed dictation continues to autosave locally;
- browser `SpeechRecognition` can run only if the browser/device supports it;
- deterministic parser remains available without network;
- local Whisper.cpp or Vosk module is optional desktop/local server acceleration and has a readiness preflight; if absent, typed dictation, browser speech where available, IndexedDB queueing, and deterministic parsing still work;
- queued chunks sync when online, but the doctor can always save the manually reviewed EMR draft first.

## Model Polish Rules

The model may:
- restore punctuation;
- split text into complaint, anamnesis, objective status, diagnosis candidate, plan, recommendations;
- preserve dental notation and tooth numbers;
- mark uncertain phrases and missing context.

The model must not:
- invent facts;
- silently add diagnosis;
- delete clinically relevant uncertainty;
- sign EMR;
- hide low confidence.

Every accepted model-polished draft must retain:
- raw transcript;
- parser/model output;
- doctor-reviewed final fields;
- save receipt and audit event.

Current implementation:
- default mode is `deterministic`;
- neural mode becomes `deterministic_neural` only when server env is configured and safety guards accept the output;
- model name and neural warnings are returned to the client, but no key or raw provider secret is exposed;
- the Visit screen keeps one server-recognition action, so the doctor does not have to choose a vendor during treatment.

## Researched Sources

- Groq Speech to Text: https://console.groq.com/docs/speech-to-text
- OpenAI Speech to Text: https://platform.openai.com/docs/guides/speech-to-text
- Deepgram Speech to Text: https://developers.deepgram.com/docs/stt/getting-started
- AssemblyAI docs: https://www.assemblyai.com/docs/
- Cloudflare Workers AI Whisper: https://developers.cloudflare.com/workers-ai/models/whisper
- Web Speech API: https://developer.mozilla.org/docs/Web/API/Web_Speech_API
- Whisper.cpp: https://github.com/ggml-org/whisper.cpp
- Vosk API: https://github.com/alphacep/vosk-api
