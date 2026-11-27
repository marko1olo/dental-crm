import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Patient } from "@dental/shared";

(globalThis as { React?: typeof React }).React = React;
import {
	executeBookPatientAppointmentAutonomy,
	executeOpenPatientVisitAutonomy,
} from "../patientAutonomy/patientNavigationAutonomy";
import { RecordNewDiaryInlineForm } from "../../emr/record/tabs/RecordNewDiaryInlineForm";
import { RecordDiariesTab } from "../../emr/record/tabs/RecordDiariesTab";
import { RecordAnamnesisTab } from "../../emr/record/tabs/RecordAnamnesisTab";
import type { MedicalRecordData } from "../../emr/types/recordDataTypes";
import { VisitSummaryDiarySections } from "../../visit/VisitSummaryDiarySections";
import { buildAnamnesisSection } from "../../egisz/cdaR2/dentalCdaSections";
import { PatientSafetyBanner } from "../tabs/generalInfo/PatientSafetyBanner";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "../safetyMath";
import { EMPTY_DIARY } from "../../../lib/protocols/protocolTypes";

function makeSampleMedicalRecord(): MedicalRecordData {
	return {
		formNumber: "Медицинская карта приёма",
		formOrderName: "Медицинская карта стоматологического пациента",
		clinic: {
			clinicName: "Клиника ДЕНТЕ",
			clinicLegalName: "ООО «ДЕНТЕ»",
			clinicAddress: "г. Москва, ул. Тестовая, д. 1",
			clinicPhone: "+74950000000",
			clinicOgrn: "1027700132195",
			clinicInn: "7707083893",
			clinicKpp: "770701001",
			licenseNumber: "ЛО-77-01-000001",
			licenseDate: "2024-01-15",
			licenseIssuer: "Департамент здравоохранения",
			chiefDoctorFullName: "Смирнов А.В.",
		},
		passport: {
			medicalCardNumber: "МК-101",
			cardOpenedDate: "2026-07-01",
			patientFullName: "Иванов Сергей Петрович",
			patientBirthDate: "1990-05-12",
			patientSex: "male",
			patientPhone: "+79991112233",
			patientEmail: "ivanov@example.ru",
			patientAddressRegistration: "г. Москва",
			patientAddressResidence: "г. Москва",
			patientIdentityDocument: "Паспорт",
			patientSnils: "112-233-445 95",
			patientInsurancePolicy: "",
			patientInsuranceCompany: "",
			patientPrivilegeCategory: "",
			primaryDiagnosisText: "Кариес дентина",
			primaryDiagnosisIcd10: "K02.1",
			attendingDoctorFullName: "Смирнов А.В.",
			attendingDoctorSpecialty: "Стоматолог-терапевт",
			attendingDoctorSnils: "",
		},
		anamnesis: {
			chiefComplaint: "Боль от холодного в области зуба 16",
			historyOfPresentIllness: "Симптомы беспокоят 3 дня",
			medicalHistoryVitae: "Соматически здоров",
			allergologicalHistory: "Аллергии отрицает",
			concomitantSomaticDiseases: "Нет",
			currentSystemicMedications: "Нет",
			pregnancyLactationStatus: "Не применимо",
			pastDentalInterventions: "Санация в 2025 году",
			occupationalHazardsAndHabits: "Нет",
		},
		dentalStatus: {
			odontogramTeeth: [],
			dmftIndex: { decayed: 1, missing: 0, filled: 2, total: 3 },
			cpitnIndex: { sextants: [0, 0, 0, 0, 0, 0], maxScore: 0 },
			hygieneIndexOhiS: { totalScore: 0.4, ratingLabel: "Хорошая" },
			biteType: "orthognathic",
			biteDescription: "Ортогнатический прикус",
			oralMucosaStatus: "healthy",
			xrayFindingsDescription: "Без периапикальных изменений",
			xrayRadiationDoseMsv: 0,
		},
		generalTreatmentPlan: "Пломбирование зуба 16",
		visitDiaries: [],
		epicrisis: {
			treatmentSummary: "",
			treatmentOutcome: "treatment_in_progress",
			treatmentOutcomeLabel: "Лечение продолжается",
			dispensaryGroup: "D_I_healthy",
			dispensaryGroupLabel: "Д-I",
			plannedRecallIntervalMonths: 6,
			preventivePlanRecommendations: "Профгигиена каждые 6 месяцев",
			dateCompleted: "",
			headOfDepartmentFullName: "",
			attendingDoctorFullName: "Смирнов А.В.",
		},
	};
}

