/**
 * packages/shared/src/types/surgery.ts
 *
 * Канонические типы, нормы и Zod-схемы хирургической стоматологии и имплантологии.
 * Стандарты: Mandate 8e (Автономия врача), Mandate 8i (Суверенитет стоматологического контекста),
 * Mandate 8s (Анти-блоат), СанПиН 3.3686-21 (Класс Б отходы), Номенклатура 804н, Форма 043/у.
 *
 * Без стационарного госпитального блоата:
 * НЕТ общему наркозу, НЕТ койко-дням, НЕТ трансфузиям крови, НЕТ ПКУ наркотических анальгетиков,
 * НЕТ комиссиям из 3 человек для списания карпул или установки имплантатов.
 * Мягкий овердрафт склада (canProceed: true): задержка накладной никогда не блокирует операцию.
 */

export * from "./surgeryModules/surgerySchemas.js";
export * from "./surgeryModules/surgeryProtocolTemplates.js";
export { IMPLANT_AND_EXTRACTION_SURGICAL_NORMS } from "./surgeryModules/surgeryNormsCatalogImplantAndExtraction.js";
export { PERIO_AND_EMERGENCY_SURGICAL_NORMS } from "./surgeryModules/surgeryNormsCatalogPerioAndEmergency.js";

import type { SurgicalOperationNorm } from "./surgeryModules/surgerySchemas.js";
import { IMPLANT_AND_EXTRACTION_SURGICAL_NORMS } from "./surgeryModules/surgeryNormsCatalogImplantAndExtraction.js";
import { PERIO_AND_EMERGENCY_SURGICAL_NORMS } from "./surgeryModules/surgeryNormsCatalogPerioAndEmergency.js";

export const CANONICAL_SURGICAL_OPERATION_NORMS: readonly SurgicalOperationNorm[] = [
	...IMPLANT_AND_EXTRACTION_SURGICAL_NORMS,
	...PERIO_AND_EMERGENCY_SURGICAL_NORMS,
];
