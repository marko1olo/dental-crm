/**
 * wave117StomxApptReasonsAndBlocks.test.ts
 *
 * Verification suite for Wave 117:
 * StomX Catalogs Export, Appointment 1-Click Visit Reasons & Doctor Blocking Intervals
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
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

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
	STOMX_MARKETING_BY_CHANNEL,
	STOMX_MARKETING_CHANNELS,
	STOMX_MARKETING_SOURCES,
	STOMX_MARKETING_SOURCES_CATALOG,
	stomxMarketingChannelSchema,
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
} from "../AppointmentModal";

import {
	STOMX_REPRESENTATIVE_CATALOG as MODAL_REPRESENTATIVE_CATALOG,
	getRepresentativeLegalStatus,
} from "../../patient/PatientCardModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Wave 117: StomX Catalogs Export & Appointment Blocking Intervals", () => {
	describe("1. Export of all StomX catalogs in @dental/shared", () => {
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
			assert.ok(Array.isArray(STOMX_MARKETING_CHANNELS), "STOMX_MARKETING_CHANNELS must be an array");
			assert.ok(STOMX_MARKETING_CHANNELS.includes("yandex"));
			assert.ok(STOMX_MARKETING_CHANNELS.includes("gis2"));
			assert.ok(STOMX_MARKETING_CHANNELS.includes("prodoctorov"));

			assert.ok(Array.isArray(STOMX_MARKETING_SOURCES_CATALOG), "STOMX_MARKETING_SOURCES_CATALOG must be an array");
			assert.ok(STOMX_MARKETING_SOURCES_CATALOG.length >= 10);
			assert.ok(STOMX_MARKETING_BY_CHANNEL.yandex !== undefined);

			assert.ok(Array.isArray(STOMX_MARKETING_SOURCES), "STOMX_MARKETING_SOURCES must be an array");
			assert.ok(STOMX_MARKETING_SOURCES.length >= 8);

			assert.ok(stomxMarketingChannelSchema.safeParse("yandex").success);
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

		it("2.3 isTechnicalBreakAppointment predicate recognizes all StomX doctor blocks", () => {
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

		it("2.4 AppointmentModal.tsx source code contains 1-click chip buttons and touch target >= 44px", () => {
			const modalPath = path.resolve(__dirname, "../AppointmentModal.tsx");
			assert.ok(fs.existsSync(modalPath), "AppointmentModal.tsx must exist");
			const content = fs.readFileSync(modalPath, "utf-8");

			// Testids
			assert.ok(
				content.includes('data-testid="appointment-quick-reasons"'),
				"Must include appointment-quick-reasons container",
			);
			assert.ok(
				content.includes('data-testid="appointment-doctor-blocks"'),
				"Must include appointment-doctor-blocks container",
			);
			assert.ok(
				content.includes('data-testid="technical-break-patient-free-banner"'),
				"Must include technical-break-patient-free-banner",
			);

			// Chips & Touch target >= 44px (Mandates 8c, 8e)
			assert.ok(
				content.includes("min-h-[44px]"),
				"Buttons must adhere to touch target >= 44px",
			);
			assert.ok(
				content.includes("chip-reason-"),
				"Must render chip-reason- testids",
			);
			assert.ok(
				content.includes("chip-block-"),
				"Must render chip-block- testids",
			);

			// Patient requirement is relaxed for technical break (Mandates 8e, 8n)
			assert.ok(
				content.includes("Пациент {isTechnicalBreak ? \"(не требуется)\" : \"*\"}"),
				"Patient label must adapt during technical break",
			);
			assert.ok(
				content.includes("if (!effectivePatientId && !isTechnicalBreak)"),
				"Save logic must allow null patientId for technical breaks",
			);
		});
	});

	describe("3. PatientCardModal.tsx & PatientGeneralInfoTab.tsx Legal Representative Selection", () => {
		it("3.1 PatientCardModal exports STOMX_REPRESENTATIVE_CATALOG and getRepresentativeLegalStatus", () => {
			assert.ok(Array.isArray(MODAL_REPRESENTATIVE_CATALOG), "MODAL_REPRESENTATIVE_CATALOG must be an array");
			assert.equal(MODAL_REPRESENTATIVE_CATALOG.length, 14);

			// Test statutory legal status helper for mother
			const motherStatus = getRepresentativeLegalStatus("Мать");
			assert.equal(motherStatus.isLegalRepresentative, true);
			assert.equal(motherStatus.idsSigningAllowed, true);
			assert.ok(motherStatus.descriptionRu.includes("323-ФЗ"));

			// Test statutory legal status helper for father
			const fatherStatus = getRepresentativeLegalStatus("Отец");
			assert.equal(fatherStatus.isLegalRepresentative, true);
			assert.equal(fatherStatus.idsSigningAllowed, true);

			// Test statutory legal status helper for guardian
			const guardianStatus = getRepresentativeLegalStatus("Опекун");
			assert.equal(guardianStatus.isLegalRepresentative, true);
			assert.equal(guardianStatus.idsSigningAllowed, true);

			// Test non-statutory family member (husband/wife/brother)
			const brotherStatus = getRepresentativeLegalStatus("Брат");
			assert.equal(brotherStatus.isLegalRepresentative, false);
			assert.equal(brotherStatus.idsSigningAllowed, false);
			assert.ok(brotherStatus.descriptionRu.includes("доверенност"));
		});

		it("3.2 isStatutoryLegalRepresentative accurately checks statutory rights by СК РФ ст. 64 and 323-ФЗ", () => {
			// True for statutory representatives
			assert.equal(isStatutoryLegalRepresentative("mother"), true);
			assert.equal(isStatutoryLegalRepresentative("father"), true);
			assert.equal(isStatutoryLegalRepresentative("parent"), true);
			assert.equal(isStatutoryLegalRepresentative("guardian"), true);
			assert.equal(isStatutoryLegalRepresentative("curator"), true);
			assert.equal(isStatutoryLegalRepresentative("adoptive_parent"), true);
			assert.equal(isStatutoryLegalRepresentative("authorized_representative"), true);

			// False for other relatives without unconditional statutory rights
			assert.equal(isStatutoryLegalRepresentative("husband"), false);
			assert.equal(isStatutoryLegalRepresentative("wife"), false);
			assert.equal(isStatutoryLegalRepresentative("son"), false);
			assert.equal(isStatutoryLegalRepresentative("daughter"), false);
			assert.equal(isStatutoryLegalRepresentative("brother"), false);
			assert.equal(isStatutoryLegalRepresentative("sister"), false);
			assert.equal(isStatutoryLegalRepresentative("other"), false);
		});

		it("3.3 PatientGeneralInfoTab.tsx contains chips and IDS signing rights badge (ст. 20 323-ФЗ)", () => {
			const tabPath = path.resolve(__dirname, "../../patient/tabs/PatientGeneralInfoTab.tsx");
			assert.ok(fs.existsSync(tabPath), "PatientGeneralInfoTab.tsx must exist");
			const content = fs.readFileSync(tabPath, "utf-8");

			// Renders representative chips
			assert.ok(content.includes("chip-representative-"), "Must include chip-representative- testids");
			assert.ok(content.includes("min-h-[44px]"), "Representative chips must have min-h-[44px]");

			// Renders automatic statutory legal status notice & badge
			assert.ok(
				content.includes('data-testid="representative-ids-signing-badge"'),
				"Must include representative-ids-signing-badge",
			);
			assert.ok(
				content.includes("323-ФЗ"),
				"Must cite Federal Law 323-ФЗ for IDS signing rights",
			);
			assert.ok(
				content.includes("64 СК РФ"),
				"Must cite Russian Family Code art. 64 for statutory representatives",
			);
		});

		it("3.4 Re-export bridge in components/patients/PatientCardModal.tsx resolves cleanly", () => {
			const patientsBridgePath = path.resolve(__dirname, "../../patients/PatientCardModal.tsx");
			assert.ok(fs.existsSync(patientsBridgePath), "components/patients/PatientCardModal.tsx must exist");
			const bridgeContent = fs.readFileSync(patientsBridgePath, "utf-8");
			assert.ok(bridgeContent.includes('export * from "../patient/PatientCardModal"'));
		});
	});
});
