import {
	createDefaultAdultTeethData,
	type ToothData,
} from "../../components/odontogram/chart/toothChartTypes";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../../components/odontogram/odontogramStorage";
import { useAppStore } from "../appStore";
import { mapVisitUiStateToToothDataState } from "./odontogramSlice.js";
import type { ToothState, VisitStore, VisitStoreSet } from "./types.js";

/**
 * Автоматическое сопоставление услуги Номенклатуры 804н / клинической манипуляции
 * с целевым статусом зуба на одонтограмме (Мандаты 8c, 8e).
 *
 * - Пломбирование / реставрация (A16.07.002%) -> "done" (зеленый)
 * - Удаление зуба (A16.07.001%) -> "missing" (перечеркнутый серый)
 * - Ортопедия / коронка (A16.07.004%) -> "crown" / "done" (золотистый)
 * - Эндодонтия / пульпит (A16.07.030%, A16.07.008%) -> "treatment" (красный)
 */
export function inferToothStateFromService(service: {
	code?: string;
	code804n?: string;
	title?: string;
	name?: string;
}): ToothState {
	const code = (service.code804n || service.code || "").trim();
	const title = (service.title || service.name || "").toLowerCase();

	// 1. Проверка кодов Номенклатуры 804н
	if (code.startsWith("A16.07.001")) {
		return "missing"; // Удаление зуба
	}
	if (code.startsWith("A16.07.004")) {
		return "crown"; // Ортопедия / коронка
	}
	if (code.startsWith("A16.07.002")) {
		return "done"; // Пломбирование / реставрация
	}
	if (
		code.startsWith("A16.07.030") ||
		code.startsWith("A16.07.008") ||
		code.startsWith("A16.07.082")
	) {
		return "treatment"; // Эндодонтия / корневые каналы / пульпит
	}

	// 2. Проверка текстовых маркеров манипуляции
	if (title.includes("удален")) {
		return "missing";
	}
	if (
		title.includes("коронк") ||
		title.includes("протез") ||
		title.includes("вкладк") ||
		title.includes("циркони") ||
		title.includes("металлокерамик")
	) {
		return "crown";
	}
	if (
		title.includes("пломб") ||
		title.includes("реставрац") ||
		title.includes("композит") ||
		title.includes("герметизац") ||
		title.includes("светоотвержд")
	) {
		return "done";
	}
	if (
		title.includes("пульпит") ||
		title.includes("периодонтит") ||
		title.includes("канал") ||
		title.includes("эндодонт") ||
		title.includes("депульп")
	) {
		return "treatment";
	}

	return "done";
}

export type BillingInvoiceSlice = Pick<
	VisitStore,
	| "completedServices"
	| "addCompletedService"
	| "setCompletedServices"
	| "removeCompletedService"
	| "applyServicesToToothState"
>;

