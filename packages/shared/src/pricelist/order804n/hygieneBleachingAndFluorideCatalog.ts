/**
 * packages/shared/src/pricelist/order804n/hygieneBleachingAndFluorideCatalog.ts
 * Layer 1: Statutory Catalog for Teeth Whitening, Remineralization & Education (A16.07, A11.07, A14.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n remineralization, bleaching and patient education services.
 */
export const HYGIENE_BLEACHING_AND_FLUORIDE_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A11.07.012",
		title: "Глубокое фторирование эмали зуба",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/фторирован/i,
			/фторлак/i,
			/реминерализац/i,
			/глубок.*фторир/i,
			/бифлюорид/i,
			/эмаль[-\s]?герметизирующ.*ликвид/i,
		],
		secondaryKeywords: [/бифлюорид/i, /аппликация.*фтор/i, /капа.*фтор/i],
		defaultPriceRub: 1200,
		defaultDurationMinutes: 15,
		taxDeductible: true,
	},
	{
		code: "A16.07.050",
		title: "Профессиональное отбеливание зубов",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/отбеливан.*зуб/i,
			/zoom/i,
			/amazing.*white/i,
			/(?:^|[\s(])flash(?:[\s)]|$)/i,
			/клиническ.*отбеливан/i,
			/капп.*для.*отбеливан/i,
			/домашн.*отбеливан/i,
			/лазерн.*отбеливан/i,
		],
		secondaryKeywords: [/пероксид.*водород/i, /гель.*отбеливан/i, /коффердам/i],
		defaultPriceRub: 25000,
		defaultDurationMinutes: 90,
		taxDeductible: true,
	},
	{
		code: "A14.07.008",
		title: "Обучение гигиене полости рта и зубов, подбор средств гигиены",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/обучение.*гигиен/i,
			/подбор.*средств.*гигиен/i,
			/подбор.*средств.*уход/i,
			/урок.*гигиен/i,
			/контролируемая.*чистка/i,
		],
		secondaryKeywords: [/индекс.*гигиен/i, /мотивация/i],
		defaultPriceRub: 800,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
];
