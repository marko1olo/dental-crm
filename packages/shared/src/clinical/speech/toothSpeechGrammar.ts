/**
 * packages/shared/src/clinical/speech/toothSpeechGrammar.ts
 *
 * DENTE Dental CRM — Canonical Speech Grammar & FDI Tooth Parser SSOT (@dental/shared/clinical).
 *
 * Provides authoritative speech-to-clinical parser for chairside voice dictation:
 * - FDI / ISO 3950 tooth number resolution from spoken Russian numerals (11–48, 51–85)
 * - Anatomical surfaces detection (O, M, D, V, L, P, MOD, etc.)
 * - Clinical statuses (Caries, Pulpitis, Periodontitis, Missing, Implant, Crown, Healthy...)
 * - Unified across apps/api, apps/web, and mobile clients.
 *
 * Compliance:
 * - Mandate 8e: Chairside doctor autonomy (instant zero-latency voice recognition).
 * - Mandate 8s: Universal SSOT — strictly zero duplicate speech parsing logic.
 * - Mandate 8x: Pure clinical language.
 */

export * from "../../ai/toothGrammarSsot.js";
