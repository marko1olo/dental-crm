/**
 * perioTypes.ts — Единые типы пародонтологического скрининга ВОЗ (PSR) (Мандат 8b: < 60 строк).
 * Реэкспортирует канонический SSOT perioCatalogData.ts.
 */

import {
	PSR_CODES_CATALOG,
	PSR_SEXTANTS_CATALOG,
	type PsrCodeMeta,
	type PsrSextantMeta,
} from "./perioCatalogData";

export type {
	PsrCode,
	PsrSextantId,
	PsrSextantMeta,
	PsrCodeMeta,
	PsrSextantState,
	PsrScreeningMap,
	PerioScreeningSummary,
} from "./perioCatalogData";

export const PSR_SEXTANTS_CONFIG = PSR_SEXTANTS_CATALOG;
export type PsrSextantInfo = PsrSextantMeta;

export const PSR_CODE_DEFINITIONS = PSR_CODES_CATALOG;
export type PsrCodeDefinition = PsrCodeMeta;

export interface PerioSiteDetail {
	probingDepthMm: number;
	gingivalMarginMm: number;
	bleedingOnProbing: boolean;
	plaque: boolean;
	calculus: boolean;
	suppuration: boolean;
	calMm: number;
}

export interface DetailedPerioTooth {
	toothNumber: number;
	isMissing: boolean;
	isImplant: boolean;
	mobility: 0 | 1 | 2 | 3;
	furcation: 0 | 1 | 2 | 3;
	distoBuccal: PerioSiteDetail;
	midBuccal: PerioSiteDetail;
	mesioBuccal: PerioSiteDetail;
	distoLingual: PerioSiteDetail;
	midLingual: PerioSiteDetail;
	mesioLingual: PerioSiteDetail;
}
