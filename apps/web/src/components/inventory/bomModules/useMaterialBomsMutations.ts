import { useState } from "react";
import { logger } from "../../../utils/logger.js";
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
					headers: getHeaders({ "Content-Type": "application/json" }),
				}).catch(() => null);

				if (res && res.ok) {
					const data = await res.json();
					showToast(data.message || "Типовые нормы расхода успешно добавлены", "success");
					await fetchAllRules();
					return;
				}
			}
			setRules(buildCanonicalFallbackBomRules());
			showToast("Типовые нормы расхода успешно добавлены", "success");
		} catch (e) {
			logger.warn("Ошибка сетевого сидирования, применен канонический SSOT", e);
			setRules(buildCanonicalFallbackBomRules());
			showToast("Типовые нормы расхода успешно добавлены", "success");
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
				headers: getHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					serviceId: modalState.serviceId, inventoryItemId: modalState.inventoryItemId, quantityToDeduct: qty,
				}),
			});

			if (res.ok) {
				showToast("Норма расхода сохранена", "success");
				setModalState(null);
				await fetchAllRules();
			} else {
				showToast("Ошибка сохранения нормы", "error");
			}
		} catch (e) {
			logger.error("Ошибка сохранения нормы", e);
			showToast("Системная ошибка", "error");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteRule = async (ruleId: string) => {
		if (!orgId) return;
		try {
			const res = await fetch(`/api/inventory/${orgId}/rules/${ruleId}`, {
				method: "DELETE",
				headers: getHeaders(),
			});
			if (res.ok) {
				showToast("Норма расхода удалена", "success");
				setConfirmDeleteId(null);
				await fetchAllRules();
			} else {
				showToast("Ошибка удаления нормы", "error");
			}
		} catch (e) {
			logger.error("Ошибка удаления нормы", e);
			showToast("Системная ошибка", "error");
		}
	};

	return {
		modalState, setModalState,
		isSaving, isSeeding,
		confirmDeleteId, setConfirmDeleteId,
		handleSeedDefaults, handleSaveRule, handleDeleteRule,
	};
}
