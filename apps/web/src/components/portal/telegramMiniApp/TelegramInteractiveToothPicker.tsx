import React, { memo, useCallback, useMemo, useState } from "react";
import type { TelegramInteractiveToothPickerProps, ToothComplaint, ToothComplaintType } from "./toothPicker/toothPickerTypes.js";
import { ADULT_Q1, ADULT_Q2, ADULT_Q3, ADULT_Q4, PEDIATRIC_Q5, PEDIATRIC_Q6, PEDIATRIC_Q7, PEDIATRIC_Q8, TOOTH_COMPLAINT_CATALOG } from "./toothPicker/toothPickerTypes.js";
import { ToothPickerQuadrantView } from "./toothPicker/ToothPickerQuadrantView.js";
import { ToothPickerArchView } from "./toothPicker/ToothPickerArchView.js";
import { ToothPickerComplaintsSummary } from "./toothPicker/ToothPickerComplaintsSummary.js";
import { ToothPickerBottomSheet } from "./toothPicker/ToothPickerBottomSheet.js";
export * from "./toothPicker/toothPickerTypes.js";
export const TelegramInteractiveToothPicker: React.FC<TelegramInteractiveToothPickerProps> = memo(({
	selectedComplaints, onSaveComplaint, onRemoveComplaint, onProceedToBooking,
}) => {
	const [dentitionMode, setDentitionMode] = useState<"adult" | "pediatric">("adult");
	const [viewMode, setViewMode] = useState<"quadrants" | "arch">("quadrants");
	const [activeQuadrant, setActiveQuadrant] = useState<number>(1);
	const [sheetTooth, setSheetTooth] = useState<number | null>(null);
	const [activeComplaintType, setActiveComplaintType] = useState<ToothComplaintType>("acute_throbbing");
	const [painLevel, setPainLevel] = useState<number>(3);
	const [notes, setNotes] = useState<string>("");
	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style); } catch { /* ignore */ }
	}, []);
	const findComplaint = useCallback((num: number) => selectedComplaints.find((c) => c.toothNumber === num), [selectedComplaints]);
	const handleOpenToothSheet = useCallback((num: number) => {
		triggerHaptic("medium");
		const existing = findComplaint(num);
		setActiveComplaintType(existing ? existing.complaintType : "acute_throbbing");
		setPainLevel(existing ? existing.painLevel : 3);
		setNotes(existing?.notes || "");
		setSheetTooth(num);
	}, [findComplaint, triggerHaptic]);
	const handleConfirmComplaint = useCallback(() => {
		if (!sheetTooth) return;
		triggerHaptic("heavy");
		const cat = TOOTH_COMPLAINT_CATALOG.find((c) => c.id === activeComplaintType);
		const tr = notes.trim();
		onSaveComplaint({ toothNumber: sheetTooth, complaintType: activeComplaintType, symptomLabel: cat?.label || "Боль в зубе", painLevel, ...(tr ? { notes: tr } : {}), cito: cat?.cito || painLevel >= 4 });
		setSheetTooth(null);
	}, [activeComplaintType, notes, onSaveComplaint, painLevel, sheetTooth, triggerHaptic]);
	const currentQuadrantTeeth = useMemo(() => {
		if (dentitionMode === "adult") {
			if (activeQuadrant === 1) return { title: "Верхний правый (18–11)", teeth: ADULT_Q1 };
			if (activeQuadrant === 2) return { title: "Верхний левый (21–28)", teeth: ADULT_Q2 };
			if (activeQuadrant === 3) return { title: "Нижний левый (31–38)", teeth: ADULT_Q3 };
			return { title: "Нижний правый (48–41)", teeth: ADULT_Q4 };
		}
		if (activeQuadrant === 1) return { title: "Верхний правый молочный (55–51)", teeth: PEDIATRIC_Q5 };
		if (activeQuadrant === 2) return { title: "Верхний левый молочный (61–65)", teeth: PEDIATRIC_Q6 };
		if (activeQuadrant === 3) return { title: "Нижний левый молочный (71–75)", teeth: PEDIATRIC_Q7 };
		return { title: "Нижний правый молочный (85–81)", teeth: PEDIATRIC_Q8 };
	}, [activeQuadrant, dentitionMode]);
	return (
		<div className="tg-tooth-picker-container">
			<div className="tg-dentition-toggle">
				<button type="button" className={`tg-toggle-chip ${dentitionMode === "adult" ? "active" : ""}`} onClick={() => { setDentitionMode("adult"); triggerHaptic("light"); }}><span>Взрослый прикус (32 зуба)</span></button>
				<button type="button" className={`tg-toggle-chip ${dentitionMode === "pediatric" ? "active" : ""}`} onClick={() => { setDentitionMode("pediatric"); triggerHaptic("light"); }}><span>Молочные зубы (20 зубов)</span></button>
			</div>
			<div className="flex items-center justify-between px-1 py-1">
				<span className="text-xs font-semibold text-[var(--tg-text)]">{dentitionMode === "adult" ? "Формула постоянных зубов (FDI)" : "Формула молочных зубов (FDI)"}</span>
				<div className="flex bg-[var(--tg-card-inner)] p-0.5 rounded-lg border border-[var(--tg-border)] text-[11px]">
					<button type="button" className={`px-2.5 py-1 rounded-md transition-all font-medium ${viewMode === "quadrants" ? "bg-[var(--tg-accent)] text-white font-bold shadow-sm" : "text-[var(--tg-text-muted)] hover:text-[var(--tg-text)]"}`} onClick={() => { setViewMode("quadrants"); triggerHaptic("light"); }}>По квадрантам</button>
					<button type="button" className={`px-2.5 py-1 rounded-md transition-all font-medium ${viewMode === "arch" ? "bg-[var(--tg-accent)] text-white font-bold shadow-sm" : "text-[var(--tg-text-muted)] hover:text-[var(--tg-text)]"}`} onClick={() => { setViewMode("arch"); triggerHaptic("light"); }}>Вся дуга</button>
				</div>
			</div>
			{viewMode === "quadrants" ? (
				<ToothPickerQuadrantView dentitionMode={dentitionMode} activeQuadrant={activeQuadrant} onSelectQuadrant={(q) => { setActiveQuadrant(q); triggerHaptic("light"); }} currentQuadrantTeeth={currentQuadrantTeeth} selectedComplaints={selectedComplaints} activeSheetTooth={sheetTooth} onOpenTooth={handleOpenToothSheet} />
			) : (
				<ToothPickerArchView dentitionMode={dentitionMode} selectedComplaints={selectedComplaints} activeSheetTooth={sheetTooth} onOpenTooth={handleOpenToothSheet} />
			)}
			<ToothPickerComplaintsSummary selectedComplaints={selectedComplaints} onRemoveComplaint={(n) => { triggerHaptic("light"); onRemoveComplaint(n); }} onProceedToBooking={onProceedToBooking} />
			{sheetTooth !== null && (
				<ToothPickerBottomSheet toothNumber={sheetTooth} activeComplaintType={activeComplaintType} onSelectComplaintType={(t) => { setActiveComplaintType(t); triggerHaptic("light"); }} painLevel={painLevel} onSelectPainLevel={(l) => { setPainLevel(l); triggerHaptic(l >= 4 ? "heavy" : "light"); }} notes={notes} onChangeNotes={setNotes} hasExistingComplaint={Boolean(findComplaint(sheetTooth))} onClose={() => { triggerHaptic("light"); setSheetTooth(null); }} onConfirm={handleConfirmComplaint} onDelete={() => { if (sheetTooth) { triggerHaptic("light"); onRemoveComplaint(sheetTooth); setSheetTooth(null); } }} />
			)}
		</div>
	);
});
TelegramInteractiveToothPicker.displayName = "TelegramInteractiveToothPicker";
