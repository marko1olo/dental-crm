/**
 * labOrderTool.ts — Dental Laboratory Work Order Draft Tool for Dentalpin Agentic Core.
 *
 * Implements clinical.draft_lab_work_order:
 * - Category: 'write' (requires confirmation in supervised mode).
 * - Validates patient existence in organization.
 * - Validates tooth codes against FDI / ISO 3950 notation (11–48, 51–85).
 * - Generates cryptographically secure unique portal token.
 * - Inserts real record into `labOrders` in PostgreSQL with strict tenant isolation (`organizationId`).
 */

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { labOrders, patients, users } from "../../../db/schema.js";
import {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../clinical/Icd10ClinicalValidator.js";
import type { ToolDefinition } from "./tool.js";

// ─── PARAMETER SCHEMA ───────────────────────────────────────────────────────

export const draftLabWorkOrderSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("Уникальный идентификатор пациента"),
	toothCodes: z
		.array(z.union([z.number().int(), z.string()]))
		.min(1, "Укажите хотя бы один номер зуба FDI")
		.describe("Номера зубов по международной формуле FDI (например, [16, 17] или ['21', '22'])"),
	workType: z
		.string()
		.min(1, "Вид зуботехнической работы обязателен")
		.describe("Вид ортопедической/хирургической конструкции (Коронка, Винир, Мостовидный протез, Бюгель, Вкладка, Индивидуальный абатмент, Хирургический шаблон)"),
	material: z
		.string()
		.min(1, "Материал конструкции обязателен")
		.describe("Материал конструкции (Диоксид циркония ZrO2, E.max Press, Металлокерамика Co-Cr, PMMA, Титан, PEEK)"),
	vitaShade: z
		.string()
		.min(1, "Оттенок по шкале VITA обязателен")
		.describe("Оттенок по шкале VITA Classical / 3D-Master (например, A1, A2, A3, A3.5, B1, BL2, BL3)"),
	dueDate: z
		.string()
		.describe("Плановый срок готовности наряда ЗТЛ в формате ISO 8601 или ГГГГ-ММ-ДД"),
	laboratoryName: z
		.string()
		.optional()
		.describe("Наименование зуботехнической лаборатории (ЗТЛ)"),
	notes: z
		.string()
		.optional()
		.describe("Клинические указания врачу-технику (особенности препарирования, анатомия, окклюзия, контакты, уступ)"),
	doctorId: z
		.string()
		.uuid("Некорректный UUID врача")
		.optional()
		.describe("Идентификатор лечащего врача-ортопеда / хирурга"),
	priceRub: z
		.number()
		.min(0, "Стоимость не может быть отрицательной")
		.optional()
		.describe("Плановая себестоимость зуботехнического наряда в рублях"),
});

// ─── OUTPUT INTERFACE ──────────────────────────────────────────────────────

export interface DraftLabWorkOrderResult {
	readonly success: true;
	readonly orderId: string;
	readonly secureToken: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly doctorId: string | null;
	readonly doctorName: string | null;
	readonly toothCodes: readonly number[];
	readonly toothFdi: string;
	readonly workType: string;
	readonly material: string;
	readonly colorVita: string;
	readonly status: "draft";
	readonly dueDate: string;
	readonly laboratoryName: string | null;
	readonly clinicalNotes: string;
	readonly priceRub: number | null;
	readonly portalUrl: string;
	readonly createdAt: string;
}

// ─── FDI VALIDATOR HELPER ──────────────────────────────────────────────────

function parseAndValidateFdiTeeth(rawTeeth: (number | string)[]): number[] {
	const validTeeth: number[] = [];

	for (const raw of rawTeeth) {
		const num = typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10);
		if (Number.isNaN(num)) {
			throw new Error(`Некорректный номер зуба: '${raw}'. Номер должен быть целым числом по стандарту FDI.`);
		}

		const isPermanent = VALID_FDI_PERMANENT_TEETH.has(num);
		const isPrimary = VALID_FDI_PRIMARY_TEETH.has(num);

		if (!isPermanent && !isPrimary) {
			throw new Error(
				`Некорректный номер зуба FDI: ${num}. Допустимы номера 11–48 (постоянный прикус) или 51–85 (молочный прикус).`,
			);
		}

		validTeeth.push(num);
	}

	return validTeeth;
}

