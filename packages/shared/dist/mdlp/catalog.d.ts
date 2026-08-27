import type { DentalAnestheticInfo } from "./types.js";
export declare const DENTAL_ANESTHETICS_CATALOG: readonly DentalAnestheticInfo[];
/**
 * Searches the catalog of dental anesthetics by GTIN, trade name, or INN.
 */
export declare function recognizeDentalMedication(gtin: string, searchHint?: string | null): DentalAnestheticInfo | null;
/**
 * Finds anesthetic by its identifier (e.g. 'ultracain-ds-forte', 'scandonest-3-plain').
 */
export declare function findAnestheticById(id: string): DentalAnestheticInfo | null;
/**
 * Returns all anesthetics matching a specific INN (e.g. 'Артикаин' or 'Мепивакаин').
 */
export declare function findAnestheticsByInn(innPattern: string): DentalAnestheticInfo[];
/**
 * Returns entire dental anesthetics catalog.
 */
export declare function getAllAnesthetics(): readonly DentalAnestheticInfo[];
