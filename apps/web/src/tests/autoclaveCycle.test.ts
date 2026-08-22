import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	AUTOCLAVE_CYCLES,
	CLINIC_AUTOCLAVES_PRESETS,
	SANPIN_PACKAGING_RULES,
	getAutoclavePreset,
	getPackagingRule
} from '../components/sanpin/autoclave/autoclavePresets';

import {
	computePackExpiryDate,
	evaluatePackStatus,
	generateSanpinBarcode,
	parseSanpinBarcode,
	generateSterileBatchPacks,
	validateSterilizationCycleParameters,
	createForm257JournalEntry,
	bindPackToPatientRecord,
	SterilePackRecord
} from '../components/sanpin/autoclave/autoclaveEngine';

describe('SanPiN 3.3686-21 & Class B Autoclave Cycle Suite', () => {

	describe('1. Class B Autoclave Cycle & Preset Parameters', () => {
		it('verifies standard 134°C wrapped cycle parameters', () => {
			const cycle = AUTOCLAVE_CYCLES.cycle_134_wrapped;
			assert.equal(cycle.targetTemperatureCelsius, 134.0);
			assert.equal(cycle.plateauTimeMinutes, 5.0);
			assert.equal(cycle.targetPressureBar, 2.15);
			assert.equal(cycle.temperatureToleranceCelsius.min, 134.0);
			assert.equal(cycle.temperatureToleranceCelsius.max, 137.0);
			assert.ok(cycle.mandatoryIndicators.includes('chemical_class5_integrating'));
		});

		it('verifies reinforced 134°C anti-prion cycle parameters', () => {
			const cycle = AUTOCLAVE_CYCLES.cycle_134_prion;
			assert.equal(cycle.targetTemperatureCelsius, 134.0);
			assert.equal(cycle.plateauTimeMinutes, 18.0);
			assert.ok(cycle.mandatoryIndicators.includes('biological_spores'));
		});

		it('verifies delicate 121°C thermo-sensitive cycle parameters', () => {
			const cycle = AUTOCLAVE_CYCLES.cycle_121_delicate;
			assert.equal(cycle.targetTemperatureCelsius, 121.0);
			assert.equal(cycle.plateauTimeMinutes, 20.0);
			assert.equal(cycle.targetPressureBar, 1.15);
		});

		it('verifies daily diagnostic Bowie-Dick and Helix PCD test cycles', () => {
			const bowie = AUTOCLAVE_CYCLES.cycle_bowie_dick;
			const helix = AUTOCLAVE_CYCLES.cycle_helix_test;
			assert.equal(bowie.plateauTimeMinutes, 3.5);
			assert.equal(helix.plateauTimeMinutes, 3.5);
			assert.ok(bowie.mandatoryIndicators.includes('bowie_dick_pack'));
			assert.ok(helix.mandatoryIndicators.includes('helix_pcd'));
		});

		it('retrieves default or fallback presets correctly', () => {
			const preset = getAutoclavePreset('cycle_134_wrapped');
			assert.equal(preset.id, 'cycle_134_wrapped');
			const fallback = getAutoclavePreset('non_existent' as any);
			assert.equal(fallback.id, 'cycle_134_wrapped');
		});
	});

	describe('2. Packaging Shelf Life & Expiration Calculations', () => {
		it('verifies SanPiN shelf life rules by packaging type', () => {
			assert.equal(SANPIN_PACKAGING_RULES.kraft_paper_sealed.shelfLifeDays, 30);
			assert.equal(SANPIN_PACKAGING_RULES.kraft_paper_crepe.shelfLifeDays, 20);
			assert.equal(SANPIN_PACKAGING_RULES.sterilization_cassette_bipack.shelfLifeDays, 50);
			assert.equal(SANPIN_PACKAGING_RULES.unwrapped_tray.shelfLifeDays, 0);
		});

		it('computes expiration date accurately for 30-day sealed Kraft pack', () => {
			const sDate = new Date('2026-08-01T10:00:00Z');
			const calc = computePackExpiryDate('kraft_paper_sealed', sDate);
			assert.equal(calc.daysValid, 30);
			assert.equal(calc.formattedExpiry, '2026-08-31');
		});

		it('evaluates status as expired when current date is past shelf life', () => {
			const pastDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
			const status = evaluatePackStatus(pastDate, 'kraft_paper_sealed');
			assert.equal(status, 'expired');
		});

		it('evaluates status as breached when package seal is compromised', () => {
			const freshDate = new Date();
			const status = evaluatePackStatus(freshDate, 'kraft_paper_sealed', true);
			assert.equal(status, 'breached');
		});
	});

	describe('3. SanPiN Barcode Generation & Parsing', () => {
		it('generates standardized SanPiN barcode string', () => {
			const date = new Date('2026-08-22T08:30:00Z');
			const barcode = generateSanpinBarcode('AUTO-MELAG-01', 42, date, 1);
			assert.equal(barcode, 'SANPIN-AUTOMELAG0-042-20260822-001');
		});

		it('parses valid SanPiN barcode string correctly', () => {
			const parsed = parseSanpinBarcode('SANPIN-AUTOMELAG0-042-20260822-005');
			assert.equal(parsed.isValid, true);
			assert.equal(parsed.autoclaveId, 'AUTOMELAG0');
			assert.equal(parsed.cycleNumber, 42);
			assert.equal(parsed.dateString, '20260822');
			assert.equal(parsed.packId, '005');
		});

		it('rejects malformed barcode string', () => {
			const parsed = parseSanpinBarcode('INVALID-BARCODE-FORMAT');
			assert.equal(parsed.isValid, false);
			assert.ok(parsed.error);
		});
	});

	describe('4. Sterile Batch Packs Generation', () => {
		it('generates batch of unique sterile packs with sequential barcodes', () => {
			const date = new Date('2026-08-22T09:00:00Z');
			const batch = generateSterileBatchPacks({
				autoclaveId: 'MELAG01',
				cycleNumber: 15,
				packagingType: 'kraft_paper_sealed',
				packCount: 3,
				itemCategoryRu: 'Терапевтический смотровой набор',
				itemsListRu: ['Зеркало', 'Зонд', 'Пинцет'],
				operatorName: 'Иванова М. В.',
				sterilizationDate: date
			});

			assert.equal(batch.length, 3);
			assert.equal(batch[0]?.packId, '001');
			assert.equal(batch[1]?.packId, '002');
			assert.equal(batch[2]?.packId, '003');
			assert.equal(batch[0]?.barcode, 'SANPIN-MELAG01-015-20260822-001');
			assert.equal(batch[0]?.status, 'sterile');
			assert.equal(batch[0]?.isBreached, false);
		});
	});

	describe('5. Cycle Validation & Form 257/u Journal Serialization', () => {
		it('approves cycle when temperature, pressure, and time are within tolerance', () => {
			const cycle = AUTOCLAVE_CYCLES.cycle_134_wrapped;
			const res = validateSterilizationCycleParameters(cycle, 134.5, 2.15, 5.0);
			assert.equal(res.isApproved, true);
			assert.equal(res.temperaturePassed, true);
			assert.equal(res.pressurePassed, true);
			assert.equal(res.plateauTimePassed, true);
			assert.equal(res.violations.length, 0);
		});

		it('rejects cycle when temperature or pressure falls below tolerance', () => {
			const cycle = AUTOCLAVE_CYCLES.cycle_134_wrapped;
			const res = validateSterilizationCycleParameters(cycle, 131.0, 1.8, 4.0);
			assert.equal(res.isApproved, false);
			assert.equal(res.temperaturePassed, false);
			assert.equal(res.pressurePassed, false);
			assert.equal(res.plateauTimePassed, false);
			assert.equal(res.violations.length, 3);
		});

		it('creates complete Form 257/u journal entry with electronic stamp', () => {
			const entry = createForm257JournalEntry({
				autoclaveId: 'MELAG-01',
				deviceName: 'Melag Vacuklav 23 B+',
				cycleNumber: 12,
				cycleId: 'cycle_134_wrapped',
				measuredTemp: 134.2,
				measuredPressure: 2.15,
				measuredDurationMin: 5,
				loadDescriptionRu: 'Хирургические наборы',
				packCount: 4,
				packagingType: 'kraft_paper_sealed',
				indicatorType: 'chemical_class5_integrating',
				isIndicatorPassed: true,
				operatorName: 'Смирнова О. И.'
			});

			assert.equal(entry.cycleNumber, 12);
			assert.equal(entry.isBatchApproved, true);
			assert.equal(entry.generatedBarcodes.length, 4);
			assert.ok(entry.operatorSignatureStamp.includes('УКЭП: Смирнова О. И.'));
		});
	});

	describe('6. EMR Traceability & Patient Safety Binding', () => {
		it('binds valid sterile pack to patient Form 043/u successfully', () => {
			const pack: SterilePackRecord = {
				barcode: 'SANPIN-MELAG01-042-20260822-001',
				packId: '001',
				autoclaveId: 'MELAG01',
				cycleNumber: 42,
				sterilizationDate: new Date().toISOString(),
				expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				packagingType: 'kraft_paper_sealed',
				packagingNameRu: 'Пакет термосварной',
				itemCategoryRu: 'Терапевтический набор',
				itemsListRu: ['Зеркало', 'Зонд'],
				operatorName: 'Смирнова О. И.',
				status: 'sterile',
				isBreached: false
			};

			const bindResult = bindPackToPatientRecord(pack, 'PAT-1002', 'Петров А. В.', 'Д-р Ковалев С. П.');
			assert.equal(bindResult.success, true);
			assert.equal(bindResult.record?.patientId, 'PAT-1002');
			assert.equal(bindResult.record?.verifiedSterile, true);
		});

		it('refuses to bind expired sterile pack to patient record', () => {
			const expiredPack: SterilePackRecord = {
				barcode: 'SANPIN-MELAG01-042-20260701-001',
				packId: '001',
				autoclaveId: 'MELAG01',
				cycleNumber: 42,
				sterilizationDate: '2026-07-01T10:00:00Z',
				expirationDate: '2026-07-31T10:00:00Z',
				packagingType: 'kraft_paper_sealed',
				packagingNameRu: 'Пакет термосварной',
				itemCategoryRu: 'Терапевтический набор',
				itemsListRu: ['Зеркало'],
				operatorName: 'Смирнова О. И.',
				status: 'expired',
				isBreached: false
			};

			const bindResult = bindPackToPatientRecord(expiredPack, 'PAT-1002', 'Петров А. В.', 'Д-р Ковалев С. П.');
			assert.equal(bindResult.success, false);
			assert.ok(bindResult.error?.includes('Запрещено СанПиН'));
		});

		it('refuses to bind breached sterile pack to patient record', () => {
			const breachedPack: SterilePackRecord = {
				barcode: 'SANPIN-MELAG01-042-20260822-001',
				packId: '001',
				autoclaveId: 'MELAG01',
				cycleNumber: 42,
				sterilizationDate: new Date().toISOString(),
				expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				packagingType: 'kraft_paper_sealed',
				packagingNameRu: 'Пакет термосварной',
				itemCategoryRu: 'Терапевтический набор',
				itemsListRu: ['Зеркало'],
				operatorName: 'Смирнова О. И.',
				status: 'breached',
				isBreached: true
			};

			const bindResult = bindPackToPatientRecord(breachedPack, 'PAT-1002', 'Петров А. В.', 'Д-р Ковалев С. П.');
			assert.equal(bindResult.success, false);
			assert.ok(bindResult.error?.includes('Нарушена герметичность'));
		});
	});

});
