import { useRef, useState } from "react";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";
import {
	apiQuickWriteoffCarpules,
	apiQuickWriteoffStandardKit,
	apiQuickWriteoffSterilizationKit,
} from "./quickWriteoff/quickWriteoffApiClient.js";
import { useBundleWriteoffHandlers } from "./quickWriteoff/useBundleWriteoffHandlers.js";

export interface UseInventoryQuickWriteoffParams {
	readonly organizationId: string;
	readonly getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	readonly fetchItems: () => Promise<void>;
}

export function useInventoryQuickWriteoff({
	organizationId,
	getHeaders,
	fetchItems,
}: UseInventoryQuickWriteoffParams) {
	const ctx = { organizationId, getHeaders };
	const isWritingOffStandardKitRef = useRef(false);
	const [isWritingOffStandardKit, setIsWritingOffStandardKit] = useState(false);
	const isWritingOffCarpulesRef = useRef(false);
	const [isWritingOffCarpules, setIsWritingOffCarpules] = useState(false);
	const isWritingOffSterilizationKitRef = useRef(false);
	const [isWritingOffSterilizationKit, setIsWritingOffSterilizationKit] = useState(false);

	const {
		handleQuickWriteoffShiftBundle,
		isWritingOffShiftBundle,
		handleQuickWriteoffVisitBundle,
		isWritingOffVisitBundle,
	} = useBundleWriteoffHandlers(ctx, fetchItems);

	const handleQuickWriteoffStandardKit = async (options?: {
		visitId?: string; cabinetId?: string; chairId?: string; notes?: string;
	}) => {
		if (isWritingOffStandardKitRef.current) return;
		isWritingOffStandardKitRef.current = true;
		setIsWritingOffStandardKit(true);
		try {
			const res = await apiQuickWriteoffStandardKit(ctx, options);
			if (res.ok) {
				const data = await res.json();
				const hasWarn = (Array.isArray(data.warnings) && data.warnings.length > 0) || data.isOverdraft;
				showToast(hasWarn ? "Требуется закупка: расход сверх остатка (мягкий овердрафт)" : "Базовый набор списан: СИЗ и расходники", hasWarn ? "warning" : "success");
				fetchItems();
			} else showToast("Ошибка списания базового набора", "error");
		} catch (e) { logger.error(e); showToast("Системная ошибка списания", "error"); }
		finally { isWritingOffStandardKitRef.current = false; setIsWritingOffStandardKit(false); }
	};

	const handleQuickWriteoffCarpules = async (options?: {
		carpulesCount?: number; drugName?: string; visitId?: string; cabinetId?: string;
		chairId?: string; disposalReason?: "used_in_procedure" | "partial_dose" | "broken_capsule" | "expired";
		isBroken?: boolean; isPartial?: boolean; disinfectionMethod?: string; notes?: string;
	}) => {
		if (isWritingOffCarpulesRef.current) return;
		isWritingOffCarpulesRef.current = true;
		setIsWritingOffCarpules(true);
		try {
			const res = await apiQuickWriteoffCarpules(ctx, options);
			if (res.ok) {
				const data = await res.json();
				const hasWarn = (Array.isArray(data.warnings) && data.warnings.length > 0) || data.isOverdraft;
				showToast(hasWarn ? "Требуется закупка: списание выполнено с дефицитом (мягкий овердрафт)" : `Пустые карпулы (${options?.carpulesCount ?? 1} шт) списаны`, hasWarn ? "warning" : "success");
				fetchItems();
			} else showToast("Ошибка списания карпул", "error");
		} catch (e) { logger.error(e); showToast("Системная ошибка списания карпул", "error"); }
		finally { isWritingOffCarpulesRef.current = false; setIsWritingOffCarpules(false); }
	};

	const handleQuickWriteoffAnestheticCarpule = async (options?: {
		carpulesCount?: number; visitId?: string; cabinetId?: string; chairId?: string; notes?: string;
	}) => handleQuickWriteoffCarpules({
		carpulesCount: options?.carpulesCount ?? 1, drugName: "Септанест/Убистезин", ...options,
		notes: options?.notes ?? "Быстрое списание карпулы анестетика без комиссии",
	});

	const handleQuickWriteoffSterilizationKit = async (options?: {
		visitId?: string; cabinetId?: string; chairId?: string; notes?: string;
	}) => {
		if (isWritingOffSterilizationKitRef.current) return;
		isWritingOffSterilizationKitRef.current = true;
		setIsWritingOffSterilizationKit(true);
		try {
			const res = await apiQuickWriteoffSterilizationKit(ctx, options);
			if (res.ok) {
				const data = await res.json();
				const hasWarn = data.isOverdraft || (Array.isArray(data.warnings) && data.warnings.length > 0);
				showToast(hasWarn ? "Требуется закупка: набор стерилизации списан с мягким овердрафтом" : "Набор стерилизации успешно списан", hasWarn ? "warning" : "success");
				fetchItems();
			} else showToast("Ошибка списания набора стерилизации", "error");
		} catch (e) { logger.error(e); showToast("Системная ошибка стерилизации", "error"); }
		finally { isWritingOffSterilizationKitRef.current = false; setIsWritingOffSterilizationKit(false); }
	};

	return {
		handleQuickWriteoffStandardKit, isWritingOffStandardKit, handleQuickWriteoffCarpules,
		isWritingOffCarpules, handleQuickWriteoffAnestheticCarpule, handleQuickWriteoffSterilizationKit,
		isWritingOffSterilizationKit, handleQuickWriteoffShiftBundle, isWritingOffShiftBundle,
		handleQuickWriteoffVisitBundle, isWritingOffVisitBundle,
	};
}