// ─── TOOL DEFINITION ────────────────────────────────────────────────────────

export const draftLabWorkOrderTool: ToolDefinition<typeof draftLabWorkOrderSchema> = {
	name: "draft_lab_work_order",
	description:
		"Создание черновика наряда-заказа в зуботехническую лабораторию (ЗТЛ) с привязкой к зубам FDI, материалу, оттенку VITA, срокам и генерацией защищенного портального токена. Категория: write (требует подтверждения в режиме supervised).",
	parameters: draftLabWorkOrderSchema,
	permissions: ["clinical.write"],
	category: "write",
	handler: async (ctx, args) => {
		// 1. Validate FDI Tooth Codes first
		const validatedTeeth = parseAndValidateFdiTeeth(args.toothCodes);
		const toothFdiString = validatedTeeth.join(", ");

		// 2. Validate Due Date format
		const dueTimestamp = new Date(args.dueDate);
		if (Number.isNaN(dueTimestamp.getTime())) {
			throw new Error(
				`Некорректный формат даты dueDate: '${args.dueDate}'. Ожидается ISO 8601 (например, 2026-09-15T18:00:00Z) или YYYY-MM-DD.`,
			);
		}

		const targetDb = ctx.db ?? db;

		// 3. Validate Patient in Clinic
		const [patient] = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден в вашей клинике.`);
		}

		// 3. Resolve Doctor if provided
		let doctorName: string | null = null;
		const targetDoctorId = args.doctorId || ctx.userId || null;

		if (targetDoctorId) {
			const [doctor] = await targetDb
				.select({
					id: users.id,
					fullName: users.fullName,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, ctx.organizationId),
						eq(users.id, targetDoctorId),
					),
				)
				.limit(1);

			if (doctor) {
				doctorName = doctor.fullName;
			}
		}

		// 5. Construct Clinical Notes
		const notesLines: string[] = [
			`Вид работы: ${args.workType}`,
			`Материал: ${args.material}`,
			`Оттенок VITA: ${args.vitaShade.toUpperCase()}`,
		];

		if (args.laboratoryName) {
			notesLines.push(`Лаборатория: ${args.laboratoryName}`);
		}

		if (args.notes) {
			notesLines.push(`Клинические указания: ${args.notes.trim()}`);
		}

		const fullClinicalNotes = notesLines.join("\n");
		const secureToken = crypto.randomUUID();

		// 6. Insert into database with strict tenant isolation
		const [createdOrder] = await targetDb
			.insert(labOrders)
			.values({
				organizationId: ctx.organizationId,
				patientId: args.patientId,
				doctorId: targetDoctorId,
				doctorName,
				secureToken,
				toothFdi: toothFdiString,
				material: args.material,
				colorVita: args.vitaShade.toUpperCase(),
				status: "draft",
				dueDate: dueTimestamp,
				clinicalNotes: fullClinicalNotes,
				priceRub: args.priceRub ?? null,
			})
			.returning();

		if (!createdOrder) {
			throw new Error("Не удалось создать заказ в зуботехническую лабораторию: база данных не вернула созданную запись.");
		}

		const result: DraftLabWorkOrderResult = {
			success: true,
			orderId: createdOrder.id,
			secureToken: createdOrder.secureToken,
			organizationId: createdOrder.organizationId,
			patientId: createdOrder.patientId,
			patientFullName: patient.fullName,
			doctorId: createdOrder.doctorId,
			doctorName: createdOrder.doctorName,
			toothCodes: validatedTeeth,
			toothFdi: createdOrder.toothFdi || toothFdiString,
			workType: args.workType,
			material: createdOrder.material || args.material,
			colorVita: createdOrder.colorVita || args.vitaShade.toUpperCase(),
			status: "draft",
			dueDate: (createdOrder.dueDate ?? dueTimestamp).toISOString(),
			laboratoryName: args.laboratoryName ?? null,
			clinicalNotes: createdOrder.clinicalNotes || fullClinicalNotes,
			priceRub: createdOrder.priceRub,
			portalUrl: `/lab-portal?token=${createdOrder.secureToken}`,
			createdAt: createdOrder.createdAt.toISOString(),
		};

		return result;
	},
};
