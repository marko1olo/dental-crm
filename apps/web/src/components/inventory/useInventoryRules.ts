import { useCallback, useEffect, useState } from "react";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";
import { buildCanonicalFallbackBomRules } from "./bomModules/materialBomTypes.js";
import { useInventoryRulesMutations } from "./rulesModules/useInventoryRulesMutations.js";

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

export type InventorySubTab = "inventory" | "waybills" | "audit" | "rules";

export function useInventoryRules({
	organizationId,
	getHeaders,
	setConfirmDialog,
}: UseInventoryRulesParams) {
	const [activeSubTab, setActiveSubTab] = useState<InventorySubTab>("inventory");
	const [selectedServiceId, setSelectedServiceId] = useState<string>("");
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [rulesList, setRulesList] = useState<any[]>(() =>
		buildCanonicalFallbackBomRules(),
	);
	const [isLoadingRules, setIsLoadingRules] = useState(false);
	const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>("");
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
				const res = await fetch(`/api/inventory/${organizationId}/rules/${serviceId}`, {
					headers: getHeaders(),
				});
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

	const mutations = useInventoryRulesMutations({
		organizationId,
		getHeaders,
		setConfirmDialog,
		selectedServiceId,
		selectedInventoryItemId,
		setSelectedInventoryItemId,
		quantityToDeduct,
		setQuantityToDeduct,
		fetchRules,
	});

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
		fetchRules,
		...mutations,
	};
}
