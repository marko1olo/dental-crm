/**
 * soloDoctorPayrollAutonomy.test.ts
 *
 * Wave 21: Solo Doctor Payroll Autonomy & Zero-Staff Fallback
 * Mandates 8e (Doctor Autonomy & Zero-Friction) & 8n (Scale Sovereignty: Solo Doctor & Small Clinic)
 *
 * Verifies:
 * 1. Automatic fallback doctor profile { id: "solo-doctor", name: "Лечащий врач (соло-практика)", specialtyId: "general_dentist" }
 *    when doctorsList is empty or undefined.
 * 2. Doctor selector is never disabled (disabled={false}) and allows switching clinical specialties in solo mode.
 * 3. Accurate kopeck-exact payroll calculations with correct lab/material deductions and piece-rate percentages per specialty.
 * 4. Switching clinical specialties (Therapist, Orthopedist, Surgeon, Orthodontist, Periodontist, Pediatric, Hygienist).
 * 5. Statutory Russian Form T-51 CSV export with UTF-8 BOM for solo practitioner.
 */

import { describe, it, expect } from "vitest";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	DoctorPayrollModal,
	DEFAULT_SOLO_DOCTOR,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
} from "../DoctorPayrollModal";
import {
	calculateDoctorPeriodPayroll,
	generatePayrollT51Csv,
	type DoctorCompletedServiceItem,
} from "../payrollEngine";
import {
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
} from "../payrollPresets";

