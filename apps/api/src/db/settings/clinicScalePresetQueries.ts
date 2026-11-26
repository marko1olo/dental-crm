import type { ClinicMode, ClinicSettings, SovereignScalePresetId } from "@dental/shared";
import { and, asc, eq } from "drizzle-orm";
import { applyClinicScalePreset as applyClinicScalePresetInMemory } from "../../sampleData.js";
import { type TenantDb, withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import { getClinicSettingsFromDb } from "./clinicProfileQueries.js";
import { useInMemory } from "./types.js";

const SCALE_PRESET_SPECS: Record<
	SovereignScalePresetId,
	{
		mode: ClinicMode;
		flags: Record<string, unknown>;
		schedule: Record<string, unknown>;
	}
> = {
	solo_doctor: {
		mode: "solo_doctor",
		flags: {
			hasAssistants: false,
			hasMultipleChairs: false,
			hasDentalLab: false,
			hasInsuranceCoPay: false,
			hasInstallments: true,
			hasOrthodontics: false,
			hasTasks: false,
			hasReclamations: false,
			hasPediatricMode: false,
			isOmniRole: true,
			workspacePreset: "solo_therapist",
			onboardingCompleted: true,
			hasPayrollModule: false,
			hasMarketingModule: false,
			hasAnalyticsModule: false,
			hasInventoryModule: false,
			hasGnathology: false,
			hasCsoScanner: false,
			hasLeadsKanban: false,
			hasOmnichannel: false,
			hasEngineeringStatus: false,
			hasClinicalRules: false,
			hasReferralModule: false,
			hasBpmWorkflows: false,
			numberOfDoctors: 1,
			aiEnableTreatmentPlan: true,
			aiEnableRecommendations: true,
			aiEnableDocuments: true,
		},
		schedule: {
			workdayStart: "09:00",
			workdayEnd: "18:00",
			workingDays: [1, 2, 3, 4, 5],
			appointmentBufferMinutes: 10,
			defaultVisitMinutes: 30,
		},
	},
	standard_clinic: {
		mode: "small_clinic",
		flags: {
			hasAssistants: true,
			hasMultipleChairs: true,
			hasDentalLab: true,
			hasInsuranceCoPay: true,
			hasInstallments: true,
			hasOrthodontics: true,
			hasTasks: true,
			hasReclamations: true,
			hasPediatricMode: true,
			isOmniRole: false,
			workspacePreset: "family_clinic",
			onboardingCompleted: true,
			hasPayrollModule: true,
			hasMarketingModule: true,
			hasAnalyticsModule: true,
			hasInventoryModule: true,
			hasGnathology: false,
			hasCsoScanner: false,
			hasLeadsKanban: false,
			hasOmnichannel: true,
			hasEngineeringStatus: false,
			hasClinicalRules: true,
			hasReferralModule: true,
			hasBpmWorkflows: false,
			numberOfDoctors: 4,
			aiEnableTreatmentPlan: true,
			aiEnableRecommendations: true,
			aiEnableDocuments: true,
		},
		schedule: {
			workdayStart: "08:30",
			workdayEnd: "20:30",
			workingDays: [1, 2, 3, 4, 5, 6],
			appointmentBufferMinutes: 15,
			defaultVisitMinutes: 45,
		},
	},
	network_center: {
		mode: "network_clinic",
		flags: {
			hasAssistants: true,
			hasMultipleChairs: true,
			hasDentalLab: true,
			hasInsuranceCoPay: true,
			hasInstallments: true,
			hasOrthodontics: true,
			hasGnathology: true,
			hasTasks: true,
			hasReclamations: true,
			hasPediatricMode: true,
			isOmniRole: false,
			workspacePreset: "enterprise",
			onboardingCompleted: true,
			hasPayrollModule: true,
			hasMarketingModule: true,
			hasAnalyticsModule: true,
			hasInventoryModule: true,
			hasCsoScanner: true,
			hasLeadsKanban: true,
			hasOmnichannel: true,
			hasEngineeringStatus: true,
			hasClinicalRules: true,
			hasReferralModule: true,
			hasBpmWorkflows: true,
			numberOfDoctors: 10,
			aiEnableTreatmentPlan: true,
			aiEnableRecommendations: true,
			aiEnableDocuments: true,
		},
		schedule: {
			workdayStart: "08:00",
			workdayEnd: "21:00",
			workingDays: [1, 2, 3, 4, 5, 6, 7],
			appointmentBufferMinutes: 15,
			defaultVisitMinutes: 60,
		},
	},
};

const STANDARD_CHAIRS = [
	{ name: "Кабинет терапии (Кресло 1)", spec: "therapist", eq: "Кабинет: 1, рентген" },
	{ name: "Кабинет хирургии (Кресло 2)", spec: "surgeon", eq: "Кабинет: 2, хирургия, рентген" },
	{ name: "Кабинет ортопедии (Кресло 3)", spec: "orthopedist", eq: "Кабинет: 3, микроскоп" },
];

const NETWORK_CHAIRS = [
	{ name: "Кабинет терапии №1", spec: "therapist", eq: "Кабинет: 101, рентген" },
	{ name: "Кабинет терапии №2", spec: "therapist", eq: "Кабинет: 102, микроскоп" },
	{ name: "Хирургия и имплантация", spec: "surgeon", eq: "Кабинет: 103, хирургия, рентген" },
	{ name: "Ортопедия и гнатология", spec: "orthopedist", eq: "Кабинет: 104, микроскоп" },
	{ name: "Детское отделение", spec: "pediatric", eq: "Кабинет: 105, детство" },
];

/**
 * Атомарное применение суверенного пресета масштаба в базе данных (PostgreSQL 18).
 */
export async function applyClinicScalePresetInDb(
	organizationId: string,
	preset: SovereignScalePresetId,
	_confirmResetExtraChairs?: boolean,
	externalTx?: TenantDb | undefined,
): Promise<ClinicSettings> {
	if (useInMemory()) {
		return applyClinicScalePresetInMemory(preset);
	}

	const spec = SCALE_PRESET_SPECS[preset] ?? SCALE_PRESET_SPECS.network_center;

	const run = async (tx: TenantDb): Promise<ClinicSettings> => {
		const [org] = await tx
			.select()
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
		if (!org) {
			throw new Error("Организация не найдена в базе данных.");
		}

		const [clinic] = await tx
			.select()
			.from(schema.clinics)
			.where(eq(schema.clinics.organizationId, organizationId))
			.limit(1);

		const existingFlags =
			(org.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
		const targetFlags = { ...existingFlags, ...spec.flags };

		await tx
			.update(schema.organizations)
			.set({
				clinicMode: spec.mode,
				workspaceFeatureFlags: targetFlags,
				clinicSchedule: spec.schedule,
				updatedAt: new Date(),
			})
			.where(eq(schema.organizations.id, organizationId));

		const currentChairs = await tx
			.select()
			.from(schema.chairs)
			.where(eq(schema.chairs.organizationId, organizationId))
			.orderBy(asc(schema.chairs.name));

		const clinicId = clinic?.id;
		const activeLimit = preset === "solo_doctor" ? 1 : preset === "standard_clinic" ? 3 : 5;
		const presets = preset === "standard_clinic" ? STANDARD_CHAIRS : NETWORK_CHAIRS;

		for (let i = 0; i < currentChairs.length; i++) {
			const chair = currentChairs[i];
			if (!chair) continue;
			const shouldActivate = preset === "network_center" ? i < 5 || chair.isActive : i < activeLimit;
			if (preset === "network_center" && i >= 5) continue;
			await tx
				.update(schema.chairs)
				.set({ isActive: shouldActivate })
				.where(
					and(
						eq(schema.chairs.id, chair.id),
						eq(schema.chairs.organizationId, organizationId),
					),
				);
		}

		if (clinicId && preset === "solo_doctor" && currentChairs.length === 0) {
			await tx.insert(schema.chairs).values({
				organizationId,
				clinicId,
				name: "Основное кресло",
				specializations: "universal",
				equipment: "Кабинет: Кабинет 1, рентген",
				isActive: true,
			});
		} else if (clinicId && preset !== "solo_doctor") {
			for (let i = currentChairs.length; i < activeLimit; i++) {
				const cfg = presets[i] ?? {
					name: `Кресло ${i + 1}`,
					spec: "universal",
					eq: `Кабинет: ${i + 1}`,
				};
				await tx.insert(schema.chairs).values({
					organizationId,
					clinicId,
					name: cfg.name,
					specializations: cfg.spec,
					equipment: cfg.eq,
					isActive: true,
				});
			}
		}

		return getClinicSettingsFromDb(organizationId, tx);
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}
