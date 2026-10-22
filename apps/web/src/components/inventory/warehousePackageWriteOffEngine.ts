/**
 * WAREHOUSE PACKAGE WRITE-OFF ENGINE (МАНДАТЫ 8e, 8k, 8n)
 * Пакетное списание анестетиков и расходников с расходом сверх остатка.
 * Модуль декомпозирован на сателлиты строго <= 120 строк по Мандату 8b.
 */

export * from "./packageWriteoff/packageWriteoffTypes.js";
export * from "./packageWriteoff/packageWriteoffPresets.js";
export * from "./packageWriteoff/packageWriteoffDeductionCalculator.js";
export * from "./packageWriteoff/packageWriteoffExecution.js";
