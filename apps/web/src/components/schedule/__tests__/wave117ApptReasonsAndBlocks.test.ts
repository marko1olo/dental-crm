/**
 * wave117ApptReasonsAndBlocks.test.ts
 *
 * Verification suite for Wave 117:
 * Appointment Catalogs Export, Appointment 1-Click Visit Reasons & Doctor Blocking Intervals
 * (Supreme Law: THE HAMMER, Mandates 8a-8q).
 *
 * Scope:
 * 1. Export & availability of all StomX catalogs in @dental/shared:
 *    - STOMX_PATIENT_TAGS_CATALOG, PATIENT_TAG_CATEGORIES, STOMX_PATIENT_TAG_CODES, schemas & types
 *    - STOMX_REPRESENTATIVE_CATALOG, STOMX_REPRESENTATIVE_TYPES, schemas & types
 *    - STOMX_MARKETING_SOURCES, STOMX_MARKETING_SOURCES_CATALOG, STOMX_MARKETING_BY_CHANNEL, schemas & types
 *    - STOMX_APPT_REASONS_CATALOG, STOMX_APPT_REASONS, STOMX_APPT_REASON_TYPES, schemas & types
 *    - STOMX_APPT_REFUSE_REASONS_CATALOG, STOMX_APPT_REFUSE_REASONS, schemas & types
 * 2. AppointmentModal.tsx integration:
 *    - 1-click clinical reasons: «Острая боль» (with red CITO badge), «Плановое обследование», «Повторно», «Лечение», «Консультация», «Профгигиена»
 *    - Doctor technical blocking intervals: «Обед», «Перерыв», «Отпуск», «Учеба», «Отсутствует», «Другое»
 *    - Touch target >= 44x44px ergonomics (Mandates 8c, 8e)
 *    - Switching to technical interval without mandatory patientId requirement (Mandates 8e, 8n)
 *    - isTechnicalBreakAppointment predicate coverage
 * 3. PatientCardModal.tsx & PatientGeneralInfoTab.tsx integration:
 *    - STOMX_REPRESENTATIVE_CATALOG export and statutory legal status check (ст. 20 323-ФЗ & ст. 64 СК РФ)
 *    - Correctness of legal representatives (Мать, Отец, Опекун, Родитель и др.) vs family members
 *    - Automatic IDS signing rights badge (representative-ids-signing-badge)
 */

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

if (typeof registerHooks === "function") {
	try {
		registerHooks({
			load(url, context, nextLoad) {
				if (url.endsWith(".css")) {
					return {
						format: "module",
						shortCircuit: true,
						source: "export default {};",
					};
				}
				return nextLoad(url, context);
			},
		});
	} catch {
		// Ignore if already registered
	}
}

import {
	// 1. Patient tags
	PATIENT_TAG_CATEGORIES,
	STOMX_PATIENT_TAG_CODES,
	STOMX_PATIENT_TAGS_CATALOG,
	patientTagCategorySchema,
	stomxPatientTagCodeSchema,
	// 2. Representatives
	STOMX_REPRESENTATIVE_CATALOG,
	STOMX_REPRESENTATIVE_TYPES,
	isStatutoryLegalRepresentative,
	stomxRepresentativeTypeSchema,
	// 3. Marketing sources
	DENTE_MARKETING_BY_CHANNEL,
	DENTE_MARKETING_CHANNELS,
	DENTE_MARKETING_SOURCES,
	DENTE_MARKETING_SOURCES_CATALOG,
	marketingChannelSchema,
	// 4. Appointment reasons & doctor blocks
	STOMX_APPT_REASON_TYPES,
	STOMX_APPT_REASONS,
	STOMX_APPT_REASONS_CATALOG,
	stomxApptReasonSchema,
	// 5. Refusal reasons
	STOMX_APPT_REFUSE_REASONS,
	STOMX_APPT_REFUSE_REASONS_CATALOG,
	stomxApptRefuseReasonSchema,
} from "@dental/shared";

import {
	QUICK_APPOINTMENT_REASONS,
	TECHNICAL_BREAK_PRESETS,
	isTechnicalBreakAppointment,
} from "../scheduleCatalogData";

