# Speech Provider Research

Date: 2026-05-16

## Decision

Use a layered strategy, not one vendor lock-in.

1. Browser speech for no-key capture where supported.
2. Groq Whisper as the first cloud STT key to request.
3. OpenAI transcription when the same protected worker is already used for careful text polish.
4. Deepgram for realtime/streaming clinic assistant scenarios.
5. AssemblyAI for longer async recordings and background transcription.
6. Cloudflare Workers AI Whisper as a second wired cloud fallback when the clinic has an account id and token pool.
7. Whisper.cpp/Vosk for offline desktop/local bridge when a clinic PC has a configured local service.
8. Azure/Google/Hugging Face are kept as admin/provider-choice lanes: useful for free-tier experiments or existing cloud contracts, but not doctor-facing treatment controls.
9. iOS/Android native speech is a future mobile-shell lane that should submit text, not raw audio, whenever the OS can handle recognition.

## Current Free / Low-Cost Notes

These are official-page observations as of 2026-05-16 and must be rechecked before production billing.

| Provider | Why it matters | Free / cost note | Product stance |
| --- | --- | --- | --- |
| Browser Web Speech API | Zero server load, immediate fallback | No API key from us; support/privacy behavior depends on browser | Keep as non-blocking helper |
| Groq Speech to Text | Fast Whisper-compatible STT, good first key | Groq docs mention free-tier STT upload up to 25MB and dev-tier up to 100MB | First cloud STT pilot |
| OpenAI Transcribe | Quality transcription plus same vendor path for polish | Paid transcription; useful if OpenAI worker already exists | Second path, not free default |
| Deepgram | REST and WebSocket STT for realtime assistant | Pricing page shows free credit, then pay-as-you-go | Use when live streaming matters |
| AssemblyAI | Async/streaming STT and long recording tooling | Official pages mention free/start credits; limits vary by account page | Use for long post-visit recordings |
| Cloudflare Workers AI Whisper | Edge proxy option | Account/Workers AI billing and quotas depend on Cloudflare setup | Wired server fallback when account id + token are configured |
| Azure AI Speech | Enterprise cloud STT and realtime/batch options | Microsoft lists free Speech-to-Text audio hours on free-service/pricing pages; quotas vary by tier/region | Cataloged, future connector |
| Google Cloud Speech-to-Text | Google Cloud STT with free quota path | Google pricing/setup pages describe a free quota with billing enabled, then usage billing | Cataloged, future connector |
| Hugging Face Inference Providers | Research path across open-source ASR models/providers | Free/community and paid provider behavior vary by model/provider | Research lane, not default medical STT |
| iOS/Android native speech | Low server load in future mobile shell | No app-side API bill, but offline/privacy behavior depends on device/OS | Future mobile lane |
| Whisper.cpp | Offline local Whisper | Open-source, no API bill, but CPU/GPU/install cost | Optional desktop/local bridge with readiness preflight |
| Vosk | Lightweight offline commands/STT | Open-source, no API bill, lower free-dictation quality | Optional low-end/offline bridge with readiness preflight |

## Architecture Rule

The browser never receives vendor keys.

## 2026-05-16 Verification Delta

The current implementation matches the vendor constraints that matter for a dental chair-side workflow:

- Groq STT exposes OpenAI-compatible transcription and translation endpoints, supports `whisper-large-v3-turbo` and `whisper-large-v3`, and returns useful `verbose_json` segment metadata. Keep `whisper-large-v3-turbo` as the pilot default for speed/cost, and reserve `whisper-large-v3` for error-sensitive multilingual cases.
- Groq direct uploads are limited by account tier, and requests shorter than 10 seconds are still billed as 10 seconds. This validates the current silence-aware chunking policy: do not send tiny fragments from every pause.
- Groq supports `json`, `verbose_json`, and `text`; `verbose_json` is the correct server default because segment timestamps and quality signals can feed the doctor-facing review state.
- OpenAI transcription currently supports `whisper-1`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, and `gpt-4o-transcribe-diarize`. Uploads are limited to 25 MB, so the same chunk/recovery queue remains required.
- OpenAI diarization requires explicit chunking strategy for longer audio and is not the default chair-side path. It is useful later for call-center/admin recordings, not for the doctor's one-button visit dictation.
- Prompting should be short and terminology-oriented only: dental spellings, materials, tooth notation, and clinic style. Prompting must not ask the STT provider to diagnose or rewrite the clinical record.
- The API now applies that rule through `dental-stt-prompt-v2-2026-05-16`: provider prompt context is server-only, applies to Groq/OpenAI STT, is capped by `DENTAL_STT_PROMPT_MAX_CHARS`, and remains visible in Settings as metadata only.

## 2026-05-17 Recheck

The STT direction remains unchanged after rechecking official provider docs:

