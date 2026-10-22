import { useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine.js";
import type { ShiftBatchMode, ShiftBatchDeductionModalProps, ShiftSummaryData } from "./types.js";
import { getDemoShiftSummary } from "./demoShiftSummary.js";
import { useShiftBatchActions } from "./useShiftBatchActions.js";

export function useShiftBatchLogic(props: ShiftBatchDeductionModalProps) {
	const {
		isOpen,
		onClose,
		organizationId = "org-default",
		onDeductionComplete,
		initialMode = "shift",
		procedureTitle,
		serviceCode,
		service804nCode,
		toothNumber,
		doctorName,
		warehouseItems,
		currentStockMap,
	} = props;

	const [activeMode, setActiveMode] = useState<ShiftBatchMode>(initialMode);
	const [isLoading, setIsLoading] = useState(false);
	const [summaryData, setSummaryData] = useState<ShiftSummaryData | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [packageQuantityMultiplier, setPackageQuantityMultiplier] = useState<number>(1);

	useEffect(() => {
		if (isOpen) setActiveMode(initialMode || "shift");
	}, [isOpen, initialMode]);

	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;
		setIsLoading(true);
		setLoadError(null);

		const fetchSummary = async () => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 2500);
			try {
				let res = await fetch(`/api/warehouse/${organizationId}/shift-summary`, {
					signal: controller.signal,
					headers: { "x-organization-id": organizationId },
				}).catch(() => null);
				if (!res?.ok) res = await fetch(`/api/inventory/${organizationId}/shift-summary`, { signal: controller.signal }).catch(() => null);
				clearTimeout(timeoutId);
				if (res?.ok) {
					const data = await res.json();
					if (isMounted) setSummaryData(data);
					return;
				}
				if (isDemoShowcaseMode() && isMounted) {
					setSummaryData(getDemoShiftSummary());
					return;
				}
				throw new Error("Не удалось загрузить сводку смены");
			} catch (err) {
				clearTimeout(timeoutId);
				if (isMounted) {
					if (isDemoShowcaseMode()) setSummaryData(getDemoShiftSummary());
					else setLoadError(err instanceof Error ? err.message : "Ошибка загрузки данных смены");
				}
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};
		fetchSummary();
		return () => { isMounted = false; };
	}, [isOpen, organizationId]);

	const actions = useShiftBatchActions({
		organizationId,
		summaryData,
		warehouseItems,
		currentStockMap,
		doctorName,
		procedureTitle,
		serviceCode,
		service804nCode,
		toothNumber,
		packageQuantityMultiplier,
		onDeductionComplete,
		onClose,
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen && !actions.isSubmitting && !actions.submittingPackageId) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, actions.isSubmitting, actions.submittingPackageId, onClose]);

	return {
		activeMode,
		setActiveMode,
		isLoading,
		summaryData,
		loadError,
		packageQuantityMultiplier,
		setPackageQuantityMultiplier,
		...actions,
	};
}
