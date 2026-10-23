/**
 * packages/shared/src/pricelist/order804n/radiologyCatalog.ts
 * Layer 1: Statutory Catalog for Dental Radiology & Tomography Services (A06.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n dental imaging and radiology services.
 */
export const RADIOLOGY_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A06.07.007",
		title: "Внутриротовая рентгенография (прицельный снимок / визиограф)",
		category: "imaging",
		specialty: "radiologist",
		primaryKeywords: [
			/прицельн.*снимок/i,
			/визиограф/i,
			/\brvg\b/i,
			/радиовизиограф/i,
			/внутриротов.*рентген/i,
			/дентальн.*снимок/i,
			/снимок.*зуб/i,
		],
		secondaryKeywords: [/датчик/i, /контрольн.*снимок/i],
		defaultPriceRub: 600,
		defaultDurationMinutes: 10,
		taxDeductible: true,
	},
	{
		code: "A06.07.010",
		title: "Панорамная рентгенография челюстей (ОПТГ)",
		category: "imaging",
		specialty: "radiologist",
		primaryKeywords: [
			/(?:^|[\s(])оптг(?:[\s)]|$)/i,
			/панорамн.*снимок/i,
			/ортопантомограмм/i,
			/обзорн.*снимок.*челюст/i,
		],
		secondaryKeywords: [/пленка/i, /диск/i, /челюст/i],
		defaultPriceRub: 1500,
		defaultDurationMinutes: 15,
		taxDeductible: true,
	},
	{
		code: "A06.07.013",
		title: "Компьютерная томография челюстно-лицевой области (КЛКТ / КТ 3D)",
		category: "imaging",
		specialty: "radiologist",
		primaryKeywords: [
			/(?:^|[\s(])клкт(?:[\s)]|$)/i,
			/(?:^|[\s(])кт(?:[\s)]|$).*челюст/i,
			/компьютерн.*томограф/i,
			/3d[-\s]?снимок/i,
			/томографи.*чло/i,
			/конусно[-\s]?лучев/i,
			/кт.*двух.*челюст/i,
			/кт.*сегмент/i,
			/исследование.*на.*диск/i,
			/запись.*исследования/i,
		],
		secondaryKeywords: [/dicom/i, /запись.*на.*диск/i, /fov/i, /носитель/i, /cd[-\s]?диск/i],
		defaultPriceRub: 3500,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
	{
		code: "A06.07.006",
		title: "Телерентгенография челюстей (ТРГ в боковой проекции)",
		category: "imaging",
		specialty: "radiologist",
		primaryKeywords: [
			/телерентгенограф/i,
			/телерентгенограмм/i,
			/трг.*боков/i,
			/трг.*прям/i,
			/(?:^|[\s(])трг(?:[\s)]|$)/i,
		],
		secondaryKeywords: [/цефалометри/i, /ортодонтическ.*снимок/i],
		defaultPriceRub: 2000,
		defaultDurationMinutes: 15,
		taxDeductible: true,
	},
];