- Groq remains the first cloud pilot because it offers an OpenAI-compatible audio transcription path and fits the current server-key-only gateway with key rotation.
- Cloudflare Workers AI Whisper remains a useful fallback only when both account id and token pool are configured; half-configured Cloudflare must not auto-select.
- Deepgram remains the realtime/streaming candidate for later assistant/call-center flows, not the simplest chair-side default.
- AssemblyAI remains the async/long-recording candidate, not the default for short visit dictation.
- The product should keep silence-aware chunking instead of uploading one huge visit file by default: chunks are easier to retry, cheaper to fail, and safer for local recovery.
- Full-recording upload can be a later admin/long-call mode, but the doctor-facing button should keep local-first chunk queue plus deterministic fallback parser.
- Local Whisper.cpp/Vosk remains behind the same safety boundary: `/api/system/local-bridges/readiness` checks whether a local bridge is available, `/api/speech/transcribe-chunk` can forward audio only to configured localhost/private LAN bridge URLs, and the Visit screen does not become a vendor/engine selector or block typing/saving when the bridge is absent.

All vendor calls go through:
- `GET /api/speech/status`
- `GET /api/speech/providers/runtime`
- `POST /api/speech/recording-strategy`
- `POST /api/speech/transcribe-chunk`
- `GET /api/speech/recordings/:recordingId/assemble`
- `GET /api/speech/recordings/recovery`
- `POST /api/speech/polish-transcript`

Server key import rule:
- API startup may read extra `.env` files through `DENTAL_SPEECH_ENV_FILE` or `DENTAL_EXTRA_ENV_FILES`;
- imported scalar values never override explicit process env values;
- imported multi-key lists are merged and de-duplicated across files so pools from multiple old projects can be used together;
- no imported key is returned to the browser, logs, docs, sample data, or status payloads.

Key rotation rule:
- single-key envs (`GROQ_API_KEY`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `ASSEMBLYAI_API_KEY`) still work for a tiny clinic pilot;
- multi-key envs (`GROQ_API_KEYS`, `OPENAI_API_KEYS`, `DEEPGRAM_API_KEYS`, `ASSEMBLYAI_API_KEYS`) and numbered envs (`GROQ_API_KEY_1..N`, etc.) are parsed into a de-duplicated server-only pool;
- each request picks a random available key, then retries another key for retryable provider errors up to `DENTAL_SPEECH_KEY_RETRY_LIMIT`;
- 429 errors get a rate-limit cooldown, 401/403 get a longer auth cooldown, and timeouts/transient network/5xx get a short error cooldown;
- status payloads expose only counts: configured, available, cooling down, retry limit, timeout, and cooldown windows.
- cooldown/failure/success state is also persisted by provider fingerprint in `.data/speech-key-health.json` by default, without raw key values, so restarts do not erase rate-limit/auth cooldowns.

`GET /api/speech/status` is intentionally an admin/status contract, not a doctor workflow:
- if a wired server key exists and `DENTAL_SPEECH_PROVIDER` is empty, the API auto-selects the first pilot-ready provider;
- if the requested provider is not wired or has no key, the API can fall back to another configured wired provider;
- `fallbackProviderIds` is capped by `DENTAL_SPEECH_FALLBACK_LIMIT` so accidental multi-provider billing is controlled;
- Cloudflare is considered configured only when both a token pool and `CLOUDFLARE_ACCOUNT_ID` are present, so auto-selection cannot pick a half-configured provider;
- the doctor still sees one `Сервер STT` action and one `Очистить STT` action.

`GET /api/speech/providers/runtime` is the admin/provider matrix:
- wired providers report whether chunk transcription can run now;
- catalog-only providers report key presence but stay out of the treatment UI until a connector is deliberately added;
- local Whisper/Vosk providers report bridge readiness; mobile native speech remains a planned text-only shell lane;
- missing setup is expressed as env variable names, never as key values.

Local bridge rule:
- `DENTAL_SPEECH_PROVIDER=local` selects Whisper.cpp-style local transcription;
- `DENTAL_SPEECH_PROVIDER=vosk` selects the Vosk local HTTP wrapper path;
- explicit transcribe URLs are `DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL` and `DENTAL_VOSK_TRANSCRIBE_URL`;
- base URLs `DENTAL_LOCAL_WHISPER_URL` / `DENTAL_VOSK_URL` stay useful for readiness checks and simple local installs;
- optional health URLs `DENTAL_LOCAL_WHISPER_HEALTH_URL` / `DENTAL_VOSK_HEALTH_URL` override the derived `/health` probe;
- local bridge URLs are accepted only for localhost, `.local`, or private LAN hosts unless `DENTAL_ALLOW_REMOTE_LOCAL_BRIDGES=true`;
- local bridge URL presence is only configuration. The gateway treats a local bridge as currently usable only after a short cached health probe succeeds, so a stopped Whisper/Vosk process cannot drain queued visit audio;
- local bridge auth is optional through `DENTAL_LOCAL_WHISPER_API_KEY` / `DENTAL_VOSK_API_KEY`, but key values never go to the browser.

