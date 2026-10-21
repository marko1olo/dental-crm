import { useEffect, useMemo, useRef, useState } from "react";
import {
	CLINICAL_BUNDLES,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
} from "../treatmentPlanBundlesEngine.js";

interface UseBundlesParams {
	readonly initialToothNumber?: number;
	readonly onApplyBundle: (bundleId: ClinicalBundleId, toothNumber?: number) => void;
}

export function useClinicalBundles({ initialToothNumber = 16, onApplyBundle }: UseBundlesParams) {
	const [selectedTooth, setSelectedTooth] = useState<number>(initialToothNumber);
	const [customToothInput, setCustomToothInput] = useState<string>(String(initialToothNumber));
	const [lastAddedBundleId, setLastAddedBundleId] = useState<string | null>(null);
	const [previewBundle, setPreviewBundle] = useState<ClinicalBundleDefinition | null>(null);
	const [stageFilter, setStageFilter] = useState<number | "all">("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const inFlightRef = useRef(false);

	useEffect(() => {
		if (initialToothNumber && initialToothNumber >= 11 && initialToothNumber <= 85) {
			setSelectedTooth(initialToothNumber);
			setCustomToothInput(String(initialToothNumber));
		}
	}, [initialToothNumber]);

	const handleToothSelect = (tooth: number) => {
		setSelectedTooth(tooth);
		setCustomToothInput(String(tooth));
	};

	const handleCustomToothChange = (val: string) => {
		const clean = val.replace(/\D/g, "").slice(0, 2);
		setCustomToothInput(clean);
		const num = parseInt(clean, 10);
		if (num >= 11 && num <= 85) setSelectedTooth(num);
	};

	const handleApply = (bundle: ClinicalBundleDefinition) => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			const tooth = bundle.requiresTooth ? selectedTooth : undefined;
			onApplyBundle(bundle.id, tooth);
			setLastAddedBundleId(bundle.id);
			setTimeout(() => setLastAddedBundleId(null), 2000);
		} finally {
			setTimeout(() => { inFlightRef.current = false; }, 350);
		}
	};

	const filteredBundles = useMemo(() => {
		return CLINICAL_BUNDLES.filter((bundle) => {
			if (stageFilter !== "all" && bundle.stageNumber !== stageFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchesTitle = bundle.title.toLowerCase().includes(q) || bundle.shortTitle.toLowerCase().includes(q);
				const matchesDesc = bundle.description.toLowerCase().includes(q);
				const matchesItems = bundle.items.some(
					(it) => it.name.toLowerCase().includes(q) || (it.serviceCode || it.code804n || "").toLowerCase().includes(q),
				);
				if (!matchesTitle && !matchesDesc && !matchesItems) return false;
			}
			return true;
		});
	}, [stageFilter, searchQuery]);

	return {
		selectedTooth, customToothInput, lastAddedBundleId, previewBundle, setPreviewBundle,
		stageFilter, setStageFilter, searchQuery, setSearchQuery, filteredBundles,
		handleToothSelect, handleCustomToothChange, handleApply,
	};
}
