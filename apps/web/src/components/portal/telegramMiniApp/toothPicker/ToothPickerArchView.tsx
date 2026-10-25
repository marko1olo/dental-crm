import type React from "react";
import type { ToothComplaint } from "./toothPickerTypes.js";
import {
	ADULT_Q1,
	ADULT_Q2,
	ADULT_Q3,
	ADULT_Q4,
	PEDIATRIC_Q5,
	PEDIATRIC_Q6,
	PEDIATRIC_Q7,
	PEDIATRIC_Q8,
	TOOTH_COMPLAINT_CATALOG,
} from "./toothPickerTypes.js";

export interface ToothPickerArchViewProps {
	readonly dentitionMode: "adult" | "pediatric";
	readonly selectedComplaints: readonly ToothComplaint[];
	readonly activeSheetTooth: number | null;
	readonly onOpenTooth: (toothNum: number) => void;
}

export function ToothPickerArchView({
	dentitionMode,
	selectedComplaints,
	activeSheetTooth,
	onOpenTooth,
}: ToothPickerArchViewProps): React.JSX.Element {
	const renderToothBtn = (toothNum: number) => {
		const complaint = selectedComplaints.find((c) => c.toothNumber === toothNum);
		const isSheetOpen = activeSheetTooth === toothNum;
		const catalogItem = complaint ? TOOTH_COMPLAINT_CATALOG.find((c) => c.id === complaint.complaintType) : null;

		return (
			<button
				key={toothNum}
				type="button"
				className={`tg-tooth-cell ${complaint ? "has-complaint" : ""} ${isSheetOpen ? "is-active" : ""} ${catalogItem?.badgeClass || ""}`}
				onClick={() => onOpenTooth(toothNum)}
				aria-label={`Зуб ${toothNum}${complaint ? `, жалоба: ${complaint.symptomLabel}` : ""}`}
			>
				<span className="tg-tooth-num">{toothNum}</span>
				{complaint && (
					<span className="tg-tooth-indicator">
						{complaint.complaintType === "acute_throbbing" && "⚡"}
						{complaint.complaintType === "fracture_filling" && "🦷"}
						{complaint.complaintType === "food_impaction_caries" && "🕳️"}
						{complaint.complaintType === "temperature_sensitivity" && "❄️"}
						{complaint.complaintType === "crown_implant" && "👑"}
					</span>
				)}
			</button>
		);
	};

	const upperQ1 = dentitionMode === "adult" ? ADULT_Q1 : PEDIATRIC_Q5;
	const upperQ2 = dentitionMode === "adult" ? ADULT_Q2 : PEDIATRIC_Q6;
	const lowerQ4 = dentitionMode === "adult" ? ADULT_Q4 : PEDIATRIC_Q8;
	const lowerQ3 = dentitionMode === "adult" ? ADULT_Q3 : PEDIATRIC_Q7;

	return (
		<div className="tg-arch-card">
			<div className="mb-3">
				<div className="text-[10px] uppercase font-bold text-[var(--tg-text-muted)] tracking-wider text-center mb-1.5">
					Верхняя челюсть
				</div>
				<div className="flex gap-1 justify-center overflow-x-auto py-1 scrollbar-none">
					<div className="flex gap-1">{upperQ1.map((t) => renderToothBtn(t))}</div>
					<div className="w-[1px] bg-[var(--tg-border)] mx-1 flex-shrink-0" />
					<div className="flex gap-1">{upperQ2.map((t) => renderToothBtn(t))}</div>
				</div>
			</div>

			<div>
				<div className="text-[10px] uppercase font-bold text-[var(--tg-text-muted)] tracking-wider text-center mb-1.5">
					Нижняя челюсть
				</div>
				<div className="flex gap-1 justify-center overflow-x-auto py-1 scrollbar-none">
					<div className="flex gap-1">{lowerQ4.map((t) => renderToothBtn(t))}</div>
					<div className="w-[1px] bg-slate-700/80 mx-1 flex-shrink-0" />
					<div className="flex gap-1">{lowerQ3.map((t) => renderToothBtn(t))}</div>
				</div>
			</div>
		</div>
	);
}
