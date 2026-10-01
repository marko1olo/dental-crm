/**
 * treatmentPlanNetworkSync.ts — сетевая синхронизация планов лечения DENTE CRM:
 * экспорт в кассу (счета 54-ФЗ), сохранение в PostgreSQL 18, оформление наряда в ЗТЛ в 1 клик, загрузка планов.
 * Выделено из useTreatmentPlanLogic.ts строго по Мандату 8b (лимит строк <= 800).
 */

import { type Kopecks, parseKopecks } from "@dental/shared";
import type {
	CashierInvoiceExportData,
	DigitalSignatureAgreementData,
	TreatmentPlanStage,
	TreatmentPlanStatus,
	TreatmentPlanTier,
} from "./types";
import {
	type BillingInvoice,
	loadStoredInvoices,
	saveStoredInvoices,
} from "../billing/InvoicesView";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { logger } from "../../utils/logger";
import {
	type CatalogServiceLookupItem,
	buildStagesFromPlanItems,
} from "./treatmentPlanStagesEngine";
import {
	ONE_CLICK_LAB_DEFAULTS,
	addWorkingDays,
	calculateMaterialTotalCostKopecks,
} from "../lab/labMath";

export interface LoadedPlanResult {
	planId: string;
	status: "draft" | "agreed" | "in_progress" | "completed";
	rebuiltStages: TreatmentPlanStage[] | null;
}

export async function fetchPatientTreatmentPlans(
	patientId: string,
	catalog?: CatalogServiceLookupItem[],
): Promise<LoadedPlanResult | null> {
	try {
		const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) return null;
		const data = await res.json();
		if (data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
			const latestPlan =
				data.plans.find((p: any) => p.status === "Approved" || p.status === "Active") ||
				data.plans[0];
			if (latestPlan) {
				const status: "draft" | "agreed" | "in_progress" | "completed" =
					latestPlan.status === "Approved"
						? "agreed"
						: latestPlan.status === "Active"
							? "in_progress"
							: latestPlan.status === "Completed"
								? "completed"
								: "draft";

				let rebuiltStages: TreatmentPlanStage[] | null = null;
				if (Array.isArray(latestPlan.items) && latestPlan.items.length > 0) {
					const rebuilt = buildStagesFromPlanItems(latestPlan.items, catalog);
					if (rebuilt.length > 0) {
						rebuiltStages = rebuilt;
					}
				}
				return {
					planId: latestPlan.id,
					status,
					rebuiltStages,
				};
			}
		}
	} catch (e) {
		logger.warn("[treatmentPlanNetworkSync] Ошибка загрузки планов пациента из БД", e);
	}
	return null;
}

export interface ExportCashierParams {
	patientId: string;
	patientName: string;
	patientPhone: string;
	doctorName: string;
	stages: readonly TreatmentPlanStage[];
	currentTier: TreatmentPlanTier;
	loyaltyDeduction: {
		appliedBonusRub: number;
		appliedBonusKopecks: Kopecks;
		netPayableRub: number;
		netPayableKopecks: Kopecks;
	};
	onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
}

