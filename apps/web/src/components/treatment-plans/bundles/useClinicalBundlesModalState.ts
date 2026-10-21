import { useEffect, useMemo, useState, useRef } from "react";
import {
	CLINICAL_BUNDLES,
	type ClinicalBundleCategory,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
	getClinicalBundleById,
} from "../treatmentPlanBundlesEngine";
import type { ClinicalServiceBundlesModalProps } from "./bundlesModalTypes";
import { executeApplyPlan, executeApplyInvoice } from "./bundleApplyHandlers";
import { filterClinicalBundles } from "./filterClinicalBundles";

export function useClinicalBundlesModalState({
	isOpen,
	onClose,
	onApplyToPlan,
	onApplyToInvoice,
	initialToothNumber = 16,
}: Pick<
	ClinicalServiceBundlesModalProps,
	"isOpen" | "onClose" | "onApplyToPlan" | "onApplyToInvoice" | "initialToothNumber"
>) {
	const [selectedCategory, setSelectedCategory] = useState<ClinicalBundleCategory | "all">("all");
	const [selectedTooth, setSelectedTooth] = useState<number>(initialToothNumber);
	const [customToothInput, setCustomToothInput] = useState<string>(String(initialToothNumber));
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, string[]>>(() => {
		const m: Record<string, string[]> = {};
		for (const b of CLINICAL_BUNDLES) m[b.id] = b.items.map((it) => it.id);
		return m;
	});
	const [expandedBundleIds, setExpandedBundleIds] = useState<Record<string, boolean>>({});
	const [justAddedBundleId, setJustAddedBundleId] = useState<string | null>(null);

	useEffect(() => {
		if (initialToothNumber >= 11 && initialToothNumber <= 85) {
			setSelectedTooth(initialToothNumber);
			setCustomToothInput(String(initialToothNumber));
		}
	}, [initialToothNumber]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	const handleCustomToothChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value.replace(/\D/g, "").slice(0, 2);
		setCustomToothInput(val);
		const num = parseInt(val, 10);
		if (num >= 11 && num <= 85) setSelectedTooth(num);
	};

	const toggleItem = (bundleId: string, itemId: string) =>
		setSelectedItemsMap((prev) => {
			const cur = prev[bundleId] ?? [];
			return {
				...prev,
				[bundleId]: cur.includes(itemId)
					? cur.filter((id) => id !== itemId)
					: [...cur, itemId],
			};
		});

	const resetBundle = (bundleId: ClinicalBundleId) => {
		const b = getClinicalBundleById(bundleId);
		if (b) setSelectedItemsMap((p) => ({ ...p, [bundleId]: b.items.map((it) => it.id) }));
	};

	const filteredBundles = useMemo(
		() => filterClinicalBundles(selectedCategory, searchQuery),
		[selectedCategory, searchQuery],
	);

	const inFlightRef = useRef(false);
	const applyCtx = {
		inFlightRef,
		selectedTooth,
		selectedItemsMap,
		setJustAddedBundleId,
		onApplyToPlan,
		onApplyToInvoice,
	};

	const handleApplyPlan = (b: ClinicalBundleDefinition) => executeApplyPlan(b, applyCtx);
	const handleApplyInvoice = (b: ClinicalBundleDefinition) => executeApplyInvoice(b, applyCtx);

	return {
		selectedCategory,
		setSelectedCategory,
		selectedTooth,
		setSelectedTooth,
		customToothInput,
		setCustomToothInput,
		handleCustomToothChange,
		searchQuery,
		setSearchQuery,
		selectedItemsMap,
		toggleItem,
		resetBundle,
		expandedBundleIds,
		setExpandedBundleIds,
		justAddedBundleId,
		filteredBundles,
		handleApplyPlan,
		handleApplyInvoice,
	};
}
