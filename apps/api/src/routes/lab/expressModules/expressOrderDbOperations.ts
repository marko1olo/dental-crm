import crypto from "node:crypto";
import { normalizeVitaShade } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { labOrders, patients, users } from "../../../db/schema.js";

export interface ExpressOrderDbParams {
	orgId: string;
	patientId: string;
	doctorId?: string | null | undefined;
	teethFdiStr: string;
	materialName: string;
	colorVita: string;
	dueDate: Date;
	priceRub: number;
	specialInstructions?: string | null | undefined;
	isOneClickPreset?: boolean | undefined;
	construction: string;
	doctorClinicalOverride?: boolean | undefined;
	doctorOverrideReason?: string | null | undefined;
}

export type ExpressDbResult =
	| { kind: "patient_not_found" }
	| { kind: "ok"; order: typeof labOrders.$inferSelect; patientName: string };

export async function insertExpressLabOrder(params: ExpressOrderDbParams): Promise<ExpressDbResult> {
	return await withTenantCtx(params.orgId, async (tx) => {
		const [patient] = await tx
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.id, params.patientId), eq(patients.organizationId, params.orgId)))
			.limit(1);

		if (!patient) return { kind: "patient_not_found" };

		let doctorName: string | null = null;
		if (params.doctorId) {
			const [doctor] = await tx
				.select({ id: users.id, fullName: users.fullName })
				.from(users)
				.where(and(eq(users.id, params.doctorId), eq(users.organizationId, params.orgId)))
				.limit(1);
			if (doctor) doctorName = doctor.fullName;
		}

		const secureToken = crypto.randomUUID();

		let instructions = params.specialInstructions
			? params.specialInstructions
			: params.isOneClickPreset
				? "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней"
				: `Конструкция: ${params.construction}, цвет: ${params.colorVita}`;

		if (params.doctorClinicalOverride) {
			const overrideNote = `[Клиническое решение врача: ${params.doctorOverrideReason || "Аванс < 50% / Срочное изготовление по клиническим показаниям"}]`;
			instructions = `${instructions}\n${overrideNote}`;
		}

		const [createdOrder] = await tx
			.insert(labOrders)
			.values({
				organizationId: params.orgId,
				patientId: params.patientId,
				doctorId: params.doctorId ?? null,
				doctorName: doctorName ?? "Врач-ортопед",
				secureToken,
				toothFdi: params.teethFdiStr,
				material: params.materialName,
				colorVita: normalizeVitaShade(params.colorVita),
				dueDate: params.dueDate,
				clinicalNotes: instructions,
				priceRub: params.priceRub,
				status: "draft",
			})
			.returning();

		if (!createdOrder) {
			throw new Error("Не удалось создать заказ ЗТЛ: запись не возвращена базой данных.");
		}

		return { kind: "ok", order: createdOrder, patientName: patient.fullName } as ExpressDbResult;
	});
}