describe("Red Team Inquisition: Human Clinical Language (Part 1: Visits, Forms, Tabs)", () => {
	it("1. patientNavigationAutonomy: visit & booking toasts use clean clinical Russian without '043/у'", () => {
		const toasts: Array<{ text: string; type: string | undefined }> = [];
		const views: string[] = [];
		const selectedIds: string[] = [];

		const noPatientVisit = executeOpenPatientVisitAutonomy({
			selectedPatient: null,
			setSelectedPatientId: (id) => selectedIds.push(id),
			setCurrentView: (v) => views.push(v),
			showToastFn: (text, type) => toasts.push({ text, type }),
		});
		assert.equal(noPatientVisit.executed, false);
		assert.equal(noPatientVisit.reason, "no_patient");
		assert.equal(toasts[0]?.text, "Выберите пациента из списка слева для открытия приёма");

		const noPatientBooking = executeBookPatientAppointmentAutonomy({
			selectedPatient: null,
			setNewAppointmentDraft: () => {},
			setCurrentView: (v) => views.push(v),
			showToastFn: (text, type) => toasts.push({ text, type }),
		});
		assert.equal(noPatientBooking.executed, false);
		assert.equal(toasts[1]?.text, "Выберите пациента из списка слева для записи в расписание");

		const patient: Patient = {
			id: "pat-lang-1",
			organizationId: "org-1",
			fullName: "Иванов Сергей Петрович",
			phone: "+79991112233",
		};
		const opened = executeOpenPatientVisitAutonomy({
			selectedPatient: patient,
			setSelectedPatientId: (id) => selectedIds.push(id),
			setCurrentView: (v) => views.push(v),
			showToastFn: (text, type) => toasts.push({ text, type }),
		});
		assert.equal(opened.executed, true);
		assert.deepEqual(selectedIds, ["pat-lang-1"]);
		assert.deepEqual(views, ["visit"]);
		assert.equal(toasts[2]?.text, "Открыт приём: Иванов Сергей Петрович");

		for (const item of toasts) {
			assert.equal(item.text.includes("043/у"), false);
		}
	});

	it("2. RecordNewDiaryInlineForm & RecordDiariesTab: render natural Russian SOAP headings without English jargon", () => {
		const noop = () => {};
		const inlineHtml = renderToString(
			React.createElement(RecordNewDiaryInlineForm, {
				selectedTooth: "16",
				setSelectedTooth: noop,
				commonTeeth: [11, 16, 26],
				subjective: "",
				setSubjective: noop,
				objective: "",
				setObjective: noop,
				diagnosisText: "",
				setDiagnosisText: noop,
				icd10Code: "K02.1",
				setIcd10Code: noop,
				protocol: "",
				setProtocol: noop,
				onApplyNorm: noop,
				onClear: noop,
				onSave: noop,
			}),
		);
		const diariesHtml = renderToString(
			React.createElement(RecordDiariesTab, {
				formData: makeSampleMedicalRecord(),
				onOpenInternalProtocolGenerator: noop,
			}),
		);
		const combinedHtml = `${inlineHtml}\n${diariesHtml}`;

		assert.equal(combinedHtml.includes("Subjective / Complaints"), false);
		assert.equal(combinedHtml.includes("Objective / Status Localis"), false);
		assert.equal(combinedHtml.includes("(Anamnesis)"), false);
		assert.equal(combinedHtml.includes("Plan / Treatment Protocol"), false);

		assert.ok(combinedHtml.includes("S (Жалобы)"));
		assert.ok(combinedHtml.includes("A (Диагноз)"));
		assert.ok(
			combinedHtml.includes("P (Протокол лечения и манипуляции)") ||
				combinedHtml.includes("P (Протокол лечения)") ||
				combinedHtml.includes("P (Лечение)"),
		);
		assert.ok(combinedHtml.includes("Дневники визитов (Медицинская карта приёма)"));
		assert.ok(
			combinedHtml.includes("Интактный ряд") ||
				combinedHtml.includes("Интактные зубы") ||
				combinedHtml.includes("Физиологическая норма"),
		);
	});

	it("3. VisitSummaryDiarySections: renders Section II in clean clinical Russian without 'Status Localis'", () => {
		const html = renderToString(
			React.createElement(VisitSummaryDiarySections, {
				diary: {
					...EMPTY_DIARY,
					anamnesis: "Жалоб нет",
					statusLocalis: "Слизистая бледно-розовая",
					diagnosisIcd10: "Z01.2",
					treatmentDescription: "Профилактический осмотр",
				},
				synthesizedDiaryPreview: null,
			}),
		);

		assert.equal(html.includes("Status Localis"), false);
		assert.ok(html.includes("Осмотр и зубная формула"));
	});

	it("4. RecordAnamnesisTab & CDA section: render Russian anamnesis labels without Latin Anamnesis Morbi/Vitae", () => {
		const tabHtml = renderToString(
			React.createElement(RecordAnamnesisTab, {
				formData: makeSampleMedicalRecord(),
				onApplyNorm: () => {},
			}),
		);
		const cdaXml = buildAnamnesisSection("Боль 3 дня", "Соматически здоров");
		const combined = `${tabHtml}\n${cdaXml}`;

		assert.equal(combined.includes("Anamnesis Morbi"), false);
		assert.equal(combined.includes("Anamnesis Vitae"), false);
		assert.ok(tabHtml.includes("История настоящего заболевания:"));
		assert.ok(cdaXml.includes("Анамнез жизни и соматический статус"));
	});

	it("5. PatientSafetyBanner (full mode): renders clean 'Соматический анамнез:' without Latin", () => {
		const html = renderToString(
			React.createElement(PatientSafetyBanner, {
				currentProfile: DEFAULT_SOMATIC_HEALTHY_NORM,
				mode: "full",
				patientId: "pat-lang-1",
				patientName: "Иванов С.П.",
				onToggleAllergy: () => {},
			}),
		);

		assert.equal(html.includes("Anamnesis Vitae"), false);
		assert.ok(html.includes("Соматический анамнез:"));
		assert.ok(html.includes("Медицинский статус, соматика и аллергологический анамнез"));
	});
});
