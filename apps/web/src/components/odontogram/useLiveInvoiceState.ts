import { useMemo, useState } from "react";
import {
	exportLiveInvoiceToCashier,
	exportLiveInvoiceToPlan,
	type UseLiveInvoiceStateParams,
} from "./liveInvoiceActions";
import {
	computeLiveInvoiceCategoryBreakdown,
	computeLiveInvoiceDiscount,
	computeLiveInvoiceGrossTotal,
} from "./liveInvoiceTotals";
import { calculateLiveInvoiceItems } from "./odontogramLiveInvoiceCalculations";

export type { UseLiveInvoiceStateParams };

export function useLiveInvoiceState({
	teethData,
	patientId,
	patientName = "Пациент",
	onGenerateTreatmentPlan,
	onCreateInvoice,
}: UseLiveInvoiceStateParams) {
	const [excludedKeys, setExcludedKeys] = useState<Set<string>>(
		() => new Set(),
	);
	const [quantities, setQuantities] = useState<Record<string, number>>({});
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [isFiscalModalOpen, setIsFiscalModalOpen] = useState<boolean>(false);
	const [visibleItemsLimit, setVisibleItemsLimit] = useState<number>(30);

	const baseItems = useMemo(
		() =>
			calculateLiveInvoiceItems(teethData, {
				excludedKeys,
				quantities,
				discountPercent,
			}),
		[teethData, excludedKeys, quantities, discountPercent],
	);

	const visibleBaseItems = useMemo(
		() => baseItems.slice(0, visibleItemsLimit),
		[baseItems, visibleItemsLimit],
	);
	const categoryBreakdown = useMemo(
		() => computeLiveInvoiceCategoryBreakdown(baseItems),
		[baseItems],
	);
	const grossTotalPrice = useMemo(
		() => computeLiveInvoiceGrossTotal(baseItems),
		[baseItems],
	);
	const totalDiscountRub = useMemo(
		() => computeLiveInvoiceDiscount(grossTotalPrice, discountPercent),
		[grossTotalPrice, discountPercent],
	);
	const netTotalPrice = useMemo(
		() => Math.max(0, grossTotalPrice - totalDiscountRub),
		[grossTotalPrice, totalDiscountRub],
	);

	const handleExcludeItem = (itemKey: string) =>
		setExcludedKeys((prev) => new Set([...prev, itemKey]));
	const handleUpdateQty = (itemKey: string, delta: number) => {
		setQuantities((prev) => ({
			...prev,
			[itemKey]: Math.max(1, Math.min(20, (prev[itemKey] ?? 1) + delta)),
		}));
	};

	const handleExportToPlan = () =>
		exportLiveInvoiceToPlan({
			baseItems,
			netTotalPrice,
			onGenerateTreatmentPlan,
		});
	const handleCreateInvoice = () =>
		exportLiveInvoiceToCashier({
			baseItems,
			grossTotalPrice,
			totalDiscountRub,
			netTotalPrice,
			discountPercent,
			patientId,
			patientName,
			onCreateInvoice,
		});

	return {
		baseItems,
		visibleBaseItems,
		categoryBreakdown,
		grossTotalPrice,
		totalDiscountRub,
		netTotalPrice,
		discountPercent,
		setDiscountPercent,
		visibleItemsLimit,
		setVisibleItemsLimit,
		isFiscalModalOpen,
		setIsFiscalModalOpen,
		handleExcludeItem,
		handleUpdateQty,
		handleExportToPlan,
		handleCreateInvoice,
	};
}
