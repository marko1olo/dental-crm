/**
 * DiarySigningCeremonyService.ts — чистый доменный сервис церемонии подписания карты 043/у.
 *
 * ГАРАНТИИ И ОТВЕТСТВЕННОСТЬ:
 * 1. Детерминированный SHA-256 хеш содержимого (8 сегментов с учетом инструментального лотка).
 * 2. Простая ЭП по ПИН-коду сотрудника (SIMPLE_PIN_EP) или УКЭП PKCS#7.
 * 3. Атомарное списание материалов со склада клиники (procedure_material_rules + inventory_items).
 * 4. Закрытие услуг визита (treatment_items status = 'completed').
 * 5. Начисление комиссии врача (doctor_commissions).
 * 6. Юридический след в журнале (clinical_audit_logs).
 * 7. Синхронизация SOAP-полей и статуса 'signed' в visits.
 * 8. Защита от гонок и TOCTOU через SELECT ... FOR UPDATE в транзакции.
 */

import crypto from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	clinicalAuditLogs,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	treatmentItems,
	users,
	visitDiaries,
	visits,
} from "../../db/schema.js";
import { verifyCredential } from "../../utils/cryptoHelper.js";
import { Icd10ClinicalValidator } from "./Icd10ClinicalValidator.js";

export const SIMPLE_PIN_PREFIX = "PIN:";
export const SIMPLE_PIN_EP_MARK = "SIMPLE_PIN_EP";

export const DIARY_PIN_USER_REQUIRED_MESSAGE =
	"Простую подпись по ПИН-коду может поставить только сотрудник, вошедший в смену. Войдите в смену заново и повторите подписание.";
export const DIARY_PIN_NOT_SET_MESSAGE =
	"У вашей учётной записи не задан ПИН-код сотрудника, простую подпись поставить нельзя. Задайте ПИН в настройках персонала или подпишите дневник через КриптоПро.";
export const DIARY_PIN_INVALID_MESSAGE =
	"ПИН-код не принят. Проверьте раскладку и введите ПИН-код сотрудника заново.";

export const DENTAL_SPECIALTY_LABELS: Record<string, string> = {
	therapist: "терапия",
	orthopedist: "ортопедия",
	surgeon: "хирургия",
	orthodontist: "ортодонтия",
	periodontist: "пародонтология",
	hygienist: "гигиена",
	pediatric: "детская",
	implantologist: "имплантация",
	radiologist: "рентген",
	universal: "универсально",
};

export type SimplePinResolve =
	| { ok: true; stored: string | null }
	| {
			ok: false;
			code: "PinRequired" | "PinInvalid" | "PinNotSet" | "UserRequired";
			message: string;
	  };

export type DiarySigningFailureCode =
	| "NotFound"
	| "NotSaved"
	| "AlreadyLocked"
	| "InsufficientStock"
	| "Icd10Required"
	| "Icd10Invalid"
	| "ToothRequired"
	| "ToothInvalid"
	| "PinRejected";

export class DiarySigningError extends Error {
	constructor(
		readonly code: DiarySigningFailureCode,
		message: string,
	) {
		super(message);
		this.name = "DiarySigningError";
	}
}

export interface DiaryStockDeduction {
	inventoryItemId: string;
	inventoryItemName: string;
	quantityChanged: string;
}

export interface DiarySigningResult {
	diaryId: string;
	hash: string;
	lockedAt: Date;
	completedTreatmentItems: number;
	deductions: DiaryStockDeduction[];
	auditLogId: string | null;
}

export type DiaryDbTransaction = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

/**
 * SHA-256 печать содержимого дневника 043/у (8 сегментов).
 */
