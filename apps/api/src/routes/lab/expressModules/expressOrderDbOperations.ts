import crypto from "node:crypto";
import { normalizeVitaShade, VALID_FDI_TOOTH_NUMBERS } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { labItems, labOrders, patients, users } from "../../../db/schema.js";

export interface ExpressOrderDbParams {
	orgId: string;
	patientId: string;
	doctorId?: string | null | undefined;
	teethFdiStr: string;
	materialName: string;
	colorVita: string;
	dueDate: Date;
	priceRub: number;
	labCostRub?: number | null | undefined;
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
				labCostRub: params.labCostRub ?? null,
				status: "draft",
			})
			.returning();

		if (!createdOrder) {
			throw new Error("Не удалось создать заказ ЗТЛ: запись не возвращена базой данных.");
		}

		if (params.teethFdiStr) {
			const parts = params.teethFdiStr.split(/[\s,;-]+/).filter(Boolean);
			const validTeeth = parts
				.map((p) => Number.parseInt(p, 10))
				.filter((num) => !Number.isNaN(num) && VALID_FDI_TOOTH_NUMBERS.has(num));

			if (validTeeth.length > 0) {
				const pricePerTooth = params.priceRub / validTeeth.length;
				for (const toothNum of validTeeth) {
					await tx.insert(labItems).values({
						organizationId: params.orgId,
						labOrderId: createdOrder.id,
						toothFdi: toothNum,
						restorationType: "crown_monolithic",
						material: params.materialName || "zirconia_multilayer_gradient",
						shadeSystem: "VITA_CLASSICAL",
						shadeFinal: normalizeVitaShade(params.colorVita),
						priceRub: String(pricePerTooth.toFixed(2)),
					});
				}
			}
		}

		return { kind: "ok", order: createdOrder, patientName: patient.fullName } as ExpressDbResult;
	});
}
