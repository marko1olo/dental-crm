/**
 * @file organizationMutations.ts
 * @description Layer 3: Clinic settings, mode, scale presets and chair mutations.
 */
import { randomUUID } from "node:crypto";
import { recordAuditEvent } from "./audit.js";
import { organizationId, chairId } from "./fixtureIds.js";
import { normalizeStaffWorkingHours } from "./staff.js";


import type {
	Chair,
	ClinicMode,
	ClinicProfile,
	ClinicSettings,
	CreateChairInput,
	SovereignScalePresetId,
	UpdateChairWorkingHoursInput,
	UpdateClinicProfileInput,
} from "@dental/shared";
import {
	chairs,
	clinicProfile,
	defaultClinicScheduleDefaults,
	normalizeClinicScheduleDefaults,
	normalizeDateOnlyInput,
} from "./organizations.js";
import {
	assertChairWorkingHoursCoverExistingAppointments,
	assertClinicScheduleDefaultsCoverExistingAppointments,
} from "./scheduleValidation.js";
import { assertValidScheduleTimeZone } from "./scheduleTimeHelpers.js";
import { buildClinicSettings } from "./dashboard.js";
import { persistMutableState } from "./stateNotifier.js";
import { nullableTrimmed, type UpdateChairProfileInput } from "./types.js";

export function updateClinicMode(mode: ClinicMode): ClinicSettings {
	const currentModePreset =
		clinicProfile.mode === "solo_doctor"
			? 60
			: clinicProfile.mode === "network_clinic"
				? 30
				: 45;
	const nextModePreset =
		mode === "solo_doctor" ? 60 : mode === "network_clinic" ? 30 : 45;
	const shouldApplyModePreset =
		clinicProfile.defaultVisitMinutes === currentModePreset;
	clinicProfile.mode = mode;
	clinicProfile.networkEnabled = mode === "network_clinic";
	if (shouldApplyModePreset) clinicProfile.defaultVisitMinutes = nextModePreset;
	clinicProfile.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "clinic_profile",
		entityId: organizationId,
		action: "clinic_mode_updated",
		reason: `Режим клиники изменен на ${mode}.`,
	});
	return buildClinicSettings();
}