`POST /api/speech/recording-strategy` is the client capture planner:
- online with a ready provider uses server chunked upload plus IndexedDB recovery;
- offline uses local queue and deterministic parser;
- local-only privacy disables cloud upload and neural polish;
- long recordings are marked as async-safe instead of being sent as one fragile blob.

`GET /api/speech/recordings/recovery` is the anti-loss layer:
- recordings are grouped from saved server chunks, not volatile UI state;
- missing indexes and failed statuses are visible after refresh;
- quality counts are visible, so a transcript with text but low confidence/provider warnings is marked `quality_review` instead of pretending to be clean;
- provider retries are allowed to improve an existing server chunk for the same `recordingId + chunkIndex`, but lower-quality retries keep the earlier usable transcript;
- recording identity is stricter than chunk idempotency: once a `recordingId` has a visit/patient/source/language, later chunks with a different identity return `409` and scoped assemble/chunk reads ignore the wrong visit;
- recovery and assemble reads require `visitId` or `patientId`, so refresh recovery cannot become an unscoped server transcript index;
- next action tells the client/admin whether to assemble, review flagged chunks, flush local queue, retry chunks, or keep local transcript fallback.

Chunk quality rule:
- `clear` means no provider warning, no low confidence, and transcript text is present;
- `review` means text is usable but the provider/fallback/signal set asks the doctor to check it;
- `empty` means audio/local input produced no usable text;
- `failed` means the provider path failed. None of these states blocks typing or saving.

`POST /api/speech/polish-transcript` has two layers:
- deterministic cleanup is always on and works offline in the browser fallback;
- optional neural cleanup is server-only, OpenAI-compatible, disabled by default, and guarded against added tooth numbers, added diagnosis codes, extreme shortening, and extreme expansion.

Neural polish env:
- `DENTAL_SPEECH_NEURAL_POLISH=on`
- `DENTAL_SPEECH_POLISH_PROVIDER=openai|groq|custom`
- `DENTAL_SPEECH_POLISH_BASE_URL`
- `DENTAL_SPEECH_POLISH_API_KEY` for a dedicated single polish key, otherwise OpenAI/Groq use the same server key pools as STT: `OPENAI_API_KEYS` / `OPENAI_API_KEY_1..N` or `GROQ_API_KEYS` / `GROQ_API_KEY_1..N`
- `DENTAL_SPEECH_POLISH_MODEL`
- `DENTAL_SPEECH_POLISH_MAX_CHARS`

The visit screen must remain usable when all providers fail:
- typed transcript autosaves locally;
- browser speech can append text if supported;
- deterministic polish cleans common STT mistakes;
- server audio recording is allowed to start even when the active provider is missing, all keys are cooling down, or the workstation is offline;
- audio chunks that cannot safely upload are queued in IndexedDB first with append/delete semantics; `localStorage` is only a small legacy fallback and must not silently truncate earlier chunks;
- audio-only queued chunks are not flushed/deleted while `/api/speech/status` says server transcription is not currently available, because the API gateway discards raw audio after a provider attempt and cannot recover a transcript from an empty `needs_provider_key` response;
- `/api/speech/chunks` requires an explicit `recordingId`; global transcript listing is not a doctor/admin shortcut because it leaks PHI across visits;
- server chunks can be assembled back into one transcript with missing-index reporting, so retry flows do not depend on fragile in-memory UI state;
- Visit passes active `patientId`/`visitId` into recovery/assemble calls, so restored text cannot cross-append into another patient's open note when a browser has stale recording ids;
- shared rule parser drafts EMR by specialty;
- saving reviewed EMR uses local retry queue.

## Sources

- Groq Speech to Text: https://console.groq.com/docs/speech-to-text
- Groq pricing: https://groq.com/pricing
- OpenAI Speech to Text: https://platform.openai.com/docs/guides/speech-to-text
- OpenAI API pricing: https://platform.openai.com/pricing
- Deepgram STT docs: https://developers.deepgram.com/docs/stt/getting-started
- Deepgram pricing: https://deepgram.com/pricing
- AssemblyAI docs: https://www.assemblyai.com/docs/
- AssemblyAI pricing: https://www.assemblyai.com/pricing/
- Azure Speech pricing: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
- Azure free services: https://azure.microsoft.com/en-us/pricing/free-services/
- Google Cloud Speech-to-Text pricing: https://cloud.google.com/speech-to-text/pricing
- Google Cloud Speech setup: https://docs.cloud.google.com/speech-to-text/docs/setup
- Hugging Face Inference Providers: https://huggingface.co/docs/inference-providers/index
- Android SpeechRecognizer: https://developer.android.com/reference/android/speech/SpeechRecognizer
- Web Speech API: https://developer.mozilla.org/docs/Web/API/Web_Speech_API
- Whisper.cpp: https://github.com/ggml-org/whisper.cpp
- Vosk API: https://github.com/alphacep/vosk-api
