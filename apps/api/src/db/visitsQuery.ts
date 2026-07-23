import { createHash } from "node:crypto";
import type {
	AcceptVisitDraftInput,
	VisitDraftAutosave,
	VisitDraftAutosaveRequest,
} from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";
import { signedOutpatientCards, visitGnathology } from "./schema.js";

function hashTranscript(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export async function getVisitDraftAutosaveFromDb(
	organizationId: string,
	visitId: string,
): Promise<VisitDraftAutosave | null> {
	const [visit] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.id, visitId),
				eq(schema.visits.organizationId, organizationId),
			),
		)
		.limit(1);
	if (!visit) return null;
	if (visit.status !== "draft") return null;

	if (visit.draftAutosave) {
		return visit.draftAutosave as VisitDraftAutosave;
	}

	// Return empty skeleton if no draft autosave exists
	return {
		visitId: visit.id,
		patientId: visit.patientId,
		selectedSpecialty: "therapist", // default fallback
		transcript: visit.transcript || "",
		draft: {
			warnings: [],
			complaint: visit.complaint || "",
			anamnesis: visit.anamnesis || "",
			objectiveStatus: visit.objectiveStatus || "",
			diagnosis: visit.diagnosis || "",
			treatmentPlan: visit.treatmentPlan || "",
		} as any,
		baseRevision: visit.revision,
		clientDraftId: null,
		clientSavedAt: null,
		serverSavedAt: visit.updatedAt.toISOString(),
		transcriptHash: "",
	};
}

export async function upsertVisitDraftAutosaveInDb(
	organizationId: string,
	input: VisitDraftAutosaveRequest,
): Promise<VisitDraftAutosave> {
	const [visit] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.id, input.visitId),
				eq(schema.visits.organizationId, organizationId),
			),
		)
		.limit(1);
	if (!visit) throw new Error("Визит не найден");
	if (visit.status !== "draft")
		throw new Error("Прием уже закрыт или аннулирован");

	const serverDraft: VisitDraftAutosave = {
		visitId: input.visitId,
		patientId: input.patientId,
		selectedSpecialty: input.selectedSpecialty,
		transcript: input.transcript,
		draft: input.draft,
		baseRevision: input.baseRevision ?? null,
		clientDraftId: input.clientDraftId?.trim() || null,
		clientSavedAt: input.clientSavedAt ?? null,
		serverSavedAt: new Date().toISOString(),
		transcriptHash: hashTranscript(
			[
				input.transcript,
				input.draft.complaint,
				input.draft.anamnesis,
				input.draft.objectiveStatus,
				input.draft.diagnosis,
				input.draft.treatmentPlan,
			]
				.filter(Boolean)
				.join("|"),
		),
	};

	await db
		.update(schema.visits)
		.set({
			draftAutosave: serverDraft,
			transcript: input.transcript,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(schema.visits.id, input.visitId),
				eq(schema.visits.organizationId, organizationId),
			),
		);

	return serverDraft;
}

