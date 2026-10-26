/**
 * Telegram Tooth Picker State Hook
 * (DOMAIN: TELEGRAM MINI APP - LAYER 3 HOOKS)
 */

import { useCallback, useState } from "react";
import { TOOTH_COMPLAINT_CATALOG } from "./toothComplaintCatalog.js";
import type {
	ToothComplaint,
	ToothComplaintType,
} from "./toothPickerTypes.js";

export function useTelegramToothPicker(
	selectedComplaints: readonly ToothComplaint[],
	onSaveComplaint: (complaint: ToothComplaint) => void,
	onRemoveComplaint: (toothNumber: number) => void,
) {
	const [dentitionMode, setDentitionMode] = useState<"adult" | "pediatric">("adult");
	const [viewMode, setViewMode] = useState<"quadrants" | "arch">("quadrants");
	const [activeQuadrant, setActiveQuadrant] = useState<number>(1);
	const [sheetTooth, setSheetTooth] = useState<number | null>(null);

	const [activeComplaintType, setActiveComplaintType] = useState<ToothComplaintType>("acute_throbbing");
	const [painLevel, setPainLevel] = useState<number>(3);
	const [notes, setNotes] = useState<string>("");

	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try {
			window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
		} catch {
			// Ignore outside of Telegram WebApp
		}
	}, []);

	const findComplaint = useCallback(
		(toothNum: number) => selectedComplaints.find((c) => c.toothNumber === toothNum),
		[selectedComplaints],
	);

	const handleOpenToothSheet = useCallback(
		(toothNum: number) => {
			triggerHaptic("medium");
			const existing = findComplaint(toothNum);
			if (existing) {
				setActiveComplaintType(existing.complaintType);
				setPainLevel(existing.painLevel);
				setNotes(existing.notes || "");
			} else {
				setActiveComplaintType("acute_throbbing");
				setPainLevel(3);
				setNotes("");
			}
			setSheetTooth(toothNum);
		},
		[findComplaint, triggerHaptic],
	);

	const handleCloseSheet = useCallback(() => {
		triggerHaptic("light");
		setSheetTooth(null);
	}, [triggerHaptic]);

	const handleConfirmComplaint = useCallback(() => {
		if (!sheetTooth) return;
		triggerHaptic("heavy");

		const catalogItem = TOOTH_COMPLAINT_CATALOG.find((c) => c.id === activeComplaintType);
		const trimmedNotes = notes.trim();
		const complaint: ToothComplaint = {
			toothNumber: sheetTooth,
			complaintType: activeComplaintType,
			symptomLabel: catalogItem?.label || "Боль в зубе",
			painLevel,
			...(trimmedNotes ? { notes: trimmedNotes } : {}),
			cito: catalogItem?.cito || painLevel >= 4,
		};

		onSaveComplaint(complaint);
		setSheetTooth(null);
	}, [activeComplaintType, notes, onSaveComplaint, painLevel, sheetTooth, triggerHaptic]);

	const handleDeleteComplaint = useCallback(() => {
		if (!sheetTooth) return;
		triggerHaptic("light");
		onRemoveComplaint(sheetTooth);
		setSheetTooth(null);
	}, [onRemoveComplaint, sheetTooth, triggerHaptic]);

	return {
		dentitionMode,
		setDentitionMode,
		viewMode,
		setViewMode,
		activeQuadrant,
		setActiveQuadrant,
		sheetTooth,
		activeComplaintType,
		setActiveComplaintType,
		painLevel,
		setPainLevel,
		notes,
		setNotes,
		triggerHaptic,
		findComplaint,
		handleOpenToothSheet,
		handleCloseSheet,
		handleConfirmComplaint,
		handleDeleteComplaint,
	};
}
