/**
 * packages/shared/src/sanpin/kraftPackageProtocolLink.ts
 *
 * Канонический фасад привязки данных стерилизации к медицинской карте приёма.
 * Мандат 8b: строго <= 120 строк.
 * Мандат 8e: ноль блокировок врача, штрихкод опционален.
 */

export * from "./kraftBarcodeParser.js";
export * from "./kraftDiaryLink.js";
export * from "./procedureMaterialDeductionEngine.js";
