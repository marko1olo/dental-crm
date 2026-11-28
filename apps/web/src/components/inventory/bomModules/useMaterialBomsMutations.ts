import { useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import {
	isPlainRecord,
	readApiErrorMessage,
	unwrapApiEnvelope,
} from "../../../lib/apiResponseHandler.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine.js";
import { showToast } from "../../GlobalToast.js";
import {
	buildCanonicalFallbackBomRules,
	type MaterialBomModalState,
	type ProcedureMaterialRuleViewItem,
} from "./materialBomTypes.js";

export interface UseMaterialBomsMutationsParams {
	readonly orgId: string;
	readonly getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	readonly setRules: React.Dispatch<React.SetStateAction<ProcedureMaterialRuleViewItem[]>>;
	readonly fetchAllRules: () => Promise<void>;
}

export function useMaterialBomsMutations({
	orgId,
	getHeaders,
	setRules,
	fetchAllRules,
}: UseMaterialBomsMutationsParams) {
	const [modalState, setModalState] = useState<MaterialBomModalState | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isSeeding, setIsSeeding] = useState(false);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const handleSeedDefaults = async () => {
		if (isSeeding) return;
		try {
			setIsSeeding(true);
			if (orgId) {
				const res = await fetch(`/api/inventory/${orgId}/rules/seed-defaults`, {
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
				});

				if (res.ok) {
					const raw: unknown = await res.json();
					const unwrapped = unwrapApiEnvelope(raw);
					const successMsg =
						isPlainRecord(unwrapped) && typeof unwrapped.message === "string"
							? unwrapped.message
							: "Типовые нормы расхода успешно добавлены";
					showToast(successMsg, "success");
					await fetchAllRules();
					return;
				}
				const serverErr = await readApiErrorMessage(
					res,
					"Не удалось добавить типовые нормы расхода на сервере",
				);
				clientLogger.warn(
					"[useMaterialBomsMutations] Сервер отклонил сидирование техкарт",
					{ status: res.status, message: serverErr },
					{ module: "Inventory" },
				);
				if (isDemoShowcaseMode()) {
					setRules(buildCanonicalFallbackBomRules());
					showToast("Типовые нормы расхода добавлены (демо-режим)", "info");
					return;
				}
				showToast(serverErr, "error");
			} else if (isDemoShowcaseMode()) {
				setRules(buildCanonicalFallbackBomRules());
				showToast("Типовые нормы расхода добавлены (демо-режим)", "info");
			} else {
				showToast("Выберите организацию для настройки техкарт", "warning");
			}
		} catch (e: unknown) {
			clientLogger.warn("[useMaterialBomsMutations] Ошибка сетевого сидирования техкарт", e, {
				module: "Inventory",
			});
			if (isDemoShowcaseMode()) {
				setRules(buildCanonicalFallbackBomRules());
				showToast("Типовые нормы расхода добавлены (демо-режим)", "info");
			} else {
				showToast("Ошибка сети при загрузке типовых норм расхода", "error");
			}
		} finally {
			setIsSeeding(false);
		}
	};

	const handleSaveRule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!modalState || !orgId || isSaving) return;

		const qty = parseFloat(modalState.quantityToDeduct);
		if (!Number.isFinite(qty) || qty <= 0) {
			showToast("Введите корректное количество (> 0)", "error");
			return;
		}

		try {
			setIsSaving(true);
			const res = await fetch(`/api/inventory/${orgId}/rules`, {
				method: "POST",
				headers: getHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					serviceId: modalState.serviceId, inventoryItemId: modalState.inventoryItemId, quantityToDeduct: qty,
				}),
			});

			if (res.ok) {
				showToast("Норма расхода сохранена", "success");
				setModalState(null);
				await fetchAllRules();
			} else {
				const errMsg = await readApiErrorMessage(res, "Ошибка сохранения нормы");
				clientLogger.warn("[useMaterialBomsMutations] Ошибка сохранения нормы", { status: res.status, message: errMsg }, { module: "Inventory" });
				showToast(errMsg, "error");
			}
		} catch (e: unknown) {
			clientLogger.error("[useMaterialBomsMutations] Ошибка сохранения нормы", e, {
				module: "Inventory",
			});
			showToast("Ошибка сети при сохранении нормы расхода", "error");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteRule = async (ruleId: string) => {
		if (!orgId) return;
		try {
			const res = await fetch(`/api/inventory/${orgId}/rules/${ruleId}`, {
				method: "DELETE",
				headers: getHeaders({
					"Idempotency-Key": generateUuidV7(),
				}),
			});
			if (res.ok) {
				showToast("Норма расхода удалена", "success");
				setConfirmDeleteId(null);
				await fetchAllRules();
			} else {
				const errMsg = await readApiErrorMessage(res, "Ошибка удаления нормы");
				clientLogger.warn("[useMaterialBomsMutations] Ошибка удаления нормы", { status: res.status, message: errMsg }, { module: "Inventory" });
				showToast(errMsg, "error");
			}
		} catch (e: unknown) {
			clientLogger.error("[useMaterialBomsMutations] Ошибка удаления нормы", e, {
				module: "Inventory",
			});
			showToast("Ошибка сети при удалении нормы расхода", "error");
		}
	};

	return {
		modalState, setModalState,
		isSaving, isSeeding,
		confirmDeleteId, setConfirmDeleteId,
		handleSeedDefaults, handleSaveRule, handleDeleteRule,
	};
}
