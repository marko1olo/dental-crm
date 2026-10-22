/**
 * ТЕХНОЛОГИЧЕСКИЕ КАРТЫ СТОМАТОЛОГИЧЕСКИХ ПРОЦЕДУР (ТЕХКАРТЫ / BOM)
 * Нормы списания материалов по видам приема и СанПиН 3.3686-21.
 * Модуль декомпозирован на сателлиты строго <= 120 строк по Мандату 8b.
 */

export * from "./techMaps/commonPpeTechMap.js";
export * from "./techMaps/anesthesiaAndCariesTechMaps.js";
export * from "./techMaps/endoTechMaps.js";
export * from "./techMaps/surgeryAndHygieneTechMaps.js";
export * from "./techMaps/implantAndGbrTechMaps.js";
export * from "./techMaps/allProcedureTechMaps.js";
