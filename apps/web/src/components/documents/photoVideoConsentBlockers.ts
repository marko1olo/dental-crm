/**
 * photoVideoConsentBlockers.ts
 *
 * Soft Guiding & Safe Defaults Engine for Photo & Video Consent (Mandates 8e, 8n).
 * Re-exports canonical implementation from photoVideoConsentGuiding.ts.
 *
 * Печать согласия и сохранение НИКОГДА не блокируются:
 * незаполненные отметки можно отметить вручную на распечатанном бланке.
 */

export * from "./photoVideoConsentGuiding.js";
