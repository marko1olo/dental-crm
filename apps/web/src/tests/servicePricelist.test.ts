/**
 * DENTE Dental CRM — Statutory Minzdrav Order 804n Service Catalog & Pricelist Test Suite
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	CATEGORY_LABELS,
	PRICE_TIER_LABELS,
	SPECIALTY_LABELS,
	STATUTORY_ORDER_804N_PRESETS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type ServicePricelistItem,
} from '../components/catalog/pricelist/servicePricelistPresets';

import {
	applyBatchPriceMarkup,
	calculateServiceProfitability,
	calculateTierPrice,
	detectCategoryFrom804nCode,
	exportPricelistToCsv,
	formatKopecksRu,
	formatRubles,
	generatePrintablePricelistHtml,
	importPricelistFromCsv,
	isValidOrder804nCode,
	kopecksToRubles,
	parseRawCsvText,
	roundPrice,
	rublesToKopecks,
	searchPricelistItems,
	UTF8_BOM,
} from '../components/catalog/pricelist/servicePricelistEngine';

describe('Statutory Order 804n Service Catalog & Pricelist Matrix Suite', () => {

	describe('1. Statutory Minzdrav Order 804n Code Syntax & Validation', () => {
		it('validates canonical Order 804n dental codes', () => {
			assert.equal(isValidOrder804nCode('A16.07.002.001'), true);
			assert.equal(isValidOrder804nCode('A16.07.054.001'), true);
			assert.equal(isValidOrder804nCode('B01.065.001'), true);
			assert.equal(isValidOrder804nCode('A06.07.007'), true);
			assert.equal(isValidOrder804nCode('A11.07.012'), true);
			assert.equal(isValidOrder804nCode('A16.07.004'), true);
		});

		it('rejects invalid non-statutory codes', () => {
			assert.equal(isValidOrder804nCode(''), false);
			assert.equal(isValidOrder804nCode('12345'), false);
			assert.equal(isValidOrder804nCode('SERVICE_01'), false);
			assert.equal(isValidOrder804nCode('C99.99'), false);
			assert.equal(isValidOrder804nCode('A16.07'), false); // incomplete
		});

		it('autodetects clinical categories from Order 804n code prefixes', () => {
			assert.equal(detectCategoryFrom804nCode('A16.07.002.001'), 'therapy');
			assert.equal(detectCategoryFrom804nCode('A16.07.030.001'), 'therapy');
			assert.equal(detectCategoryFrom804nCode('A16.07.008.002'), 'therapy');
			assert.equal(detectCategoryFrom804nCode('A16.07.001.001'), 'surgery');
			assert.equal(detectCategoryFrom804nCode('A16.07.054.001'), 'surgery');
			assert.equal(detectCategoryFrom804nCode('A16.07.006.002'), 'orthopedics');
			assert.equal(detectCategoryFrom804nCode('A16.07.047.001'), 'orthodontics');
			assert.equal(detectCategoryFrom804nCode('A06.07.007'), 'radiology');
			assert.equal(detectCategoryFrom804nCode('A16.07.051.001'), 'hygiene');
			assert.equal(detectCategoryFrom804nCode('A16.07.004.001'), 'anesthesia');
			assert.equal(detectCategoryFrom804nCode('B01.065.001'), 'consultation');
		});
	});

	describe('2. Canonical Presets Inventory & Statutory Compliance', () => {
		it('contains rich statutory presets covering all major dental specialties', () => {
			assert.ok(STATUTORY_ORDER_804N_PRESETS.length >= 25);

			const categories = new Set(STATUTORY_ORDER_804N_PRESETS.map((p) => p.category));
			assert.ok(categories.has('consultation'));
			assert.ok(categories.has('therapy'));
			assert.ok(categories.has('surgery'));
			assert.ok(categories.has('orthopedics'));
			assert.ok(categories.has('orthodontics'));
			assert.ok(categories.has('pediatric'));
			assert.ok(categories.has('radiology'));
			assert.ok(categories.has('hygiene'));
			assert.ok(categories.has('anesthesia'));
		});

		it('ensures all statutory presets comply with VAT 0% (ст. 149 НК РФ)', () => {
			for (const item of STATUTORY_ORDER_804N_PRESETS) {
				assert.equal(item.vatRate, 0);
				assert.equal(item.vatExemptionArticle, STATUTORY_VAT_EXEMPTION_NOTE);
				assert.equal(item.basePriceKopecks, item.basePriceRub * 100);
				assert.ok(item.estimatedDurationMin > 0);
				assert.ok(item.commercialTitle.length > 5);
				assert.ok(item.statutoryTitle804n.length > 5);
			}
		});
	});

	describe('3. Kopeck-Exact Financial Math & Price Formatting', () => {
		it('accurately converts rubles to kopecks and vice versa', () => {
			assert.equal(rublesToKopecks(5500), 550000);
			assert.equal(rublesToKopecks(0), 0);
			assert.equal(kopecksToRubles(550000), 5500);
			assert.equal(kopecksToRubles(125050), 1250.5);
		});

		it('formats rubles with currency and non-breaking space', () => {
			const formatted = formatRubles(15000);
			assert.ok(formatted.includes('15'));
			assert.ok(formatted.includes('000'));
			assert.ok(formatted.includes('₽'));

			assert.equal(formatRubles(0), `0\u00A0₽`);
		});

		it('formats kopecks accurately with exact two decimal digits', () => {
			const formatted = formatKopecksRu(150050);
			assert.ok(formatted.includes('1'));
			assert.ok(formatted.includes('500,50'));
			assert.ok(formatted.includes('₽'));
		});
	});

	describe('4. Price Tier Calculations (Standard, VIP, DMS, Promo)', () => {
		it('calculates standard base price (100%)', () => {
			assert.equal(calculateTierPrice(10000, 'standard'), 10000);
		});

		it('calculates VIP price (+20% with rounding to nearest 50 ₽)', () => {
			assert.equal(calculateTierPrice(10000, 'vip'), 12000);
			assert.equal(calculateTierPrice(5500, 'vip'), 6600);
		});

		it('calculates DMS tariff (85% with rounding)', () => {
			assert.equal(calculateTierPrice(10000, 'dms'), 8500);
			assert.equal(calculateTierPrice(5000, 'dms'), 4250);
		});

		it('calculates Promo discount price (90%)', () => {
			assert.equal(calculateTierPrice(10000, 'promo'), 9000);
			assert.equal(calculateTierPrice(6500, 'promo'), 5850);
		});

		it('respects custom override tier prices when explicitly defined', () => {
			assert.equal(calculateTierPrice(10000, 'vip', 15000), 15000);
			assert.equal(calculateTierPrice(10000, 'dms', 7500), 7500);
		});
	});

	describe('5. Profitability & Unit Cost Margin Analysis', () => {
		it('calculates high profitability service (composite filling)', () => {
			const item: ServicePricelistItem = {
				id: 'test-filling',
				code804n: 'A16.07.002.001',
				commercialTitle: 'Пломба фотополимерная',
				statutoryTitle804n: 'Восстановление зуба пломбой',
				category: 'therapy',
				specialty: 'therapist',
				basePriceRub: 6000,
				basePriceKopecks: 600000,
				materialCostRub: 1000,
				labCostRub: 0,
				vatRate: 0,
				vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
				icd10Indications: ['K02.1'],
				estimatedDurationMin: 45,
				isActive: true,
				isArchived: false,
				tags: ['пломба'],
			};

			const prof = calculateServiceProfitability(item, 'standard');
			assert.equal(prof.sellingPriceRub, 6000);
			assert.equal(prof.totalCostRub, 1000);
			assert.equal(prof.grossProfitRub, 5000);
			assert.equal(prof.grossProfitKopecks, 500000);
			assert.equal(prof.marginPercent, 83.3);
			assert.equal(prof.markupPercent, 500.0);
			assert.equal(prof.level, 'high');
		});

		it('calculates medium profitability service with lab cost (zirconia crown)', () => {
			const item: ServicePricelistItem = {
				id: 'test-crown',
				code804n: 'A16.07.006.002',
				commercialTitle: 'Коронка из диоксида циркония',
				statutoryTitle804n: 'Протезирование зуба коронкой',
				category: 'orthopedics',
				specialty: 'orthopedist',
				basePriceRub: 24000,
				basePriceKopecks: 2400000,
				materialCostRub: 2000,
				labCostRub: 8000, // total cost 10 000
				vatRate: 0,
				vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
				icd10Indications: ['K08.1'],
				estimatedDurationMin: 60,
				isActive: true,
				isArchived: false,
				tags: ['коронка'],
			};

			const prof = calculateServiceProfitability(item, 'standard');
			assert.equal(prof.totalCostRub, 10000);
			assert.equal(prof.grossProfitRub, 14000);
			assert.equal(prof.marginPercent, 58.3);
			assert.equal(prof.level, 'medium');
		});

		it('detects loss when total cost exceeds selling price', () => {
			const item: ServicePricelistItem = {
				id: 'test-loss',
				code804n: 'A16.07.999',
				commercialTitle: 'Убыточная процедура',
				statutoryTitle804n: 'Тест',
				category: 'other',
				specialty: 'general',
				basePriceRub: 1000,
				basePriceKopecks: 100000,
				materialCostRub: 800,
				labCostRub: 500, // total cost 1300 > 1000
				vatRate: 0,
				vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
				icd10Indications: [],
				estimatedDurationMin: 20,
				isActive: true,
				isArchived: false,
				tags: [],
			};

			const prof = calculateServiceProfitability(item, 'standard');
			assert.equal(prof.grossProfitRub, -300);
			assert.equal(prof.level, 'loss');
		});
	});

	describe('6. Batch Markup & Rounding Operations', () => {
		const sampleCatalog: ServicePricelistItem[] = [
			{
				id: 'srv-1',
				code804n: 'A16.07.002.001',
				commercialTitle: 'Пломба',
				statutoryTitle804n: 'Восстановление зуба пломбой',
				category: 'therapy',
				specialty: 'therapist',
				basePriceRub: 5000,
				basePriceKopecks: 500000,
				tierPrices: { vip: 6000 },
				vatRate: 0,
				vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
				icd10Indications: [],
				estimatedDurationMin: 45,
				isActive: true,
				isArchived: false,
				tags: [],
			},
			{
				id: 'srv-2',
				code804n: 'A16.07.001.001',
				commercialTitle: 'Удаление зуба',
				statutoryTitle804n: 'Удаление постоянного зуба',
				category: 'surgery',
				specialty: 'surgeon',
				basePriceRub: 3500,
				basePriceKopecks: 350000,
				vatRate: 0,
				vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
				icd10Indications: [],
				estimatedDurationMin: 30,
				isActive: true,
				isArchived: false,
				tags: [],
			},
		];

		it('applies +10% batch price markup across catalog with rounding to 100 ₽', () => {
			const updated = applyBatchPriceMarkup(sampleCatalog, {
				percentChange: 10,
				roundMode: 'round_100',
				applyToTiers: ['standard'],
			});

			assert.equal(updated[0]!.basePriceRub, 5500); // 5000 * 1.10 = 5500
			assert.equal(updated[0]!.basePriceKopecks, 550000);
			assert.equal(updated[1]!.basePriceRub, 3900); // 3500 * 1.10 = 3850 -> round_100 = 3900 (or 3850->3900)
		});

		it('applies batch markup filtered by category', () => {
			const updated = applyBatchPriceMarkup(sampleCatalog, {
				percentChange: 20,
				categoryFilter: 'therapy',
				roundMode: 'none',
				applyToTiers: ['standard'],
			});

			assert.equal(updated[0]!.basePriceRub, 6000); // therapy updated
			assert.equal(updated[1]!.basePriceRub, 3500); // surgery unchanged
		});

		it('tests rounding helper with various modes', () => {
			assert.equal(roundPrice(1234, 'round_10'), 1230);
			assert.equal(roundPrice(1236, 'round_10'), 1240);
			assert.equal(roundPrice(1225, 'round_50'), 1250);
			assert.equal(roundPrice(1249, 'round_100'), 1200);
			assert.equal(roundPrice(1251, 'round_100'), 1300);
			assert.equal(roundPrice(1740, 'round_500'), 1500);
			assert.equal(roundPrice(1760, 'round_500'), 2000);
		});
	});

	describe('7. Fast Multi-Index Search & Filtering', () => {
		it('searches by 804n code with or without dots', () => {
			const res1 = searchPricelistItems(STATUTORY_ORDER_804N_PRESETS, {
				searchTerm: 'A16.07.002',
			});
			assert.ok(res1.length >= 3);

			const res2 = searchPricelistItems(STATUTORY_ORDER_804N_PRESETS, {
				searchTerm: 'a1607002',
			});
			assert.ok(res2.length >= 3);
		});

		it('searches by commercial keyword and cyrillic case-insensitivity', () => {
			const res = searchPricelistItems(STATUTORY_ORDER_804N_PRESETS, {
				searchTerm: 'имплантация osstem',
			});
			assert.ok(res.length >= 1);
			assert.ok(res[0]?.commercialTitle.includes('Osstem'));
		});

		it('searches by ICD-10 indication code', () => {
			const res = searchPricelistItems(STATUTORY_ORDER_804N_PRESETS, {
				searchTerm: 'K07.2',
			});
			assert.ok(res.length >= 2);
			assert.ok(res.some((item) => item.category === 'orthodontics'));
			assert.ok(res.some((item) => item.category === 'consultation'));
		});

		it('filters by category and specialty', () => {
			const res = searchPricelistItems(STATUTORY_ORDER_804N_PRESETS, {
				category: 'orthopedics',
				specialty: 'orthopedist',
			});
			assert.ok(res.length >= 4);
			for (const item of res) {
				assert.equal(item.category, 'orthopedics');
				assert.equal(item.specialty, 'orthopedist');
			}
		});
	});

	describe('8. RFC 4180 CSV Export & Import with UTF-8 BOM', () => {
		it('exports catalog into CSV with UTF-8 BOM and correct headers', () => {
			const csv = exportPricelistToCsv(STATUTORY_ORDER_804N_PRESETS.slice(0, 5), {
				delimiter: ';',
			});

			assert.ok(csv.startsWith(UTF8_BOM));
			assert.ok(csv.includes('Код 804н;Коммерческое наименование;'));
			assert.ok(csv.includes('НДС не облагается'));
		});

		it('parses raw RFC 4180 CSV with quotes and semicolons', () => {
			const raw = `Код 804н;Наименование;Цена\r\n"A16.07.002";"Пломба ""Estelite""; Световая";5500`;
			const parsed = parseRawCsvText(raw, ';');
			assert.equal(parsed.length, 2);
			assert.equal(parsed[1]![0], 'A16.07.002');
			assert.equal(parsed[1]![1], 'Пломба "Estelite"; Световая');
			assert.equal(parsed[1]![2], '5500');
		});

		it('imports CSV string and returns validated service items', () => {
			const csvText = `${UTF8_BOM}Код 804н;Коммерческое наименование;Категория;Специальность;Цена стандарт (руб);Себестоимость материалов (руб);Зуботехническая лаборатория (руб);МКБ-10\r\n` +
				`A16.07.002.001;Пломба световая Filtek;Терапия;Стоматолог-терапевт;5500;1000;0;K02.1\r\n` +
				`A16.07.006.002;Коронка цирконий;Ортопедия;Стоматолог-ортопед;25000;2000;8000;K08.1`;

			const res = importPricelistFromCsv(csvText);
			assert.equal(res.totalRows, 2);
			assert.equal(res.validItems.length, 2);
			assert.equal(res.invalidRows.length, 0);

			const item1 = res.validItems[0]!;
			assert.equal(item1.code804n, 'A16.07.002.001');
			assert.equal(item1.commercialTitle, 'Пломба световая Filtek');
			assert.equal(item1.category, 'therapy');
			assert.equal(item1.specialty, 'therapist');
			assert.equal(item1.basePriceRub, 5500);
			assert.equal(item1.materialCostRub, 1000);
			assert.equal(item1.vatRate, 0);

			const item2 = res.validItems[1]!;
			assert.equal(item2.code804n, 'A16.07.006.002');
			assert.equal(item2.category, 'orthopedics');
			assert.equal(item2.basePriceRub, 25000);
			assert.equal(item2.labCostRub, 8000);
		});

		it('gracefully handles corrupt CSV rows with error reporting', () => {
			const corruptCsv = `Код;Название;Цена\r\n` +
				`;;1000\r\n` + // Missing title
				`A16.07.001;Удаление;invalid_number`; // Invalid price

			const res = importPricelistFromCsv(corruptCsv);
			assert.equal(res.validItems.length, 0);
			assert.equal(res.invalidRows.length, 2);
			assert.ok(res.invalidRows[0]?.error.includes('Отсутствует наименование'));
			assert.ok(res.invalidRows[1]?.error.includes('Некорректная цена'));
		});
	});

	describe('9. Official Printable A4 Document Generation', () => {
		it('generates compliant official clinic pricelist HTML with legal blocks', () => {
			const html = generatePrintablePricelistHtml(
				{
					clinicName: 'Стоматологическая клиника «DENTE»',
					clinicAddress: 'г. Москва, ул. Арбат, 10',
					clinicPhone: '+7 (495) 999-88-77',
					clinicLicense: 'ЛО-77-01-098765',
					chiefDoctorName: 'Иванов И. И.',
					effectiveDateRu: '01.09.2026',
				},
				STATUTORY_ORDER_804N_PRESETS,
				'standard',
			);

			assert.ok(html.includes('ПРЕЙСКУРАНТ ЦЕН НА МЕДИЦИНСКИЕ СТОМАТОЛОГИЧЕСКИЕ УСЛУГИ'));
			assert.ok(html.includes('Приказом Минздрава России № 804н'));
			assert.ok(html.includes('подпункта 2 пункта 2 статьи 149 Налогового кодекса Российской Федерации'));
			assert.ok(html.includes('НДС не облагаются (0%)'));
			assert.ok(html.includes('Стоматологическая клиника «DENTE»'));
			assert.ok(html.includes('Иванов И. И.'));
			assert.ok(html.includes('A16.07.002.001'));
		});
	});

});
