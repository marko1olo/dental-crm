import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";

export interface UseInventoryRulesParams {
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
}

export function useInventoryRules({
	organizationId,
	getHeaders,
	setConfirmDialog,
}: UseInventoryRulesParams) {
	const [activeSubTab, setActiveSubTab] = useState<"inventory" | "rules">(
		"inventory",
	);
	const [selectedServiceId, setSelectedServiceId] = useState<string>("");
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [rulesList, setRulesList] = useState<any[]>([]);
	const [isLoadingRules, setIsLoadingRules] = useState(false);
	const [selectedInventoryItemId, setSelectedInventoryItemId] =
		useState<string>("");
	const [quantityToDeduct, setQuantityToDeduct] = useState<string>("1");
	const [rulesError, setRulesError] = useState<string | null>(null);

	const selectService = (serviceId: string) => {
		setSelectedServiceId(serviceId);
		setSelectedInventoryItemId("");
		setQuantityToDeduct("1");
	};

	const fetchRules = useCallback(
		async (serviceId: string) => {
			if (!serviceId) {
				setRulesList([]);
				setRulesError(null);
				return;
			}
			try {
				setIsLoadingRules(true);
				const res = await fetch(
					`/api/inventory/${organizationId}/rules/${serviceId}`,
					{
						headers: getHeaders(),
					},
				);
				if (res.ok) {
					const data = await res.json();
					setRulesList(Array.isArray(data) ? data : []);
					setRulesError(null);
				} else {
					setRulesList([]);
					setRulesError(
						res.status === 401 || res.status === 403
							? "Правила списания не показаны: доступ не подтверждён. Войдите в кабинет заново."
							: "Правила списания не загрузились. Неизвестно, списываются материалы по этой услуге или нет — нажмите «Повторить».",
					);
					showToast("Ошибка загрузки правил", "error");
				}
			} catch (e) {
				logger.error(e);
				setRulesList([]);
				setRulesError(
					"Нет связи с сервером: правила списания не загрузились. Неизвестно, списываются материалы по этой услуге или нет — проверьте интернет и нажмите «Повторить».",
				);
				showToast("Ошибка загрузки правил", "error");
			} finally {
				setIsLoadingRules(false);
			}
		},
		[organizationId, getHeaders],
	);

	useEffect(() => {
		if (activeSubTab === "rules" && selectedServiceId) {
			fetchRules(selectedServiceId);
		}
	}, [activeSubTab, selectedServiceId, fetchRules]);

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

	return {
		activeSubTab,
		setActiveSubTab,
		selectedServiceId,
		setSelectedServiceId,
		selectService,
		rulesList,
		setRulesList,
		isLoadingRules,
		rulesError,
		selectedInventoryItemId,
		setSelectedInventoryItemId,
		quantityToDeduct,
		setQuantityToDeduct,
		isSavingRule,
		fetchRules,
		handleAddRule,
		handleDeleteRule,
	};
}