export function exportPlanToCashier({
	patientId,
	patientName,
	patientPhone,
	doctorName,
	stages,
	currentTier,
	loyaltyDeduction,
	onExportToCashier,
}: ExportCashierParams): void {
	const allItems = stages.flatMap((s) => s.items);
	if (allItems.length === 0) {
		showToast("Нет позиций для формирования счета", "warning", 3000);
		return;
	}

	const grossTotalRub =
		allItems.reduce(
			(acc, it) => acc + Math.round((it.unitPriceRub || 0) * 100) * (it.quantity || 1),
			0,
		) / 100;
	const discountRub =
		allItems.reduce((acc, it) => acc + Math.round((it.discountRub || 0) * 100), 0) / 100;
	const netTotalRub = loyaltyDeduction.netPayableRub;

	const cleanPat = (patientId || "pat").replace(/\D/g, "").slice(0, 4) || "0001";
	const invoiceId = `inv-plan-${Date.now()}-${cleanPat}`;
	const invoiceNumber = `СЧ-${new Date().getFullYear()}-${cleanPat.padStart(4, "0")}`;

	const exportData: CashierInvoiceExportData = {
		patientId,
		patientName,
		invoiceId,
		invoiceNumber,
		items: allItems,
		grossTotalRub,
		discountRub,
		bonusPointsUsedRub: loyaltyDeduction.appliedBonusRub,
		bonusPointsUsedKopecks: loyaltyDeduction.appliedBonusKopecks,
		netTotalRub,
		netTotalKopecks: loyaltyDeduction.netPayableKopecks,
		notes: `Счет на оплату по комплексному плану «${currentTier.title}»${
			loyaltyDeduction.appliedBonusRub > 0
				? ` (Списано бонусов: ${loyaltyDeduction.appliedBonusRub} ₽)`
				: ""
		}`,
		createdAtIso: new Date().toISOString(),
	};

	const newBillingInvoice: BillingInvoice = {
		id: invoiceId,
		number: invoiceNumber,
		patientId,
		patientName,
		patientPhone,
		doctorName: doctorName || "Лечащий врач-стоматолог",
		date: new Date().toLocaleDateString("ru-RU"),
		totalAmountRub: netTotalRub,
		paidAmountRub: 0,
		status: (netTotalRub === 0 ? "warranty_100" : "issued") as BillingInvoice["status"],
		items: allItems.map((it, idx) => ({
			id: it.id || `item-${idx}`,
			code: it.code804n || "A16.07.002",
			name: `${it.name}${it.toothNumber ? ` (зуб ${it.toothNumber})` : ""}`,
			quantity: it.quantity || 1,
			priceRub: it.unitPriceRub || 0,
		})),
		createdAt: new Date().toISOString(),
		notes: exportData.notes,
	};

	const existingInvoices = loadStoredInvoices();
	const updatedInvoices = [
		newBillingInvoice,
		...existingInvoices.filter(
			(inv) => inv.id !== newBillingInvoice.id && inv.number !== newBillingInvoice.number,
		),
	];
	saveStoredInvoices(updatedInvoices);

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente-invoices-updated", {
				detail: newBillingInvoice,
			}),
		);
	}

	if (onExportToCashier) {
		onExportToCashier(exportData);
	}

	void fetch("/api/invoices/generate-from-plan", {
		method: "POST",
		headers: {
			...denteAdminSecretRequestHeaders(),
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			patientId,
			planId: `PLAN-${patientId.slice(0, 6).toUpperCase()}`,
			planNumber: `ПЛАН-№${patientId.slice(0, 4)}`,
			planTitle: currentTier.title,
			documentType: "invoice",
			items: allItems.map((it, idx) => ({
				itemId: it.id || `item-${idx}`,
				toothNumber: it.toothNumber ?? null,
				nameRu: it.name,
				quantity: it.quantity || 1,
				unitPriceRub: it.unitPriceRub || 0,
				discountRub: it.discountRub || 0,
				code804n: it.code804n || undefined,
			})),
			allowUnplannedServices: true,
			notes: exportData.notes,
		}),
	}).catch((err) => {
		logger.warn("[treatmentPlanNetworkSync] Background server invoice export fallback", err);
	});

	showToast(
		`Счет №${invoiceNumber} на сумму ${(netTotalRub || 0).toLocaleString("ru-RU")} ₽ успешно отправлен в кассу!`,
		"success",
		5000,
	);
}

export interface SavePlanParams {
	patientId: string;
	currentPlanId: string | null;
	currentTier: TreatmentPlanTier;
	planStatus: TreatmentPlanStatus;
	signedAgreement: DigitalSignatureAgreementData | null;
	stages: readonly TreatmentPlanStage[];
	grandTotalRub: number;
	totalItemsCount: number;
	onPlanSaved?: ((planId: string) => void) | undefined;
}

export async function savePlanToPostgres({
	patientId,
	currentPlanId,
	currentTier,
	planStatus,
	signedAgreement,
	stages,
	grandTotalRub,
	totalItemsCount,
	onPlanSaved,
}: SavePlanParams): Promise<string | null> {
	if (totalItemsCount === 0) {
		showToast("План пуст: добавьте или отметьте зубы на схеме", "warning");
		return null;
	}

	try {
		const allItems = stages.flatMap((s) => s.items);
		const itemsForApi = allItems.map((it) => ({
			toothNumber: it.toothNumber ?? null,
			priceId: it.priceId || it.code804n,
			name: it.name,
			quantity: it.quantity || 1,
			price: it.unitPriceRub || 0,
			discount: it.discountRub || 0,
			phase: it.phase,
			isAuto: it.isAuto ?? true,
		}));

		const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				...(currentPlanId ? { id: currentPlanId } : {}),
				name: `${currentTier.title} (${new Date().toLocaleDateString("ru-RU")})`,
				status:
					planStatus === "agreed"
						? "Approved"
						: planStatus === "in_progress"
							? "Active"
							: planStatus === "completed"
								? "Completed"
								: "Draft",
				patientSignature: signedAgreement?.signatureBase64 || null,
				items: itemsForApi,
			}),
		});

		if (res.ok) {
			const data = await res.json();
			const planId = data.planId || currentPlanId;
			if (planId && onPlanSaved) {
				onPlanSaved(planId);
			}
			showToast(
				`Комплексный план лечения успешно сохранен в базе на сумму ${(grandTotalRub || 0).toLocaleString("ru-RU")} ₽!`,
				"success",
				4000,
			);
			return planId || null;
		}

		showToast("Не удалось сохранить план на сервере", "error");
		return null;
	} catch (err) {
		logger.error("[treatmentPlanNetworkSync] Save error", err);
		showToast("Ошибка сохранения плана", "error");
		return null;
	}
}

