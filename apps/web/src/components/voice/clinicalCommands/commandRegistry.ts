/**
 * commandRegistry.ts — Канонический фасад конвейера команд речи (Мандат 8b: <= 15 строк).
 */

export * from "./registry/splitIntoClinicalClauses";
export * from "./registry/soapCommandBuilder";
export * from "./registry/medicationCommandBuilder";
export * from "./registry/odontogramCommandBuilder";
export * from "./registry/speechParsePipeline";
