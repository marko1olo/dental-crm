/**
 * surgeryProtocols.ts — Хирургические протоколы, физиологические нормы операций и мягкий овердрафт склада.
 * Стандарт: «Софт для врача, а не врач для софта. Любой барьер или лишний клик — это брак».
 */

export * from "./surgeryNormsCatalog";
export * from "./protocols/surgeryWarehouseOverdraft";
export * from "./protocols/surgeryDiaryBuilder";
export * from "./protocols/surgeryInvoiceDispatcher";
export * from "./protocols/surgeryExtractionTypes";
export * from "./protocols/surgeryExtractionServices";
export * from "./protocols/surgeryExtractionProtocolBuilder";
export * from "./protocols/surgeryPostOpMemo";