export function applyClinicScalePreset(
	preset: SovereignScalePresetId,
): ClinicSettings {
	if (preset === "solo_doctor") {
		clinicProfile.mode = "solo_doctor";
		clinicProfile.networkEnabled = false;
		clinicProfile.defaultVisitMinutes = 30;
		clinicProfile.hasAssistants = false;
		clinicProfile.hasMultipleChairs = false;
		clinicProfile.hasDentalLab = false;
		clinicProfile.hasInsuranceCoPay = false;
		clinicProfile.hasInstallments = true;
		clinicProfile.hasOrthodontics = false;
		clinicProfile.hasTasks = false;
		clinicProfile.hasReclamations = false;
		clinicProfile.hasPediatricMode = false;
		clinicProfile.isOmniRole = true;
		clinicProfile.workspacePreset = "solo_therapist";
		clinicProfile.onboardingCompleted = true;
		clinicProfile.hasPayrollModule = false;
		clinicProfile.hasMarketingModule = false;
		clinicProfile.hasAnalyticsModule = false;
		clinicProfile.hasInventoryModule = false;
		clinicProfile.hasGnathology = false;
		clinicProfile.hasCsoScanner = false;
		clinicProfile.hasLeadsKanban = false;
		clinicProfile.hasOmnichannel = false;
		clinicProfile.hasEngineeringStatus = false;
		clinicProfile.hasClinicalRules = false;
		clinicProfile.numberOfDoctors = 1;

		if (chairs.length === 0) {
			chairs.push({
				id: chairId,
				organizationId,
				name: "Основное кресло",
				room: "Кабинет 1",
				specialization: "universal",
				active: true,
				hasXraySensor: true,
				hasMicroscope: false,
				hasSurgeryKit: false,
				notes: "Основное кресло врача",
				workingHours: null,
			});
		} else {
			chairs[0]!.active = true;
			for (let i = 1; i < chairs.length; i++) {
				chairs[i]!.active = false;
			}
		}
	} else if (preset === "standard_clinic") {
		clinicProfile.mode = "small_clinic";
		clinicProfile.networkEnabled = false;
		clinicProfile.defaultVisitMinutes = 45;
		clinicProfile.hasAssistants = true;
		clinicProfile.hasMultipleChairs = true;
		clinicProfile.hasDentalLab = true;
		clinicProfile.hasInsuranceCoPay = true;
		clinicProfile.hasInstallments = true;
		clinicProfile.hasOrthodontics = true;
		clinicProfile.hasTasks = true;
		clinicProfile.hasReclamations = true;
		clinicProfile.hasPediatricMode = true;
		clinicProfile.isOmniRole = false;
		clinicProfile.workspacePreset = "family_clinic";
		clinicProfile.onboardingCompleted = true;
		clinicProfile.hasPayrollModule = true;
		clinicProfile.hasMarketingModule = true;
		clinicProfile.hasAnalyticsModule = true;
		clinicProfile.hasInventoryModule = true;
		clinicProfile.hasGnathology = false;
		clinicProfile.hasCsoScanner = false;
		clinicProfile.hasLeadsKanban = false;
		clinicProfile.hasOmnichannel = true;
		clinicProfile.hasClinicalRules = true;
		clinicProfile.numberOfDoctors = 4;

		for (let i = 0; i < Math.min(chairs.length, 3); i++) {
			chairs[i]!.active = true;
		}
		while (chairs.length < 3) {
			const idx = chairs.length + 1;
			chairs.push({
				id: randomUUID(),
				organizationId,
				name: `Кресло ${idx}`,
				room: `Кабинет ${idx}`,
				specialization:
					idx === 2 ? "surgeon" : idx === 3 ? "orthopedist" : "therapist",
				active: true,
				hasXraySensor: true,
				hasMicroscope: idx === 3,
				hasSurgeryKit: idx === 2,
				notes: null,
				workingHours: null,
			});
		}
	} else {
		clinicProfile.mode = "network_clinic";
		clinicProfile.networkEnabled = true;
		clinicProfile.defaultVisitMinutes = 60;
		clinicProfile.hasAssistants = true;
		clinicProfile.hasMultipleChairs = true;
		clinicProfile.hasDentalLab = true;
		clinicProfile.hasInsuranceCoPay = true;
		clinicProfile.hasInstallments = true;
		clinicProfile.hasOrthodontics = true;
		clinicProfile.hasGnathology = true;
		clinicProfile.hasTasks = true;
		clinicProfile.hasReclamations = true;
		clinicProfile.hasPediatricMode = true;
		clinicProfile.isOmniRole = false;
		clinicProfile.workspacePreset = "enterprise";
		clinicProfile.onboardingCompleted = true;
		clinicProfile.hasPayrollModule = true;
		clinicProfile.hasMarketingModule = true;
		clinicProfile.hasAnalyticsModule = true;
		clinicProfile.hasInventoryModule = true;
		clinicProfile.hasCsoScanner = true;
		clinicProfile.hasLeadsKanban = true;
		clinicProfile.hasOmnichannel = true;
		clinicProfile.hasClinicalRules = true;
		clinicProfile.hasEngineeringStatus = true;
		clinicProfile.numberOfDoctors = 10;

		for (let i = 0; i < Math.min(chairs.length, 5); i++) {
			chairs[i]!.active = true;
		}
		while (chairs.length < 5) {
			const idx = chairs.length + 1;
			chairs.push({
				id: randomUUID(),
				organizationId,
				name: `Кресло ${idx}`,
				room: `Кабинет ${idx}`,
				specialization: "universal",
				active: true,
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: true,
				notes: null,
				workingHours: null,
			});
		}
	}

	clinicProfile.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "clinic_profile",
		entityId: organizationId,
		action: "clinic_scale_preset_applied",
		reason: `Применен суверенный пресет масштаба: ${preset}.`,
	});
	return buildClinicSettings();
}

