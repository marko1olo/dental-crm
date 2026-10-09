/**
 * ══════════════════════════════════════════════════════════════════════════════
 * STOMX CONSENTS & DOCUMENT REGISTRY BARREL (LAYER 5)
 *
 * Единый шлюз реэкспорта всех слоев декомпозированного каталога согласий StomX:
 * - Layer 0: types.ts (интерфейсы и схемы)
 * - Layer 1: therapyAndOrthoConsents.ts (терапия, ортопедия, гигиена)
 * - Layer 1: surgeryAndImplantConsents.ts (хирургия, имплантация, седация)
 * - Layer 1: variableResolver.ts (шаблонизатор печати и подстановка токенов)
 * - Layer 2: specializedAndRefusalConsents.ts (ортодонтия, рентген, отказы, реестр 49 форм)
 * ══════════════════════════════════════════════════════════════════════════════
 */

export * from "./types.js";
export * from "./therapyAndOrthoConsents.js";
export * from "./surgeryAndImplantConsents.js";
export * from "./variableResolver.js";
export * from "./specializedAndRefusalConsents.js";
