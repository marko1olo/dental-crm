/**
 * ============================================================================
 * RETROACTIVE SANPIN MODULE BARREL (Layer 5)
 * Канонический реэкспорт всех слоев ретроспективного СанПиН 3.3686-21:
 * - Layer 0: types.ts (типы и DTO)
 * - Layer 1: retroactiveDisinfectionMatcher.ts (дезсредства, режимы, диапазоны)
 * - Layer 2: retroactiveCycleGenerator.ts (генерация циклов по визитам)
 * - Layer 3: retroactiveSanpinValidator.ts (валидация, досье А4, выгрузка CSV)
 * ============================================================================
 */

export * from "./types.js";
export * from "./retroactiveDisinfectionMatcher.js";
export * from "./retroactiveCycleGenerator.js";
export * from "./retroactiveSanpinValidator.js";
