import { useRef, useState } from "react";
import { logger } from "../../../utils/logger.js";
import { showToast } from "../../GlobalToast.js";
import {
	apiQuickWriteoffShiftBundle,
	apiQuickWriteoffVisitBundle,
} from "./quickWriteoffApiClient.js";

export function useBundleWriteoffHandlers(
	ctx: {
		organizationId: string;
		getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	},
	fetchItems: () => Promise<void>,
) {
	const isWritingOffShiftBundleRef = useRef(false);
	const [isWritingOffShiftBundle, setIsWritingOffShiftBundle] = useState(false);
	const isWritingOffVisitBundleRef = useRef(false);
	const [isWritingOffVisitBundle, setIsWritingOffVisitBundle] = useState(false);

	const handleQuickWriteoffShiftBundle = async (
		bundleType: "therapy" | "orthopedics" | "surgery" = "therapy",
		options?: { visitId?: string; cabinetId?: string; chairId?: string; notes?: string },
	) => {
		if (isWritingOffShiftBundleRef.current) return;
		isWritingOffShiftBundleRef.current = true;
		setIsWritingOffShiftBundle(true);
		try {
			const res = await apiQuickWriteoffShiftBundle(ctx, bundleType, options);
			if (res.ok) {
				const data = await res.json();
				const hasWarn = (Array.isArray(data.warnings) && data.warnings.length > 0) || data.isOverdraft;
				showToast(hasWarn ? "Расход смены списан с дефицитом" : `Расход смены успешно списан`, hasWarn ? "warning" : "success");
				fetchItems();
			} else showToast(`Ошибка списания смены`, "error");
		} catch (e) { logger.error(e); showToast("Ошибка расхода смены", "error"); }
		finally { isWritingOffShiftBundleRef.current = false; setIsWritingOffShiftBundle(false); }
	};

	const handleQuickWriteoffVisitBundle = async (
		visitType: "therapy" | "surgery" = "therapy",
		options?: { visitId?: string; cabinetId?: string; chairId?: string; notes?: string },
	) => {
		if (isWritingOffVisitBundleRef.current) return;
		isWritingOffVisitBundleRef.current = true;
		setIsWritingOffVisitBundle(true);
		try {
			const res = await apiQuickWriteoffVisitBundle(ctx, visitType, options);
			if (res.ok) {
				const data = await res.json();
				const hasWarn = (Array.isArray(data.warnings) && data.warnings.length > 0) || data.isOverdraft;
				showToast(hasWarn ? "Набор визита списан в минус" : `Набор визита успешно списан`, hasWarn ? "warning" : "success");
				fetchItems();
			} else showToast(`Ошибка списания набора визита`, "error");
		} catch (e) { logger.error(e); showToast("Ошибка списания визита", "error"); }
		finally { isWritingOffVisitBundleRef.current = false; setIsWritingOffVisitBundle(false); }
	};

	return {
		handleQuickWriteoffShiftBundle,
		isWritingOffShiftBundle,
		handleQuickWriteoffVisitBundle,
		isWritingOffVisitBundle,
	};
}
