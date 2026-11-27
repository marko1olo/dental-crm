import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard } from "@dental/shared";
import { executeShiftSanpinAutoClose } from "../../sanpin/shiftCloser/shiftAutoCloseEngine.js";
import { SanpinRegisters } from "../../sanpin/SanpinRegisters";
import { performAutoVisitBomDeduction } from "../../inventory/autoBomDeductionEngine.js";
import { DoctorShiftRosterModal } from "../../schedule/roster/DoctorShiftRosterModal";
import { QuickBookingDrawer } from "../../schedule/QuickBookingDrawer";
import { VisitEmkTab } from "../VisitEmkTab";
import { RecordNewDiaryInlineForm } from "../../emr/record/tabs/RecordNewDiaryInlineForm";

describe("Solo-Doctor & Small-Clinic Ergonomics Audit (Real Engines & UI Renders)", () => {
	it("1. executeShiftSanpinAutoClose compiles full batch autoclaving, PSO, microclimate & waste logs", () => {
		const shift = executeShiftSanpinAutoClose({
			date: "2026-11-27",
			visitsCount: 8,
			traysCount: 16,
			operatorStaffFullName: "Соколова Елена Сергеевна",
		});
		assert.strictEqual(shift.date, "2026-11-27");
		assert.strictEqual(shift.visitsCount, 8);
		assert.ok(shift.form257Records.length > 0);
		assert.ok(shift.psoBatches.length > 0);
		assert.ok(shift.digitalStampHash.length > 8);
		assert.ok(shift.complianceSummaryRu.includes("2026-11-27"));
	});

	it("2. performAutoVisitBomDeduction deducts consumables with soft negative overdraft & zero chairside blocks", async () => {
		const toasts: Array<{ msg: string; type: string }> = [];
		const res = await performAutoVisitBomDeduction({
			visitId: "visit-solo-1",
			patientId: "pat-solo-1",
			doctorId: "doc-solo-1",
			patientFullName: "Иванов Петр Сергеевич",
			doctorFullName: "Соколова Елена Сергеевна",
			visitDate: "2026-11-27",
			renderedServices: [
				{
					serviceCode: "A16.07.002",
					serviceTitle: "Лечение кариеса (световой композит)",
					quantity: 1,
					toothNumber: 16,
				},
			],
			currentStockMap: {},
			allowOverdraft: true,
			onToast: (msg, type) => {
				toasts.push({ msg, type });
			},
		});
		assert.ok(res.items.length > 0);
		assert.strictEqual(res.hasOverdraft, true);
		assert.strictEqual(toasts.length, 1);
	});

	it("3. SanpinRegisters renders batch sterilization registers without bureaucratic 'Форма 257/у' blockers", () => {
		const html = renderToStaticMarkup(React.createElement(SanpinRegisters));
		assert.ok(html.includes("sanpin-container"));
		assert.equal(html.includes("Форма 257/у"), false);
		assert.equal(html.includes("043/у"), false);
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
	});

	it("4. DoctorShiftRosterModal renders solo-friendly shift matrix and Apply & Close CTA", () => {
		const html = renderToStaticMarkup(
			React.createElement(DoctorShiftRosterModal, {
				isOpen: true,
				onClose: () => {},
				clinicName: "DENTE Соло",
				currentDate: "2026-11-27",
			}),
		);
		assert.ok(html.includes('data-testid="roster-apply-close-btn"'));
		assert.ok(html.includes("Применить и закрыть"));
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
	});

	it("5. QuickBookingDrawer renders fast booking flow without mandatory assistant gates", () => {
		const minimalDashboard = {
			patients: [{ id: "pat-1", fullName: "Смирнов Алексей", phone: "+79991112233" }],
			appointments: [],
			doctors: [{ id: "doc-1", fullName: "Соколова Е.С.", role: "doctor" }],
			clinicSettings: {
				isSoloPractice: true,
				chairs: [{ id: "chair-1", name: "Кресло 1" }],
				staff: [{ id: "doc-1", fullName: "Соколова Е.С.", role: "doctor" }],
			},
		} as unknown as Dashboard;

		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: minimalDashboard,
				initialSlot: {
					dateKey: "2026-11-27",
					startTime: "10:00",
					startsAt: "2026-11-27T10:00:00.000Z",
					chairId: "chair-1",
					chairName: "Кресло 1",
					doctorUserId: "doc-1",
					durationMinutes: 30,
				},
			}),
		);
		assert.ok(html.includes("Кресло 1"));
		assert.equal(html.includes("043/у"), false);
		assert.equal(html.includes("804н"), false);
	});

	it("6. VisitEmkTab & RecordNewDiaryInlineForm preserve clean Russian UI and unblocked primary CTAs", () => {
		const tabHtml = renderToStaticMarkup(
			React.createElement(VisitEmkTab, {
				visitNoteForm: {
					complaint: "Осмотр",
					anamnesis: "Без особенностей",
					objectiveStatus: "Интактные зубы",
					diagnosis: "Z01.2",
					treatmentPlan: "Рекомендована гигиена",
					recommendations: "Повторный осмотр через 6 мес.",
				},
				updateVisitNoteField: () => {},
				activePatient: { id: "pat-1", fullName: "Смирнов Алексей" },
				activeDoctor: { id: "doc-1", fullName: "Соколова Е.С.", specialty: "therapist" },
			}),
		);
		const formHtml = renderToStaticMarkup(
			React.createElement(RecordNewDiaryInlineForm, {
				selectedTooth: "11",
				setSelectedTooth: () => {},
				commonTeeth: [11, 21, 16, 26],
				subjective: "",
				setSubjective: () => {},
				objective: "",
				setObjective: () => {},
				diagnosisText: "",
				setDiagnosisText: () => {},
				icd10Code: "Z01.2",
				setIcd10Code: () => {},
				protocol: "",
				setProtocol: () => {},
				onApplyNorm: () => {},
				onClear: () => {},
				onSave: () => {},
			}),
		);
		for (const html of [tabHtml, formHtml]) {
			assert.equal(html.includes("043/у"), false);
			assert.equal(html.includes("804н"), false);
			assert.equal(html.includes("54-ФЗ"), false);
			assert.equal(/1 клик|в 1 клик/i.test(html), false);
			assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
		}
	});
});
