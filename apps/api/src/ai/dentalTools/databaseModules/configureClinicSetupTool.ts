/**
 * configureClinicSetupTool.ts — Автономная экспресс-настройка клиники под ключ.
 * Мандаты: 8b (<= 120 строк), 8e (2-фазный Guard), 8n (соло-врач), 8x (живой язык).
 */

import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { clinics, organizations } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { provisionChairs, provisionDoctorsAndShifts, provisionInitialServices, provisionKkm } from "./clinicSetupProvisioner.js";
import { type ConfigureClinicSetupInput, configureClinicSetupSchema } from "./clinicSetupTypes.js";

export * from "./clinicSetupTypes.js";
export * from "./clinicSetupServices.js";

function toCanonicalClinicSchedule(schedule: {
	startHour: number;
	endHour: number;
	workDays: number[];
}) {
	const padHour = (h: number) => `${String(Math.max(0, Math.min(23, Math.trunc(h)))).padStart(2, "0")}:00`;
	return {
		workdayStart: padHour(schedule.startHour),
		workdayEnd: schedule.endHour >= 24 ? "23:59" : padHour(schedule.endHour),
		workingDays: schedule.workDays,
		appointmentBufferMinutes: 10,
	};
}

export async function handleConfigureClinicSetup(args: ConfigureClinicSetupInput, context: DentalToolContext) {
	const parsedArgs = configureClinicSetupSchema.parse(args);
	const orgId = context.organizationId;
	const now = new Date();

	let calculatedMode = parsedArgs.clinicMode;
	if (!calculatedMode) {
		if (parsedArgs.chairsCount <= 1 && parsedArgs.doctors.length <= 1) calculatedMode = "solo_doctor";
		else if (parsedArgs.chairsCount === 1) calculatedMode = "one_chair";
		else if (parsedArgs.chairsCount <= 4) calculatedMode = "small_clinic";
		else calculatedMode = "network_clinic";
	}

	return await withTenantCtx(orgId, async (tx) => {
		await tx
			.update(organizations)
			.set({
				name: parsedArgs.clinicName,
				legalAddress: parsedArgs.legalAddress ?? null,
				inn: parsedArgs.inn ?? null,
				kpp: parsedArgs.kpp ?? null,
				ogrn: parsedArgs.ogrn ?? null,
				email: parsedArgs.email ?? null,
				clinicMode: calculatedMode,
				clinicSchedule: toCanonicalClinicSchedule(parsedArgs.schedule),
				workspaceFeatureFlags: { schedule: true, emr: true, billing: true, imaging: true, kkm: true, inventory: true, analytics: true },
				updatedAt: now,
			})
			.where(eq(organizations.id, orgId));

		let targetClinicId: string;
		const existingClinics = await tx.select().from(clinics).where(eq(clinics.organizationId, orgId)).limit(1);
		if (existingClinics.length > 0 && existingClinics[0]) {
			targetClinicId = existingClinics[0].id;
			await tx.update(clinics).set({ name: parsedArgs.clinicName, address: parsedArgs.legalAddress ?? null, phone: parsedArgs.phone ?? null, timezone: parsedArgs.schedule.timezone }).where(eq(clinics.id, targetClinicId));
		} else {
			const [c] = await tx.insert(clinics).values({ organizationId: orgId, name: parsedArgs.clinicName, address: parsedArgs.legalAddress ?? null, phone: parsedArgs.phone ?? null, timezone: parsedArgs.schedule.timezone }).returning({ id: clinics.id });
			if (!c) {
				throw new Error("Не удалось инициализировать профиль клиники");
			}
			targetClinicId = c.id;
		}

		const createdChairs = await provisionChairs(tx, orgId, targetClinicId, parsedArgs.chairsCount, parsedArgs.chairNames, parsedArgs.schedule);
		const { createdDoctors, createdShifts } = await provisionDoctorsAndShifts(tx, orgId, parsedArgs.doctors, parsedArgs.schedule, createdChairs);

		let servicesAddedCount = 0;
		if (parsedArgs.activateStandardPricelist) {
			servicesAddedCount = await provisionInitialServices(tx, orgId);
		}

		const configuredKkmModel = await provisionKkm(tx, orgId, parsedArgs.kkmSettings, now);

		return {
			success: true,
			clinicName: parsedArgs.clinicName,
			clinicMode: calculatedMode,
			chairsConfigured: createdChairs.length,
			doctorsRegistered: createdDoctors.length,
			shiftsScheduled: createdShifts.length,
			servicesActivated: servicesAddedCount,
			cashRegisterConfigured: { model: configuredKkmModel, active: parsedArgs.kkmSettings?.kkmActive, port: parsedArgs.kkmSettings?.defaultPort },
			message: `Клиника '${parsedArgs.clinicName}' успешно настроена под ключ: создано ${createdChairs.length} кресел, ${createdDoctors.length} врачей, ${createdShifts.length} смен, ${servicesAddedCount} услуг и подключена касса ${configuredKkmModel}.`,
		};
	});
}

export const configureClinicSetupTool: DentalToolEntry<typeof configureClinicSetupSchema> = {
	name: "configure_clinic_setup",
	description: "Автономная настройка клиники под ключ: создание кабинетов и кресел, регистрация врачей, расписание смен, каталог услуг и касса.",
	schema: configureClinicSetupSchema,
	destructive: true,
	titleRu: "Автономная настройка клиники под ключ",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("configure_clinic_setup", "Автономная экспресс-настройка профиля клиники, кресел, врачей, смен, прайс-листа и кассы.", configureClinicSetupSchema),
	handler: handleConfigureClinicSetup,
};