export async function acceptVisitDraftInDb(
	organizationId: string,
	userId: string | null,
	input: AcceptVisitDraftInput,
): Promise<{ acceptedVisitId: string; newRevision: number }> {
	return await db.transaction(async (tx) => {
		// 1. Lock the row using FOR UPDATE or just check the revision
		const [visit] = await tx
			.select()
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.id, input.visitId),
					eq(schema.visits.organizationId, organizationId),
				),
			)
			.limit(1)
			.for("update");

		if (!visit) throw new Error("Визит не найден");
		if (visit.status !== "draft")
			throw new Error("Прием уже закрыт или аннулирован");
		if (
			input.baseRevision !== undefined &&
			visit.revision !== input.baseRevision
		) {
			throw new Error(
				"Конфликт версий: черновик был изменен другим пользователем. Обновите страницу.",
			);
		}

		const newRevision = visit.revision + 1;
		const now = new Date();

		const [updatedVisit] = await tx
			.update(schema.visits)
			.set({
				status: "signed",
				revision: newRevision,
				complaint: input.draft.complaint,
				anamnesis: input.draft.anamnesis,
				objectiveStatus: input.draft.objectiveStatus,
				diagnosis: input.draft.diagnosis,
				treatmentPlan: input.draft.treatmentPlan,
				doctorSummary: input.doctorSummary,
				signedAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(schema.visits.id, input.visitId),
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.revision, visit.revision), // Double safety
				),
			)
			.returning({ id: schema.visits.id });

		if (!updatedVisit) {
			throw new Error("Конфликт версий: не удалось сохранить изменения.");
		}

		// --- 1. Блокировка дневника (visitDiaries.isLocked = true) & 2. Крипто-хэш ---
		const diaryHash = hashTranscript(
			`${visit.id}|${visit.patientId}|${input.draft.anamnesis ?? ""}|${input.draft.objectiveStatus ?? ""}|${input.draft.treatmentPlan ?? ""}`,
		);

		const [existingDiary] = await tx
			.select()
			.from(schema.visitDiaries)
			.where(eq(schema.visitDiaries.visitId, visit.id))
			.limit(1);
		let diaryIdToLog = existingDiary?.id;

		if (existingDiary) {
			await tx
				.update(schema.visitDiaries)
				.set({
					anamnesis: input.draft.anamnesis,
					statusLocalis: input.draft.objectiveStatus,
					treatmentDescription: input.draft.treatmentPlan,
					isLocked: true,
					lockedAt: now,
					lockedByUserId: userId,
					coSignedByUserId: userId,
					diaryHash,
					updatedAt: now,
					instrumentTrayBarcode:
						input.instrumentTrayBarcode ?? existingDiary.instrumentTrayBarcode,
				})
				.where(eq(schema.visitDiaries.id, existingDiary.id));
		} else {
			const [newDiary] = await tx
				.insert(schema.visitDiaries)
				.values({
					organizationId,
					visitId: visit.id,
					patientId: visit.patientId,
					anamnesis: input.draft.anamnesis,
					statusLocalis: input.draft.objectiveStatus,
					treatmentDescription: input.draft.treatmentPlan,
					draftAuthorId: userId,
					coSignedByUserId: userId,
					diaryHash,
					isLocked: true,
					lockedAt: now,
					lockedByUserId: userId,
					instrumentTrayBarcode: input.instrumentTrayBarcode,
				})
				.returning();
			diaryIdToLog = newDiary?.id;
		}

		// --- 3. Статус услуг 'Выполнено' & 4. Списание материалов ---
		if (input.draft.completedServices && input.draft.completedServices.length > 0) {
			await tx.delete(schema.treatmentItems).where(eq(schema.treatmentItems.visitId, visit.id));
			await tx.insert(schema.treatmentItems).values(
				input.draft.completedServices.map(s => ({
					organizationId,
					patientId: visit.patientId,
					visitId: visit.id,
					serviceId: s.serviceId,
					title: s.title,
					quantity: String(s.quantity),
					priceRub: Math.round(Number(s.priceRub || 0)),
					unitPriceRub: Math.round(Number(s.priceRub || 0)),
					status: "completed" as const,
					toothCode: s.toothCode || null,
				}))
			);
		}

		const tItems = await tx
			.select()
			.from(schema.treatmentItems)
			.where(eq(schema.treatmentItems.visitId, visit.id));

		let totalInvoiceAmount = 0;
		let totalInsuranceAmount = 0;
		let totalPatientAmount = 0;

		const [patientRecord] = await tx.select().from(schema.patients).where(eq(schema.patients.id, visit.patientId!));
		let insuranceContract: any = null;
		if (patientRecord?.insuranceContractId) {
			const [contract] = await tx.select().from(schema.insuranceContracts).where(eq(schema.insuranceContracts.id, patientRecord.insuranceContractId));
			if (contract?.isActive) insuranceContract = contract;
		}

		if (tItems.length > 0) {
			await tx
				.update(schema.treatmentItems)
				.set({ status: "completed" })
				.where(eq(schema.treatmentItems.visitId, visit.id));

			for (const item of tItems) {
				const itemTotal = Number(item.priceRub) * Number(item.quantity);
				totalInvoiceAmount += itemTotal;

				let category = "other";
				if (item.serviceId) {
					const [service] = await tx.select({ category: schema.serviceCatalogItems.category }).from(schema.serviceCatalogItems).where(eq(schema.serviceCatalogItems.id, item.serviceId));
					if (service) category = service.category;
					
					const rules = await tx
						.select()
						.from(schema.procedureMaterialRules)
						.where(eq(schema.procedureMaterialRules.serviceId, item.serviceId));
					for (const rule of rules) {
						const [inv] = await tx
							.select()
							.from(schema.inventoryItems)
							.where(eq(schema.inventoryItems.id, rule.inventoryItemId))
							.for("update");
						if (inv) {
							const qtyToDeduct =
								Number(rule.quantityToDeduct) * Number(item.quantity);
							if (inv.stockQuantity < qtyToDeduct) {
								throw new Error(`Недостаточно материалов: ${inv.name}`);
							}
							await tx
								.update(schema.inventoryItems)
								.set({ stockQuantity: inv.stockQuantity - qtyToDeduct })
								.where(eq(schema.inventoryItems.id, inv.id));

							await tx.insert(schema.inventoryTransactions).values({
								organizationId,
								inventoryItemId: inv.id,
								transactionType: "deduction",
								quantityChanged: -qtyToDeduct,
								unitCostRub: inv.unitCostRub || "0",
								
								userId,
								visitId: visit.id,
							});
						}
					}
				}

				let insurancePct = 0;
				if (insuranceContract) {
					if (category === "therapy" || category === "consultation" || category === "periodontology") insurancePct = insuranceContract.coverageTherapyPct;
					else if (category === "surgery") insurancePct = insuranceContract.coverageSurgeryPct;
					else if (category === "orthodontics" || category === "prosthetics") insurancePct = insuranceContract.coverageOrthoPct;
					else if (category === "hygiene") insurancePct = insuranceContract.coverageHygienePct;
				}
				const covered = itemTotal * (insurancePct / 100);
				totalInsuranceAmount += covered;
				totalPatientAmount += (itemTotal - covered);
			}

			// --- Выставление счета пациенту ---
			if (totalInvoiceAmount > 0) {
				await tx.insert(schema.patientInvoices).values({
					organizationId,
					patientId: visit.patientId!,
					visitId: visit.id,
					totalAmountRub: totalInvoiceAmount.toFixed(2),
					insuranceAmountRub: totalInsuranceAmount.toFixed(2),
					patientAmountRub: totalPatientAmount.toFixed(2),
					status: "unpaid",
					itemsJson: JSON.stringify(
						tItems.map((i) => ({
							title: i.title,
							quantity: i.quantity,
							priceRub: i.priceRub,
						})),
					),
				});
			}
		}

		// --- 5. Начисление комиссии врачу ---
		if (userId && totalInvoiceAmount > 0) {
			const [commissionRule] = await tx
				.select()
				.from(schema.doctorCommissions)
				.where(
					and(
						eq(schema.doctorCommissions.userId, userId),
						eq(schema.doctorCommissions.isActive, true),
					),
				)
				.limit(1);

			const pct = commissionRule?.commissionPct ?? 30.0;
			const commissionAmount = (totalInvoiceAmount * (pct / 100)).toFixed(2);

			await tx.insert(schema.doctorPayrolls).values({
				organizationId,
				userId,
				visitId: visit.id,
				amountRub: commissionAmount,
				description: `Комиссия за прием`,
			});
		}

		// --- 6. HIPAA Audit Log ---
		await tx.insert(schema.clinicalAuditLogs).values({
			organizationId,
			patientId: visit.patientId,
			action: "VISIT_SIGNED_AND_LOCKED",
			userId: userId,
			entityType: "visit_diary",
			entityId: diaryIdToLog ?? "UNKNOWN",
		});

		// Smart Aftercare Generator
		const treatmentText = (input.draft.treatmentPlan || "").toLowerCase();
		const isComplicated =
			treatmentText.includes("имплантат") ||
			treatmentText.includes("удаление") ||
			treatmentText.includes("хирургич");

		if (isComplicated && visit.patientId) {
			const dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
			await tx.insert(schema.communicationTasks).values({
				organizationId,
				patientId: visit.patientId,
				visitId: visit.id,
				assignedRole: "admin",
				channel: "phone",
				intent: "post_visit_instruction",
				status: "queued",
				priority: "high",
				dueAt,
				title: "Контроль самочувствия (Post-Op Care)",
				body: `Связаться с пациентом для контроля самочувствия после сложного лечения (${now.toLocaleDateString("ru-RU")}). Уточнить наличие боли, отека, температуры. Напомнить о приеме назначенных препаратов.`,
				botConfigId: "default",
			});
		}

		return { acceptedVisitId: visit.id, newRevision };
	});
}