export interface LabOrderCreationParams {
	patientId: string;
	doctorId: string | null;
	targetTeeth: readonly number[];
	currentTierTitle: string;
}

export async function createExpressLabOrder({
	patientId,
	doctorId,
	targetTeeth,
	currentTierTitle,
}: LabOrderCreationParams): Promise<void> {
	if (!targetTeeth || targetTeeth.length === 0) {
		showToast("Нет выбранных ортопедических зубов для наряда ЗТЛ", "warning");
		return;
	}

	const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
	const dueDateIso = due.toISOString();
	const dueDateFormatted = due.toLocaleDateString("ru-RU");
	const isBridge = targetTeeth.length > 1;
	const construction = isBridge
		? ONE_CLICK_LAB_DEFAULTS.restorationTypeBridge
		: ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle;
	const priceRub =
		(calculateMaterialTotalCostKopecks(ONE_CLICK_LAB_DEFAULTS.materialId, targetTeeth.length) ||
			650000 * targetTeeth.length) / 100;
	const toothFdiStr = targetTeeth.join(", ");

	try {
		showToast(`Создаём наряд ЗТЛ в 1 клик для зубов ${toothFdiStr}...`, "info", 2000);
		const res = await fetch("/api/clinical/lab-orders", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				patientId,
				doctorId,
				toothFdi: toothFdiStr,
				material: ONE_CLICK_LAB_DEFAULTS.materialName,
				colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
				dueDate: dueDateIso,
				clinicalNotes: `• Экспресс 1-клик наряд ЗТЛ из плана лечения (${currentTierTitle})\n• Конструкция: ${isBridge ? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})` : "Одиночная коронка"}\n• Материал: ${ONE_CLICK_LAB_DEFAULTS.materialName}\n• Цвет: VITA Classical ${ONE_CLICK_LAB_DEFAULTS.colorVita}\n• Срок: 7 рабочих дней (до ${dueDateFormatted})\n• Цементный зазор: ${ONE_CLICK_LAB_DEFAULTS.cementGapMicrons} мкм`,
				priceRub,
			}),
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка создания наряда ЗТЛ");
		}

		const savedOrder = await res.json();

		if (savedOrder?.id) {
			for (const tooth of targetTeeth) {
				try {
					await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							toothFdi: tooth,
							restorationType: construction,
							material: ONE_CLICK_LAB_DEFAULTS.materialId,
							shadeFinal: ONE_CLICK_LAB_DEFAULTS.colorVita,
							translucencyLevel: ONE_CLICK_LAB_DEFAULTS.translucency,
							cementGapMicrons: ONE_CLICK_LAB_DEFAULTS.cementGapMicrons,
							priceRub: priceRub / targetTeeth.length,
						}),
					});
				} catch {
					// Non-blocking item fallback
				}
			}
		}

		showToast(
			`Наряд ЗТЛ успешно оформлен в 1 клик для зубов ${toothFdiStr} (Цирконий A2, срок до ${dueDateFormatted})!`,
			"success",
			6000,
		);
		window.dispatchEvent(
			new CustomEvent("dente-lab-order-created", { detail: { order: savedOrder } }),
		);
	} catch (err: any) {
		showToast(err.message || "Не удалось оформить наряд в ЗТЛ", "error");
	}
}

export function dispatchStageStartEvents(
	patientId: string,
	patientName: string,
	stage: TreatmentPlanStage,
): void {
	if (typeof window === "undefined") return;

	window.dispatchEvent(
		new CustomEvent("dente-take-stage-to-visit", {
			detail: {
				patientId,
				patientName,
				stage,
				items: stage.items,
			},
		}),
	);

	for (const item of stage.items) {
		window.dispatchEvent(
			new CustomEvent("dente-add-billing-item", {
				detail: {
					item: {
						code804n: item.code804n || item.priceId || "A16.07.001",
						title: item.name,
						toothCode: item.toothNumber ? String(item.toothNumber) : undefined,
						quantity: item.quantity || 1,
						unitPriceRub: item.unitPriceRub,
						discountRub: item.discountRub || 0,
					},
				},
			}),
		);
	}

	window.dispatchEvent(
		new CustomEvent("dente-book-stage-appointment", {
			detail: {
				patientId,
				patientName,
				stageNumber: stage.stageNumber,
				stageTitle: stage.title,
				items: stage.items,
			},
		}),
	);

	window.dispatchEvent(
		new CustomEvent("dente-stage-activated", {
			detail: {
				patientId,
				stageNumber: stage.stageNumber,
				stageTitle: stage.title,
			},
		}),
	);
}