export function createBillingInvoiceSlice(
	set: VisitStoreSet,
): BillingInvoiceSlice {
	return {
		completedServices: [],
		addCompletedService: (service) =>
			set((prev) => ({
				completedServices: [...prev.completedServices, service],
			})),
		setCompletedServices: (val) =>
			set((state) => ({
				completedServices:
					typeof val === "function" ? val(state.completedServices) : val,
			})),
		removeCompletedService: (index) =>
			set((prev) => ({
				completedServices: prev.completedServices.filter((_, i) => i !== index),
			})),

		applyServicesToToothState: (payload) =>
			set((prev) => {
				if (!payload) return prev;
				const rawList = Array.isArray(payload.services)
					? payload.services
					: Array.isArray(payload.items)
						? payload.items
						: payload.service
							? [payload.service]
							: [];

				if (rawList.length === 0 && !payload.toothNumber && !payload.toothCode) {
					return prev;
				}

				const nextToothStates = { ...prev.visitToothStateByCode };
				const nextToothRecords = { ...prev.visitToothRecordsByCode };
				let lastToothNumber: number | null = null;

				// Обработка списка услуг
				for (const srv of rawList) {
					const toothCandidate =
						srv.toothCode ??
						srv.toothNumber ??
						payload.toothCode ??
						payload.toothNumber;

					let codeStr =
						toothCandidate !== undefined && toothCandidate !== null
							? String(toothCandidate).trim()
							: "";

					// Если код зуба не указан в поле, ищем в названии: «(зуб 16)», «(зубы 16, 17)», «Зуб 16:»
					if (!codeStr) {
						const title = srv.title || srv.name || "";
						const match = title.match(
							/(?:\(?зуб(?:ы)?\s+([A-Za-z0-9,\s]+)\)?|^зуб(?:ы)?\s+([A-Za-z0-9,\s]+):)/i,
						);
						if (match) {
							codeStr = (match[1] || match[2] || "").trim();
						}
					}

					if (
						codeStr &&
						codeStr.toLowerCase() !== "none" &&
						codeStr !== "0" &&
						codeStr.toLowerCase() !== "без зуба"
					) {
						const individualCodes = codeStr.includes(",")
							? codeStr
									.split(",")
									.map((c) => c.trim())
									.filter(Boolean)
							: [codeStr];

						for (const singleCode of individualCodes) {
							if (
								!singleCode ||
								singleCode.toLowerCase() === "none" ||
								singleCode === "0" ||
								singleCode.toLowerCase() === "без зуба"
							) {
								continue;
							}

							const state = inferToothStateFromService(srv);
							nextToothStates[singleCode] = state;
							const toothNum = Number.parseInt(singleCode, 10) || 16;
							lastToothNumber = toothNum;

							const existing = nextToothRecords[singleCode] || {
								toothNumber: toothNum,
								state,
							};

							const srvEntry = {
								code: srv.code804n || srv.code || "A16.07.001",
								title: srv.title || srv.name || "Стоматологическая услуга",
								price: srv.price ?? srv.unitPriceRub ?? 0,
							};

							const updatedServices = existing.services
								? [...existing.services, srvEntry]
								: [srvEntry];

							nextToothRecords[singleCode] = {
								...existing,
								toothNumber: toothNum,
								state,
								services: updatedServices,
								updatedAt: new Date().toISOString(),
							};
						}
					}
				}

				// Если список услуг пустой, но указан конкретный зуб
				if (rawList.length === 0 && (payload.toothNumber || payload.toothCode)) {
					const codeStr = String(payload.toothCode || payload.toothNumber).trim();
					if (
						codeStr &&
						codeStr.toLowerCase() !== "none" &&
						codeStr !== "0" &&
						codeStr.toLowerCase() !== "без зуба"
					) {
						const toothNum = Number.parseInt(codeStr, 10) || 16;
						lastToothNumber = toothNum;
						nextToothStates[codeStr] = "done";
						const existing = nextToothRecords[codeStr] || {
							toothNumber: toothNum,
							state: "done" as ToothState,
						};
						nextToothRecords[codeStr] = {
							...existing,
							toothNumber: toothNum,
							state: "done",
							updatedAt: new Date().toISOString(),
						};
					}
				}

				// Определяем затронутые зубы для синхронизации с ToothChart & odontogramStorage
				const affectedToothNumbers: number[] = [];
				for (const [codeStr, state] of Object.entries(nextToothStates)) {
					if (prev.visitToothStateByCode[codeStr] !== state) {
						const num = Number.parseInt(codeStr, 10);
						if (Number.isFinite(num)) affectedToothNumbers.push(num);
					}
				}
				if (lastToothNumber && !affectedToothNumbers.includes(lastToothNumber)) {
					affectedToothNumbers.push(lastToothNumber);
				}

				// Двухуровневое сохранение и реактивная диспетчеризация (Мандаты 8c, 8e)
				const effectivePatientId =
					payload.patientId ||
					useAppStore.getState().activePatientId ||
					useAppStore.getState().dashboard?.activeVisit?.patientId ||
					null;

				if (effectivePatientId && affectedToothNumbers.length > 0) {
					try {
						const existingTeeth =
							loadStoredTeethData(effectivePatientId) ||
							createDefaultAdultTeethData();
						const updatedTeeth: ToothData[] = [...existingTeeth];

						for (const toothNum of affectedToothNumbers) {
							const uiState = nextToothStates[String(toothNum)] ?? "done";
							const clinicalState = mapVisitUiStateToToothDataState(uiState);
							const idx = updatedTeeth.findIndex(
								(t) => t.toothNumber === toothNum,
							);
							if (idx >= 0 && updatedTeeth[idx]) {
								updatedTeeth[idx] = {
									...updatedTeeth[idx],
									toothNumber: toothNum,
									state: clinicalState,
									updatedAt: new Date().toISOString(),
								};
							} else {
								updatedTeeth.push({
									toothNumber: toothNum,
									state: clinicalState,
									updatedAt: new Date().toISOString(),
								});
							}
						}

						saveStoredTeethData(effectivePatientId, updatedTeeth, true);

						if (typeof window !== "undefined") {
							window.dispatchEvent(
								new CustomEvent("dente-odontogram-update", {
									detail: {
										patientId: effectivePatientId,
										states: updatedTeeth,
										teeth: updatedTeeth,
									},
								}),
							);
						}
					} catch (storageErr) {
						console.warn(
							"[visitStore] Ошибка локального обновления одонтограммы:",
							storageErr,
						);
					}
				}

				return {
					visitToothStateByCode: nextToothStates,
					visitToothRecordsByCode: nextToothRecords,
					activeToothNumber: lastToothNumber ?? prev.activeToothNumber,
				};
			}),
	};
}
