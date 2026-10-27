/**
 * clinicSetupProvisioner.ts — Провайдинг кресел, врачей, смен и кассы при настройке клиники.
 * Мандаты: 8b (<= 120 строк), 8n (соло-практика), 8e (автономия врача).
 */

import { and, eq } from "drizzle-orm";
import { cashBoxes, chairs, doctorShiftRosters, serviceCatalogItems, services, users } from "../../../db/schema.js";
import { STANDARD_INITIAL_SERVICES } from "./clinicSetupServices.js";
import type { ConfigureClinicSetupInput } from "./clinicSetupTypes.js";

type DbClient = any;

export async function provisionChairs(activeDb: DbClient, orgId: string, clinicId: string, count: number, names?: string[], schedule?: unknown) {
	const created: Array<{ id: string; name: string }> = [];
	for (let i = 0; i < count; i++) {
		const defaultName = names?.[i] || (i === 0 ? "Кабинет 1 (Терапия)" : i === 1 ? "Кабинет 2 (Хирургия / Имплантация)" : i === 2 ? "Кабинет 3 (Ортопедия / Ортодонтия)" : `Кабинет ${i + 1}`);
		const [chair] = await activeDb.insert(chairs).values({ organizationId: orgId, clinicId, name: defaultName, isActive: true, workingHours: schedule }).returning({ id: chairs.id, name: chairs.name });
		created.push(chair);
	}
	return created;
}

export async function provisionDoctorsAndShifts(activeDb: DbClient, orgId: string, doctorsList: ConfigureClinicSetupInput["doctors"], schedule: any, createdChairs: Array<{ id: string; name: string }>) {
	const createdDocs: Array<{ id: string; fullName: string; specialty: string }> = [];
	for (const doc of doctorsList) {
		const [u] = await activeDb.insert(users).values({ organizationId: orgId, fullName: doc.fullName, role: "doctor", phone: doc.phone ?? null, email: doc.email ?? null, isActive: true }).returning({ id: users.id, fullName: users.fullName });
		createdDocs.push({ id: u.id, fullName: u.fullName, specialty: doc.specialty });
	}

	const createdShifts: Array<{ date: string; doctorName: string; time: string }> = [];
	const today = new Date();
	const startHourStr = String(schedule.startHour).padStart(2, "0") + ":00";
	const endHourStr = String(schedule.endHour).padStart(2, "0") + ":00";

	for (let offset = 0; offset < 7; offset++) {
		const dateObj = new Date(today.getTime() + offset * 86400000);
		if (schedule.workDays.includes(dateObj.getDay())) {
			const dateIso = dateObj.toISOString().slice(0, 10);
			for (let dIdx = 0; dIdx < createdDocs.length; dIdx++) {
				const doc = createdDocs[dIdx];
				const assignedChair = createdChairs[dIdx % createdChairs.length];
				if (!doc || !assignedChair) continue;
				await activeDb.insert(doctorShiftRosters).values({ organizationId: orgId, doctorId: doc.id, doctorName: doc.fullName, chairId: assignedChair.id, dateIso, startTime: startHourStr, endTime: endHourStr, role: "doctor", specialty: doc.specialty });
				createdShifts.push({ date: dateIso, doctorName: doc.fullName, time: `${startHourStr} - ${endHourStr}` });
			}
		}
	}
	return { createdDoctors: createdDocs, createdShifts };
}

export async function provisionInitialServices(activeDb: DbClient, orgId: string): Promise<number> {
	let count = 0;
	for (const s of STANDARD_INITIAL_SERVICES) {
		const existing = await activeDb.select().from(serviceCatalogItems).where(and(eq(serviceCatalogItems.organizationId, orgId), eq(serviceCatalogItems.code, s.code))).limit(1);
		if (existing.length === 0) {
			await activeDb.insert(serviceCatalogItems).values({ organizationId: orgId, code: s.code, title: s.title, category: s.category, specialty: s.specialty, basePriceRub: s.priceRub, priceRub: s.priceRub, durationMinutes: s.durationMinutes, order804nCode: s.code, taxDeductible: true, isActive: true });
			await activeDb.insert(services).values({ organizationId: orgId, code: s.code, title: s.title, category: s.category, specialty: s.specialty, basePriceRub: s.priceRub, durationMinutes: s.durationMinutes, taxDeductible: true });
			count++;
		}
	}
	return count;
}

export async function provisionKkm(activeDb: DbClient, orgId: string, kkm: ConfigureClinicSetupInput["kkmSettings"], now: Date) {
	const existing = await activeDb.select().from(cashBoxes).where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main"))).limit(1);
	if (existing.length > 0) {
		await activeDb.update(cashBoxes).set({ kkmModel: kkm?.model, kkmActive: kkm?.kkmActive, updatedAt: now }).where(eq(cashBoxes.id, existing[0].id));
	} else {
		await activeDb.insert(cashBoxes).values({ organizationId: orgId, name: "Основная касса ККМ", type: "main", isMain: true, isCashless: false, balanceRub: 0, kkmModel: kkm?.model, kkmSerialNumber: `ATOL-${Date.now().toString().slice(-6)}`, kkmActive: kkm?.kkmActive });
	}
	return kkm?.model ?? "ATOL 25F / 30F USB";
}
