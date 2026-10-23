/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * CSV Column Indices & Statutory Fallback Mapping
 */

export interface CsvColumnIndices {
	colCode: number;
	colCommTitle: number;
	colStatTitle: number;
	colCat: number;
	colSpec: number;
	colPrice: number;
	colVip: number;
	colDms: number;
	colPromo: number;
	colNight: number;
	colMatCost: number;
	colLabCost: number;
	colIcd: number;
	colDur: number;
}

export const CATEGORY_CODE_FALLBACK: Record<string, string> = {
	therapy: "A16.07.002",
	surgery: "A16.07.001",
	orthopedics: "A16.07.004",
	orthodontics: "A16.07.048",
	hygiene: "A16.07.051",
	periodontics: "A16.07.018",
	radiology: "A06.07.007",
	consultation: "B01.065.001",
	pediatric: "A16.07.002.009",
	anesthesia: "B01.003.004.005",
};