export function updateClinicProfile(
	input: UpdateClinicProfileInput,
): ClinicSettings {
	const nextTimezone =
		input.timezone !== undefined
			? input.timezone.trim()
			: clinicProfile.timezone;
	if (input.timezone !== undefined) assertValidScheduleTimeZone(nextTimezone);
	if (input.scheduleDefaults !== undefined || input.timezone !== undefined) {
		assertClinicScheduleDefaultsCoverExistingAppointments(
			normalizeClinicScheduleDefaults(
				input.scheduleDefaults ?? clinicProfile.scheduleDefaults,
			),
			nextTimezone,
		);
	}
	if (input.clinicName !== undefined)
		clinicProfile.clinicName = input.clinicName.trim();
	if (input.legalName !== undefined)
		clinicProfile.legalName = nullableTrimmed(input.legalName);
	if (input.inn !== undefined) clinicProfile.inn = nullableTrimmed(input.inn);
	if (input.kpp !== undefined) clinicProfile.kpp = nullableTrimmed(input.kpp);
	if (input.ogrn !== undefined)
		clinicProfile.ogrn = nullableTrimmed(input.ogrn);
	if (input.address !== undefined)
		clinicProfile.address = nullableTrimmed(input.address);
	if (input.phone !== undefined)
		clinicProfile.phone = nullableTrimmed(input.phone);
	if (input.email !== undefined)
		clinicProfile.email = nullableTrimmed(input.email);
	if (input.website !== undefined)
		clinicProfile.website = nullableTrimmed(input.website);
	if (input.medicalLicenseNumber !== undefined) {
		clinicProfile.medicalLicenseNumber = nullableTrimmed(
			input.medicalLicenseNumber,
		);
	}
	if (input.medicalLicenseIssuedAt !== undefined) {
		clinicProfile.medicalLicenseIssuedAt = nullableTrimmed(
			input.medicalLicenseIssuedAt,
		);
	}
	if (input.medicalLicenseIssuer !== undefined) {
		clinicProfile.medicalLicenseIssuer = nullableTrimmed(
			input.medicalLicenseIssuer,
		);
	}
	if (input.bankDetails !== undefined)
		clinicProfile.bankDetails = nullableTrimmed(input.bankDetails);
	if (input.signatoryName !== undefined)
		clinicProfile.signatoryName = nullableTrimmed(input.signatoryName);
	if (input.signatoryTitle !== undefined)
		clinicProfile.signatoryTitle = nullableTrimmed(input.signatoryTitle);
	if (input.timezone !== undefined) clinicProfile.timezone = nextTimezone;
	if (input.defaultVisitMinutes !== undefined)
		clinicProfile.defaultVisitMinutes = input.defaultVisitMinutes;
	if (input.scheduleDefaults !== undefined)
		clinicProfile.scheduleDefaults = normalizeClinicScheduleDefaults(
			input.scheduleDefaults,
		);
	if (input.egiszEnabled !== undefined)
		clinicProfile.egiszEnabled = input.egiszEnabled;
	if (input.logoUrl !== undefined)
		clinicProfile.logoUrl = nullableTrimmed(input.logoUrl);
	if (input.stampUrl !== undefined)
		clinicProfile.stampUrl = nullableTrimmed(input.stampUrl);
	clinicProfile.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "clinic_profile",
		entityId: organizationId,
		action: "clinic_profile_updated",
		reason:
			"Юридические, контактные и профильные поля клиники обновлены из настройки первого запуска.",
	});
	return buildClinicSettings();
}


export function createChair(input: CreateChairInput): Chair {
	const chair: Chair = {
		id: randomUUID(),
		organizationId,
		name: input.name.trim(),
		room: nullableTrimmed(input.room),
		specialization: input.specialization ?? null,
		active: true,
		hasXraySensor: input.hasXraySensor,
		hasMicroscope: input.hasMicroscope,
		hasSurgeryKit: input.hasSurgeryKit,
		notes: nullableTrimmed(input.notes),
		workingHours: normalizeStaffWorkingHours(input.workingHours ?? null),
	};
	chairs.unshift(chair);
	recordAuditEvent({
		entityType: "chair",
		entityId: chair.id,
		action: "chair_created",
		reason: `${chair.name} добавлено в конфигурацию клиники.`,
	});
	return chair;
}

export function updateChairWorkingHours(
	chairId: string,
	input: UpdateChairWorkingHoursInput,
): Chair {
	const chair = chairs.find((item) => item.id === chairId);
	if (!chair) {
		throw new Error("Кресло не найдено.");
	}
	const workingHours = normalizeStaffWorkingHours(input.workingHours);
	assertChairWorkingHoursCoverExistingAppointments(chair, workingHours);
	chair.workingHours = workingHours;
	recordAuditEvent({
		entityType: "chair",
		entityId: chair.id,
		action: "chair_working_hours_updated",
		reason: `${chair.name}: рабочее расписание кабинета обновлено.`,
	});
	return chair;
}

/**
 * Поля карточки сотрудника, которые правит адрес PUT /api/settings/staff/:staffId.
 *
 * Расписание сюда намеренно не входит: у него отдельный адрес
 * /api/settings/staff/:staffId/working-hours, и только там есть проверка на
 * активные записи за пределами нового графика. Приняв расписание здесь, мы
 * обошли бы эту проверку и оставили приемы вне рабочего окна врача.
 */

export function updateChairProfile(
	chairId: string,
	input: UpdateChairProfileInput,
): Chair {
	const chair = chairs.find((item) => item.id === chairId);
	if (!chair) {
		throw new Error("Кресло не найдено.");
	}
	if (input.name !== undefined) chair.name = input.name.trim();
	if (input.active !== undefined) chair.active = input.active;
	recordAuditEvent({
		entityType: "chair",
		entityId: chair.id,
		action: "chair_profile_updated",
		reason: `${chair.name}: карточка кресла обновлена.`,
	});
	return chair;
}

/**
 * Мягкое отключение кресла: на chairs.id ссылаются приемы (appointments.chair_id),
 * поэтому строка не удаляется, а перестает быть активной. Уже назначенные
 * приемы остаются на месте и не теряют привязку к кабинету.
 */
export function deactivateChair(chairId: string): Chair {
	const chair = chairs.find((item) => item.id === chairId);
	if (!chair) {
		throw new Error("Кресло не найдено.");
	}
	chair.active = false;
	recordAuditEvent({
		entityType: "chair",
		entityId: chair.id,
		action: "chair_deactivated",
		reason: `${chair.name}: кресло отключено, существующие приемы сохранены.`,
	});
	return chair;
}

