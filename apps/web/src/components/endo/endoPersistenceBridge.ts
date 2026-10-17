import type {
	EndoCanalData,
	EndoToothClinicalData,
	EndoTreatmentBillingEstimateResult,
	ToothClinicalServicePayload,
} from "@dental/shared";
import type { EndoStageStamp } from "./endoCanalConstants";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";

export interface PersistCanalsOptions {
	readonly patientId?: string | undefined;
	readonly activeTooth: number;
	readonly clinicalData: EndoToothClinicalData;
	readonly onSaveCanals?: (
		(canals: EndoCanalData[], clinicalData: EndoToothClinicalData) => Promise<void> | void
	) | undefined;
}

export async function persistCanalsToBackend({
	patientId,
	activeTooth,
	clinicalData,
	onSaveCanals,
}: PersistCanalsOptions): Promise<boolean> {
	if (onSaveCanals) {
		await onSaveCanals(clinicalData.canals as EndoCanalData[], clinicalData);
		return true;
	}

	if (patientId) {
		try {
			const res = await fetch(`/api/patients/${patientId}/tooth-states/${activeTooth}/endo`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					toothNumber: activeTooth,
					canals: clinicalData.canals,
					irrigation: clinicalData.irrigation,
					rotarySystem: clinicalData.rotarySystem,
					radiologyControl: clinicalData.radiologyControl,
				}),
			});
			if (!res.ok) {
				showToast("Не удалось сохранить параметры каналов в БД", "error");
				return false;
			}
			return true;
		} catch {
			showToast("Ошибка сохранения параметров каналов в БД", "error");
			return false;
		}
	}

	return true;
}

export function updateVisitStoreWithEndoProtocol(
	activeTooth: number,
	stageStamp: EndoStageStamp,
	protocolTextToInsert: string,
): void {
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const existingObj = prev.objectiveStatus?.trim() || "";
			const existingPlan = prev.treatmentPlan?.trim() || "";
			const newObjective = existingObj
				? `${existingObj}\n\n${protocolTextToInsert}`
				: protocolTextToInsert;
			const planSummary = `Эндодонтическое лечение зуба #${activeTooth} (${
				stageStamp === "TEMP_CAOH2"
					? "Временная обтурация Ca(OH)2"
					: "Обтурация корневых каналов до апекса"
			})`;
			const newPlan =
				existingPlan && !existingPlan.includes(planSummary)
					? `${existingPlan}\n${planSummary}`
					: existingPlan || planSummary;
			return {
				...prev,
				objectiveStatus: newObjective,
				treatmentPlan: newPlan,
			};
		});
	} catch {
		// safe fallback
	}
}

export function applyEndoBillingAndInventoryDeductions(
	activeTooth: number,
	patientId: string | undefined,
	stageStamp: EndoStageStamp,
	billingEstimate: EndoTreatmentBillingEstimateResult,
): void {
	// 1. Автоматическое добавление услуг в счет визита (Мандаты 8b, 8e, 8n)
	try {
		const visitStore = useVisitStore.getState();
		for (const srv of billingEstimate.services804n) {
			const itemPayload: ToothClinicalServicePayload = {
				serviceId: `endo_${srv.code804n}_${activeTooth}`,
				code804n: srv.code804n,
				toothNumber: activeTooth,
				toothCode: String(activeTooth),
				name: srv.title,
				priceRub: srv.priceRub,
				priceKopecks: srv.priceKopecks,
				quantity: srv.quantity,
				category: srv.category,
			};
			visitStore.addCompletedService(itemPayload);
		}

		visitStore.applyServicesToToothState({
			toothNumber: activeTooth,
			toothCode: String(activeTooth),
			services: billingEstimate.services804n.map((s) => ({
				code804n: s.code804n,
				title: s.title,
				price: s.priceRub,
				unitPriceRub: s.priceRub,
				toothNumber: activeTooth,
				toothCode: String(activeTooth),
			})),
		});
	} catch (billErr) {
		console.warn("Auto-billing endo services skipped or outside active visit store", billErr);
	}

	// 2. Автоматическое списание расходных материалов со склада через мягкий овердрафт (Мандаты 8e, 8n)
	try {
		for (const mat of billingEstimate.materials) {
			fetch("/api/inventory/soft-overdraft-deduct", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					itemId: mat.itemId,
					itemName: mat.itemName,
					quantity: mat.quantity,
					reason: `Эндодонтический протокол зуба #${activeTooth} (${mat.notes || "Списание расходных материалов"})`,
				}),
			}).catch((err) => {
				console.warn("Soft overdraft deduction failed silently for", mat.itemId, err);
			});
		}
	} catch (matDeductErr) {
		console.warn("Soft overdraft call error", matDeductErr);
	}

	// 3. Автоматическое уведомление шины событий склада (inventory_items)
	try {
		window.dispatchEvent(
			new CustomEvent("dente-deduct-inventory-materials", {
				detail: {
					toothNumber: activeTooth,
					patientId,
					stage: stageStamp,
					materials: billingEstimate.materials,
				},
			}),
		);
	} catch (matErr) {
		console.warn("Materials deduction event dispatch skipped", matErr);
	}
}
