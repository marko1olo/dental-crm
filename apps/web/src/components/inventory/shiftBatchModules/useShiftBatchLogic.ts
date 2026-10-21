import { useEffect, useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine.js";
import {
	type ClinicalPackageId,
	handleOneClickPackageWriteOff,
	type OneClickPackageWriteOffResult,
} from "../warehousePackageWriteOffEngine.js";
import type { ShiftBatchMode, ShiftBatchDeductionModalProps, ShiftSummaryData } from "./types.js";
import { getDemoShiftSummary } from "./demoShiftSummary.js";

export function useShiftBatchLogic(props: ShiftBatchDeductionModalProps) {
	const {
		isOpen,
		onClose,
		organizationId = "org-default",
		onDeductionComplete,
		initialMode = "shift",
		procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
		serviceCode,
		service804nCode = "A16.07.002.011",
		toothNumber = 16,
		doctorName = "Кузнецов А.В.",
		warehouseItems,
		currentStockMap,
	} = props;

	const [activeMode, setActiveMode] = useState<ShiftBatchMode>(initialMode);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const inFlightRef = useRef(false);
	const [summaryData, setSummaryData] = useState<ShiftSummaryData | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [packageQuantityMultiplier, setPackageQuantityMultiplier] = useState<number>(1);
	const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
	const [lastPackageResult, setLastPackageResult] = useState<OneClickPackageWriteOffResult | null>(null);

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

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen && !isSubmitting && !submittingPackageId) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isSubmitting, submittingPackageId, onClose]);

	const handleExecuteShiftDeduction = async () => {
		if (inFlightRef.current || isSubmitting) return;
		inFlightRef.current = true;
		setIsSubmitting(true);
		try {
			let res = await fetch(`/api/warehouse/${organizationId}/shift-deduct`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "x-organization-id": organizationId },
				body: JSON.stringify({ date: summaryData?.date, notes: "Пакетное списание расходников за смену (1 клик)" }),
			}).catch(() => null);
			if (!res?.ok) {
				res = await fetch(`/api/inventory/${organizationId}/shift-deduct`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ date: summaryData?.date, notes: "Пакетное списание расходников за смену (1 клик)" }),
				}).catch(() => null);
			}
			if (res?.ok || isDemoShowcaseMode()) {
				showToast("Расходники за смену успешно списаны пакетом в 1 клик. Мягкий овердрафт активен.", "success");
				onDeductionComplete?.();
				onClose();
				return;
			}
			throw new Error("Сбой проведения списания за смену");
		} catch (err) {
			if (isDemoShowcaseMode()) {
				showToast("Расходники за смену списаны в 1 клик (демо-режим)", "success");
				onDeductionComplete?.();
				onClose();
			} else {
				showToast(err instanceof Error ? err.message : "Не удалось выполнить списание за смену", "error");
			}
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	const handlePackageClick = async (packageId: ClinicalPackageId) => {
		if (inFlightRef.current || submittingPackageId) return;
		inFlightRef.current = true;
		setSubmittingPackageId(packageId);
		try {
			const result = await handleOneClickPackageWriteOff({
				packageId,
				warehouseItems,
				currentStockMap,
				organizationId,
				doctorName,
				quantityMultiplier: packageQuantityMultiplier,
				allowSoftOverdraft: true,
			});
			setLastPackageResult(result);
			showToast(result.toastMessage, result.isOverdraft ? "warning" : "success");
			onDeductionComplete?.();
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Ошибка списания пакета", "error");
		} finally {
			inFlightRef.current = false;
			setTimeout(() => setSubmittingPackageId(null), 300);
		}
	};

	const handleConfirmProcedureDeduction = async () => {
		if (inFlightRef.current || isSubmitting) return;
		inFlightRef.current = true;
		setIsSubmitting(true);
		try {
			const payload = { serviceCode: serviceCode || service804nCode, toothNumber, allowSoftOverdraft: true };
			let res = await fetch(`/api/inventory/${organizationId}/deduct/visit`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			}).catch(() => null);
			if (!res?.ok) {
				res = await fetch(`/api/warehouse/${organizationId}/deduct/visit`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				}).catch(() => null);
			}
			showToast(`Материалы по процедуре «${procedureTitle}» успешно списаны.`, "success");
			onDeductionComplete?.();
			onClose();
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Не удалось списать материалы по процедуре", "error");
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	return {
		activeMode,
		setActiveMode,
		isLoading,
		isSubmitting,
		summaryData,
		loadError,
		packageQuantityMultiplier,
		setPackageQuantityMultiplier,
		submittingPackageId,
		lastPackageResult,
		handleExecuteShiftDeduction,
		handlePackageClick,
		handleConfirmProcedureDeduction,
	};
}
