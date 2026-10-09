/**
 * photoProtocolEngine.ts — Orthodontic & Clinical Dental Photo Protocol Canonical Facade (@dental/shared)
 *
 * Fully compliant with:
 * - Клинические рекомендации Стоматологической Ассоциации России (СтАР) по ортодонтической диагностике
 * - Международный стандарт фотографического протокола ABO (American Board of Orthodontics)
 * - Приказ Минздрава России от 15.12.2014 № 834н (Медицинская карта стоматологического пациента)
 * - Стандарты FDI / ISO 3950 (нумерация зубов и оценка окклюзионных взаимоотношений по Энглю)
 *
 * Decomposed into modular DAG structure under ./photoProtocol/ in accordance with /decomposer:
 * - types.ts (Layer 0): Schemas, interfaces & contracts
 * - shotAngleClassifier.ts (Layer 1): Angle registry & classification
 * - photoColorCalibration.ts (Layer 1): Colorimetry, gray card & guidelines
 * - beforeAfterComparator.ts (Layer 2): Session mutations & comparison series
 * - photoPresentationExporter.ts (Layer 2): Presentation HTML & ZTL export
 * - index.ts (Layer 5): Unified module barrel
 */

export * from "./photoProtocol/index.js";