export function computeDiaryHash(
	visitId: string,
	patientId: string,
	anamnesis: string | null | undefined,
	statusLocalis: string | null | undefined,
	treatmentDescription: string | null | undefined,
	diagnosisIcd10?: string | null | undefined,
	diagnosisTooth?: string | null | undefined,
	complications?: string | null | undefined,
	comorbidities?: string | null | undefined,
	instrumentTrayBarcode?: string | null | undefined,
): string {
	const raw = [
		visitId,
		patientId,
		anamnesis ?? "",
		statusLocalis ?? "",
		treatmentDescription ?? "",
		diagnosisIcd10 ?? "",
		diagnosisTooth ?? "",
		complications ?? "",
		comorbidities ?? "",
		instrumentTrayBarcode ?? "",
	].join("|");
	return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Формирование диагноза ЭМК из МКБ-10 и зуба.
 */
export function buildEmkDiagnosisText(
	diagnosisIcd10?: string | null,
	diagnosisTooth?: string | null,
): string | null {
	const icd = (diagnosisIcd10 ?? "").trim();
	const tooth = (diagnosisTooth ?? "").trim();
	if (!icd) return null;
	if (tooth) return `${icd} | Зуб ${tooth}`;
	return icd;
}

/**
 * Синхронизация SOAP-полей дневника 043/у в visits ЭМК.
 */
export async function syncVisitEmkFromDiarySoap(
	executor: Pick<DiaryDbTransaction, "update">,
	params: {
		visitId: string;
		organizationId: string;
		anamnesis?: string | null;
		statusLocalis?: string | null;
		diagnosisIcd10?: string | null;
		diagnosisTooth?: string | null;
		treatmentDescription?: string | null;
	},
): Promise<void> {
	const visitId =
		typeof params.visitId === "string" ? params.visitId.trim() : "";
	if (!visitId) return;

	const patch: {
		anamnesis?: string;
		objectiveStatus?: string;
		diagnosis?: string;
		treatmentPlan?: string;
		updatedAt: Date;
	} = { updatedAt: new Date() };

	const anamnesis = (params.anamnesis ?? "").trim();
	if (anamnesis) patch.anamnesis = anamnesis;

	const objective = (params.statusLocalis ?? "").trim();
	if (objective) patch.objectiveStatus = objective;

	const diagnosisText = buildEmkDiagnosisText(
		params.diagnosisIcd10,
		params.diagnosisTooth,
	);
	if (diagnosisText) patch.diagnosis = diagnosisText;

	const treatment = (params.treatmentDescription ?? "").trim();
	if (treatment) patch.treatmentPlan = treatment;

	if (
		patch.anamnesis === undefined &&
		patch.objectiveStatus === undefined &&
		patch.diagnosis === undefined &&
		patch.treatmentPlan === undefined
	) {
		return;
	}

	await executor
		.update(visits)
		.set(patch)
		.where(
			and(
				eq(visits.id, visitId),
				eq(visits.organizationId, params.organizationId),
			),
		);
}

/**
 * Простая ЭП по PIN сотрудника → непрозрачная отметка, не цифры PIN.
 */
export async function resolveSignatureForStorage(params: {
	pkcs7Signature: string | null | undefined;
	userId: string | null;
	organizationId: string;
	diaryHashForMark?: string | null;
}): Promise<SimplePinResolve> {
	const raw =
		typeof params.pkcs7Signature === "string" ? params.pkcs7Signature : null;
	if (raw == null || raw.length === 0) {
		return { ok: true, stored: null };
	}
	if (!raw.startsWith(SIMPLE_PIN_PREFIX)) {
		// УКЭП / PKCS#7 — без разбора; legacy SIMPLE_PIN_EP тоже проходит.
		return { ok: true, stored: raw };
	}
	const pinDigits = raw.slice(SIMPLE_PIN_PREFIX.length);
	if (!/^\d{4}$/.test(pinDigits)) {
		return {
			ok: false,
			code: "PinInvalid",
			message: DIARY_PIN_INVALID_MESSAGE,
		};
	}
	if (!params.userId) {
		return {
			ok: false,
			code: "UserRequired",
			message: DIARY_PIN_USER_REQUIRED_MESSAGE,
		};
	}
	const [user] = await db
		.select({
			id: users.id,
			pinCodeHash: users.pinCodeHash,
		})
		.from(users)
		.where(
			and(
				eq(users.id, params.userId),
				eq(users.organizationId, params.organizationId),
				eq(users.isActive, true),
			),
		)
		.limit(1);
	if (!user) {
		return {
			ok: false,
			code: "UserRequired",
			message: DIARY_PIN_USER_REQUIRED_MESSAGE,
		};
	}
	if (!user.pinCodeHash) {
		return {
			ok: false,
			code: "PinNotSet",
			message: DIARY_PIN_NOT_SET_MESSAGE,
		};
	}
	const matched = await verifyCredential(pinDigits, user.pinCodeHash);
	if (!matched) {
		return {
			ok: false,
			code: "PinInvalid",
			message: DIARY_PIN_INVALID_MESSAGE,
		};
	}
	const hashPart =
		typeof params.diaryHashForMark === "string" &&
		params.diaryHashForMark.length >= 12
			? params.diaryHashForMark.slice(0, 12)
			: "nohash";
	const mark = [
		SIMPLE_PIN_EP_MARK,
		params.userId,
		new Date().toISOString(),
		hashPart,
	].join("|");
	return { ok: true, stored: mark };
}

/**
 * RU-метка специальности врача для печати 043/у.
 */
export function formatDoctorSpecialtyLabel(raw: unknown): string | null {
	const codes: string[] = Array.isArray(raw)
		? raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
		: typeof raw === "string" && raw.trim()
			? [raw.trim()]
			: [];
	if (codes.length === 0) return null;
	const meaningful = codes.filter((c) => c !== "universal");
	const list = meaningful.length > 0 ? meaningful : codes;
	const labels = list.map((c) => DENTAL_SPECIALTY_LABELS[c] ?? c);
	const joined = labels.join(", ").trim();
	return joined.length > 0 ? joined : null;
}

/**
 * Legacy PIN:… в ответе GET не отдаём — только факт, что оттиск был.
 */
export function redactLegacyPinSignature(
	value: string | null | undefined,
): string | null {
	if (typeof value !== "string" || value.length === 0) return value ?? null;
	if (value.startsWith(SIMPLE_PIN_PREFIX)) {
		return `${SIMPLE_PIN_EP_MARK}|redacted-legacy`;
	}
	return value;
}

/**
 * Списывать со склада можно только конечное положительное количество.
 */
export function isDeductibleQuantity(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}

/**
 * Единственная церемония подписания дневника внутри транзакции.
 */
export async function runDiarySigningCeremony(
	tx: DiaryDbTransaction,
	params: {
		diaryId: string;
		organizationId: string;
		userId: string | null;
		pkcs7Signature: string | null;
	},
): Promise<DiarySigningResult> {
	const { diaryId, organizationId, userId } = params;

	// 0. Перечитать дневник FOR UPDATE внутри транзакции и заново проверить замок.
	const [diary] = await tx
		.select()
		.from(visitDiaries)
		.where(
			and(
				eq(visitDiaries.id, diaryId),
				eq(visitDiaries.organizationId, organizationId),
			),
		)
		.limit(1)
		.for("update");
	if (!diary) {
		throw new DiarySigningError(
			"NotFound",
			"Дневник приёма не найден в этой клинике, подписывать нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён. Откройте приём заново, нажмите «Сохранить черновик» и повторите подписание.",
		);
	}
	if (diary.isLocked) {
		throw new DiarySigningError("AlreadyLocked", "Дневник уже подписан.");
	}

	const validation = Icd10ClinicalValidator.validate(
		diary.diagnosisIcd10,
		diary.diagnosisTooth,
	);
	if (!validation.isValid) {
		throw new DiarySigningError(
			validation.errorCode,
			validation.errorMessage,
		);
	}

	const hash = computeDiaryHash(
		diary.visitId,
		diary.patientId ?? "",
		diary.anamnesis,
		diary.statusLocalis,
		diary.treatmentDescription,
		diary.diagnosisIcd10,
		diary.diagnosisTooth,
		diary.complications,
		diary.comorbidities,
		diary.instrumentTrayBarcode,
	);
	const lockedAt = new Date();

	// 1. Замок и печать
	const lockedRows = await tx
		.update(visitDiaries)
		.set({
			isLocked: true,
			lockedAt,
			lockedByUserId: userId,
			coSignedByUserId: userId,
			authorId: userId,
			doctorId: userId,
			diaryHash: hash,
			cryptoSignaturePkcs7: params.pkcs7Signature,
			updatedAt: lockedAt,
		})
		.where(
			and(
				eq(visitDiaries.id, diaryId),
				eq(visitDiaries.organizationId, organizationId),
				eq(visitDiaries.isLocked, false),
			),
		)
		.returning({ id: visitDiaries.id });
	if (lockedRows.length === 0) {
		throw new DiarySigningError(
			"AlreadyLocked",
			"Дневник подписан и заблокирован.",
		);
	}

	// 2. Закрыть услуги визита и списать расходники со склада.
	const deductions: DiaryStockDeduction[] = [];
	const transactionsToInsert: (typeof inventoryTransactions.$inferInsert)[] =
		[];
	let completedTreatmentItems = 0;
	if (diary.visitId) {
		const visitTreatmentItems = await tx
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.visitId, diary.visitId),
					eq(treatmentItems.organizationId, organizationId),
				),
			);
		if (visitTreatmentItems.length > 0) {
			await tx
				.update(treatmentItems)
				.set({ status: "completed" })
				.where(
					and(
						eq(treatmentItems.visitId, diary.visitId),
						eq(treatmentItems.organizationId, organizationId),
					),
				);
			completedTreatmentItems = visitTreatmentItems.length;

			// Собираем все правила списания по услугам визита
			const serviceIds = visitTreatmentItems
				.map((item) => item.serviceId)
				.filter((id): id is string => typeof id === "string" && id.length > 0);

			if (serviceIds.length > 0) {
				const rules = await tx
					.select()
					.from(procedureMaterialRules)
					.where(
						and(
							or(
								eq(procedureMaterialRules.organizationId, organizationId),
								isNull(procedureMaterialRules.organizationId),
							),
						),
					);

				// Агрегируем требуемые количества по каждому inventoryItemId
				const requiredByItem = new Map<string, number>();

				for (const item of visitTreatmentItems) {
					if (!item.serviceId) continue;
					const serviceQuantity = Number(item.quantity);
					if (!isDeductibleQuantity(serviceQuantity)) continue;

					const matchingRules = rules.filter((r) => r.serviceId === item.serviceId);
					for (const rule of matchingRules) {
						if (!rule.inventoryItemId) continue;
						const ruleQuantity = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 0);
						if (!isDeductibleQuantity(ruleQuantity)) continue;

						const qtyToDeduct = ruleQuantity * serviceQuantity;
						const prev = requiredByItem.get(rule.inventoryItemId) ?? 0;
						requiredByItem.set(rule.inventoryItemId, prev + qtyToDeduct);
					}
				}

				if (requiredByItem.size > 0) {
					// Блокировка строк в строго сортированном порядке (Deadlock-free locking)
					const sortedItemIds = Array.from(requiredByItem.keys()).sort();

					for (const itemId of sortedItemIds) {
						const qtyNeeded = requiredByItem.get(itemId) ?? 0;
						if (qtyNeeded <= 0) continue;

						const [inv] = await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.id, itemId),
									eq(inventoryItems.organizationId, organizationId),
								),
							)
							.for("update");

						if (!inv) continue;

						const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
						const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
						const newStock = baseStock - qtyNeeded;
						const quantityChanged = String(-qtyNeeded);

						if (newStock < 0) {
							console.warn(
								`[DiarySigningCeremonyService] Списание в дефицит по материалу «${inv.name}» (ID: ${inv.id}) ` +
									`для визита ${diary.visitId}: в наличии ${baseStock}, требовалось ${qtyNeeded}, итоговый дефицит: ${newStock}.`,
							);
						}

						await tx
							.update(inventoryItems)
							.set({
								stockQuantity: String(newStock),
								currentQty: String(newStock),
							})
							.where(
								and(
									eq(inventoryItems.id, inv.id),
									eq(inventoryItems.organizationId, organizationId),
								),
							);

						transactionsToInsert.push({
							organizationId,
							visitId: diary.visitId,
							inventoryItemId: inv.id,
							quantityChanged,
							unitCostRub:
								inv.unitCostRub != null ? String(inv.unitCostRub) : null,
							transactionType: "auto_deduct" as const,
							userId,
						});

						deductions.push({
							inventoryItemId: inv.id,
							inventoryItemName: inv.name,
							quantityChanged,
						});
					}

					if (transactionsToInsert.length > 0) {
						await tx.insert(inventoryTransactions).values(transactionsToInsert);
					}
				}
			}
		}
	}

	// 3. Ставка врача, если её ещё нет
	if (userId) {
		const [existingCommission] = await tx
			.select()
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.userId, userId),
					eq(doctorCommissions.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!existingCommission) {
			await tx.insert(doctorCommissions).values({
				organizationId,
				userId,
				specialty: "universal",
				serviceCategory: "therapy",
				commissionPct: "30.00",
				commissionPercent: "30.00",
				materialCostDeductionPct: "100.00",
				isActive: true,
			});
		}
	}

	// 4. Клинический журнал
	const [auditLog] = await tx
		.insert(clinicalAuditLogs)
		.values({
			organizationId,
			patientId: diary.patientId,
			action: "VISIT_SIGNED_AND_LOCKED",
			userId,
			entityType: "visit_diary",
			entityId: diaryId,
		})
		.returning({ id: clinicalAuditLogs.id });

	// 5. Синхронизация SOAP и статуса 'signed' в visits
	if (diary.visitId) {
		await syncVisitEmkFromDiarySoap(tx, {
			visitId: diary.visitId,
			organizationId,
			anamnesis: diary.anamnesis,
			statusLocalis: diary.statusLocalis,
			diagnosisIcd10: diary.diagnosisIcd10,
			diagnosisTooth: diary.diagnosisTooth,
			treatmentDescription: diary.treatmentDescription,
		});

		await tx
			.update(visits)
			.set({
				status: "signed",
				signedAt: lockedAt,
				updatedAt: lockedAt,
			})
			.where(
				and(
					eq(visits.id, diary.visitId),
					eq(visits.organizationId, organizationId),
					eq(visits.status, "draft"),
				),
			);
	}

	return {
		diaryId,
		hash,
		lockedAt,
		completedTreatmentItems,
		deductions,
		auditLogId: auditLog?.id ?? null,
	};
}