describe("Solo Doctor Payroll Autonomy & Zero-Staff Fallback (Mandates 8e & 8n)", () => {
	it("1. Provides default fallback profile when doctorsList is empty", () => {
		expect(DEFAULT_SOLO_DOCTOR.id).toBe("solo-doctor");
		expect(DEFAULT_SOLO_DOCTOR.name).toBe("Лечащий врач (соло-практика)");
		expect(DEFAULT_SOLO_DOCTOR.specialtyId).toBe("general_dentist");

		const html = renderToString(
			createElement(DoctorPayrollModal, {
				isOpen: true,
				onClose: () => {},
				doctorsList: [],
			})
		);

		// Must render modal container
		expect(html).toContain("payroll-modal-container");
		expect(html).toContain("Сдельная зарплата и расчетный листок");

		// Must NOT display blocking empty list messages
		expect(html).not.toContain("Нет сотрудников для расчета");
		expect(html).not.toContain("Сотрудник не выбран");

		// Must display solo doctor specialty in footer
		expect(html).toContain("Врач-стоматолог общей практики (соло)");
	});

	it("2. Selector is NOT disabled when doctorsList is empty and renders clinical specialties", () => {
		const html = renderToString(
			createElement(DoctorPayrollModal, {
				isOpen: true,
				onClose: () => {},
				doctorsList: [],
			})
		);

		// Selector element must NOT have disabled attribute
		const selectTagMatch = html.match(/<select[^>]*>/);
		expect(selectTagMatch).not.toBeNull();
		const selectTag = selectTagMatch ? selectTagMatch[0] : "";
		expect(selectTag).not.toMatch(/\sdisabled([=\s>]|$)/);
		expect(selectTag).toContain("data-testid=\"doctor-payroll-select\"");

		// Must render options for clinical specialties
		expect(html).toContain("value=\"general_dentist\"");
		expect(html).toContain("value=\"therapist\"");
		expect(html).toContain("value=\"orthopedist\"");
		expect(html).toContain("value=\"surgeon_implantologist\"");
		expect(html).toContain("value=\"surgeon\"");
		expect(html).toContain("value=\"orthodontist\"");
		expect(html).toContain("value=\"periodontist\"");
		expect(html).toContain("value=\"pediatric_dentist\"");
		expect(html).toContain("value=\"hygienist\"");

		// Verify Russian labels in select options
		expect(html).toContain("Стоматолог общей практики");
		expect(html).toContain("Терапевт / эндодонтист");
		expect(html).toContain("Ортопед (CAD/CAM)");
		expect(html).toContain("Хирург-имплантолог");
		expect(html).toContain("Хирург");
		expect(html).toContain("Ортодонт (брекеты / элайнеры)");
		expect(html).toContain("Пародонтолог");
		expect(html).toContain("Детский стоматолог");
		expect(html).toContain("Гигиенист");
	});

	it("3. Correctly calculates payrollResult for solo doctor with general dentist preset", () => {
		const services: readonly DoctorCompletedServiceItem[] = [
			{
				id: "srv-solo-1",
				dateIso: "2026-08-10",
				patientName: "Ковалева Е.А.",
				medicalCardNumber: "043/у-001",
				serviceNameRu: "Пломбирование зуба 1.6 светоотверждаемым композитом",
				category: "therapy",
				toothCode: "16",
				grossRevenueKop: 800000, // 8,000.00 RUB
				labCostKop: 0,
				materialCostKop: 100000, // 1,000.00 RUB
			},
			{
				id: "srv-solo-2",
				dateIso: "2026-08-12",
				patientName: "Сидоров Н.В.",
				medicalCardNumber: "043/у-002",
				serviceNameRu: "Циркониевая коронка на оксиде циркония (лаборатория)",
				category: "orthopedics",
				toothCode: "21",
				grossRevenueKop: 3000000, // 30,000.00 RUB
				labCostKop: 800000, // 8,000.00 RUB lab bill
				materialCostKop: 0,
			},
		];

		const result = calculateDoctorPeriodPayroll({
			doctorId: DEFAULT_SOLO_DOCTOR.id,
			doctorName: DEFAULT_SOLO_DOCTOR.name,
			specialtyId: DEFAULT_SOLO_DOCTOR.specialtyId,
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		expect(result.doctorId).toBe("solo-doctor");
		expect(result.doctorName).toBe("Лечащий врач (соло-практика)");
		expect(result.specialtyTitleRu).toBe("Врач-стоматолог общей практики (соло)");
		expect(result.totalGrossRevenueKop).toBe(3800000); // 38,000.00 RUB
		expect(result.totalMaterialDeductionsKop).toBe(100000); // 1,000.00 RUB
		expect(result.totalLabDeductionsKop).toBe(800000); // 8,000.00 RUB
		expect(result.totalNetBaseKop).toBe(2900000); // 29,000.00 RUB
		expect(result.baseCommissionPercent).toBe(25);

		// Earned base: 25% of 29,000 = 7,250 RUB = 725,000 kop
		expect(result.earnedBaseCommissionKop).toBe(725000);
		// Min guarantee for general dentist is 60,000 RUB (6,000,000 kop)
		expect(result.minimumGuaranteeApplied).toBe(true);
		expect(result.grossPayoutBeforeTaxKop).toBe(6000000);
		expect(result.ndfl13TaxKop).toBe(780000); // 13% of 60,000 = 7,800 RUB
		expect(result.netPayoutToDoctorKop).toBe(5220000); // 52,200 RUB
	});

	it("4. Switches clinical specialty to Orthopedist and verifies CAD/CAM lab deductions", () => {
		const services: readonly DoctorCompletedServiceItem[] = [
			{
				id: "srv-ortho-1",
				dateIso: "2026-08-15",
				patientName: "Петрова А.В.",
				medicalCardNumber: "043/у-003",
				serviceNameRu: "Керамический винир E.max CAD",
				category: "orthopedics",
				toothCode: "11",
				grossRevenueKop: 3500000, // 35,000.00 RUB
				labCostKop: 1000000, // 10,000.00 RUB lab invoice
				materialCostKop: 200000, // 2,000.00 RUB (orthopedist preset only deducts lab, not materials)
			},
		];

		const result = calculateDoctorPeriodPayroll({
			doctorId: DEFAULT_SOLO_DOCTOR.id,
			doctorName: DEFAULT_SOLO_DOCTOR.name,
			specialtyId: "orthopedist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		expect(result.doctorId).toBe("solo-doctor");
		expect(result.specialtyTitleRu).toBe("Врач-стоматолог ортопед (CAD/CAM)");
		expect(result.totalLabDeductionsKop).toBe(1000000); // Lab deducted
		expect(result.totalMaterialDeductionsKop).toBe(0); // Material NOT deducted for orthopedist preset
		expect(result.totalNetBaseKop).toBe(2500000); // 25,000.00 RUB
		expect(result.baseCommissionPercent).toBe(25);
	});

	it("5. Switches clinical specialty to Surgeon and verifies 20% commission with material deduction", () => {
		const services: readonly DoctorCompletedServiceItem[] = [
			{
				id: "srv-surg-1",
				dateIso: "2026-08-18",
				patientName: "Григорьев М.С.",
				medicalCardNumber: "043/у-004",
				serviceNameRu: "Сложное удаление ретенированного зуба мудрости 3.8",
				category: "surgery",
				toothCode: "38",
				grossRevenueKop: 1500000, // 15,000.00 RUB
				labCostKop: 0,
				materialCostKop: 300000, // 3,000.00 RUB
			},
		];

		const result = calculateDoctorPeriodPayroll({
			doctorId: DEFAULT_SOLO_DOCTOR.id,
			doctorName: DEFAULT_SOLO_DOCTOR.name,
			specialtyId: "surgeon",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		expect(result.doctorId).toBe("solo-doctor");
		expect(result.specialtyTitleRu).toBe("Врач-стоматолог хирург");
		expect(result.baseCommissionPercent).toBe(20);
		expect(result.totalMaterialDeductionsKop).toBe(300000);
		expect(result.totalLabDeductionsKop).toBe(0);
		expect(result.totalNetBaseKop).toBe(1200000); // 12,000.00 RUB
		expect(result.earnedBaseCommissionKop).toBe(240000); // 20% of 12,000 = 2,400 RUB
	});

	it("6. Switches clinical specialty to Hygienist and verifies 30% service commission & 15% retail", () => {
		const services: readonly DoctorCompletedServiceItem[] = [
			{
				id: "srv-hyg-1",
				dateIso: "2026-08-20",
				patientName: "Семенова Д.К.",
				medicalCardNumber: "043/у-005",
				serviceNameRu: "Комплексная гигиена полости рта (Air-Flow + УЗ)",
				category: "hygiene",
				grossRevenueKop: 700000, // 7,000.00 RUB
				labCostKop: 0,
				materialCostKop: 0,
			},
			{
				id: "srv-hyg-2",
				dateIso: "2026-08-20",
				patientName: "Семенова Д.К.",
				medicalCardNumber: "043/у-005",
				serviceNameRu: "Зубная паста Curaprox Enzycal 1450",
				category: "retail_hygiene",
				grossRevenueKop: 120000, // 1,200.00 RUB
				labCostKop: 0,
				materialCostKop: 0,
			},
		];

		const result = calculateDoctorPeriodPayroll({
			doctorId: DEFAULT_SOLO_DOCTOR.id,
			doctorName: DEFAULT_SOLO_DOCTOR.name,
			specialtyId: "hygienist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		expect(result.doctorId).toBe("solo-doctor");
		expect(result.specialtyTitleRu).toBe("Гигиенист стоматологический");
		expect(result.baseCommissionPercent).toBe(30);
		expect(result.earnedBaseCommissionKop).toBe(210000); // 30% of 7,000 = 2,100 RUB
		expect(result.earnedRetailCommissionKop).toBe(18000); // 15% of 1,200 = 180 RUB
	});

	it("7. Generates valid Russian Form T-51 CSV for solo doctor with UTF-8 BOM", () => {
		const result = calculateDoctorPeriodPayroll({
			doctorId: DEFAULT_SOLO_DOCTOR.id,
			doctorName: DEFAULT_SOLO_DOCTOR.name,
			specialtyId: DEFAULT_SOLO_DOCTOR.specialtyId,
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: [
				{
					id: "srv-csv-1",
					dateIso: "2026-08-10",
					patientName: "Иванов И.И.",
					medicalCardNumber: "043/у-100",
					serviceNameRu: "Консультация врача-стоматолога",
					category: "therapy",
					grossRevenueKop: 200000, // 2,000.00 RUB
					labCostKop: 0,
					materialCostKop: 0,
				},
			],
		});

		const csv = generatePayrollT51Csv([result]);

		// Mandatory Excel UTF-8 BOM check
		expect(csv.startsWith("\uFEFF")).toBe(true);

		// Russian Form T-51 header check
		expect(csv).toContain("Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб)");

		// Solo doctor data row check
		expect(csv).toContain("solo-doctor");
		expect(csv).toContain("Лечащий врач (соло-практика)");
		expect(csv).toContain("Врач-стоматолог общей практики (соло)");
		expect(csv).toContain("2026-08-01 — 2026-08-31");
		expect(csv).toContain("2000.00");
	});

	it("8. Modal renders with initialDoctorId pointing to a specific specialty in solo mode", () => {
		const html = renderToString(
			createElement(DoctorPayrollModal, {
				isOpen: true,
				onClose: () => {},
				doctorsList: [],
				initialDoctorId: "orthodontist",
			})
		);

		// Must render orthodontist title in footer
		expect(html).toContain("Врач-ортодонт (брекеты / элайнеры)");

		// Export CSV and Print buttons must be present
		expect(html).toContain("Экспорт Т-51 (CSV)");
		expect(html).toContain("Печать расчетного листка");
	});

	it("9. Handles undefined doctorsList safely without crashing", () => {
		const html = renderToString(
			createElement(DoctorPayrollModal, {
				isOpen: true,
				onClose: () => {},
			})
		);

		expect(html).toContain("payroll-modal-container");
		expect(html).toContain("Лечащий врач (соло-практика)");
		expect(html).not.toContain("NaN");
		expect(html).not.toContain("undefined");
	});
});
