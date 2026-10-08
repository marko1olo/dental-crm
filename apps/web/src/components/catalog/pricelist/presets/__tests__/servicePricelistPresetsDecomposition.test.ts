import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

import {
	CATEGORY_LABELS,
	SPECIALTY_LABELS,
	PRICE_TIER_LABELS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	STATUTORY_ORDER_804N_PRESETS,
	BASELINE_804N_PRICELIST_SERVICES,
	THERAPY_STATUTORY_PRESETS,
	HYGIENE_STATUTORY_PRESETS,
	SURGERY_STATUTORY_PRESETS,
	ORTHOPEDIC_STATUTORY_PRESETS,
	ORTHODONTIC_STATUTORY_PRESETS,
	PEDIATRIC_STATUTORY_PRESETS,
	RADIOLOGY_STATUTORY_PRESETS,
	ANESTHESIA_STATUTORY_PRESETS,
	PACKAGE_STATUTORY_PRESETS,
	THERAPY_BASELINE_SERVICES,
	HYGIENE_BASELINE_SERVICES,
	SURGERY_BASELINE_SERVICES,
	ORTHOPEDIC_BASELINE_SERVICES,
	CONSULTATION_BASELINE_SERVICES,
	RADIOLOGY_BASELINE_SERVICES,
	normalizeCode804n,
	findPresetsByIcd10,
	findPresetsByToothContext,
	findPresetsByComplaint,
	matchPresets,
	getRecommendedPresetsForSpecialty,
} from '../index';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Service Pricelist Presets Decomposed Suite (DAG Invariants & Red Team Gates)', () => {
	test('Gate 1 Line Budget: All preset files and facade are strictly < 800 lines', () => {
		const presetsDir = path.resolve(__dirname, '..');
		const files = fs.readdirSync(presetsDir).filter(f => f.endsWith('.ts') && !f.includes('.test.'));
		
		assert.ok(files.length >= 8, 'Expected at least 8 modular files in presets directory');

		for (const file of files) {
			const fullPath = path.join(presetsDir, file);
			const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').length;
			assert.ok(
				lineCount < 800,
				`File ${file} exceeds 800-line budget: currently ${lineCount} lines`
			);
		}

		// Also verify canonical facade
		const facadePath = path.resolve(presetsDir, '..', 'servicePricelistPresets.ts');
		const facadeLines = fs.readFileSync(facadePath, 'utf8').split('\n').length;
		assert.ok(
			facadeLines <= 50,
			`Canonical facade must be a slim layer <= 50 lines: currently ${facadeLines} lines`
		);
	});

	test('Preserves 100% of Statutory Order 804n Presets (exactly 50 items)', () => {
		assert.strictEqual(STATUTORY_ORDER_804N_PRESETS.length, 50);

		// Verify specialty sub-arrays composition
		const totalSubArrays =
			THERAPY_STATUTORY_PRESETS.length +
			HYGIENE_STATUTORY_PRESETS.length +
			SURGERY_STATUTORY_PRESETS.length +
			ORTHOPEDIC_STATUTORY_PRESETS.length +
			ORTHODONTIC_STATUTORY_PRESETS.length +
			PEDIATRIC_STATUTORY_PRESETS.length +
			RADIOLOGY_STATUTORY_PRESETS.length +
			ANESTHESIA_STATUTORY_PRESETS.length +
			PACKAGE_STATUTORY_PRESETS.length +
			5; // Consultation presets (5 items)

		assert.strictEqual(totalSubArrays, 50);

		for (const item of STATUTORY_ORDER_804N_PRESETS) {
			assert.ok(item.id.startsWith('srv-'), `Invalid ID prefix for ${item.id}`);
			assert.ok(item.code804n.length > 3, `Invalid 804n code for ${item.id}`);
			assert.ok(item.statutoryTitle804n.length > 0, `Empty statutory title for ${item.id}`);
			assert.ok(item.commercialTitle.length > 0, `Empty commercial title for ${item.id}`);
			assert.strictEqual(item.vatRate, 0, `VAT rate must be 0 for ${item.id}`);
			assert.strictEqual(
				item.vatExemptionArticle,
				STATUTORY_VAT_EXEMPTION_NOTE,
				`VAT exemption article mismatch for ${item.id}`
			);
			assert.strictEqual(
				item.basePriceKopecks,
				item.basePriceRub * 100,
				`Kopeck-exact price mismatch for ${item.id}`
			);
		}
	});

	test('Preserves 100% of Baseline 804n Catalog Presets (exactly 30 items srv-base-01 to srv-base-30)', () => {
		assert.strictEqual(BASELINE_804N_PRICELIST_SERVICES.length, 30);

		BASELINE_804N_PRICELIST_SERVICES.forEach((item, index) => {
			const expectedIndexStr = String(index + 1).padStart(2, '0');
			const expectedId = `srv-base-${expectedIndexStr}`;
			assert.strictEqual(
				item.id,
				expectedId,
				`Baseline item ID mismatch at index ${index}: expected ${expectedId}, got ${item.id}`
			);
			assert.strictEqual(
				item.basePriceKopecks,
				item.basePriceRub * 100,
				`Kopecks math mismatch for ${item.id}`
			);
		});

		// Check sub-arrays composition
		assert.strictEqual(THERAPY_BASELINE_SERVICES.length, 11);
		assert.strictEqual(HYGIENE_BASELINE_SERVICES.length, 3);
		assert.strictEqual(SURGERY_BASELINE_SERVICES.length, 7);
		assert.strictEqual(ORTHOPEDIC_BASELINE_SERVICES.length, 6);
		assert.strictEqual(CONSULTATION_BASELINE_SERVICES.length, 1);
		assert.strictEqual(RADIOLOGY_BASELINE_SERVICES.length, 2);
	});

	test('Metadata labels and constants dictionary integrity', () => {
		assert.strictEqual(CATEGORY_LABELS.therapy, 'Терапия и эндодонтия');
		assert.strictEqual(CATEGORY_LABELS.surgery, 'Хирургия и имплантация');
		assert.strictEqual(CATEGORY_LABELS.orthopedics, 'Ортопедия и протезирование');
		assert.strictEqual(CATEGORY_LABELS.orthodontics, 'Ортодонтия');
		assert.strictEqual(SPECIALTY_LABELS.therapist, 'Стоматолог-терапевт');
		assert.strictEqual(SPECIALTY_LABELS.surgeon, 'Стоматолог-хирург / имплантолог');
		assert.strictEqual(PRICE_TIER_LABELS.standard, 'Основной прайс (100%)');
		assert.ok(STATUTORY_VAT_EXEMPTION_NOTE.includes('149 НК РФ'));
	});

	describe('Layer 2 Preset Matcher Engine', () => {
		test('normalizeCode804n normalizes messy codes correctly', () => {
			assert.strictEqual(normalizeCode804n('A16.07.002.010'), 'A1607002010');
			assert.strictEqual(normalizeCode804n('a16-07-002'), 'A1607002');
			assert.strictEqual(normalizeCode804n('  B01.065.001  '), 'B01065001');
		});

		test('findPresetsByIcd10 finds services matching ICD-10 diagnosis', () => {
			const cariesPresets = findPresetsByIcd10(STATUTORY_ORDER_804N_PRESETS, 'K02.1');
			assert.ok(cariesPresets.length > 0);
			assert.ok(cariesPresets.some(p => p.commercialTitle.includes('кариес')));

			const pulpitisPresets = findPresetsByIcd10(STATUTORY_ORDER_804N_PRESETS, 'K04.0');
			assert.ok(pulpitisPresets.length > 0);
			assert.ok(pulpitisPresets.some(p => p.tags.includes('эндодонтия') || p.tags.includes('пульпит')));
		});

		test('findPresetsByToothContext handles milk teeth and scalable root canals', () => {
			// Milk tooth 54 (deciduous)
			const pedMatches = findPresetsByToothContext(STATUTORY_ORDER_804N_PRESETS, 54, { isTemporary: true });
			assert.ok(pedMatches.length > 0);
			assert.ok(pedMatches.every(p => p.category === 'pediatric'));

			// Permanent molar with 3 canals
			const canalMatches = findPresetsByToothContext(BASELINE_804N_PRICELIST_SERVICES, 36, { canals: 3 });
			assert.ok(canalMatches.length > 0);
			assert.ok(canalMatches.some(p => p.commercialTitle.includes('3 корневых каналов')));
		});

		test('findPresetsByComplaint matches patient complaints intelligently', () => {
			const wisdomMatches = findPresetsByComplaint(BASELINE_804N_PRICELIST_SERVICES, 'Беспокоит зуб мудрости');
			assert.ok(wisdomMatches.length > 0);
			assert.ok(wisdomMatches.some(p => p.commercialTitle.includes('зуба мудрости')));

			const hygieneMatches = findPresetsByComplaint(BASELINE_804N_PRICELIST_SERVICES, 'Нужно снять зубной камень и налет');
			assert.ok(hygieneMatches.length > 0);
			assert.ok(hygieneMatches.some(p => p.category === 'hygiene'));
		});

		test('matchPresets auto-scores multi-criteria query', () => {
			const results = matchPresets(STATUTORY_ORDER_804N_PRESETS, {
				category: 'therapy',
				icd10Code: 'K02.1',
				complaintText: 'болит зуб, средний кариес',
			});

			assert.ok(results.length > 0);
			assert.ok(results[0].score >= 50);
			assert.strictEqual(results[0].item.category, 'therapy');
		});

		test('getRecommendedPresetsForSpecialty filters active presets for doctor specialty', () => {
			const orthopedistPresets = getRecommendedPresetsForSpecialty(STATUTORY_ORDER_804N_PRESETS, 'orthopedist');
			assert.ok(orthopedistPresets.length > 0);
			assert.ok(orthopedistPresets.every(p => p.specialty === 'orthopedist' && p.isActive));
		});
	});
});
