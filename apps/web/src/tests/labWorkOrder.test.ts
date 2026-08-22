import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	PROSTHETIC_TYPES,
	LAB_MATERIALS,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	STUMP_SHADES_ND,
	SURFACE_TEXTURES,
	TRANSLUCENCY_LEVELS,
	LAB_WORKFLOW_STAGES,
	LAB_STAGE_ORDER,
	ProstheticTypeId
} from '../components/lab/orders/labWorkOrderPresets';

import {
	calculateLabFinancials,
	calculateLabTurnaroundSchedule,
	addWorkingDays,
	formatDateToIsoDay,
	generateBarcodeSvg,
	generateQrCodeSvg,
	generateFdiOdontogramSvg,
	generatePrintableLabWorkOrderHtml,
	createLabWorkOrder
} from '../components/lab/orders/labWorkOrderEngine';

describe('Statutory Dental Laboratory Work Order & Tracking Studio Suite', () => {

	describe('1. Statutory Russian Dental Prosthetic Types & Material Presets', () => {
		it('verifies all 7 required statutory prosthetic types exist with complete specifications', () => {
			const expectedTypes: ProstheticTypeId[] = [
				'crown_zirconia_monolithic',
				'crown_emax_press',
				'veneer_refractory',
				'implant_screw_retained_crown',
				'removable_clasp_prosthesis',
				'all_on_4_hybrid',
				'surgical_guide_3d'
			];

			for (const typeId of expectedTypes) {
				const preset = PROSTHETIC_TYPES[typeId];
				assert.ok(preset, `Missing prosthetic preset: ${typeId}`);
				assert.ok(preset.nameRu.length > 0, `Missing Russian name for ${typeId}`);
				assert.ok(preset.standardTurnaroundWorkingDays > 0, `Invalid turnaround days for ${typeId}`);
				assert.ok(preset.defaultPriceClinicRub > 0, `Invalid default clinic price for ${typeId}`);
				assert.ok(preset.defaultCostLabRub > 0, `Invalid default lab cost for ${typeId}`);
				assert.ok(preset.defaultPriceClinicRub > preset.defaultCostLabRub, `Clinic price must exceed lab cost for ${typeId}`);
			}
		});

		it('verifies specific material and clinical requirements for prosthetic types', () => {
			assert.equal(PROSTHETIC_TYPES.crown_zirconia_monolithic.requiresStumpShade, true);
			assert.equal(PROSTHETIC_TYPES.crown_emax_press.requiresStumpShade, true);
			assert.equal(PROSTHETIC_TYPES.veneer_refractory.requiresStumpShade, true);
			assert.equal(PROSTHETIC_TYPES.implant_screw_retained_crown.requiresImplantSystem, true);
			assert.equal(PROSTHETIC_TYPES.all_on_4_hybrid.requiresImplantSystem, true);
			assert.equal(PROSTHETIC_TYPES.surgical_guide_3d.requiresImplantSystem, true);
			assert.equal(PROSTHETIC_TYPES.removable_clasp_prosthesis.requiresFittingStage, true);
		});

		it('verifies laboratory materials catalog specifications and biocompatibility', () => {
			const zr = LAB_MATERIALS['zirconia_katana_ml'];
			const emax = LAB_MATERIALS['emax_press'];
			const photopolymer = LAB_MATERIALS['photopolymer_biocompatible'];
			const cocr = LAB_MATERIALS['cobalt_chromium_bredent'];

			assert.ok(zr && zr.strengthMpa >= 1000);
			assert.ok(emax && emax.strengthMpa >= 400);
			assert.equal(zr?.isBiocompatible, true);
			assert.equal(photopolymer?.isBiocompatible, true);
			assert.ok(cocr && cocr.nameRu.includes('Bredent'));
		});
	});

	describe('2. VITA Shades, Natural Die Stump Shades (ND1-ND9) & Optical Texture', () => {
		it('verifies VITA Classical palette has all 16 shades with valid hex codes', () => {
			assert.equal(VITA_CLASSICAL_SHADES.length, 16);
			const shadeCodes = VITA_CLASSICAL_SHADES.map(s => s.code);
			assert.ok(shadeCodes.includes('A1') && shadeCodes.includes('A2') && shadeCodes.includes('A3'));
			assert.ok(shadeCodes.includes('B1') && shadeCodes.includes('B4'));
			assert.ok(shadeCodes.includes('C1') && shadeCodes.includes('D4'));

			for (const s of VITA_CLASSICAL_SHADES) {
				assert.match(s.hex, /^#[0-9A-Fa-f]{6}$/);
			}
		});

		it('verifies VITA Bleach & 3D-Master palettes', () => {
			assert.equal(VITA_BLEACH_SHADES.length, 4);
			assert.ok(VITA_3D_MASTER_SHADES.length >= 19);
			const bleachCodes = VITA_BLEACH_SHADES.map(s => s.code);
			assert.deepEqual(bleachCodes, ['BL1', 'BL2', 'BL3', 'BL4']);
		});

		it('verifies IPS Natural Die Material ND1-ND9 stump shade standards', () => {
			assert.equal(STUMP_SHADES_ND.length, 9);
			for (let i = 1; i <= 9; i++) {
				const expectedCode = `ND${i}`;
				const found = STUMP_SHADES_ND.find(s => s.code === expectedCode);
				assert.ok(found, `Missing stump shade ${expectedCode}`);
				assert.match(found.hex, /^#[0-9A-Fa-f]{6}$/);
			}
			const nd9 = STUMP_SHADES_ND[8];
			assert.ok(nd9 && nd9.descriptionRu?.includes('Металлическая')); // ND9
		});

		it('verifies surface textures and translucency levels', () => {
			assert.equal(SURFACE_TEXTURES.length, 3);
			assert.equal(TRANSLUCENCY_LEVELS.length, 5);
			const translucencyIds = TRANSLUCENCY_LEVELS.map(t => t.id);
			assert.deepEqual(translucencyIds, ['HT', 'MT', 'LT', 'MO', 'HO']);
		});
	});

	describe('3. Statutory 7-Stage Workflow Sequence', () => {
		it('verifies all 7 stages in canonical GOST sequence', () => {
			assert.equal(LAB_STAGE_ORDER.length, 7);
			assert.deepEqual(LAB_STAGE_ORDER, [
				'impression_sent',
				'cad_design',
				'milling_wax_up',
				'try_in_fitting',
				'glaze_finish',
				'delivered_to_clinic',
				'installed_in_mouth'
			]);

			for (let i = 0; i < LAB_STAGE_ORDER.length; i++) {
				const stageId = LAB_STAGE_ORDER[i]!;
				const stageDef = LAB_WORKFLOW_STAGES[stageId];
				assert.equal(stageDef.orderIndex, i + 1);
				assert.ok(stageDef.nameRu.length > 0);
				assert.ok(stageDef.icon.length > 0);
			}
		});
	});

	describe('4. Financial & Margin Accounting Engine', () => {
		it('calculates gross margin, doctor commission and clinic net profit accurately', () => {
			// Single crown: 20,000 ₽ price, 6,000 ₽ lab cost, 20% doctor commission
			const fin = calculateLabFinancials({
				unitsCount: 1,
				pricePerUnitRub: 20000,
				costPerUnitRub: 6000,
				doctorPercent: 20
			});

			assert.equal(fin.patientPriceTotalRub, 20000);
			assert.equal(fin.labCostTotalRub, 6000);
			assert.equal(fin.grossMarginRub, 14000);
			assert.equal(fin.grossMarginPercent, 70.0);
			assert.equal(fin.doctorCommissionRub, 2800); // 14,000 * 20% = 2,800
			assert.equal(fin.clinicNetProfitRub, 11200); // 14,000 - 2,800 = 11,200
		});

		it('handles multi-unit scaling (e.g. 6 veneers anterior group)', () => {
			const fin = calculateLabFinancials({
				unitsCount: 6,
				pricePerUnitRub: 28000,
				costPerUnitRub: 10000,
				doctorPercent: 25
			});

			assert.equal(fin.unitsCount, 6);
			assert.equal(fin.patientPriceTotalRub, 168000); // 28,000 * 6
			assert.equal(fin.labCostTotalRub, 60000); // 10,000 * 6
			assert.equal(fin.grossMarginRub, 108000);
			assert.equal(fin.grossMarginPercent, 64.3);
			assert.equal(fin.doctorCommissionRub, 27000); // 108,000 * 25%
			assert.equal(fin.clinicNetProfitRub, 81000);
		});

		it('handles zero and edge cases cleanly without NaN', () => {
			const fin = calculateLabFinancials({
				unitsCount: 0,
				pricePerUnitRub: 0,
				costPerUnitRub: 0,
				doctorPercent: 0
			});

			assert.equal(fin.unitsCount, 1);
			assert.equal(fin.patientPriceTotalRub, 0);
			assert.equal(fin.grossMarginRub, 0);
			assert.equal(fin.grossMarginPercent, 0);
			assert.equal(fin.doctorCommissionRub, 0);
			assert.equal(fin.clinicNetProfitRub, 0);
		});
	});

	describe('5. Turnaround & Delivery Scheduler (Weekend Buffering)', () => {
		it('correctly skips Saturdays and Sundays when adding working days', () => {
			// Friday 2026-08-21 + 1 working day -> Monday 2026-08-24
			const friday = new Date('2026-08-21T10:00:00Z');
			const nextDay = addWorkingDays(friday, 1);
			assert.equal(nextDay.getDay(), 1); // Monday

			// Friday + 5 working days -> next Friday 2026-08-28
			const fiveDays = addWorkingDays(friday, 5);
			assert.equal(formatDateToIsoDay(fiveDays), '2026-08-28');
		});

		it('calculates stage turnaround schedule with fitting date for applicable types', () => {
			const schedule = calculateLabTurnaroundSchedule({
				orderDate: '2026-08-24', // Monday
				prostheticTypeId: 'removable_clasp_prosthesis', // 10 working days, requires fitting
				currentDate: '2026-08-24'
			});

			assert.equal(schedule.workingDaysRequired, 10);
			assert.ok(schedule.expectedFittingDate);
			assert.ok(schedule.expectedDeliveryDate > schedule.expectedFittingDate);
			assert.equal(schedule.deadlineStatus, 'on_track');
			assert.equal(schedule.isOverdue, false);
		});

		it('detects approaching deadlines and overdue statuses', () => {
			const overdueSchedule = calculateLabTurnaroundSchedule({
				orderDate: '2026-08-01',
				prostheticTypeId: 'crown_zirconia_monolithic',
				currentDate: '2026-08-20'
			});

			assert.equal(overdueSchedule.isOverdue, true);
			assert.equal(overdueSchedule.deadlineStatus, 'overdue');
			assert.ok(overdueSchedule.deadlineStatusRu.includes('Просрочено'));
		});
	});

	describe('6. SVG Barcode, QR Code & Odontogram Generation', () => {
		it('generates valid vector SVG for Code128 barcode', () => {
			const svg = generateBarcodeSvg('ЛО-2026/08-0142', 240, 50);
			assert.ok(svg.includes('<svg'));
			assert.ok(svg.includes('</svg>'));
			assert.ok(svg.includes('ЛО-2026/08-0142'));
			assert.ok(svg.includes('<rect'));
		});

		it('generates valid vector SVG for QR Code', () => {
			const qrSvg = generateQrCodeSvg('DENTE-LAB:TEST-001', 100);
			assert.ok(qrSvg.includes('<svg'));
			assert.ok(qrSvg.includes('viewBox="0 0 100 100"'));
			assert.ok(qrSvg.includes('<rect'));
		});

		it('generates 32-tooth FDI odontogram SVG with highlighted teeth', () => {
			const svg = generateFdiOdontogramSvg([11, 21, 22]);
			assert.ok(svg.includes('<svg'));
			assert.ok(svg.includes('11'));
			assert.ok(svg.includes('21'));
			assert.ok(svg.includes('48'));
			assert.ok(svg.includes('ВЧ')); // Upper jaw
			assert.ok(svg.includes('НЧ')); // Lower jaw
		});
	});

	describe('7. Statutory A4 Printable Lab Blank Generator & Order Factory', () => {
		it('creates complete LabWorkOrder object via factory', () => {
			const order = createLabWorkOrder({
				patientId: 'pat-901',
				patientName: 'Смирнова Анна Викторовна',
				doctorId: 'doc-101',
				doctorName: 'Д-р Ковалев С. П.',
				selectedTeeth: [11, 21],
				prostheticTypeId: 'crown_emax_press',
				shadeCode: 'A1',
				stumpShadeCode: 'ND1',
				clinicalNotes: 'Минимальное препарирование с уступом 0.5 мм.'
			});

			assert.ok(order.id.startsWith('lab-ord-'));
			assert.ok(order.orderNumber.startsWith('ЛО-'));
			assert.equal(order.patientName, 'Смирнова Анна Викторовна');
			assert.equal(order.prostheticTypeId, 'crown_emax_press');
			assert.equal(order.selectedTeeth.length, 2);
			assert.equal(order.financials.unitsCount, 2);
			assert.equal(order.currentStage, 'impression_sent');
		});

		it('generates complete A4 printable HTML containing all clinical & administrative data', () => {
			const order = createLabWorkOrder({
				patientId: 'pat-901',
				patientName: 'Смирнова Анна Викторовна',
				doctorId: 'doc-101',
				doctorName: 'Д-р Ковалев С. П.',
				selectedTeeth: [11, 21],
				prostheticTypeId: 'veneer_refractory',
				shadeCode: 'BL2',
				stumpShadeCode: 'ND1',
				clinicalNotes: 'Выраженные мамелоны, прозрачный режущий край HT.'
			});

			const html = generatePrintableLabWorkOrderHtml(order);

			assert.ok(html.includes('<!DOCTYPE html>'));
			assert.ok(html.includes('Наряд-заказ №'));
			assert.ok(html.includes('Смирнова Анна Викторовна'));
			assert.ok(html.includes('Д-р Ковалев С. П.'));
			assert.ok(html.includes('BL2'));
			assert.ok(html.includes('ND1'));
			assert.ok(html.includes('Выраженные мамелоны'));
			assert.ok(html.includes('Врач-ортопед'));
			assert.ok(html.includes('Зубной техник'));
			assert.ok(html.includes('<svg'));
		});
	});

});