export async function getVisitByIdInDb(organizationId: string, id: string) {
	const [res] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.id, id),
			),
		)
		.limit(1);
	return res || null;
}

export async function saveVisitSignatureInDb(
	payload: {
		visitId: string;
		doctorId: string;
		patientId: string;
		signatureBase64: string;
		thumbprint: string;
		signatureProvider: string;
	}
) {
	await db.insert(signedOutpatientCards).values({
		visitId: payload.visitId,
		doctorId: payload.doctorId,
		patientId: payload.patientId,
		signatureBase64: payload.signatureBase64,
		thumbprint: payload.thumbprint,
		signatureProvider: payload.signatureProvider,
	});
}

export async function getVisitSignatureInDb(visitId: string) {
    const result = await db
        .select()
        .from(signedOutpatientCards)
        .where(eq(signedOutpatientCards.visitId, visitId))
        .limit(1);
    return result[0] || null;
}

export async function getVisitGnathologyFromDb(visitId: string) {
	const result = await db
		.select()
		.from(visitGnathology)
		.where(eq(visitGnathology.visitId, visitId))
		.limit(1);
	return result[0] || null;
}

export async function upsertVisitGnathologyInDb(
	visitId: string,
	patientId: string,
	data: {
		occlusionType?: string;
		jawShift?: string;
		tmjState?: string;
		mouthOpeningMm?: number;
		osteopathicStatus?: string;
	}
) {
	const [existing] = await db
		.select()
		.from(visitGnathology)
		.where(eq(visitGnathology.visitId, visitId))
		.limit(1);

	if (existing) {
		await db
			.update(visitGnathology)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(visitGnathology.id, existing.id));
	} else {
		await db.insert(visitGnathology).values({
			visitId,
			patientId,
			...data,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
}

export async function getVisitsByIdsInDb(organizationId: string, ids: readonly string[]) {
	if (ids.length === 0) return [];
	return await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				inArray(schema.visits.id, ids as string[]),
			),
		);
}
