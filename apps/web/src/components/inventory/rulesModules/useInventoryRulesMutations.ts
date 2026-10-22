import { useRef, useState } from "react";
import { logger } from "../../../utils/logger.js";
import { showToast } from "../../GlobalToast.js";

export interface UseInventoryRulesMutationsParams {
	readonly organizationId: string;
	readonly getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	readonly setConfirmDialog: (
		dialog: {
			isOpen: boolean;
			title: string;
			message: string;
			onConfirm: () => void;
		} | null,
	) => void;
	readonly selectedServiceId: string;
	readonly selectedInventoryItemId: string;
	readonly setSelectedInventoryItemId: (id: string) => void;
	readonly quantityToDeduct: string;
	readonly setQuantityToDeduct: (qty: string) => void;
	readonly fetchRules: (serviceId: string) => void;
}

export function useInventoryRulesMutations({
	organizationId,
	getHeaders,
	setConfirmDialog,
	selectedServiceId,
	selectedInventoryItemId,
	setSelectedInventoryItemId,
	quantityToDeduct,
	setQuantityToDeduct,
	fetchRules,
}: UseInventoryRulesMutationsParams) {
	const isSavingRuleRef = useRef(false);
	const [isSavingRule, setIsSavingRule] = useState(false);

	const handleAddRule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedServiceId || !selectedInventoryItemId || !quantityToDeduct)
			return;

		const qty = parseInt(quantityToDeduct, 10);
		if (Number.isNaN(qty) || qty <= 0) {
			showToast("Введите корректное количество", "error");
			return;
		}
		if (isSavingRuleRef.current) return;
		isSavingRuleRef.current = true;
		setIsSavingRule(true);

		try {
			const res = await fetch(`/api/inventory/${organizationId}/rules`, {
				method: "POST",
				headers: getHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					serviceId: selectedServiceId,
					inventoryItemId: selectedInventoryItemId,
					quantityToDeduct: qty,
				}),
			});

			if (res.ok) {
				showToast("Правило списания сохранено", "success");
				setSelectedInventoryItemId("");
				setQuantityToDeduct("1");
				fetchRules(selectedServiceId);
			} else {
				showToast("Ошибка сохранения правила", "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка", "error");
		} finally {
			isSavingRuleRef.current = false;
			setIsSavingRule(false);
		}
	};

	const handleDeleteRule = async (ruleId: string) => {
		setConfirmDialog({
			isOpen: true,
			title: "Удалить правило?",
			message: "Удалить это правило списания? Это действие необратимо.",
			onConfirm: async () => {
				setConfirmDialog(null);
				try {
					const res = await fetch(
						`/api/inventory/${organizationId}/rules/${ruleId}`,
						{
							method: "DELETE",
							headers: getHeaders(),
						},
					);

					if (res.ok) {
						showToast("Правило списания удалено", "success");
						fetchRules(selectedServiceId);
					} else {
						showToast("Ошибка удаления правила", "error");
					}
				} catch (e) {
					logger.error(e);
					showToast("Системная ошибка", "error");
				}
			},
		});
	};

	return { isSavingRule, handleAddRule, handleDeleteRule };
}