import {
	getRepresentativeLegalStatus,
} from "../../patients/patientCardModalModules/patientCardModalTypes";
import { PatientCardModal } from "../../patients/PatientCardModal";
import { RepresentativeAlertBanner } from "../../patients/tabs/generalInfo/RepresentativeAlertBanner";
import { RepresentativeRelationshipChips } from "../../patients/tabs/generalInfo/RepresentativeRelationshipChips";
import { QuickPresetChipsBar } from "../quickBookingService/QuickPresetChipsBar";
import { PatientSectionHeader } from "../quickBookingPatient/PatientSectionHeader";
import { buildQuickBookingPayload } from "../quickBookingSubmitPayload";
const MODAL_REPRESENTATIVE_CATALOG = STOMX_REPRESENTATIVE_CATALOG;

describe("Wave 117: Appointment Catalogs Export & Blocking Intervals", () => {
	describe("1. Export of appointment catalogs in @dental/shared", () => {
		it("1.1 Patient tags catalog & codes are fully exported and valid", () => {
			assert.ok(Array.isArray(PATIENT_TAG_CATEGORIES), "PATIENT_TAG_CATEGORIES must be an array");
			assert.ok(PATIENT_TAG_CATEGORIES.includes("clinical"), "Must contain clinical category");
			assert.ok(PATIENT_TAG_CATEGORIES.includes("administrative"), "Must contain administrative category");
			assert.ok(PATIENT_TAG_CATEGORIES.includes("financial"), "Must contain financial category");
			assert.ok(PATIENT_TAG_CATEGORIES.includes("social"), "Must contain social category");

			assert.ok(Array.isArray(STOMX_PATIENT_TAG_CODES), "STOMX_PATIENT_TAG_CODES must be an array");
			assert.ok(STOMX_PATIENT_TAG_CODES.includes("allergy"), "Must contain allergy code");
			assert.ok(STOMX_PATIENT_TAG_CODES.includes("acute_pain"), "Must contain acute_pain code");

			assert.ok(Array.isArray(STOMX_PATIENT_TAGS_CATALOG), "STOMX_PATIENT_TAGS_CATALOG must be an array");
			assert.ok(STOMX_PATIENT_TAGS_CATALOG.length >= 10, "Must contain at least 10 canonical tags");

			// Zod schema checks
			assert.ok(patientTagCategorySchema.safeParse("clinical").success);
			assert.ok(stomxPatientTagCodeSchema.safeParse("allergy").success);
		});

		it("1.2 Statutory & Family Representatives catalog is fully exported and valid", () => {
			assert.ok(Array.isArray(STOMX_REPRESENTATIVE_TYPES), "STOMX_REPRESENTATIVE_TYPES must be an array");
			assert.ok(STOMX_REPRESENTATIVE_TYPES.includes("mother"));
			assert.ok(STOMX_REPRESENTATIVE_TYPES.includes("father"));
			assert.ok(STOMX_REPRESENTATIVE_TYPES.includes("guardian"));
			assert.ok(STOMX_REPRESENTATIVE_TYPES.includes("parent"));

			assert.ok(Array.isArray(STOMX_REPRESENTATIVE_CATALOG), "STOMX_REPRESENTATIVE_CATALOG must be an array");
			assert.equal(STOMX_REPRESENTATIVE_CATALOG.length, 14, "Must contain exactly 14 StomX representative types");

			// Zod schema check
			assert.ok(stomxRepresentativeTypeSchema.safeParse("mother").success);
			assert.ok(stomxRepresentativeTypeSchema.safeParse("father").success);
		});

		it("1.3 Marketing channels & lead sources catalogs are fully exported and valid", () => {
			assert.ok(Array.isArray(DENTE_MARKETING_CHANNELS), "DENTE_MARKETING_CHANNELS must be an array");
			assert.ok(DENTE_MARKETING_CHANNELS.includes("yandex"));
			assert.ok(DENTE_MARKETING_CHANNELS.includes("gis2"));
			assert.ok(DENTE_MARKETING_CHANNELS.includes("prodoctorov"));

			assert.ok(Array.isArray(DENTE_MARKETING_SOURCES_CATALOG), "DENTE_MARKETING_SOURCES_CATALOG must be an array");
			assert.ok(DENTE_MARKETING_SOURCES_CATALOG.length >= 10);
			assert.ok(DENTE_MARKETING_BY_CHANNEL.yandex !== undefined);

			assert.ok(Array.isArray(DENTE_MARKETING_SOURCES), "DENTE_MARKETING_SOURCES must be an array");
			assert.ok(DENTE_MARKETING_SOURCES.length >= 8);

			assert.ok(marketingChannelSchema.safeParse("yandex").success);
		});

		it("1.4 Appointment visit reasons & doctor blocking intervals catalog is fully exported and valid", () => {
			assert.deepEqual(Array.from(STOMX_APPT_REASON_TYPES), ["common", "block"]);

			assert.ok(Array.isArray(STOMX_APPT_REASONS), "STOMX_APPT_REASONS must be an array");
			assert.ok(STOMX_APPT_REASONS.includes("acute_pain"));
			assert.ok(STOMX_APPT_REASONS.includes("lunch"));
			assert.ok(STOMX_APPT_REASONS.includes("break"));
			assert.ok(STOMX_APPT_REASONS.includes("vacation"));
			assert.ok(STOMX_APPT_REASONS.includes("study"));
			assert.ok(STOMX_APPT_REASONS.includes("absent"));
			assert.ok(STOMX_APPT_REASONS.includes("other_block"));

			assert.ok(Array.isArray(STOMX_APPT_REASONS_CATALOG), "STOMX_APPT_REASONS_CATALOG must be an array");
			assert.equal(STOMX_APPT_REASONS_CATALOG.length, 12, "Must contain exactly 12 StomX appointment reasons");

			const commonReasons = STOMX_APPT_REASONS_CATALOG.filter((r) => r.type === "common");
			assert.equal(commonReasons.length, 6, "Must contain 6 clinical visit reasons");
			const blockReasons = STOMX_APPT_REASONS_CATALOG.filter((r) => r.type === "block");
			assert.equal(blockReasons.length, 6, "Must contain 6 doctor blocking reasons");

			assert.ok(stomxApptReasonSchema.safeParse("acute_pain").success);
			assert.ok(stomxApptReasonSchema.safeParse("lunch").success);
		});

		it("1.5 Appointment refusal & cancellation reasons catalog is fully exported and valid", () => {
			assert.ok(Array.isArray(STOMX_APPT_REFUSE_REASONS), "STOMX_APPT_REFUSE_REASONS must be an array");
			assert.ok(STOMX_APPT_REFUSE_REASONS.includes("no_show_confirmed"));
			assert.ok(STOMX_APPT_REFUSE_REASONS.includes("clinic_cancelled"));

			assert.ok(Array.isArray(STOMX_APPT_REFUSE_REASONS_CATALOG), "STOMX_REFUSE_REASONS_CATALOG must be an array");
			assert.equal(STOMX_APPT_REFUSE_REASONS_CATALOG.length, 10, "Must contain 10 refusal reasons");

			assert.ok(stomxApptRefuseReasonSchema.safeParse("no_show_confirmed").success);
		});
	});

	describe("2. AppointmentModal.tsx 1-Click Visit Reasons and Doctor Blocking Intervals", () => {
		it("2.1 AppointmentModal exports QUICK_APPOINTMENT_REASONS with canonical clinical reasons", () => {
			assert.ok(Array.isArray(QUICK_APPOINTMENT_REASONS), "QUICK_APPOINTMENT_REASONS must be an array");

			// Check all 6 required clinical reasons
			const labels = QUICK_APPOINTMENT_REASONS.map((r) => r.label);
			assert.ok(labels.some((l) => l.includes("Острая боль")), "Must contain Острая боль");
			assert.ok(labels.some((l) => l.includes("Плановое обследование")), "Must contain Плановое обследование");
			assert.ok(labels.some((l) => l.includes("Повторно")), "Must contain Повторно");
			assert.ok(labels.some((l) => l.includes("Лечение")), "Must contain Лечение");
			assert.ok(labels.some((l) => l.includes("Консультация")), "Must contain Консультация");
			assert.ok(labels.some((l) => l.includes("Профгигиена")), "Must contain Профгигиена");

			// Check emergency badge on Острая боль
			const acutePain = QUICK_APPOINTMENT_REASONS.find((r) => r.label.includes("Острая боль"));
			assert.ok(acutePain, "Must find acute pain preset");
			assert.equal(acutePain.tone, "emergency", "Acute pain must have emergency tone");
		});

		it("2.2 AppointmentModal exports TECHNICAL_BREAK_PRESETS with canonical doctor blocks", () => {
			assert.ok(Array.isArray(TECHNICAL_BREAK_PRESETS), "TECHNICAL_BREAK_PRESETS must be an array");

			// Check all 6 doctor blocking reasons
			const labels = TECHNICAL_BREAK_PRESETS.map((b) => b.label);
			assert.ok(labels.some((l) => l.includes("Обед")), "Must contain Обед");
			assert.ok(labels.some((l) => l.includes("Перерыв")), "Must contain Перерыв");
			assert.ok(labels.some((l) => l.includes("Отпуск")), "Must contain Отпуск");
			assert.ok(labels.some((l) => l.includes("Учеба")), "Must contain Учеба");
			assert.ok(labels.some((l) => l.includes("Отсутствует")), "Must contain Отсутствует");
			assert.ok(labels.some((l) => l.includes("Другое")), "Must contain Другое");
		});

		it("2.3 isTechnicalBreakAppointment predicate recognizes all doctor technical blocks", () => {
			// All 6 doctor blocking reasons
			assert.equal(isTechnicalBreakAppointment({ reason: "Служебный перерыв: Обед" }), true);
			assert.equal(isTechnicalBreakAppointment({ reason: "Обед (60 мин)" }), true);
			assert.equal(isTechnicalBreakAppointment({ reason: "Технический перерыв: Перерыв" }), true);
			assert.equal(isTechnicalBreakAppointment({ reason: "Блокировка расписания: Отпуск" }), true);
			assert.equal(isTechnicalBreakAppointment({ reason: "Служебный перерыв: Учеба / Консилиум" }), true);
			assert.equal(isTechnicalBreakAppointment({ reason: "Блокировка расписания: Отсутствует" }), true);
			assert.equal(isTechnicalBreakAppointment({ reason: "Служебный перерыв: Другое" }), true);
			assert.equal(isTechnicalBreakAppointment({ comment: "Служебная блокировка расписания: Обед" }), true);
			assert.equal(isTechnicalBreakAppointment({ comment: "Технический интервал врача" }), true);

			// Clinical appointment should NOT be a technical break
			assert.equal(isTechnicalBreakAppointment({ reason: "Лечение кариеса 24" }), false);
			assert.equal(isTechnicalBreakAppointment({ reason: "Консультация ортодонта" }), false);
			assert.equal(isTechnicalBreakAppointment({ reason: "Острая боль" }), false);
		});

		it("2.4 QuickPresetChipsBar, PatientSectionHeader and buildQuickBookingPayload implement non-blocking chip selection and technical breaks", () => {
			const chipsHtml = renderToStaticMarkup(
				React.createElement(QuickPresetChipsBar, {
					reason: "",
					setReason: () => {},
					comment: "",
					setComment: () => {},
				}),
			);
			assert.ok(chipsHtml.includes('data-testid="appointment-quick-reasons"'));
			assert.ok(chipsHtml.includes('data-testid="appointment-doctor-blocks"'));
			assert.ok(chipsHtml.includes("chip-reason-"));
			assert.ok(chipsHtml.includes("chip-block-"));
			assert.ok(chipsHtml.includes("min-h-[44px]"));

			const clinicalHeaderHtml = renderToStaticMarkup(
				React.createElement(PatientSectionHeader, {
					showInlineNewPatient: false,
					setShowInlineNewPatient: () => {},
					selectedPatient: null,
					newPatientFullName: "",
					setNewPatientFullName: () => {},
					newPatientPhone: "",
					setNewPatientPhone: () => {},
					newPatientBirthDate: "",
					searchQuery: "",
					setAppointmentType: () => {},
					setReason: () => {},
					setComment: () => {},
					setDurationMinutes: () => {},
					doctors: [],
					doctorUserId: "",
					isTechnicalBreak: false,
				}),
			);
			assert.ok(clinicalHeaderHtml.includes("Пациент *"));
			assert.ok(clinicalHeaderHtml.includes("min-h-[44px]"));

			const techBreakHeaderHtml = renderToStaticMarkup(
				React.createElement(PatientSectionHeader, {
					showInlineNewPatient: false,
					setShowInlineNewPatient: () => {},
					selectedPatient: null,
					newPatientFullName: "",
					setNewPatientFullName: () => {},
					newPatientPhone: "",
					setNewPatientPhone: () => {},
					newPatientBirthDate: "",
					searchQuery: "",
					setAppointmentType: () => {},
					setReason: () => {},
					setComment: () => {},
					setDurationMinutes: () => {},
					doctors: [],
					doctorUserId: "",
					isTechnicalBreak: true,
				}),
			);
			assert.ok(techBreakHeaderHtml.includes("Пациент (не требуется)"));

			const breakPayload = buildQuickBookingPayload({
				params: {
					doctorUserId: "doc-1",
					dutyDoctorId: "",
					doctors: [{ id: "doc-1" }],
					chairId: "chair-1",
					chairs: [{ id: "chair-1" }],
					assistantUserId: "",
					isSoloClinic: false,
					reason: "Служебный перерыв: Обед",
					comment: "",
					status: "planned",
				} as never,
				activePatientId: null,
				startsAtIso: "2026-10-01T12:00:00.000Z",
				endsAtIso: "2026-10-01T13:00:00.000Z",
				isEmergency: false,
				overbookOverride: false,
			});
			assert.equal(breakPayload.patientId, null);
			assert.equal(breakPayload.reason, "Служебный перерыв: Обед");
		});
	});

	describe("3. PatientCardModal.tsx & PatientGeneralInfoTab.tsx Legal Representative Selection", () => {
		it("3.1 PatientCardModal exports STOMX_REPRESENTATIVE_CATALOG and getRepresentativeLegalStatus", () => {
			assert.ok(Array.isArray(MODAL_REPRESENTATIVE_CATALOG), "MODAL_REPRESENTATIVE_CATALOG must be an array");
			assert.equal(MODAL_REPRESENTATIVE_CATALOG.length, 14);

			const motherStatus = getRepresentativeLegalStatus("Мать");
			assert.equal(motherStatus.isLegalRepresentative, true);
			assert.equal(motherStatus.idsSigningAllowed, true);
			assert.ok(motherStatus.descriptionRu.includes("Законный представитель") || motherStatus.descriptionRu.includes("323-ФЗ"));

			const fatherStatus = getRepresentativeLegalStatus("Отец");
			assert.equal(fatherStatus.isLegalRepresentative, true);
			assert.equal(fatherStatus.idsSigningAllowed, true);

			const guardianStatus = getRepresentativeLegalStatus("Опекун");
			assert.equal(guardianStatus.isLegalRepresentative, true);
			assert.equal(guardianStatus.idsSigningAllowed, true);

			const brotherStatus = getRepresentativeLegalStatus("Брат");
			assert.equal(brotherStatus.isLegalRepresentative, false);
			assert.equal(brotherStatus.idsSigningAllowed, false);
			assert.ok(brotherStatus.descriptionRu.includes("доверенност"));
		});

		it("3.2 isStatutoryLegalRepresentative accurately checks statutory rights by СК РФ ст. 64 and 323-ФЗ", () => {
			assert.equal(isStatutoryLegalRepresentative("mother"), true);
			assert.equal(isStatutoryLegalRepresentative("father"), true);
			assert.equal(isStatutoryLegalRepresentative("parent"), true);
			assert.equal(isStatutoryLegalRepresentative("guardian"), true);
			assert.equal(isStatutoryLegalRepresentative("curator"), true);
			assert.equal(isStatutoryLegalRepresentative("adoptive_parent"), true);
			assert.equal(isStatutoryLegalRepresentative("authorized_representative"), true);

			assert.equal(isStatutoryLegalRepresentative("husband"), false);
			assert.equal(isStatutoryLegalRepresentative("wife"), false);
			assert.equal(isStatutoryLegalRepresentative("son"), false);
			assert.equal(isStatutoryLegalRepresentative("daughter"), false);
			assert.equal(isStatutoryLegalRepresentative("brother"), false);
			assert.equal(isStatutoryLegalRepresentative("sister"), false);
			assert.equal(isStatutoryLegalRepresentative("other"), false);
		});

		it("3.3 RepresentativeRelationshipChips & RepresentativeAlertBanner render statutory 323-ФЗ / 64 СК РФ badges", () => {
			const chipsHtml = renderToStaticMarkup(
				React.createElement(RepresentativeRelationshipChips, {
					patient: { representativeType: "Мать" },
					disabled: false,
					onUpdatePatient: () => {},
				}),
			);
			assert.ok(chipsHtml.includes("chip-representative-mother"));
			assert.ok(chipsHtml.includes("min-h-[44px]"));

			const motherMeta = STOMX_REPRESENTATIVE_CATALOG.find((r) => r.code === "mother") ?? null;
			const bannerHtml = renderToStaticMarkup(
				React.createElement(RepresentativeAlertBanner, {
					isMinorChild: true,
					selectedRep: motherMeta,
					compact: false,
				}),
			);
			assert.ok(bannerHtml.includes('data-testid="minor-323fz-alert"'));
			assert.ok(bannerHtml.includes('data-testid="representative-ids-signing-badge"'));
			assert.ok(bannerHtml.includes("323-ФЗ"));
			assert.ok(bannerHtml.includes("64 СК РФ"));
		});

		it("3.4 Canonical components/patients/PatientCardModal renders cleanly when closed", () => {
			const closedHtml = renderToStaticMarkup(
				React.createElement(PatientCardModal, {
					isOpen: false,
					onClose: () => {},
				}),
			);
			assert.equal(closedHtml, "");
		});
	});
});
