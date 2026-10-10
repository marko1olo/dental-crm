/**
 * voiceClinicalCommands.ts — Канонический фасад голосового клинического ассистента DENTE.
 * Декомпозирован в модульную подсистему ./clinicalCommands/ (DAG Layering).
 * Обеспечивает 100% обратную совместимость публичного API.
 */

export * from "./clinicalCommands/index.js";
export type * from "./clinicalCommands/index.js";
