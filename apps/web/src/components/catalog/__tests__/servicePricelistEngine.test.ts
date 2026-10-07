import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	applyBatchPriceMarkup,
	calculateServiceProfitability,
	calculateTierPrice,
	detectCategoryFrom804nCode,
	exportPricelistToCsv,
	formatRubles,
	getClinicalSynonyms,
	importPricelistFromCsv,
	isValidOrder804nCode,
	parseRawCsvText,
	roundPrice,
	rublesToKopecks,
	searchPricelistItems,
	sortPricelistItems,
	UTF8_BOM,
} from '../pricelist/servicePricelistEngine';
import {
	BASELINE_804N_PRICELIST_SERVICES,
	type ServicePricelistItem,
} from '../pricelist/servicePricelistPresets';

describe('Service Pricelist Engine & Statutory 804n Catalog Tests', () => {
	const sampleService: ServicePricelistItem = {
		id: 'test-srv-1',
		code804n: 'A16.07.002.001',
		statutoryTitle804n: 'Восстановление зуба пломбой I, V, VI класс по Блэку с использованием стоматологических цементов',
		commercialTitle: 'Лечение кариеса эмали/дентина (композит светового отверждения)',
		category: 'therapy',
		specialty: 'therapist',
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		materialCostRub: 900,
		labCostRub: 0,
		estimatedDurationMin: 45,
		icd10Indications: ['K02.0', 'K02.1'],
		vatRate: 0,
		vatExemptionArticle: 'пп. 2 п. 2 ст. 149 НК РФ',
		isActive: true,
		isArchived: false,
		tags: ['терапия', 'пломба'],
	};

	describe('1. Price Tier Calculations', () => {
		it('calculates standard tier price equal to base price', () => {
			assert.equal(calculateTierPrice(4500, 'standard'), 4500);
		});

		it('calculates VIP tier (+20%)', () => {
			assert.equal(calculateTierPrice(5000, 'vip'), 6000);
		});

		it('calculates Promo tier (-10%)', () => {
			assert.equal(calculateTierPrice(5000, 'promo'), 4500);
		});

		it('calculates Night/Weekend tier (+30%)', () => {
			assert.equal(calculateTierPrice(5000, 'night_weekend'), 6500);
		});

		it('respects manual tier override when provided', () => {
			assert.equal(calculateTierPrice(5000, 'vip', 7200), 7200);
			assert.equal(calculateTierPrice(5000, 'dms', 4200), 4200);
		});
	});

	describe('2. Profitability and Unit Economics', () => {
		it('calculates margin percentage and high profitability tier', () => {
			// Base: 4500, Cost: 900 -> Gross Profit = 3600 / 4500 = 80% (high)
			const prof = calculateServiceProfitability(sampleService, 'standard');
			assert.equal(prof.totalCostRub, 900);
			assert.equal(prof.grossProfitRub, 3600);
			assert.equal(prof.marginPercent, 80);
			assert.equal(prof.level, 'high');
		});

		it('detects loss when cost exceeds price', () => {
			const lossService: ServicePricelistItem = {
				...sampleService,
				basePriceRub: 1000,
				materialCostRub: 800,
				labCostRub: 500, // Total cost = 1300 > 1000
			};
			const prof = calculateServiceProfitability(lossService, 'standard');
			assert.equal(prof.totalCostRub, 1300);
			assert.equal(prof.grossProfitRub, -300);
			assert.equal(prof.level, 'loss');
		});
	});

	describe('3. Clinical Search & Synonym Expansion', () => {
		const catalog: ServicePricelistItem[] = [
			sampleService,
			{
				id: 'test-srv-2',
				code804n: 'A16.07.008.001',
				statutoryTitle804n: 'Пломбирование корневого канала зуба пастой',
				commercialTitle: 'Эндодонтическое лечение пульпита (1 канал)',
				category: 'therapy',
				specialty: 'therapist',
				basePriceRub: 6000,
				basePriceKopecks: 600000,
				estimatedDurationMin: 60,
				icd10Indications: ['K04.0'],
				vatRate: 0,
				vatExemptionArticle: 'пп. 2 п. 2 ст. 149 НК РФ',
				isActive: true,
				isArchived: false,
				tags: ['эндодонтия', 'пульпит'],
			},
			{
				id: 'test-srv-3',
				code804n: 'A06.07.007',
				statutoryTitle804n: 'Прицельная внутриротовая контактная рентгенография',
				commercialTitle: 'Радиовизиография прицельная (RVG снимок)',
				category: 'radiology',
				specialty: 'radiologist',
				basePriceRub: 500,
				basePriceKopecks: 50000,
				estimatedDurationMin: 10,
				icd10Indications: [],
				vatRate: 0,
				vatExemptionArticle: 'пп. 2 п. 2 ст. 149 НК РФ',
				isActive: true,
				isArchived: false,
				tags: ['снимок', 'рентген'],
			},
		];

		it('finds therapy service by Order 804n code', () => {
			const res = searchPricelistItems(catalog, 'A16.07.002');
			assert.equal(res.length, 1);
			assert.equal(res[0]?.id, 'test-srv-1');
		});

		it('finds radiology service by synonym "снимок" or "рентген"', () => {
			const res = searchPricelistItems(catalog, 'снимок');
			assert.equal(res.length, 1);
			assert.equal(res[0]?.id, 'test-srv-3');
		});

		it('expands clinical synonyms correctly', () => {
			const syns = getClinicalSynonyms('кариес');
			assert.ok(syns.includes('пломб'));
			assert.ok(syns.includes('a16.07.002'));
		});
	});

	describe('4. Sorting Catalog Items', () => {
		const items: ServicePricelistItem[] = [
			{ ...sampleService, id: '1', code804n: 'B01.065.001', basePriceRub: 1000, commercialTitle: 'Консультация' },
			{ ...sampleService, id: '2', code804n: 'A16.07.001', basePriceRub: 3500, commercialTitle: 'Удаление зуба' },
			{ ...sampleService, id: '3', code804n: 'A16.07.054', basePriceRub: 35000, commercialTitle: 'Имплантация Osstem' },
		];

		it('sorts by price ascending and descending', () => {
			const asc = sortPricelistItems(items, 'price', 'asc', 'standard');
			assert.equal(asc[0]?.id, '1');
			assert.equal(asc[2]?.id, '3');

			const desc = sortPricelistItems(items, 'price', 'desc', 'standard');
			assert.equal(desc[0]?.id, '3');
			assert.equal(desc[2]?.id, '1');
		});

		it('sorts by statutory Order 804n code', () => {
			const asc = sortPricelistItems(items, 'code', 'asc', 'standard');
			assert.equal(asc[0]?.code804n, 'A16.07.001');
			assert.equal(asc[2]?.code804n, 'B01.065.001');
		});
	});

	describe('5. Batch Markups and Rounding', () => {
		it('applies +10% batch price markup with round_100', () => {
			const items: ServicePricelistItem[] = [
				{ ...sampleService, id: '1', basePriceRub: 1450 },
			];
			// 1450 * 1.1 = 1595 -> round_100 = 1600
			const updated = applyBatchPriceMarkup(items, {
				percentChange: 10,
				roundMode: 'round_100',
				applyToTiers: ['standard'],
			});
			assert.equal(updated[0]?.basePriceRub, 1600);
		});

		it('supports -100% warranty discount (0 rub, Mandate 8e)', () => {
			const items: ServicePricelistItem[] = [
				{ ...sampleService, id: '1', basePriceRub: 5000 },
			];
			const updated = applyBatchPriceMarkup(items, {
				percentChange: -100,
				roundMode: 'none',
				applyToTiers: ['standard'],
			});
			assert.equal(updated[0]?.basePriceRub, 0);
		});
	});

	describe('6. RFC 4180 CSV Import/Export without Data Loss', () => {
		it('exports catalog to CSV with UTF-8 BOM', () => {
			const csv = exportPricelistToCsv([sampleService]);
			assert.ok(csv.startsWith(UTF8_BOM));
			assert.ok(csv.includes('A16.07.002.001'));
			assert.ok(csv.includes('Лечение кариеса'));
			assert.ok(csv.includes('4500'));
		});

		it('imports valid CSV records', () => {
			const csvData = [
				'Код услуги;Наименование;Цена;Категория;Специальность',
				'A16.07.002;Пломба световая;3500;Терапия;Терапевт',
				'A16.07.001;Удаление зуба;2500;Хирургия;Хирург',
			].join('\r\n');

			const res = importPricelistFromCsv(csvData);
			assert.equal(res.validItems.length, 2);
			assert.equal(res.invalidRows.length, 0);
			assert.equal(res.validItems[0]?.basePriceRub, 3500);
			assert.equal(res.validItems[0]?.category, 'therapy');
			assert.equal(res.validItems[1]?.basePriceRub, 2500);
			assert.equal(res.validItems[1]?.category, 'surgery');
		});

		it('allows multiple distinct services with the same Minzdrav 804n code', () => {
			const csvData = [
				'Код услуги;Наименование;Цена;Категория',
				'A16.07.002;Лечение кариеса 1 поверхности;3000;Терапия',
				'A16.07.002;Лечение кариеса 2 поверхностей;4200;Терапия',
				'A16.07.002;Эстетическая реставрация зуба;6500;Терапия',
			].join('\r\n');

			const res = importPricelistFromCsv(csvData);
			assert.equal(res.validItems.length, 3);
			// Check that all 3 distinct items are present and have distinct IDs
			const ids = new Set(res.validItems.map((i) => i.id));
			assert.equal(ids.size, 3);
		});
	});

	describe('7. Order 804n Code Validation and Category Detection', () => {
		it('validates Order 804n standard syntax', () => {
			assert.ok(isValidOrder804nCode('A16.07.002'));
			assert.ok(isValidOrder804nCode('A16.07.002.001'));
			assert.ok(isValidOrder804nCode('B01.065.001'));
			assert.ok(isValidOrder804nCode('A06.07.007'));
			assert.equal(isValidOrder804nCode('INVALID_CODE'), false);
		});

		it('detects category automatically from 804n code prefix', () => {
			assert.equal(detectCategoryFrom804nCode('A16.07.002'), 'therapy');
			assert.equal(detectCategoryFrom804nCode('A16.07.001'), 'surgery');
			assert.equal(detectCategoryFrom804nCode('A16.07.006'), 'orthopedics');
			assert.equal(detectCategoryFrom804nCode('A16.07.047'), 'orthodontics');
			assert.equal(detectCategoryFrom804nCode('A16.07.051'), 'hygiene');
			assert.equal(detectCategoryFrom804nCode('A06.07.007'), 'radiology');
			assert.equal(detectCategoryFrom804nCode('B01.065.001'), 'consultation');
			assert.equal(detectCategoryFrom804nCode('PKG-CHECKUP'), 'package');
		});
	});

	describe('8. Statutory Presets Sanity Check', () => {
		it('baseline 804n pricelist has at least 25 canonical services', () => {
			assert.ok(BASELINE_804N_PRICELIST_SERVICES.length >= 25);
			for (const srv of BASELINE_804N_PRICELIST_SERVICES) {
				assert.ok(srv.code804n, `Service ${srv.id} missing code804n`);
				assert.ok(srv.commercialTitle, `Service ${srv.id} missing commercialTitle`);
				assert.ok(srv.basePriceRub >= 0, `Service ${srv.id} price negative`);
				assert.equal(srv.vatRate, 0, `Medical service must have VAT 0%`);
			}
		});
	});
});