/**
 * Объектный интерфейс доменного сервиса DiarySigningCeremonyService.
 */
export class DiarySigningCeremonyService {
	static computeHash = computeDiaryHash;
	static resolveSignature = resolveSignatureForStorage;
	static redactSignature = redactLegacyPinSignature;
	static formatSpecialty = formatDoctorSpecialtyLabel;
	static buildEmkDiagnosis = buildEmkDiagnosisText;
	static syncVisitEmk = syncVisitEmkFromDiarySoap;
	static runCeremony = runDiarySigningCeremony;
	static validateClinicalProtocol = Icd10ClinicalValidator.validate;
	static isDentalIcd10 = Icd10ClinicalValidator.isDentalIcd10;
	static isToothSpecificDiagnosis = Icd10ClinicalValidator.isToothSpecificDiagnosis;
	static isValidFdiTooth = Icd10ClinicalValidator.isValidFdiTooth;
	static parseAndValidateTeeth = Icd10ClinicalValidator.parseAndValidateTeeth;

	static async signDiary(params: {
		diaryId: string;
		organizationId: string;
		userId: string | null;
		pkcs7Signature: string | null;
	}): Promise<DiarySigningResult> {
		return await db.transaction((tx) =>
			runDiarySigningCeremony(tx, params),
		);
	}
}
