/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/index.ts
 *
 * Сводный канонический экспорт модулей пресетов стерилизации:
 * - autoclavePresets: циклы автоклавирования и сухожара, 1-клик генераторы, API-коннекторы.
 * - psoPresets: контроль качества очистки (азопирам, фенолфталеин).
 * - kraftPresets: типоразмеры крафт-пакетов, индикаторы, лотки, HID-штрихкоды.
 * - disinfectionPresets: химическая дезинфекция и холодная стерилизация.
 * - types: типизированные интерфейсы.
 */

export * from "./autoclavePresets.js";
export * from "./disinfectionPresets.js";
export * from "./kraftPresets.js";
export * from "./psoPresets.js";
export * from "./types.js";
